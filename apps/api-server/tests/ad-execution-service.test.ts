import assert from "node:assert/strict";
import { test } from "node:test";
import { TransactionHost } from "@nestjs-cls/transactional";
import { AppError } from "../src/app-errors.js";
import type {
  ActiveAdServingAssignmentEntity,
  AdExperimentEntity,
  PromotionEntity,
  PromotionRunEntity,
  RedirectLinkEntity,
  StoredDispatchJobEntity
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
process.env.LOOPAD_DECISION_API_BASE_URL ??= "http://localhost:8081";
process.env.LOOPAD_INTERNAL_API_KEY ??= "test-internal-key";
process.env.LOOPAD_OPENAI_API_KEY ??= "test-openai-api-key";
process.env.LOOPAD_DEMO_DISPATCH_RECIPIENTS ??= JSON.stringify([
  {
    userId: "user-1",
    email: "demo-recipient-1@loop-ad.org",
    phoneNumber: "+821012345001"
  },
  {
    userId: "user-2",
    email: "demo-recipient-2@loop-ad.org",
    phoneNumber: "+821012345002"
  }
]);

const { BannerResolveService } =
  await import("../src/features/ad-execution/service/banner-resolve.service.js");
const { PromotionDispatchService } =
  await import("../src/features/ad-execution/service/promotion-dispatch.service.js");
const { RedirectService } =
  await import("../src/features/ad-execution/service/redirect.service.js");
const { OpenPixelController } =
  await import("../src/features/ad-execution/controller/open-pixel.controller.js");
const { AwsEndUserMessagingSmsSender, AwsSesEmailSender } =
  await import("../src/features/ad-execution/adapters/dispatch-sender.js");
const {
  AD_DISPATCH_AWS_REGION,
  AD_DISPATCH_EMAIL_FROM_ADDRESS,
  createEmailSender,
  createSmsSender
} = await import("../src/features/ad-execution/ad-execution.module.js");
const { EnvDemoRecipientDirectory } =
  await import("../src/features/ad-execution/repository/index.js");
const { renderRedirectPage } =
  await import("../src/features/ad-execution/adapters/redirect-page-renderer.js");
const { log } = await import("../src/infra/logger/index.js");

test("dispatch uses stored assignments and records sender success", async () => {
  const reader = new FakeAdExecutionReader();
  const writer = new FakeAdExecutionWriter();
  const transactionHost = installCountingTransactionHost();
  const emailSender = new RecordingEmailSender();
  const recipientDirectory = new FakeRecipientDirectory(true, [
    recipient("user-ok"),
    recipient("user-also-ok")
  ]);
  const service = createDispatchService(
    reader,
    writer,
    emailSender,
    new RecordingSmsSender(),
    recipientDirectory
  );

  reader.dispatchAssignments = [
    assignment({ userId: "user-ok" }),
    assignment({ userId: "user-also-ok" })
  ];

  const { result: response, logs } = await captureDispatchLogs(async () => {
    const result = await service.dispatchPromotionRun("run-1");
    log.info("after_dispatch_scope");
    return result;
  });

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
  assert.deepEqual(transactionHost.calls, [
    "transactional",
    "transactional",
    "transactional",
    "transactional"
  ]);
  assert.equal(
    logs.filter(
      (entry) =>
        entry.operation === "PromotionDispatchService.dispatchPromotionRun" &&
        entry.event === "started"
    ).length,
    1
  );
  assert.equal(logs.filter((entry) => entry.event === "dispatch_assignments_loaded").length, 1);
  assert.deepEqual(reader.dispatchAssignmentQueries, [
    {
      promotionRunId: "run-1",
      recipientUserIds: ["user-ok", "user-also-ok"]
    }
  ]);
  assert.equal(logs.filter((entry) => entry.event === "dispatch_job_finished").length, 1);
  assert.equal(logs.filter((entry) => entry.event === "assignment_sent").length, 2);
  assert.equal(
    logs.filter(
      (entry) =>
        entry.operation === "PromotionDispatchService.dispatchPromotionRun" &&
        entry.event === "completed"
    ).length,
    1
  );
  assert.equal(logs.find((entry) => entry.event === "after_dispatch_scope")?.operation, undefined);
  assert.equal(
    logs.find((entry) => entry.event === "after_dispatch_scope")?.promotionRunId,
    undefined
  );
  assert.equal(JSON.stringify(logs).includes('"redirectToken"'), false);
  assert.equal(emailSender.inputs.length, 2);
  assert.equal(emailSender.inputs[0]?.htmlBody.includes("{{redirect_url}}"), false);
  assert.equal(emailSender.inputs[0]?.htmlBody.includes("{{open_pixel_url}}"), false);
  assert.equal(emailSender.inputs[0]?.htmlBody.includes("/p/open/"), true);
  assert.deepEqual(
    logs
      .filter((entry) => entry.event === "assignment_sent")
      .map((entry) => (entry.attempt as { status?: string }).status)
      .sort(),
    ["sent", "sent"]
  );
  assert.equal(
    logs.some((entry) => JSON.stringify(entry).includes("@example.test")),
    true
  );
  assert.equal(
    logs.some((entry) => JSON.stringify(entry).includes("+1555")),
    true
  );
});

test("email offer cards create and replace one redirect per link target", async () => {
  const reader = new FakeAdExecutionReader();
  const writer = new FakeAdExecutionWriter();
  const emailSender = new RecordingEmailSender();
  reader.dispatchAssignments = [
    assignment({
      contentMetadataJson: {
        creative: {
          artifact: {
            creative_format: "email_html",
            artifact_status: "published",
            public_url: "https://gen-ai.asset.dev.loop-ad.org/generated/cards.html"
          },
          link_targets: [
            { placeholder: "{{redirect_url}}", target_type: "promotion" },
            {
              placeholder: "{{offer_redirect_url_1}}",
              target_type: "offer",
              offer_id: "jeju-ocean-breeze-006",
              destination_url: "https://shop.example/hotel/jeju-ocean-breeze-006"
            },
            {
              placeholder: "{{offer_redirect_url_2}}",
              target_type: "offer",
              offer_id: "jeju-aewol-sunset-007",
              destination_url: "https://shop.example/hotel/jeju-aewol-sunset-007"
            }
          ]
        }
      }
    })
  ];
  const artifactReader = new FakeHtmlArtifactReader(
    [
      '<a href="{{redirect_url}}">전체 보기</a>',
      '<a href="{{offer_redirect_url_1}}">첫 번째 숙소</a>',
      '<a href="{{offer_redirect_url_2}}">두 번째 숙소</a>',
      '<img src="{{open_pixel_url}}">'
    ].join("")
  );

  const response = await createDispatchService(
    reader,
    writer,
    emailSender,
    new RecordingSmsSender(),
    new FakeRecipientDirectory(),
    artifactReader
  ).dispatchPromotionRun("run-1");

  assert.equal(response.dispatched_count, 1);
  assert.deepEqual(
    writer.redirectLinks.map((link) => link.destinationUrl),
    [
      "https://loop-ad.example/landing",
      "https://shop.example/hotel/jeju-ocean-breeze-006",
      "https://shop.example/hotel/jeju-aewol-sunset-007"
    ]
  );
  const htmlBody = emailSender.inputs[0]?.htmlBody ?? "";
  assert.equal(htmlBody.includes("{{redirect_url}}"), false);
  assert.equal(htmlBody.includes("{{offer_redirect_url_"), false);
  assert.equal(new Set(htmlBody.match(/\/r\/[a-f0-9-]+/g)).size, 3);
});

test("email dispatch rejects duplicate and unresolved redirect placeholders", async () => {
  const duplicateReader = new FakeAdExecutionReader();
  const duplicateWriter = new FakeAdExecutionWriter();
  duplicateReader.dispatchAssignments = [
    assignment({
      contentMetadataJson: {
        creative: {
          artifact: {
            creative_format: "email_html",
            artifact_status: "published",
            public_url: "https://gen-ai.asset.dev.loop-ad.org/generated/duplicate.html"
          },
          link_targets: [
            { placeholder: "{{redirect_url}}", target_type: "promotion" },
            { placeholder: "{{redirect_url}}", target_type: "promotion" }
          ]
        }
      }
    })
  ];

  const duplicateResponse = await createDispatchService(
    duplicateReader,
    duplicateWriter
  ).dispatchPromotionRun("run-1");

  assert.equal(duplicateResponse.dispatched_count, 0);
  assert.deepEqual(dispatchAttemptErrorCodes(duplicateWriter), ["REDIRECT_TARGET_INVALID"]);
  assert.equal(duplicateWriter.redirectLinks.length, 0);

  const unresolvedReader = new FakeAdExecutionReader();
  const unresolvedWriter = new FakeAdExecutionWriter();
  unresolvedReader.dispatchAssignments = [assignment()];
  const unresolvedResponse = await createDispatchService(
    unresolvedReader,
    unresolvedWriter,
    new RecordingEmailSender(),
    new RecordingSmsSender(),
    new FakeRecipientDirectory(),
    new FakeHtmlArtifactReader(
      '<a href="{{redirect_url}}">전체</a><a href="{{offer_redirect_url_1}}">숙소</a>'
    )
  ).dispatchPromotionRun("run-1");

  assert.equal(unresolvedResponse.dispatched_count, 0);
  assert.deepEqual(dispatchAttemptErrorCodes(unresolvedWriter), ["REDIRECT_TARGET_INVALID"]);
});

test("completed dispatch job is returned without sending again", async () => {
  const reader = new FakeAdExecutionReader();
  const writer = new FakeAdExecutionWriter();
  const emailSender = new RecordingEmailSender();
  const service = createDispatchService(reader, writer, emailSender);

  const first = await captureDispatchLogs(() => service.dispatchPromotionRun("run-1"));
  const completedJob = first.result.jobs[0]!;
  reader.dispatchJob = storedDispatchJob({
    dispatchJobId: completedJob.dispatch_job_id,
    status: "completed",
    targetCount: completedJob.target_count,
    sentCount: completedJob.dispatched_count,
    failedCount: completedJob.failed_count,
    metadataJson: { result: writer.finishes[0]!.result }
  });

  const second = await captureDispatchLogs(() => service.dispatchPromotionRun("run-1"));

  assert.equal(second.result.jobs[0]?.dispatch_job_id, completedJob.dispatch_job_id);
  assert.equal(emailSender.inputs.length, 1);
  assert.equal(writer.dispatchJobs.length, 1);
  assert.equal(writer.finishes.length, 1);
});

test("failed dispatch retries only failed recipients with the same job id", async () => {
  const reader = new FakeAdExecutionReader();
  const writer = new FakeAdExecutionWriter();
  const emailSender = new RecordingEmailSender();
  reader.dispatchAssignments = [assignment({ userId: "user-1" }), assignment({ userId: "user-2" })];
  reader.dispatchJob = storedDispatchJob({
    dispatchJobId: "dispatch_629053cbd09473465f4bc1a2d18f02fd8ee0d2904f697c596c49fd461ef7a65a",
    status: "failed",
    targetCount: 2,
    sentCount: 1,
    failedCount: 1,
    metadataJson: {
      result: {
        status: "partial_failed",
        attempts: [
          { userId: "user-1", status: "sent", providerMessageId: "message-1" },
          { userId: "user-2", status: "failed", errorCode: "SEND_FAILED" }
        ]
      }
    }
  });

  const response = await captureDispatchLogs(() =>
    createDispatchService(
      reader,
      writer,
      emailSender,
      new RecordingSmsSender(),
      new FakeRecipientDirectory(true, [recipient("user-1"), recipient("user-2")])
    ).dispatchPromotionRun("run-1")
  );

  assert.equal(response.result.jobs[0]?.dispatch_job_id, reader.dispatchJob.dispatchJobId);
  assert.equal(response.result.dispatched_count, 2);
  assert.equal(response.result.failed_count, 0);
  assert.equal(emailSender.inputs.length, 1);
  assert.equal(emailSender.inputs[0]?.recipient, "user-2@example.test");
  assert.deepEqual(writer.restartedDispatchJobIds, [reader.dispatchJob.dispatchJobId]);
});

test("dispatch module always creates AWS senders from fixed code config", () => {
  assert.equal(createEmailSender() instanceof AwsSesEmailSender, true);
  assert.equal(createSmsSender() instanceof AwsEndUserMessagingSmsSender, true);
  assert.equal(AD_DISPATCH_AWS_REGION, "ap-northeast-2");
  assert.equal(AD_DISPATCH_EMAIL_FROM_ADDRESS, "noreply@loop-ad.org");
});

test("env demo recipient directory maps user_id to configured contacts", async () => {
  const directory = new EnvDemoRecipientDirectory();

  const recipient = await directory.findRecipient("user-1");
  const recipients = await directory.listRecipients();

  assert.equal(recipient?.userId, "user-1");
  assert.equal(recipient?.email, "demo-recipient-1@loop-ad.org");
  assert.equal(recipient?.phoneNumber, "+821012345001");
  assert.deepEqual(
    recipients.map((item) => item.userId),
    ["user-1", "user-2"]
  );
  assert.equal(await directory.findRecipient("missing-user"), null);
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

test("dispatch sends once to each configured demo recipient", async () => {
  const reader = new FakeAdExecutionReader();
  const writer = new FakeAdExecutionWriter();
  const recipientDirectory = new FakeRecipientDirectory(true, [
    recipient("user-1", { email: "demo-1@example.test" }),
    recipient("user-2", { email: "demo-2@example.test" }),
    recipient("user-3", { email: "demo-3@example.test" })
  ]);
  const emailSender = new RecordingEmailSender();

  reader.dispatchAssignments = [
    assignment({ userId: "raw-assignment-user", segmentId: "fallback-segment" }),
    assignment({ userId: "user-2", segmentId: "matched-segment" }),
    assignment({ userId: "unrelated-user", segmentId: "unrelated-segment" })
  ];

  const { result: response, logs } = await captureDispatchLogs(() =>
    createDispatchService(
      reader,
      writer,
      emailSender,
      new RecordingSmsSender(),
      recipientDirectory
    ).dispatchPromotionRun("run-1")
  );

  assert.equal(response.target_count, 3);
  assert.equal(response.dispatched_count, 3);
  assert.equal(response.failed_count, 0);
  assert.equal(response.jobs[0]?.status, "completed");
  assert.deepEqual(
    response.jobs.flatMap((job) => job.attempts.map((attempt) => attempt.user_id)).sort(),
    ["user-1", "user-2", "user-3"]
  );
  assert.deepEqual(dispatchAttemptErrorCodes(writer), []);
  assert.equal(emailSender.inputs.length, 3);
  assert.deepEqual(
    emailSender.inputs.map((input) => input.recipient),
    ["demo-1@example.test", "demo-2@example.test", "demo-3@example.test"]
  );
  assert.equal(writer.redirectLinks.length, 3);
  assert.deepEqual(reader.dispatchAssignmentQueries, [
    {
      promotionRunId: "run-1",
      recipientUserIds: ["user-1", "user-2", "user-3"]
    }
  ]);
  assert.deepEqual(
    writer.redirectLinks.map((link) => link.segmentId),
    ["fallback-segment", "matched-segment", "fallback-segment"]
  );
  const assignmentLoadedLog = logs.find((entry) => entry.event === "dispatch_assignments_loaded");
  const recipientMappedLog = logs.find(
    (entry) => entry.event === "demo_recipient_assignments_mapped"
  );
  assert.equal(assignmentLoadedLog?.storedAssignmentCount, 2);
  assert.equal(assignmentLoadedLog?.mappedAssignmentCount, 3);
  assert.equal("storedAssignments" in (assignmentLoadedLog ?? {}), false);
  assert.equal("assignments" in (assignmentLoadedLog ?? {}), false);
  assert.equal(recipientMappedLog?.exactMatchedRecipientCount, 1);
  assert.equal(recipientMappedLog?.fallbackMappedRecipientCount, 2);
  assert.equal("recipients" in (recipientMappedLog ?? {}), false);
  assert.equal("mappedAssignments" in (recipientMappedLog ?? {}), false);
  assert.equal(
    logs.some((entry) => entry.event === "assignment_skipped"),
    false
  );
});

test("dispatch validates sms phone contact before sending", async () => {
  const reader = new FakeAdExecutionReader();
  const writer = new FakeAdExecutionWriter();
  const recipientDirectory = new FakeRecipientDirectory(false);
  const smsSender = new RecordingSmsSender();

  reader.promotion = { ...reader.promotion, channel: "sms" };
  reader.dispatchAssignments = [assignment({ channel: "sms", userId: "sms-invalid" })];
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
  assert.equal(response.failed_count, 1);
  assert.deepEqual(
    response.jobs[0]?.attempts.map((attempt) => attempt.error_code),
    ["RECIPIENT_CONTACT_INVALID"]
  );
  assert.deepEqual(dispatchAttemptErrorCodes(writer), ["RECIPIENT_CONTACT_INVALID"]);
  assert.equal(smsSender.inputs.length, 0);
});

test("AWS senders build SES and SMS v2 command inputs from options", async () => {
  const emailClient = new RecordingAwsClient();
  const smsClient = new RecordingAwsClient();
  const emailSender = new AwsSesEmailSender({
    region: "ap-northeast-2",
    fromAddress: AD_DISPATCH_EMAIL_FROM_ADDRESS,
    configurationSetName: "ses-config",
    client: emailClient as ConstructorParameters<typeof AwsSesEmailSender>[0]["client"]
  });
  const smsSender = new AwsEndUserMessagingSmsSender({
    region: "ap-northeast-2",
    configurationSetName: "sms-config",
    originationIdentity: "sender-id",
    client: smsClient as ConstructorParameters<typeof AwsEndUserMessagingSmsSender>[0]["client"]
  });

  await captureDispatchLogs(async () => {
    await emailSender.sendEmail({
      recipient: "person@example.test",
      subject: "Subject",
      htmlBody: "<p>Body</p>",
      textBody: "Body",
      redirectUrl: "https://loop-ad.example/r/1",
      openPixelUrl: "https://loop-ad.example/p/open/1"
    });
    await smsSender.sendSms({
      recipient: "+15555550123",
      body: "Message https://loop-ad.example/r/1",
      redirectUrl: "https://loop-ad.example/r/1"
    });
  });

  assert.deepEqual(emailClient.inputs[0], {
    FromEmailAddress: AD_DISPATCH_EMAIL_FROM_ADDRESS,
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
          Html: {
            Data: "<p>Body</p>",
            Charset: "UTF-8"
          },
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
  installCountingTransactionHost();

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

test("dispatch fails pending and failed email artifacts without sending", async () => {
  const pendingReader = new FakeAdExecutionReader();
  const failedReader = new FakeAdExecutionReader();
  const pendingWriter = new FakeAdExecutionWriter();
  const failedWriter = new FakeAdExecutionWriter();
  const pendingEmailSender = new RecordingEmailSender();
  const failedEmailSender = new RecordingEmailSender();

  pendingReader.dispatchAssignments = [
    assignment({
      contentMetadataJson: {
        creative: {
          artifact: {
            creative_format: "email_html",
            artifact_status: "pending"
          }
        }
      }
    })
  ];
  failedReader.dispatchAssignments = [
    assignment({
      contentMetadataJson: {
        creative: {
          artifact: {
            creative_format: "email_html",
            artifact_status: "failed",
            error_code: "s3_put_failed"
          }
        }
      }
    })
  ];

  const { result: pendingResponse } = await captureDispatchLogs(() =>
    createDispatchService(pendingReader, pendingWriter, pendingEmailSender).dispatchPromotionRun(
      "run-1"
    )
  );
  const { result: failedResponse } = await captureDispatchLogs(() =>
    createDispatchService(failedReader, failedWriter, failedEmailSender).dispatchPromotionRun(
      "run-1"
    )
  );

  assert.equal(pendingResponse.dispatched_count, 0);
  assert.equal(failedResponse.dispatched_count, 0);
  assert.deepEqual(dispatchAttemptErrorCodes(pendingWriter), ["ARTIFACT_NOT_READY"]);
  assert.deepEqual(dispatchAttemptErrorCodes(failedWriter), ["ARTIFACT_FAILED"]);
  assert.equal(pendingEmailSender.inputs.length, 0);
  assert.equal(failedEmailSender.inputs.length, 0);
});

test("dispatch rejects onsite banner promotion runs", async () => {
  const reader = new FakeAdExecutionReader();
  reader.promotion = { ...reader.promotion, channel: "onsite_banner" };

  const { logs } = await captureDispatchLogs(async () => {
    await assert.rejects(
      () => createDispatchService(reader).dispatchPromotionRun("run-1"),
      (error) =>
        error instanceof AppError &&
        error.statusCode === 409 &&
        error.code === "UNSUPPORTED_DISPATCH_CHANNEL"
    );
  });
  const failed = logs.find((entry) => entry.event === "failed");

  assert.equal(failed?.operation, "PromotionDispatchService.dispatchPromotionRun");
  assert.equal(failed?.promotionRunId, "run-1");
  assert.equal(typeof failed?.durationMs, "number");
});

test("dispatch rejects unknown promotion channels before sender selection", async () => {
  const reader = new FakeAdExecutionReader();
  reader.promotion = {
    ...reader.promotion,
    channel: "push" as unknown as typeof reader.promotion.channel
  };

  await assert.rejects(
    () => captureDispatchLogs(() => createDispatchService(reader).dispatchPromotionRun("run-1")),
    (error) =>
      error instanceof AppError &&
      error.statusCode === 409 &&
      error.code === "UNSUPPORTED_DISPATCH_CHANNEL"
  );
});

test("banner resolve returns the precomputed segment content", async () => {
  const reader = new FakeAdExecutionReader();
  reader.bannerAssignment = assignment({
    title: "Approved title",
    body: "Approved body",
    cta: "Book now",
    landingUrl: "https://loop-ad.example/landing",
    channel: "onsite_banner"
  });

  const { result: response } = await captureDispatchLogs(() =>
    createBannerService(reader).resolveBanner({
      project_id: "project-1",
      promotion_run_id: "run-1",
      user_id: "user-1",
      placement_id: "hero"
    })
  );

  assert.deepEqual(response, {
    status: "filled",
    placement_id: "hero",
    creative: {
      creative_id: "content-1",
      creative_format: "banner_html",
      html_url: "https://gen-ai.asset.dev.loop-ad.org/generated/content-1.banner_html.html",
      width: 320,
      height: 100,
      click_url:
        "https://loop-ad.example/landing?loopad_project_id=project-1&loopad_campaign_id=campaign-1&loopad_promotion_id=promotion-1&loopad_promotion_run_id=run-1&loopad_ad_experiment_id=exp-1&loopad_segment_id=seg-1&loopad_content_id=content-1&loopad_content_option_id=option-1&loopad_creative_id=content-1&loopad_channel=onsite_banner&loopad_placement_id=hero",
      target_url: "https://loop-ad.example/landing",
      sandbox: {
        allow_scripts: true,
        allow_same_origin: false,
        allow_popups: false
      }
    },
    attribution: {
      project_id: "project-1",
      campaign_id: "campaign-1",
      promotion_id: "promotion-1",
      promotion_run_id: "run-1",
      ad_experiment_id: "exp-1",
      segment_id: "seg-1",
      content_id: "content-1",
      content_option_id: "option-1",
      creative_id: "content-1",
      promotion_channel: "onsite_banner",
      target_url: "https://loop-ad.example/landing",
      placement_id: "hero"
    }
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
      captureDispatchLogs(() =>
        createBannerService(reader).resolveBanner({
          project_id: "project-1",
          promotion_run_id: "run-1",
          user_id: "user-1",
          placement_id: "hero"
        })
      ),
    (error) =>
      error instanceof AppError &&
      error.statusCode === 409 &&
      error.code === "UNSUPPORTED_BANNER_CHANNEL"
  );
});

test("banner resolve returns empty for missing, pending, and failed artifacts", async () => {
  const missingReader = new FakeAdExecutionReader();
  const pendingReader = new FakeAdExecutionReader();
  const failedReader = new FakeAdExecutionReader();
  const request = {
    project_id: "project-1",
    promotion_run_id: "run-1",
    user_id: "user-1",
    placement_id: "hero"
  };

  pendingReader.bannerAssignment = assignment({
    channel: "onsite_banner",
    contentMetadataJson: {
      creative: {
        artifact: {
          creative_format: "banner_html",
          artifact_status: "pending"
        }
      }
    }
  });
  failedReader.bannerAssignment = assignment({
    channel: "onsite_banner",
    contentMetadataJson: {
      creative: {
        artifact: {
          creative_format: "banner_html",
          artifact_status: "failed",
          error_code: "s3_put_failed"
        }
      }
    }
  });

  assert.deepEqual(await createBannerService(missingReader).resolveBanner(request), {
    status: "empty",
    placement_id: "hero",
    reason: "assignment_not_found"
  });
  assert.deepEqual(await createBannerService(pendingReader).resolveBanner(request), {
    status: "empty",
    placement_id: "hero",
    reason: "artifact_not_ready"
  });
  assert.deepEqual(await createBannerService(failedReader).resolveBanner(request), {
    status: "empty",
    placement_id: "hero",
    reason: "artifact_failed"
  });
});

test("redirect returns an SDK handoff page with ad_experiment_id context", async () => {
  const reader = new FakeAdExecutionReader();
  const service = createRedirectService(reader);

  const { result: page, logs } = await captureDispatchLogs(() =>
    service.resolveRedirectPage("redirect-1")
  );
  const html = renderRedirectPage(page);
  const targetUrl = new URL(page.targetUrl);

  assert.equal(targetUrl.origin + targetUrl.pathname, "https://loop-ad.example/landing");
  assert.equal(targetUrl.searchParams.get("loopad_project_id"), "project-1");
  assert.equal(targetUrl.searchParams.get("loopad_campaign_id"), "campaign-1");
  assert.equal(targetUrl.searchParams.get("loopad_promotion_id"), "promotion-1");
  assert.equal(targetUrl.searchParams.get("loopad_promotion_run_id"), "run-1");
  assert.equal(targetUrl.searchParams.get("loopad_ad_experiment_id"), "exp-1");
  assert.equal(targetUrl.searchParams.get("loopad_segment_id"), "seg-1");
  assert.equal(targetUrl.searchParams.get("loopad_content_id"), "content-1");
  assert.equal(targetUrl.searchParams.get("loopad_content_option_id"), "option-1");
  assert.equal(targetUrl.searchParams.get("loopad_creative_id"), "content-1");
  assert.equal(targetUrl.searchParams.get("loopad_channel"), "email");
  assert.equal(targetUrl.searchParams.get("loopad_redirect_id"), "redirect-1");
  assert.equal(page.event.name, "리다이렉트_클릭");
  assert.equal(page.event.projectId, "project-1");
  assert.equal(page.event.identity.userId, "user-1");
  assert.equal(page.event.identity.sessionId, "redirect:redirect-1");
  assert.equal(page.event.fields.ad_experiment_id, "exp-1");
  assert.equal(page.event.fields.redirect_id, "redirect-1");
  assert.equal(page.event.fields.content_option_id, "option-1");
  assert.equal(page.event.fields.creative_id, "content-1");
  assert.equal(page.event.fields.target_url, "https://loop-ad.example/landing");
  assert.equal(
    page.eventSdk.url,
    "https://krafton-jungle-project-4team.github.io/loop-ad_event_sdk/loop-ad-event-sdk.iife.js"
  );
  assert.equal(
    page.eventSdk.connectionUrl,
    "https://dashboard.api.dev.loop-ad.org/api/public/v1/sdk/connections/sdk-key-1"
  );
  assert.match(html, /await window\.LoopAdEventSDK\.init/);
  assert.match(html, /connectionUrl:\s*redirect\.eventSdk\.connectionUrl/);
  assert.match(html, /리다이렉트_클릭/);
  assert.match(html, /sdk\.track\(redirect\.event\.name/);
  assert.match(html, /\.\.\.redirect\.event\.fields/);
  assert.match(html, /device:\s*detectDevice\(\)/);
  assert.match(html, /window\.location\.replace/);
  assert.equal(JSON.stringify(logs).includes('"sdkKey"'), false);
  assert.equal(JSON.stringify(logs).includes('"redirectToken"'), false);
  assert.equal(JSON.stringify(logs).includes("sdk-key-1"), false);
});

test("open pixel endpoint returns an uncacheable transparent image", async () => {
  const controller = new OpenPixelController();
  const response = new RecordingImageResponse();
  const openPixelId = Buffer.from(
    JSON.stringify({
      recipient_user_id: "사용자-1",
      attribution: {
        event_name: "이메일_열람"
      }
    })
  ).toString("base64url");

  await controller.openPixel({ openPixelId }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers.get("Content-Type"), "image/gif");
  assert.equal(
    response.headers.get("Cache-Control"),
    "no-store, no-cache, must-revalidate, max-age=0"
  );
  assert.equal(response.headers.get("Pragma"), "no-cache");
  assert.equal(Buffer.isBuffer(response.body), true);
  assert.equal(response.body?.length, 43);
});

test("redirect page escapes script data and fallback href with stable libraries", () => {
  const html = renderRedirectPage({
    targetUrl: 'https://loop-ad.example/landing?next=</script><img src=x>&quote="',
    eventSdk: {
      url: "https://sdk.example/loop-ad-event-sdk.iife.js",
      connectionUrl: "https://dashboard.example/connections/sdk-key"
    },
    event: {
      name: "리다이렉트_클릭",
      projectId: "project-1",
      identity: {
        userId: "user-1",
        sessionId: "redirect:redirect-1"
      },
      fields: {
        campaign_id: "campaign-1",
        project_id: "project-1",
        promotion_id: "promotion-1",
        promotion_run_id: "run-1",
        ad_experiment_id: "exp-1",
        segment_id: "seg-1",
        content_id: "content-1",
        content_option_id: "option-1",
        creative_id: "content-1",
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
  recipientDirectory = new FakeRecipientDirectory(),
  artifactReader = new FakeHtmlArtifactReader()
) {
  return new PromotionDispatchService(
    reader as ConstructorParameters<typeof PromotionDispatchService>[0],
    writer as ConstructorParameters<typeof PromotionDispatchService>[1],
    recipientDirectory as ConstructorParameters<typeof PromotionDispatchService>[2],
    emailSender as ConstructorParameters<typeof PromotionDispatchService>[3],
    smsSender as ConstructorParameters<typeof PromotionDispatchService>[4],
    artifactReader as ConstructorParameters<typeof PromotionDispatchService>[5]
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
  const base = {
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
    contentMetadataJson: {},
    contentStatus: "approved",
    adExperimentStatus: "approved",
    ...overrides
  };
  return {
    ...base,
    contentMetadataJson: overrides.contentMetadataJson ?? contentMetadataForChannel(base.channel)
  };
}

function contentMetadataForChannel(channel: ActiveAdServingAssignmentEntity["channel"]) {
  if (channel === "email") {
    return {
      creative: {
        artifact: {
          creative_format: "email_html",
          artifact_status: "published",
          public_url: "https://gen-ai.asset.dev.loop-ad.org/generated/content-1.email_html.html",
          content_type: "text/html; charset=utf-8"
        }
      }
    };
  }
  if (channel === "onsite_banner") {
    return {
      creative: {
        artifact: {
          creative_format: "banner_html",
          artifact_status: "published",
          public_url: "https://gen-ai.asset.dev.loop-ad.org/generated/content-1.banner_html.html",
          width: 320,
          height: 100,
          content_type: "text/html; charset=utf-8"
        }
      }
    };
  }
  return {
    creative: {
      artifact: {
        creative_format: "sms_text",
        artifact_status: "not_required"
      }
    }
  };
}

function recipient(userId: string, overrides: Partial<DispatchRecipient> = {}): DispatchRecipient {
  return {
    userId,
    email: `${userId}@example.test`,
    phoneNumber: "+15555550123",
    ...overrides
  };
}

function storedDispatchJob(
  overrides: Partial<StoredDispatchJobEntity> = {}
): StoredDispatchJobEntity {
  return {
    dispatchJobId: "dispatch-existing",
    promotionRunId: "run-1",
    adExperimentId: "exp-1",
    channel: "email",
    status: "completed",
    targetCount: 1,
    sentCount: 1,
    failedCount: 0,
    metadataJson: {
      result: {
        status: "completed",
        attempts: [{ userId: "user-1", status: "sent" }]
      }
    },
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

  constructor(
    private readonly useDefaultRecipient = true,
    configuredRecipients: readonly DispatchRecipient[] = []
  ) {
    for (const configuredRecipient of configuredRecipients) {
      this.recipients.set(configuredRecipient.userId, configuredRecipient);
    }
  }

  async listRecipients(): Promise<readonly DispatchRecipient[]> {
    if (this.recipients.size > 0) {
      return [...this.recipients.values()];
    }

    return this.useDefaultRecipient ? [recipient("user-1")] : [];
  }

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

class FakeHtmlArtifactReader {
  constructor(
    private readonly html = [
      "<html>",
      '<body><a href="{{redirect_url}}">Open</a>',
      '<img src="{{open_pixel_url}}" width="1" height="1" alt=""></body>',
      "</html>"
    ].join("")
  ) {}

  async readHtml() {
    return this.html;
  }
}

class RecordingImageResponse {
  statusCode = 0;
  readonly headers = new Map<string, string>();
  body: Buffer | null = null;

  status(statusCode: number) {
    this.statusCode = statusCode;
    return this;
  }

  setHeader(name: string, value: string) {
    this.headers.set(name, value);
    return this;
  }

  send(body: Buffer) {
    this.body = body;
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
  dispatchAssignmentQueries: Array<{
    promotionRunId: string;
    recipientUserIds: readonly string[];
  }> = [];
  dispatchJob: StoredDispatchJobEntity | null = null;
  promotionRun: PromotionRunEntity = {
    promotionRunId: "run-1",
    projectId: "project-1",
    campaignId: "campaign-1",
    promotionId: "promotion-1",
    analysisId: "analysis-1",
    generationId: "generation-1",
    loopCount: 1,
    status: "approved",
    goalSnapshotJson: {},
    startedAt: null,
    endedAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z")
  };
  promotion: PromotionEntity = {
    promotionId: "promotion-1",
    projectId: "project-1",
    campaignId: "campaign-1",
    marketingTheme: "summer_sale",
    channel: "email",
    goalMetric: "promotion_click_rate",
    goalTargetValue: "0.100000",
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
    sdkKey: "sdk-key-1",
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

  async findDispatchJob() {
    return this.dispatchJob;
  }

  async listDispatchAssignments(promotionRunId: string, recipientUserIds: readonly string[]) {
    this.dispatchAssignmentQueries.push({ promotionRunId, recipientUserIds });
    const fallbackAssignment = this.dispatchAssignments[0];
    const recipientUserIdSet = new Set(recipientUserIds);

    return this.dispatchAssignments.filter(
      (assignment) => assignment === fallbackAssignment || recipientUserIdSet.has(assignment.userId)
    );
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
    destinationUrl: string;
  }> = [];
  restartedDispatchJobIds: string[] = [];

  async insertDispatchJob(input: { dispatchJobId: string }) {
    this.dispatchJobs.push(input);
    return input.dispatchJobId;
  }

  async restartDispatchJob(input: { dispatchJobId: string }) {
    this.restartedDispatchJobIds.push(input.dispatchJobId);
    return true;
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
    destinationUrl: string;
  }) {
    this.redirectLinks.push(input);
    return input.redirectToken;
  }
}

function installCountingTransactionHost() {
  const calls: string[] = [];

  new TransactionHost({
    connectionName: undefined,
    defaultTxOptions: {},
    enableTransactionProxy: false,
    extraProviderTokens: [],
    getFallbackInstance: () => ({}),
    wrapWithTransaction: async (_options: unknown, callback: () => Promise<unknown>) => {
      calls.push("transactional");
      return callback();
    }
  } as never);

  return { calls };
}

async function captureDispatchLogs<T>(callback: () => Promise<T>) {
  const logs: Array<Record<string, unknown>> = [];
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  console.log = (line?: unknown) => {
    pushJsonLog(logs, line);
  };
  console.warn = (line?: unknown) => {
    pushJsonLog(logs, line);
  };
  console.error = (line?: unknown) => {
    pushJsonLog(logs, line);
  };

  try {
    const result = await callback();
    return { result, logs };
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
  }
}

function pushJsonLog(logs: Array<Record<string, unknown>>, line: unknown) {
  if (typeof line !== "string") {
    return;
  }

  logs.push(JSON.parse(line) as Record<string, unknown>);
}
