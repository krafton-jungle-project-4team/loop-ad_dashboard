import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { Transactional } from "@nestjs-cls/transactional";
import type { DispatchJobSummary, PromotionRunDispatchResponse } from "@loopad/shared";
import { z, ZodError } from "zod";
import { env } from "../../../infra/env/env.js";
import { LogContextScope, dms, log } from "../../../infra/logger/index.js";
import { adExecutionErrors } from "../ad-execution-errors.js";
import {
  EmailSender,
  type DispatchSendResult,
  type EmailSendInput,
  SmsSender,
  type SmsSendInput
} from "../adapters/dispatch-sender.js";
import {
  AdExecutionDomain,
  type ActiveAdServingAssignmentEntity,
  type DispatchAttemptSnapshot,
  type DispatchChannel,
  type DispatchJobStatus,
  type PromotionRunEntity
} from "../domain/index.js";
import { AdExecutionReader, AdExecutionWriter, RecipientDirectory } from "../repository/index.js";
import { requirePromotionLandingUrl } from "./landing-url.guard.js";

const LOCAL_DASHBOARD_PUBLIC_BASE_URL = "http://localhost:8080";
const DEV_DASHBOARD_PUBLIC_BASE_URL = "https://dashboard.api.dev.loop-ad.org";
const requiredContentTextSchema = z.string().min(1);
const emailAddressSchema = z.string().trim().email();
const e164PhoneNumberSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{1,14}$/);
const emailContentSchema = z.object({
  subject: requiredContentTextSchema,
  preheader: z.string().nullable(),
  body: requiredContentTextSchema,
  cta: z.string().nullable()
});
const smsContentSchema = z.object({
  message: requiredContentTextSchema
});

interface DispatchContext {
  promotionRun: PromotionRunEntity;
  channel: DispatchChannel;
}

type DispatchFailureCode = "RECIPIENT_CONTACT_INVALID";

/** 프로모션 외부 발행 요청을 저장된 assignment 기반으로 처리합니다. */
@Injectable()
export class PromotionDispatchService {
  constructor(
    @Inject(AdExecutionReader)
    private readonly reader: AdExecutionReader,
    @Inject(AdExecutionWriter)
    private readonly writer: AdExecutionWriter,
    @Inject(RecipientDirectory)
    private readonly recipientDirectory: RecipientDirectory,
    @Inject(EmailSender)
    private readonly emailSender: EmailSender,
    @Inject(SmsSender)
    private readonly smsSender: SmsSender
  ) {}

  /** promotion_run_id 기준으로 Email/SMS 발송을 실행합니다. */
  @LogContextScope()
  async dispatchPromotionRun(promotionRunId: string): Promise<PromotionRunDispatchResponse> {
    const startedAt = Date.now();
    log.assignContext({ promotionRunId });
    log.info("started", { promotionRunId });

    const context = await this.requireDispatchContext(promotionRunId);
    log.assignContext({
      campaignId: context.promotionRun.campaignId,
      channel: context.channel,
      projectId: context.promotionRun.projectId,
      promotionId: context.promotionRun.promotionId,
      promotionRunId: context.promotionRun.promotionRunId
    });
    const assignments = await this.requireDispatchAssignments(context);
    const jobs = await this.dispatchAssignments(context, assignments);
    const response = AdExecutionDomain.toDispatchResponse(promotionRunId, context.channel, jobs);

    log.info("completed", { response, durationMs: dms(startedAt) });

    return response;
  }

  private async requireDispatchContext(promotionRunId: string): Promise<DispatchContext> {
    const promotionRun = await this.reader.findPromotionRun(promotionRunId);

    if (!promotionRun) {
      log.warn("promotion_run_not_found", { promotionRunId });
      throw adExecutionErrors.promotionRunNotFound(promotionRunId);
    }

    const promotion = await this.reader.findPromotion(promotionRun.promotionId);

    if (!promotion) {
      log.warn("promotion_not_found", { promotionRun });
      throw adExecutionErrors.inconsistentAssignment(
        `promotion_run_id '${promotionRun.promotionRunId}' references missing promotion_id '${promotionRun.promotionId}'.`
      );
    }

    const channel = promotion.channel;

    if (!AdExecutionDomain.isDispatchChannel(channel)) {
      log.warn("unsupported_dispatch_channel", { promotionRun, promotion });
      throw adExecutionErrors.unsupportedDispatchChannel(promotionRunId, channel);
    }

    log.info("dispatch_context_loaded", { promotionRun, promotion, channel });

    return {
      promotionRun,
      channel
    };
  }

