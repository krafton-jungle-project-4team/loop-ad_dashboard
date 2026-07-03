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

  const response = await service.dispatchPromotionRun("run-1");

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

test("redirect sends campaign_redirect_click with ad_experiment_id context", async () => {
  const reader = new FakeAdExecutionReader();
  const collector = new FakePromotionEventCollector();
  const service = createService(reader, undefined, undefined, undefined, collector);

  const targetUrl = await service.handleRedirect("redirect-1");
  const properties = AdExecutionDomain.toRedirectClickProperties(collector.links[0]!);

  assert.equal(targetUrl, "https://loop-ad.example/landing");
  assert.equal(properties.ad_experiment_id, "exp-1");
  assert.equal(properties.redirect_id, "redirect-1");
  assert.equal(properties.content_option_id, "option-1");
});

function createService(
  reader = new FakeAdExecutionReader(),
  writer = new FakeAdExecutionWriter(),
  resolver = new FakeRecipientResolver(),
  sender = new FakeDispatchSender(),
  collector = new FakePromotionEventCollector()
) {
  return new AdExecutionService(
    reader as ConstructorParameters<typeof AdExecutionService>[0],
    writer as ConstructorParameters<typeof AdExecutionService>[1],
    resolver as ConstructorParameters<typeof AdExecutionService>[2],
    sender as ConstructorParameters<typeof AdExecutionService>[3],
    collector as ConstructorParameters<typeof AdExecutionService>[4]
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
  providerName = "fake";
  sent: unknown[] = [];

  async send(input: unknown) {
    this.sent.push(input);
    return {
      provider: this.providerName,
      providerMessageId: "provider-message-1"
    };
  }
}

class FakePromotionEventCollector {
  links: RedirectLinkSnapshot[] = [];

  async trackRedirectClick(link: RedirectLinkSnapshot) {
    this.links.push(link);
  }
}
