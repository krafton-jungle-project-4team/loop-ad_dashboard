import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { InjectTransactionHost, TransactionHost } from "@nestjs-cls/transactional";
import type { DispatchJobSummary, PromotionRunDispatchResponse } from "@loopad/shared";
import { z, ZodError } from "zod";
import { PgTypedTransactionalAdapter } from "../../../infra/database/index.js";
import { env } from "../../../infra/env/env.js";
import { logWithContext } from "../../../infra/logger/index.js";
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
import { AdExecutionReader, AdExecutionWriter } from "../repository/index.js";

const LOCAL_DASHBOARD_PUBLIC_BASE_URL = "http://localhost:8080";
const DEV_DASHBOARD_PUBLIC_BASE_URL = "https://dashboard.api.dev.loop-ad.org";
const requiredContentTextSchema = z.string().min(1);
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

/** 프로모션 외부 발행 요청을 저장된 assignment 기반으로 처리합니다. */
@Injectable()
export class PromotionDispatchService {
  constructor(
    @Inject(AdExecutionReader)
    private readonly reader: AdExecutionReader,
    @Inject(AdExecutionWriter)
    private readonly writer: AdExecutionWriter,
    @InjectTransactionHost()
    private readonly transactionHost: TransactionHost<PgTypedTransactionalAdapter>,
    @Inject(EmailSender)
    private readonly emailSender: EmailSender,
    @Inject(SmsSender)
    private readonly smsSender: SmsSender
  ) {}

  /** promotion_run_id 기준으로 Email/SMS 발송을 실행합니다. */
  async dispatchPromotionRun(promotionRunId: string): Promise<PromotionRunDispatchResponse> {
    const context = await this.requireDispatchContext(promotionRunId);
    const assignments = await this.requireDispatchAssignments(context);
    const jobs = await this.dispatchAssignments(context, assignments);

    return AdExecutionDomain.toDispatchResponse(promotionRunId, context.channel, jobs);
  }

  private async requireDispatchContext(promotionRunId: string): Promise<DispatchContext> {
    const promotionRun = await this.reader.findPromotionRun(promotionRunId);

    if (!promotionRun) {
      throw adExecutionErrors.promotionRunNotFound(promotionRunId);
    }

    const promotion = await this.reader.findPromotion(promotionRun.promotionId);

    if (!promotion) {
      throw adExecutionErrors.inconsistentAssignment(
        `promotion_run_id '${promotionRun.promotionRunId}' references missing promotion_id '${promotionRun.promotionId}'.`
      );
    }

    const channel = promotion.channel;

    if (!AdExecutionDomain.isDispatchChannel(channel)) {
      throw adExecutionErrors.unsupportedDispatchChannel(promotionRunId, channel);
    }

    return {
      promotionRun,
      channel
    };
  }

  private async requireDispatchAssignments(
    context: DispatchContext
  ): Promise<ActiveAdServingAssignmentEntity[]> {
    const assignments = await this.reader.listDispatchAssignments(
      context.promotionRun.promotionRunId
    );

    this.assertDispatchAssignments(context, assignments);

    return assignments;
  }

  private async dispatchAssignments(
    context: DispatchContext,
    assignments: readonly ActiveAdServingAssignmentEntity[]
  ): Promise<DispatchJobSummary[]> {
    const jobs: DispatchJobSummary[] = [];

    for (const group of AdExecutionDomain.groupAssignmentsByAdExperiment(assignments)) {
      jobs.push(await this.dispatchAdExperimentGroup(context, group));
    }

    return jobs;
  }

  private async dispatchAdExperimentGroup(
    context: DispatchContext,
    assignments: readonly ActiveAdServingAssignmentEntity[]
  ): Promise<DispatchJobSummary> {
    const dispatchJobId = await this.createDispatchJob(context, assignments);
    const attempts = await this.dispatchGroup(context.channel, assignments);
    const summary = AdExecutionDomain.toDispatchJobSummary(
      dispatchJobId,
      context.channel,
      assignments,
      attempts
    );

    await this.finishDispatchJob(dispatchJobId, summary, attempts);

    return summary;
  }

  private async finishDispatchJob(
    dispatchJobId: string,
    summary: DispatchJobSummary,
    attempts: readonly DispatchAttemptSnapshot[]
  ) {
    await this.transactionHost.withTransaction(() =>
      this.writer.finishDispatchJob({
        dispatchJobId,
        status: toStoredDispatchJobStatus(summary.status),
        dispatchedCount: summary.dispatched_count,
        failedCount: summary.failed_count,
        result: {
          status: summary.status,
          attempts
        }
      })
    );
  }

  private async createDispatchJob(
    context: DispatchContext,
    assignments: readonly ActiveAdServingAssignmentEntity[]
  ) {
    const first = requireFirstAssignment(assignments);

    return this.transactionHost.withTransaction(() =>
      this.writer.insertDispatchJob({
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
      })
    );
  }

  private async dispatchGroup(
    channel: DispatchChannel,
    assignments: readonly ActiveAdServingAssignmentEntity[]
  ): Promise<DispatchAttemptSnapshot[]> {
    const attempts: DispatchAttemptSnapshot[] = [];

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
    const redirectId = await this.createRedirectLink(assignment);
    const provider = this.providerNameFor(channel, assignment.promotionRunId);

    logDispatchAttempt(channel, provider, assignment, redirectId);

    try {
      const sendResult = await this.sendDispatch(channel, assignment, redirectId);
      const attempt = toSentAttempt(assignment.userId, redirectId, sendResult);

      logDispatchResult(channel, sendResult.provider, assignment, attempt);

      return attempt;
    } catch (error) {
      const attempt = toFailedAttempt(assignment.userId, redirectId, getDispatchErrorCode(error));

      logDispatchResult(channel, provider, assignment, attempt, getErrorName(error));

      return attempt;
    }
  }

