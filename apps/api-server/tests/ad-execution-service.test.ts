import assert from "node:assert/strict";
import { test } from "node:test";
import { AppError } from "../src/app-errors.js";
import type {
  ActiveAdServingAssignmentEntity,
  AdExperimentEntity,
  PromotionEntity,
  PromotionRunEntity,
  RedirectLinkEntity
} from "../src/features/ad-execution/domain/index.js";
import type {
  DispatchSendResult,
  EmailSendInput,
  SmsSendInput
} from "../src/features/ad-execution/adapters/dispatch-sender.js";
import type { DispatchRecipient } from "../src/features/ad-execution/repository/index.js";

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
process.env.LOOPAD_OPENAI_API_KEY ??= "test-openai-api-key";
process.env.LOOPAD_AWS_REGION ??= "ap-northeast-2";
process.env.LOOPAD_AD_EMAIL_FROM_ADDRESS ??= "ads@example.test";

const { BannerResolveService } =
  await import("../src/features/ad-execution/service/banner-resolve.service.js");
const { PromotionDispatchService } =
  await import("../src/features/ad-execution/service/promotion-dispatch.service.js");
const { RedirectService } =
  await import("../src/features/ad-execution/service/redirect.service.js");
const { AwsEndUserMessagingSmsSender, AwsSesEmailSender } =
  await import("../src/features/ad-execution/adapters/dispatch-sender.js");
const { createEmailSender, createSmsSender } =
  await import("../src/features/ad-execution/ad-execution.module.js");
const { renderRedirectPage } =
  await import("../src/features/ad-execution/adapters/redirect-page-renderer.js");

