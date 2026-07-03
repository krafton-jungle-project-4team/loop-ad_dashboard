import assert from "node:assert/strict";
import { test } from "node:test";
import { AppError } from "../src/app-errors.js";
import { AdExecutionDomain } from "../src/features/ad-execution/domain/index.js";
import type {
  ActiveAssignmentSnapshot,
  BannerAssignmentSnapshot,
  DispatchChannel,
  RedirectLinkSnapshot
} from "../src/features/ad-execution/domain/index.js";

process.env.LOOPAD_ENV ??= "test";
process.env.LOOPAD_SERVICE_ID ??= "dashboard-api";
process.env.PORT ??= "8080";
process.env.LOOPAD_AURORA_HOST ??= "localhost";
process.env.LOOPAD_AURORA_PORT ??= "15432";
process.env.LOOPAD_AURORA_DATABASE ??= "loopad";
process.env.LOOPAD_AURORA_USERNAME ??= "loopad";
process.env.LOOPAD_AURORA_PASSWORD ??= "loopad";
process.env.LOOPAD_CLICKHOUSE_URL ??= "http://localhost:18123";
process.env.LOOPAD_CLICKHOUSE_DATABASE ??= "loopad";
process.env.LOOPAD_CLICKHOUSE_USERNAME ??= "loopad_app";
process.env.LOOPAD_CLICKHOUSE_PASSWORD ??= "loopad_local_password";
process.env.LOOPAD_PUBLIC_BASE_URL ??= "http://dashboard.test";

const { AdExecutionService } =
  await import("../src/features/ad-execution/service/ad-execution.service.js");
const { renderRedirectPage } =
  await import("../src/features/ad-execution/adapters/redirect-page-renderer.js");

test("dispatch uses stored assignments and keeps resolver failures visible", async () => {
  const reader = new FakeAdExecutionReader();
  const writer = new FakeAdExecutionWriter();
  const resolver = new FakeRecipientResolver();
  const sender = new FakeDispatchSender();
  const service = createService(reader, writer, resolver, sender);

  resolver.missingUserIds.add("user-missing");
  reader.dispatchAssignments = [
    assignment({ userId: "user-ok" }),
    assignment({ userId: "user-missing" })
  ];

  const { result: response, logs } = await captureDispatchLogs(() =>
    service.dispatchPromotionRun("run-1")
  );

  assert.equal(response.promotion_run_id, "run-1");
  assert.equal(response.channel, "email");
  assert.equal(response.target_count, 2);
  assert.equal(response.dispatched_count, 1);
  assert.equal(response.failed_count, 1);
  assert.equal(response.jobs[0]?.status, "partial_failed");
  assert.equal(writer.redirectLinks.length, 2);
  assert.equal(writer.redirectLinks[0]?.adExperimentId, "exp-1");
  assert.equal(writer.finishes[0]?.status, "failed");
  assert.equal(writer.finishes[0]?.failedCount, 1);
  assert.equal(sender.sent.length, 1);
  assert.equal(logs.filter((entry) => entry.message === "Ad dispatch send attempt").length, 2);
  assert.equal(logs.filter((entry) => entry.message === "Ad dispatch send result").length, 2);
  assert.deepEqual(
    logs
      .filter((entry) => entry.message === "Ad dispatch send result")
      .map((entry) => entry.status)
      .sort(),
    ["failed", "sent"]
  );
  assert.equal(
    logs.some((entry) => JSON.stringify(entry).includes("@example.test")),
    false
  );
  assert.equal(
    logs.some((entry) => JSON.stringify(entry).includes("+1555")),
    false
  );
});

test("dispatch rejects onsite banner promotion runs", async () => {
  const reader = new FakeAdExecutionReader();
  reader.context = { ...reader.context, channel: "onsite_banner" };

  await assert.rejects(
    () => createService(reader).dispatchPromotionRun("run-1"),
    (error) =>
      error instanceof AppError &&
      error.statusCode === 409 &&
      error.code === "UNSUPPORTED_DISPATCH_CHANNEL"
  );
});

test("banner resolve returns the precomputed segment content", async () => {
  const reader = new FakeAdExecutionReader();
  reader.bannerAssignment = {
    promotionRunId: "run-1",
    adExperimentId: "exp-1",
    segmentId: "seg-1",
    contentId: "content-1",
    contentOptionId: "option-1",
    title: "Approved title",
    body: "Approved body",
    cta: "Book now",
    targetUrl: "https://loop-ad.example/landing"
  };

  const response = await createService(reader).resolveBanner({
    project_id: "project-1",
    promotion_run_id: "run-1",
    user_id: "user-1",
    placement_id: "hero"
  });

  assert.deepEqual(response, {
    promotion_run_id: "run-1",
    ad_experiment_id: "exp-1",
    segment_id: "seg-1",
    content_id: "content-1",
    content_option_id: "option-1",
    title: "Approved title",
    body: "Approved body",
    cta: "Book now",
    target_url: "https://loop-ad.example/landing"
  });
});