  private async requireDispatchAssignments(
    context: DispatchContext
  ): Promise<ActiveAdServingAssignmentEntity[]> {
    const storedAssignments = await this.reader.listDispatchAssignments(
      context.promotionRun.promotionRunId
    );

    this.assertDispatchAssignments(context, storedAssignments);
    const assignments = await this.toDemoRecipientAssignments(context, storedAssignments);

    log.info("dispatch_assignments_loaded", { storedAssignments, assignments });

    return assignments;
  }

  private async toDemoRecipientAssignments(
    context: DispatchContext,
    assignments: readonly ActiveAdServingAssignmentEntity[]
  ): Promise<ActiveAdServingAssignmentEntity[]> {
    const recipients = await this.recipientDirectory.listRecipients();

    if (recipients.length === 0) {
      log.warn("demo_recipients_empty", { context, assignments });
      throw adExecutionErrors.inconsistentAssignment(
        `promotion_run_id '${context.promotionRun.promotionRunId}' has no configured demo dispatch recipients.`
      );
    }

    const mappedAssignments = assignmentsForDemoRecipients(
      assignments,
      recipients.map((recipient) => recipient.userId)
    );

    log.info("demo_recipient_assignments_mapped", { assignments, recipients, mappedAssignments });

    return mappedAssignments;
  }

  private async dispatchAssignments(
    context: DispatchContext,
    assignments: readonly ActiveAdServingAssignmentEntity[]
  ): Promise<DispatchJobSummary[]> {
    const jobs: DispatchJobSummary[] = [];
    const groups = AdExecutionDomain.groupAssignmentsByAdExperiment(assignments);

    log.info("dispatch_groups_prepared", { groups });

    for (const group of groups) {
      jobs.push(await this.dispatchAdExperimentGroup(context, group));
    }

    return jobs;
  }

  private async dispatchAdExperimentGroup(
    context: DispatchContext,
    assignments: readonly ActiveAdServingAssignmentEntity[]
  ): Promise<DispatchJobSummary> {
    log.info("dispatch_group_started", { assignments });

    const dispatchJobId = await this.createDispatchJob(context, assignments);
    const attempts = await this.dispatchGroup(context.channel, assignments);
    const summary = AdExecutionDomain.toDispatchJobSummary(
      dispatchJobId,
      context.channel,
      assignments,
      attempts
    );

    await this.finishDispatchJob(dispatchJobId, summary, attempts);
    log.info("dispatch_group_completed", { summary });

    return summary;
  }

  @Transactional()
  private async finishDispatchJob(
    dispatchJobId: string,
    summary: DispatchJobSummary,
    attempts: readonly DispatchAttemptSnapshot[]
  ) {
    log.info("dispatch_job_finished", { dispatchJobId, summary, attempts });

    await this.writer.finishDispatchJob({
      dispatchJobId,
      status: toStoredDispatchJobStatus(summary.status),
      dispatchedCount: summary.dispatched_count,
      failedCount: summary.failed_count,
      result: {
        status: summary.status,
        attempts
      }
    });
  }

  @Transactional()
  private async createDispatchJob(
    context: DispatchContext,
    assignments: readonly ActiveAdServingAssignmentEntity[]
  ) {
    const first = requireFirstAssignment(assignments);
    const input = {
      dispatchJobId: randomUUID(),
      projectId: context.promotionRun.projectId,
      campaignId: context.promotionRun.campaignId,
      promotionId: context.promotionRun.promotionId,
      promotionRunId: context.promotionRun.promotionRunId,
      adExperimentId: first.adExperimentId,
      channel: context.channel,
      provider: this.providerNameFor(context.channel, context.promotionRun.promotionRunId),
      targetCount: assignments.length,
      request: {
        segment_id: first.segmentId,
        content_id: first.contentId,
        content_option_id: first.contentOptionId
      }
    };

    log.info("dispatch_job_created", { input, assignments });

    return this.writer.insertDispatchJob(input);
  }

  private async dispatchGroup(
    channel: DispatchChannel,
    assignments: readonly ActiveAdServingAssignmentEntity[]
  ): Promise<DispatchAttemptSnapshot[]> {
    const attempts: DispatchAttemptSnapshot[] = [];
    log.info("dispatch_group_dispatching", { channel, assignments });

    for (const assignment of assignments) {
      attempts.push(await this.dispatchAssignment(channel, assignment));
    }

    return attempts;
  }