test("dispatch uses stored assignments and records sender success", async () => {
  const reader = new FakeAdExecutionReader();
  const writer = new FakeAdExecutionWriter();
  const emailSender = new RecordingEmailSender();
  const service = createDispatchService(reader, writer, emailSender);

  reader.dispatchAssignments = [
    assignment({ userId: "user-ok" }),
    assignment({ userId: "user-also-ok" })
  ];

  const { result: response, logs } = await captureDispatchLogs(() =>
    service.dispatchPromotionRun("run-1")
  );

  assert.equal(response.promotion_run_id, "run-1");
  assert.equal(response.channel, "email");
  assert.equal(response.target_count, 2);
  assert.equal(response.dispatched_count, 2);
  assert.equal(response.failed_count, 0);
  assert.equal(response.jobs[0]?.status, "completed");
  assert.equal(writer.redirectLinks.length, 2);
  assert.equal(writer.redirectLinks[0]?.adExperimentId, "exp-1");
  assert.equal(writer.finishes[0]?.status, "completed");
  assert.equal(writer.finishes[0]?.failedCount, 0);
  assert.equal(logs.filter((entry) => entry.message === "Ad dispatch send attempt").length, 2);
  assert.equal(logs.filter((entry) => entry.message === "Ad dispatch send result").length, 2);
  assert.equal(emailSender.inputs.length, 2);
  assert.deepEqual(
    logs
      .filter((entry) => entry.message === "Ad dispatch send result")
      .map((entry) => entry.status)
      .sort(),
    ["sent", "sent"]
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

test("dispatch module always creates AWS senders from config", () => {
  const awsConfig = {
    region: "ap-northeast-2",
    emailFromAddress: "ads@example.test",
    sesConfigurationSet: "ses-config",
    smsConfigurationSet: "sms-config",
    smsOriginationIdentity: "sender-id"
  };

  assert.equal(createEmailSender(awsConfig) instanceof AwsSesEmailSender, true);
  assert.equal(createSmsSender(awsConfig) instanceof AwsEndUserMessagingSmsSender, true);
});

test("dispatch resolves user_id to email before sending", async () => {
  const reader = new FakeAdExecutionReader();
  const writer = new FakeAdExecutionWriter();
  const recipientDirectory = new FakeRecipientDirectory(false);
  const emailSender = new RecordingEmailSender();

  recipientDirectory.recipients.set(
    "user-1",
    recipient("user-1", { email: "resolved-recipient@example.test" })
  );

  const { result: response } = await captureDispatchLogs(() =>
    createDispatchService(
      reader,
      writer,
      emailSender,
      new RecordingSmsSender(),
      recipientDirectory
    ).dispatchPromotionRun("run-1")
  );

  assert.equal(response.dispatched_count, 1);
  assert.equal(emailSender.inputs.length, 1);
  assert.equal(emailSender.inputs[0]?.recipient, "resolved-recipient@example.test");
  assert.notEqual(emailSender.inputs[0]?.recipient, "user-1");
});

test("dispatch records RECIPIENT_NOT_FOUND without creating a redirect", async () => {
  const reader = new FakeAdExecutionReader();
  const writer = new FakeAdExecutionWriter();
  const recipientDirectory = new FakeRecipientDirectory(false);
  const emailSender = new RecordingEmailSender();

  const { result: response } = await captureDispatchLogs(() =>
    createDispatchService(
      reader,
      writer,
      emailSender,
      new RecordingSmsSender(),
      recipientDirectory
    ).dispatchPromotionRun("run-1")
  );

  assert.equal(response.dispatched_count, 0);
  assert.equal(response.failed_count, 1);
  assert.deepEqual(
    response.jobs[0]?.attempts.map((attempt) => attempt.error_code),
    ["RECIPIENT_NOT_FOUND"]
  );
  assert.deepEqual(dispatchAttemptErrorCodes(writer), ["RECIPIENT_NOT_FOUND"]);
  assert.equal(emailSender.inputs.length, 0);
  assert.equal(writer.redirectLinks.length, 0);
});

test("dispatch honors email opt-in before sending", async () => {
  const reader = new FakeAdExecutionReader();
  const writer = new FakeAdExecutionWriter();
  const recipientDirectory = new FakeRecipientDirectory(false);
  const emailSender = new RecordingEmailSender();

  recipientDirectory.recipients.set("user-1", recipient("user-1", { emailOptedIn: false }));

  const { result: response } = await captureDispatchLogs(() =>
    createDispatchService(
      reader,
      writer,
      emailSender,
      new RecordingSmsSender(),
      recipientDirectory
    ).dispatchPromotionRun("run-1")
  );

  assert.equal(response.dispatched_count, 0);
  assert.equal(response.failed_count, 1);
  assert.deepEqual(
    response.jobs[0]?.attempts.map((attempt) => attempt.error_code),
    ["EMAIL_NOT_OPTED_IN"]
  );
  assert.deepEqual(dispatchAttemptErrorCodes(writer), ["EMAIL_NOT_OPTED_IN"]);
  assert.equal(emailSender.inputs.length, 0);
});

test("dispatch honors sms opt-in and validates phone contact", async () => {
  const reader = new FakeAdExecutionReader();
  const writer = new FakeAdExecutionWriter();
  const recipientDirectory = new FakeRecipientDirectory(false);
  const smsSender = new RecordingSmsSender();

  reader.promotion = { ...reader.promotion, channel: "sms" };
  reader.dispatchAssignments = [
    assignment({ channel: "sms", userId: "sms-off" }),
    assignment({ channel: "sms", userId: "sms-invalid" })
  ];
  recipientDirectory.recipients.set("sms-off", recipient("sms-off", { smsOptedIn: false }));
  recipientDirectory.recipients.set(
    "sms-invalid",
    recipient("sms-invalid", { phoneNumber: "010-1234-5678" })
  );

  const { result: response } = await captureDispatchLogs(() =>
    createDispatchService(
      reader,
      writer,
      new RecordingEmailSender(),
      smsSender,
      recipientDirectory
    ).dispatchPromotionRun("run-1")
  );

  assert.equal(response.dispatched_count, 0);
  assert.equal(response.failed_count, 2);
  assert.deepEqual(response.jobs[0]?.attempts.map((attempt) => attempt.error_code).sort(), [
    "RECIPIENT_CONTACT_INVALID",
    "SMS_NOT_OPTED_IN"
  ]);
  assert.deepEqual(dispatchAttemptErrorCodes(writer).sort(), [
    "RECIPIENT_CONTACT_INVALID",
    "SMS_NOT_OPTED_IN"
  ]);
  assert.equal(smsSender.inputs.length, 0);
});

test("AWS senders build SES and SMS v2 command inputs from options", async () => {
  const emailClient = new RecordingAwsClient();
  const smsClient = new RecordingAwsClient();
  const emailSender = new AwsSesEmailSender({
    region: "ap-northeast-2",
    fromAddress: "ads@example.test",
    configurationSetName: "ses-config",
    client: emailClient as ConstructorParameters<typeof AwsSesEmailSender>[0]["client"]
  });
  const smsSender = new AwsEndUserMessagingSmsSender({
    region: "ap-northeast-2",
    configurationSetName: "sms-config",
    originationIdentity: "sender-id",
    client: smsClient as ConstructorParameters<typeof AwsEndUserMessagingSmsSender>[0]["client"]
  });

  await emailSender.sendEmail({
    recipient: "person@example.test",
    subject: "Subject",
    body: "Body",
    redirectUrl: "https://loop-ad.example/r/1"
  });
  await smsSender.sendSms({
    recipient: "+15555550123",
    body: "Message https://loop-ad.example/r/1",
    redirectUrl: "https://loop-ad.example/r/1"
  });

  assert.deepEqual(emailClient.inputs[0], {
    FromEmailAddress: "ads@example.test",
    Destination: {
      ToAddresses: ["person@example.test"]
    },
    Content: {
      Simple: {
        Subject: {
          Data: "Subject",
          Charset: "UTF-8"
        },
        Body: {
          Text: {
            Data: "Body",
            Charset: "UTF-8"
          }
        }
      }
    },
    ConfigurationSetName: "ses-config"
  });
  assert.deepEqual(smsClient.inputs[0], {
    DestinationPhoneNumber: "+15555550123",
    MessageBody: "Message https://loop-ad.example/r/1",
    MessageType: "PROMOTIONAL",
    ConfigurationSetName: "sms-config",
    OriginationIdentity: "sender-id"
  });
});

test("dispatch fails invalid email content instead of synthesizing fallbacks", async () => {
  const reader = new FakeAdExecutionReader();
  const writer = new FakeAdExecutionWriter();

  reader.dispatchAssignments = [
    assignment({
      subject: null,
      preheader: null,
      title: "Ignored title",
      body: null,
      cta: null,
      message: "Ignored message"
    })
  ];

  const { result: response } = await captureDispatchLogs(() =>
    createDispatchService(reader, writer).dispatchPromotionRun("run-1")
  );

  assert.equal(response.dispatched_count, 0);
  assert.equal(response.failed_count, 1);
  assert.equal(response.jobs[0]?.status, "failed");
  assert.equal(writer.finishes[0]?.failedCount, 1);
  assert.equal(
    (writer.finishes[0]?.result as { attempts: Array<{ errorCode?: string }> } | undefined)
      ?.attempts[0]?.errorCode,
    "CONTENT_INVALID"
  );
});

test("dispatch rejects onsite banner promotion runs", async () => {
  const reader = new FakeAdExecutionReader();
  reader.promotion = { ...reader.promotion, channel: "onsite_banner" };

  await assert.rejects(
    () => createDispatchService(reader).dispatchPromotionRun("run-1"),
    (error) =>
      error instanceof AppError &&
      error.statusCode === 409 &&
      error.code === "UNSUPPORTED_DISPATCH_CHANNEL"
  );
});

test("dispatch rejects unknown promotion channels before sender selection", async () => {
  const reader = new FakeAdExecutionReader();
  reader.promotion = {
    ...reader.promotion,
    channel: "push" as unknown as typeof reader.promotion.channel
  };

  await assert.rejects(
    () => createDispatchService(reader).dispatchPromotionRun("run-1"),
    (error) =>
      error instanceof AppError &&
      error.statusCode === 409 &&
      error.code === "UNSUPPORTED_DISPATCH_CHANNEL"
  );
});

test("banner resolve returns the precomputed segment content", async () => {
  const reader = new FakeAdExecutionReader();
  reader.bannerAssignment = {
    ...assignment(),
    title: "Approved title",
    body: "Approved body",
    cta: "Book now",
    landingUrl: "https://loop-ad.example/landing",
    channel: "onsite_banner"
  };

  const response = await createBannerService(reader).resolveBanner({
    project_id: "project-1",
    promotion_run_id: "run-1",
    user_id: "user-1",
    placement_id: "hero"
  });

  assert.deepEqual(response, {
    project_id: "project-1",
    user_id: "user-1",
    campaign_id: "campaign-1",
    promotion_id: "promotion-1",
    promotion_run_id: "run-1",
    ad_experiment_id: "exp-1",
    segment_id: "seg-1",
    content_id: "content-1",
    content_option_id: "option-1",
    promotion_channel: "onsite_banner",
    placement_id: "hero",
    title: "Approved title",
    body: "Approved body",
    cta: "Book now",
    target_url: "https://loop-ad.example/landing"
  });
});

test("banner resolve rejects non-banner assignment channels", async () => {
  const reader = new FakeAdExecutionReader();
  reader.bannerAssignment = {
    ...assignment(),
    channel: "email"
  };

  await assert.rejects(
    () =>
      createBannerService(reader).resolveBanner({
        project_id: "project-1",
        promotion_run_id: "run-1",
        user_id: "user-1",
        placement_id: "hero"
      }),
    (error) =>
      error instanceof AppError &&
      error.statusCode === 409 &&
      error.code === "UNSUPPORTED_BANNER_CHANNEL"
  );
});

test("redirect returns an SDK handoff page with ad_experiment_id context", async () => {
  const reader = new FakeAdExecutionReader();
  const service = createRedirectService(reader);

  const page = await service.resolveRedirectPage("redirect-1");
  const html = renderRedirectPage(page);

  assert.equal(page.targetUrl, "https://loop-ad.example/landing");
  assert.equal(page.event.name, "campaign_redirect_click");
  assert.equal(page.event.projectId, "project-1");
  assert.equal(page.event.identity.userId, "user-1");
  assert.equal(page.event.identity.sessionId, "redirect:redirect-1");
  assert.equal(page.event.fields.ad_experiment_id, "exp-1");
  assert.equal(page.event.fields.redirect_id, "redirect-1");
  assert.equal(page.event.fields.content_option_id, "option-1");
  assert.equal(page.event.fields.target_url, "https://loop-ad.example/landing");
  assert.equal(
    page.eventSdk.url,
    "https://krafton-jungle-project-4team.github.io/loop-ad_event_sdk/loop-ad-event-sdk.iife.js"
  );
  assert.equal(page.eventSdk.writeKey, "public_write_key");
  assert.match(html, /LoopAdEventSDK\.init/);
  assert.match(html, /campaign_redirect_click/);
  assert.match(html, /window\.location\.replace/);
});

test("redirect page escapes script data and fallback href with stable libraries", () => {
  const html = renderRedirectPage({
    targetUrl: 'https://loop-ad.example/landing?next=</script><img src=x>&quote="',
    eventSdk: {
      url: "https://sdk.example/loop-ad-event-sdk.iife.js",
      writeKey: "public_write_key"
    },
    event: {
      name: "campaign_redirect_click",
      projectId: "project-1",
      identity: {
        userId: "user-1",
        sessionId: "redirect:redirect-1"
      },
      fields: {
        campaign_id: "campaign-1",
        promotion_id: "promotion-1",
        promotion_run_id: "run-1",
        ad_experiment_id: "exp-1",
        segment_id: "seg-1",
        content_id: "content-1",
        content_option_id: "option-1",
        promotion_channel: "email",
        redirect_id: "redirect-1",
        target_url: "</script><img src=x>"
      }
    }
  });

  assert.equal(html.includes('href="https://loop-ad.example/landing?next=&lt;/script&gt;'), true);
  assert.equal(html.includes("quote=&quot;"), true);
  assert.equal(html.includes('"target_url":"\\u003C\\u002Fscript\\u003E'), true);
  assert.equal(html.includes('const redirect = {"targetUrl":"</script>'), false);
});

function createDispatchService(
  reader = new FakeAdExecutionReader(),
  writer = new FakeAdExecutionWriter(),
  emailSender = new RecordingEmailSender(),
  smsSender = new RecordingSmsSender(),
  recipientDirectory = new FakeRecipientDirectory()
) {
  return new PromotionDispatchService(
    reader as ConstructorParameters<typeof PromotionDispatchService>[0],
    writer as ConstructorParameters<typeof PromotionDispatchService>[1],
    recipientDirectory as ConstructorParameters<typeof PromotionDispatchService>[2],
    emailSender as ConstructorParameters<typeof PromotionDispatchService>[3],
    smsSender as ConstructorParameters<typeof PromotionDispatchService>[4]
  );
}

function createBannerService(reader = new FakeAdExecutionReader()) {
  return new BannerResolveService(reader as ConstructorParameters<typeof BannerResolveService>[0]);
}

function createRedirectService(reader = new FakeAdExecutionReader()) {
  return new RedirectService(reader as ConstructorParameters<typeof RedirectService>[0]);
}

function assignment(
  overrides: Partial<ActiveAdServingAssignmentEntity> = {}
): ActiveAdServingAssignmentEntity {
  return {
    promotionRunId: "run-1",
    userId: "user-1",
    segmentId: "seg-1",
    adExperimentId: "exp-1",
    contentId: "content-1",
    contentOptionId: "option-1",
    fallback: false,
    similarityScore: null,
    projectId: "project-1",
    campaignId: "campaign-1",
    promotionId: "promotion-1",
    channel: "email",
    subject: "Subject",
    preheader: "Preheader",
    title: "Title",
    body: "Body",
    cta: "Open",
    message: "Message",
    imagePrompt: null,
    landingUrl: "https://loop-ad.example/landing",
    contentStatus: "approved",
    adExperimentStatus: "approved",
    ...overrides
  };
}

function recipient(userId: string, overrides: Partial<DispatchRecipient> = {}): DispatchRecipient {
  return {
    userId,
    email: `${userId}@example.test`,
    phoneNumber: "+15555550123",
    emailOptedIn: true,
    smsOptedIn: true,
    ...overrides
  };
}

function dispatchAttemptErrorCodes(writer: FakeAdExecutionWriter): string[] {
  const result = writer.finishes[0]?.result as
    | { attempts?: Array<{ errorCode?: string }> }
    | undefined;

  return result?.attempts?.map((attempt) => attempt.errorCode).filter(isString) ?? [];
}

function isString(value: string | undefined): value is string {
  return typeof value === "string";
}

class FakeRecipientDirectory {
  readonly recipients = new Map<string, DispatchRecipient>();

  constructor(private readonly useDefaultRecipient = true) {}

  async findRecipient(userId: string): Promise<DispatchRecipient | null> {
    return this.recipients.get(userId) ?? (this.useDefaultRecipient ? recipient(userId) : null);
  }
}

class RecordingEmailSender {
  readonly providerName = "recording-email";
  readonly inputs: EmailSendInput[] = [];

  async sendEmail(input: EmailSendInput): Promise<DispatchSendResult> {
    this.inputs.push(input);

    return {
      provider: this.providerName,
      providerMessageId: `recording_email_${this.inputs.length}`
    };
  }
}

class RecordingSmsSender {
  readonly providerName = "recording-sms";
  readonly inputs: SmsSendInput[] = [];

  async sendSms(input: SmsSendInput): Promise<DispatchSendResult> {
    this.inputs.push(input);

    return {
      provider: this.providerName,
      providerMessageId: `recording_sms_${this.inputs.length}`
    };
  }
}

class RecordingAwsClient {
  readonly inputs: unknown[] = [];

  async send(command: { input?: unknown }) {
    this.inputs.push(command.input);

    return {
      MessageId: `aws_message_${this.inputs.length}`,
      $metadata: {}
    };
  }
}

class FakeAdExecutionReader {
  promotionRun: PromotionRunEntity = {
    promotionRunId: "run-1",
    projectId: "project-1",
    campaignId: "campaign-1",
    promotionId: "promotion-1",
    analysisId: "analysis-1",
    generationId: "generation-1",
    previousPromotionRunId: null,
    loopCount: 1,
    operatorInstruction: null,
    status: "approved",
    summaryJson: {},
    startedAt: null,
    endedAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z")
  };
  promotion: PromotionEntity = {
    promotionId: "promotion-1",
    projectId: "project-1",
    campaignId: "campaign-1",
    name: "Promotion",
    channel: "email",
    targetAudience: "existing_users",
    goalMetric: "promotion_click_rate",
    targetValue: "0.100000",
    goalBasis: "promotion_average",
    status: "approved",
    metadataJson: {},
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z")
  };
  adExperiment: AdExperimentEntity = {
    adExperimentId: "exp-1",
    projectId: "project-1",
    campaignId: "campaign-1",
    promotionId: "promotion-1",
    promotionRunId: "run-1",
    analysisId: "analysis-1",
    generationId: "generation-1",
    segmentId: "seg-1",
    segmentName: null,
    contentId: "content-1",
    contentOptionId: "option-1",
    channel: "email",
    loopCount: 1,
    status: "approved",
    goalMetric: "promotion_click_rate",
    goalTargetValue: "0.100000",
    goalBasis: "promotion_average",
    startedAt: null,
    endedAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z")
  };
  dispatchAssignments: ActiveAdServingAssignmentEntity[] = [assignment()];
  bannerAssignment: ActiveAdServingAssignmentEntity | null = null;
  redirectLink: RedirectLinkEntity | null = {
    redirectLinkId: "redirect-1",
    projectId: "project-1",
    campaignId: "campaign-1",
    promotionId: "promotion-1",
    promotionRunId: "run-1",
    adExperimentId: "exp-1",
    segmentId: "seg-1",
    userId: "user-1",
    contentId: "content-1",
    contentOptionId: "option-1",
    redirectToken: "redirect-1",
    destinationUrl: "https://loop-ad.example/landing",
    status: "active",
    metadataJson: {},
    expiresAt: null,
    clickedAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z")
  };

  async findPromotionRun() {
    return this.promotionRun;
  }

  async findPromotion() {
    return this.promotion;
  }

  async findAdExperiment() {
    return this.adExperiment;
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
    result?: unknown;
  }> = [];
  redirectLinks: Array<{
    redirectToken: string;
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
    result?: unknown;
  }) {
    this.finishes.push(input);
  }

  async insertRedirectLink(input: {
    redirectToken: string;
    adExperimentId: string;
    segmentId: string;
    contentId: string;
    contentOptionId: string;
  }) {
    this.redirectLinks.push(input);
    return input.redirectToken;
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