test("redirect returns an SDK handoff page with ad_experiment_id context", async () => {
  const reader = new FakeAdExecutionReader();
  const service = createService(reader);

  const page = await service.resolveRedirectPage("redirect-1");
  const properties = AdExecutionDomain.toRedirectClickProperties(reader.redirectLink!);
  const html = renderRedirectPage(page);

  assert.equal(page.targetUrl, "https://loop-ad.example/landing");
  assert.equal(page.event.name, "campaign_redirect_click");
  assert.equal(page.event.projectId, "project-1");
  assert.equal(page.event.identity.userId, "user-1");
  assert.equal(page.event.identity.sessionId, "redirect:redirect-1");
  assert.equal(page.event.fields.adExperimentId, "exp-1");
  assert.equal(page.event.fields.targetUrl, "https://loop-ad.example/landing");
  assert.equal(
    page.eventSdk.url,
    "https://krafton-jungle-project-4team.github.io/loop-ad_event_sdk/loop-ad-event-sdk.iife.js"
  );
  assert.equal(page.eventSdk.writeKey, "public_write_key");
  assert.equal(properties.ad_experiment_id, "exp-1");
  assert.equal(properties.redirect_id, "redirect-1");
  assert.equal(properties.content_option_id, "option-1");
  assert.equal(properties.target_url, "https://loop-ad.example/landing");
  assert.match(html, /LoopAdEventSDK\.init/);
  assert.match(html, /campaign_redirect_click/);
  assert.match(html, /window\.location\.replace/);
});

function createService(
  reader = new FakeAdExecutionReader(),
  writer = new FakeAdExecutionWriter(),
  resolver = new FakeRecipientResolver(),
  sender = new FakeDispatchSender()
) {
  return new AdExecutionService(
    reader as ConstructorParameters<typeof AdExecutionService>[0],
    writer as ConstructorParameters<typeof AdExecutionService>[1],
    resolver as ConstructorParameters<typeof AdExecutionService>[2],
    sender as ConstructorParameters<typeof AdExecutionService>[3]
  );
}

function assignment(overrides: Partial<ActiveAssignmentSnapshot> = {}): ActiveAssignmentSnapshot {
  return {
    promotionRunId: "run-1",
    projectId: "project-1",
    campaignId: "campaign-1",
    promotionId: "promotion-1",
    userId: "user-1",
    segmentId: "seg-1",
    adExperimentId: "exp-1",
    contentId: "content-1",
    contentOptionId: "option-1",
    channel: "email",
    subject: "Subject",
    preheader: "Preheader",
    title: "Title",
    body: "Body",
    cta: "Open",
    message: "Message",
    targetUrl: "https://loop-ad.example/landing",
    ...overrides
  };
}

class FakeAdExecutionReader {
  context = {
    promotionRunId: "run-1",
    projectId: "project-1",
    campaignId: "campaign-1",
    promotionId: "promotion-1",
    promotionRunStatus: "approved",
    channel: "email" as "email" | "sms" | "onsite_banner"
  };
  dispatchAssignments: ActiveAssignmentSnapshot[] = [assignment()];
  bannerAssignment: BannerAssignmentSnapshot | null = null;
  redirectLink: RedirectLinkSnapshot | null = {
    redirectId: "redirect-1",
    projectId: "project-1",
    campaignId: "campaign-1",
    promotionId: "promotion-1",
    promotionRunId: "run-1",
    adExperimentId: "exp-1",
    segmentId: "seg-1",
    userId: "user-1",
    contentId: "content-1",
    contentOptionId: "option-1",
    targetUrl: "https://loop-ad.example/landing",
    expiresAt: null,
    promotionChannel: "email"
  };

  async findPromotionRunContext() {
    return this.context;
  }

  async listDispatchAssignments() {
    return this.dispatchAssignments;
  }

  async findBannerAssignment() {
    return this.bannerAssignment;
  }

  async findRedirectLink() {
    return this.redirectLink;
  }
}

class FakeAdExecutionWriter {
  dispatchJobs: unknown[] = [];
  finishes: Array<{
    status: "completed" | "failed";
    dispatchedCount: number;
    failedCount: number;
  }> = [];
  redirectLinks: Array<{
    redirectId: string;
    adExperimentId: string;
    segmentId: string;
    contentId: string;
    contentOptionId: string;
  }> = [];

  async insertDispatchJob(input: { dispatchJobId: string }) {
    this.dispatchJobs.push(input);
    return input.dispatchJobId;
  }

  async finishDispatchJob(input: {
    status: "completed" | "failed";
    dispatchedCount: number;
    failedCount: number;
  }) {
    this.finishes.push(input);
  }

  async insertRedirectLink(input: {
    redirectId: string;
    adExperimentId: string;
    segmentId: string;
    contentId: string;
    contentOptionId: string;
  }) {
    this.redirectLinks.push(input);
    return input.redirectId;
  }
}

class FakeRecipientResolver {
  missingUserIds = new Set<string>();

  async resolve(input: { userId: string; channel: DispatchChannel }) {
    if (this.missingUserIds.has(input.userId)) {
      return null;
    }

    return {
      recipient: input.channel === "email" ? `${input.userId}@example.test` : "+15551234567"
    };
  }
}

class FakeDispatchSender {
  providerNameFor() {
    return "fake";
  }

  sent: unknown[] = [];

  async send(input: unknown) {
    this.sent.push(input);
    return {
      provider: "fake",
      providerMessageId: "provider-message-1"
    };
  }
}

async function captureDispatchLogs<T>(callback: () => Promise<T>) {
  const logs: Array<Record<string, unknown>> = [];
  const originalLog = console.log;
  const originalWarn = console.warn;

  console.log = (line?: unknown) => {
    pushJsonLog(logs, line);
  };
  console.warn = (line?: unknown) => {
    pushJsonLog(logs, line);
  };

  try {
    const result = await callback();
    return { result, logs };
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
  }
}

function pushJsonLog(logs: Array<Record<string, unknown>>, line: unknown) {
  if (typeof line !== "string") {
    return;
  }

  logs.push(JSON.parse(line) as Record<string, unknown>);
}