  private async dispatchAssignment(
    channel: DispatchChannel,
    assignment: ActiveAdServingAssignmentEntity
  ): Promise<DispatchAttemptSnapshot> {
    // TODO: channel별 발송 실행은 EmailDispatchService/SmsDispatchService로 분리한다.
    const provider = this.providerNameFor(channel, assignment.promotionRunId);
    let redirectId: string | undefined;
    log.info("assignment_started", { channel, assignment, provider });

    try {
      const contact = await this.resolveRecipientContact(channel, assignment);

      if (!contact) {
        const attempt = toSkippedAttempt(assignment.userId);
        const reason = "DEMO_RECIPIENT_NOT_MAPPED";

        log.info("assignment_skipped", { assignment, attempt, reason });

        return attempt;
      }

      redirectId = await this.createRedirectLink(assignment);
      const targetUrl = redirectUrl(redirectId);
      const sendResult = await this.sendToResolvedContact(channel, assignment, targetUrl, contact);
      const attempt = toSentAttempt(assignment.userId, redirectId, sendResult);

      log.info("assignment_sent", { assignment, contact, targetUrl, sendResult, attempt });

      return attempt;
    } catch (error) {
      const attempt = toFailedAttempt(assignment.userId, getDispatchErrorCode(error), redirectId);

      log.warn("assignment_failed", { assignment, attempt, err: error });

      return attempt;
    }
  }

  private async resolveRecipientContact(
    channel: DispatchChannel,
    assignment: ActiveAdServingAssignmentEntity
  ): Promise<string | null> {
    const recipient = await this.recipientDirectory.findRecipient(assignment.userId);

    if (!recipient) {
      log.info("recipient_not_found", { channel, assignment, recipient });
      return null;
    }

    log.info("recipient_resolved", { channel, assignment, recipient });

    switch (channel) {
      case "email":
        return requireValidEmailContact(recipient.email);
      case "sms":
        return requireValidSmsContact(recipient.phoneNumber);
      default:
        return throwUnsupportedDispatchChannel(assignment.promotionRunId, channel);
    }
  }

  private async sendToResolvedContact(
    channel: DispatchChannel,
    assignment: ActiveAdServingAssignmentEntity,
    targetUrl: string,
    contact: string
  ): Promise<DispatchSendResult> {
    switch (channel) {
      case "email": {
        const input = toEmailSendInput(assignment, targetUrl, contact);
        log.info("send_input_prepared", { channel, assignment, input });
        return this.emailSender.sendEmail(input);
      }
      case "sms": {
        const input = toSmsSendInput(assignment, targetUrl, contact);
        log.info("send_input_prepared", { channel, assignment, input });
        return this.smsSender.sendSms(input);
      }
      default:
        return throwUnsupportedDispatchChannel(assignment.promotionRunId, channel);
    }
  }

  @Transactional()
  private async createRedirectLink(assignment: ActiveAdServingAssignmentEntity): Promise<string> {
    const redirectId = randomUUID();
    const destinationUrl = requirePromotionLandingUrl(assignment);
    const input = {
      redirectLinkId: redirectId,
      redirectToken: redirectId,
      projectId: assignment.projectId,
      campaignId: assignment.campaignId,
      promotionId: assignment.promotionId,
      promotionRunId: assignment.promotionRunId,
      adExperimentId: assignment.adExperimentId,
      segmentId: assignment.segmentId,
      userId: assignment.userId,
      contentId: assignment.contentId,
      contentOptionId: assignment.contentOptionId,
      destinationUrl,
      metadata: {},
      expiresAt: daysFromNow(7)
    };

    log.info("redirect_link_created", { assignment, input });

    return this.writer.insertRedirectLink(input);
  }

  private assertDispatchAssignments(
    context: DispatchContext,
    assignments: readonly ActiveAdServingAssignmentEntity[]
  ) {
    if (assignments.length === 0) {
      log.warn("dispatch_assignments_empty", { context });
      throw adExecutionErrors.activeAssignmentNotFound(context.promotionRun.promotionRunId);
    }

    const channelMismatch = assignments.find(
      (assignment) => assignment.channel !== context.channel
    );

    if (channelMismatch) {
      log.warn("dispatch_assignment_channel_mismatch", { context, channelMismatch, assignments });
      throw adExecutionErrors.inconsistentAssignment(
        `promotion_run_id '${context.promotionRun.promotionRunId}' has assignment channel '${channelMismatch.channel}' but promotion channel is '${context.channel}'.`
      );
    }

    const conflicts = AdExecutionDomain.findAssignmentConflicts(assignments);

    if (conflicts.length > 0) {
      log.warn("dispatch_assignment_conflict", { context, assignments, conflicts });
      throw adExecutionErrors.inconsistentAssignment(conflicts.join(" "));
    }

    log.info("dispatch_assignments_validated", { context, assignments });
  }