  private async sendDispatch(
    channel: DispatchChannel,
    assignment: ActiveAdServingAssignmentEntity,
    redirectId: string
  ): Promise<DispatchSendResult> {
    const targetUrl = redirectUrl(redirectId);

    switch (channel) {
      case "email":
        return this.emailSender.sendEmail(toEmailSendInput(assignment, targetUrl));
      case "sms":
        return this.smsSender.sendSms(toSmsSendInput(assignment, targetUrl));
      default:
        return throwUnsupportedDispatchChannel(assignment.promotionRunId, channel);
    }
  }

  private async createRedirectLink(assignment: ActiveAdServingAssignmentEntity): Promise<string> {
    const redirectId = randomUUID();

    return this.transactionHost.withTransaction(() =>
      this.writer.insertRedirectLink({
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
        destinationUrl: requiredContentTextSchema.parse(assignment.landingUrl),
        metadata: {},
        expiresAt: daysFromNow(7)
      })
    );
  }

  private assertDispatchAssignments(
    context: DispatchContext,
    assignments: readonly ActiveAdServingAssignmentEntity[]
  ) {
    if (assignments.length === 0) {
      throw adExecutionErrors.activeAssignmentNotFound(context.promotionRun.promotionRunId);
    }

    const channelMismatch = assignments.find(
      (assignment) => assignment.channel !== context.channel
    );

    if (channelMismatch) {
      throw adExecutionErrors.inconsistentAssignment(
        `promotion_run_id '${context.promotionRun.promotionRunId}' has assignment channel '${channelMismatch.channel}' but promotion channel is '${context.channel}'.`
      );
    }

    const conflicts = AdExecutionDomain.findAssignmentConflicts(assignments);

    if (conflicts.length > 0) {
      throw adExecutionErrors.inconsistentAssignment(conflicts.join(" "));
    }
  }

  private providerNameFor(channel: DispatchChannel, promotionRunId: string) {
    switch (channel) {
      case "email":
        return this.emailSender.providerName;
      case "sms":
        return this.smsSender.providerName;
      default:
        return throwUnsupportedDispatchChannel(promotionRunId, channel);
    }
  }
}

function toEmailSendInput(
  assignment: ActiveAdServingAssignmentEntity,
  targetUrl: string
): EmailSendInput {
  const content = emailContentSchema.parse(assignment);

  return {
    recipient: assignment.userId,
    subject: content.subject,
    body: [content.preheader, content.body, ctaLine(content.cta, targetUrl)]
      .filter(Boolean)
      .join("\n\n"),
    redirectUrl: targetUrl
  };
}

function toSmsSendInput(
  assignment: ActiveAdServingAssignmentEntity,
  targetUrl: string
): SmsSendInput {
  const content = smsContentSchema.parse(assignment);

  return {
    recipient: assignment.userId,
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

function toFailedAttempt(
  userId: string,
  redirectId: string,
  errorCode: string
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

function logDispatchAttempt(
  channel: DispatchChannel,
  provider: string,
  assignment: ActiveAdServingAssignmentEntity,
  redirectId: string
) {
  logWithContext("info", "Ad dispatch send attempt", {
    channel,
    provider,
    ...dispatchLogContext(assignment),
    redirectId
  });
}

function logDispatchResult(
  channel: DispatchChannel,
  provider: string,
  assignment: ActiveAdServingAssignmentEntity,
  attempt: DispatchAttemptSnapshot,
  errorName?: string
) {
  logWithContext(attempt.status === "sent" ? "info" : "warn", "Ad dispatch send result", {
    channel,
    provider,
    ...dispatchLogContext(assignment),
    redirectId: attempt.redirectId,
    status: attempt.status,
    errorCode: attempt.errorCode,
    providerMessageId: attempt.providerMessageId,
    errorName
  });
}

function dispatchLogContext(assignment: ActiveAdServingAssignmentEntity) {
  return {
    projectId: assignment.projectId,
    campaignId: assignment.campaignId,
    promotionId: assignment.promotionId,
    promotionRunId: assignment.promotionRunId,
    adExperimentId: assignment.adExperimentId,
    segmentId: assignment.segmentId,
    contentId: assignment.contentId,
    contentOptionId: assignment.contentOptionId,
    userId: assignment.userId
  };
}

function getErrorName(error: unknown) {
  return error instanceof Error ? error.name : "UnknownError";
}

function getDispatchErrorCode(error: unknown) {
  return error instanceof ZodError ? "CONTENT_INVALID" : "PROVIDER_SEND_FAILED";
}

function requireFirstAssignment(assignments: readonly ActiveAdServingAssignmentEntity[]) {
  const first = assignments[0];

  if (!first) {
    throw new Error("Dispatch job requires at least one assignment.");
  }

  return first;
}

function throwUnsupportedDispatchChannel(
  promotionRunId: string,
  channel: never
): never {
  throw adExecutionErrors.unsupportedDispatchChannel(promotionRunId, String(channel));
}