  private providerNameFor(channel: DispatchChannel, promotionRunId: string) {
    switch (channel) {
      case "email": {
        const provider = this.emailSender.providerName;
        log.info("provider_selected", { channel, promotionRunId, provider });
        return provider;
      }
      case "sms": {
        const provider = this.smsSender.providerName;
        log.info("provider_selected", { channel, promotionRunId, provider });
        return provider;
      }
      default:
        return throwUnsupportedDispatchChannel(promotionRunId, channel);
    }
  }
}

function toEmailSendInput(
  assignment: ActiveAdServingAssignmentEntity,
  targetUrl: string,
  recipient: string
): EmailSendInput {
  const content = emailContentSchema.parse(assignment);

  return {
    recipient,
    subject: content.subject,
    body: [content.preheader, content.body, ctaLine(content.cta, targetUrl)]
      .filter(Boolean)
      .join("\n\n"),
    redirectUrl: targetUrl
  };
}

function toSmsSendInput(
  assignment: ActiveAdServingAssignmentEntity,
  targetUrl: string,
  recipient: string
): SmsSendInput {
  const content = smsContentSchema.parse(assignment);

  return {
    recipient,
    body: [content.message, targetUrl].join(" "),
    redirectUrl: targetUrl
  };
}

function toSentAttempt(
  userId: string,
  redirectId: string,
  sendResult: DispatchSendResult
): DispatchAttemptSnapshot {
  return {
    userId,
    redirectId,
    status: "sent",
    providerMessageId: sendResult.providerMessageId
  };
}

function toSkippedAttempt(userId: string): DispatchAttemptSnapshot {
  return {
    userId,
    status: "sent"
  };
}

function toFailedAttempt(
  userId: string,
  errorCode: string,
  redirectId?: string
): DispatchAttemptSnapshot {
  return {
    userId,
    redirectId,
    status: "failed",
    errorCode
  };
}

function toStoredDispatchJobStatus(
  status: DispatchJobStatus
): Extract<DispatchJobStatus, "completed" | "failed"> {
  return status === "completed" ? "completed" : "failed";
}

function ctaLine(cta: string | null, targetUrl: string) {
  return cta ? `${cta}: ${targetUrl}` : targetUrl;
}

function redirectUrl(redirectId: string) {
  return `${dashboardPublicBaseUrl()}/r/${encodeURIComponent(redirectId)}`;
}

function dashboardPublicBaseUrl() {
  return env.env === "dev" ? DEV_DASHBOARD_PUBLIC_BASE_URL : LOCAL_DASHBOARD_PUBLIC_BASE_URL;
}

function daysFromNow(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function getDispatchErrorCode(error: unknown) {
  if (error instanceof DispatchFailureError) {
    return error.code;
  }

  return error instanceof ZodError ? "CONTENT_INVALID" : "PROVIDER_SEND_FAILED";
}

function requireFirstAssignment(assignments: readonly ActiveAdServingAssignmentEntity[]) {
  const first = assignments[0];

  if (!first) {
    throw new Error("Dispatch job requires at least one assignment.");
  }

  return first;
}

function assignmentsForDemoRecipients(
  assignments: readonly ActiveAdServingAssignmentEntity[],
  recipientUserIds: readonly string[]
): ActiveAdServingAssignmentEntity[] {
  const fallbackAssignment = requireFirstAssignment(assignments);
  const assignmentsByUserId = new Map<string, ActiveAdServingAssignmentEntity>();

  for (const assignment of assignments) {
    if (!assignmentsByUserId.has(assignment.userId)) {
      assignmentsByUserId.set(assignment.userId, assignment);
    }
  }

  return recipientUserIds.map((userId) => ({
    ...(assignmentsByUserId.get(userId) ?? fallbackAssignment),
    userId
  }));
}

function throwUnsupportedDispatchChannel(promotionRunId: string, channel: never): never {
  throw adExecutionErrors.unsupportedDispatchChannel(promotionRunId, String(channel));
}

function requireValidEmailContact(value: string): string {
  const result = emailAddressSchema.safeParse(value);

  if (!result.success) {
    return throwDispatchFailure("RECIPIENT_CONTACT_INVALID");
  }

  return result.data;
}

function requireValidSmsContact(value: string): string {
  const result = e164PhoneNumberSchema.safeParse(value);

  if (!result.success) {
    return throwDispatchFailure("RECIPIENT_CONTACT_INVALID");
  }

  return result.data;
}

function throwDispatchFailure(code: DispatchFailureCode): never {
  throw new DispatchFailureError(code);
}

class DispatchFailureError extends Error {
  override readonly name = "DispatchFailureError";

  constructor(readonly code: DispatchFailureCode) {
    super(code);
  }
}
