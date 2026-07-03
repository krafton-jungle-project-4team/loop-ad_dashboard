import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import type {
  BannerResolveQuery,
  BannerResolveResponse,
  PromotionRunDispatchResponse
} from "@loopad/shared";
import { env } from "../../../infra/env/env.js";
import { logWithContext } from "../../../infra/logger/index.js";
import { adExecutionErrors } from "../ad-execution-errors.js";
import {
  DispatchSender,
  type DispatchSendInput,
  type DispatchSendResult
} from "../adapters/dispatch-sender.js";
import { RecipientResolver } from "../adapters/recipient-resolver.js";
import {
  AdExecutionDomain,
  type ActiveAssignmentSnapshot,
  type DispatchAttemptSnapshot,
  type DispatchChannel,
  type DispatchJobStatus,
  type PromotionRunExecutionContextSnapshot,
  type RedirectPageSnapshot
} from "../domain/index.js";
import { AdExecutionReader, AdExecutionWriter } from "../repository/index.js";

@Injectable()
export class AdExecutionService {
  constructor(
    @Inject(AdExecutionReader)
    private readonly reader: AdExecutionReader,
    @Inject(AdExecutionWriter)
    private readonly writer: AdExecutionWriter,
    @Inject(RecipientResolver)
    private readonly recipientResolver: RecipientResolver,
    @Inject(DispatchSender)
    private readonly dispatchSender: DispatchSender
  ) {}

  async dispatchPromotionRun(promotionRunId: string): Promise<PromotionRunDispatchResponse> {
    const context = await this.requireDispatchContext(promotionRunId);
    const assignments = await this.reader.listDispatchAssignments(promotionRunId);

    this.assertDispatchAssignments(context, assignments);

    const jobs = [];

    for (const group of AdExecutionDomain.groupAssignmentsByAdExperiment(assignments)) {
      const dispatchJobId = await this.createDispatchJob(context, group);
      const attempts = await this.dispatchGroup(context.channel, group);
      const summary = AdExecutionDomain.toDispatchJobSummary(
        dispatchJobId,
        context.channel,
        group,
        attempts
      );

      await this.writer.finishDispatchJob({
        dispatchJobId,
        status: toStoredDispatchJobStatus(summary.status),
        dispatchedCount: summary.dispatched_count,
        failedCount: summary.failed_count,
        metadata: {
          status: summary.status,
          attempts
        }
      });

      jobs.push(summary);
    }

    return AdExecutionDomain.toDispatchResponse(promotionRunId, context.channel, jobs);
  }

  async resolveBanner(request: BannerResolveQuery): Promise<BannerResolveResponse> {
    const assignment = await this.reader.findBannerAssignment({
      projectId: request.project_id,
      promotionRunId: request.promotion_run_id,
      userId: request.user_id
    });

    if (!assignment) {
      throw adExecutionErrors.bannerAssignmentNotFound(request.promotion_run_id, request.user_id);
    }

    return AdExecutionDomain.toBannerResponse(assignment);
  }

  async resolveRedirectPage(redirectId: string): Promise<RedirectPageSnapshot> {
    const link = await this.reader.findRedirectLink(redirectId);

    if (!link) {
      throw adExecutionErrors.redirectNotFound(redirectId);
    }

    if (link.expiresAt && link.expiresAt <= new Date()) {
      throw adExecutionErrors.redirectExpired(redirectId);
    }

    if (!isHttpUrl(link.targetUrl)) {
      throw adExecutionErrors.redirectTargetUrlInvalid(redirectId);
    }

    return AdExecutionDomain.toRedirectPage(link, env.eventSdk);
  }

  private async requireDispatchContext(
    promotionRunId: string
  ): Promise<PromotionRunExecutionContextSnapshot & { channel: DispatchChannel }> {
    const context = await this.reader.findPromotionRunContext(promotionRunId);

    if (!context) {
      throw adExecutionErrors.promotionRunNotFound(promotionRunId);
    }

    const channel = context.channel;

    if (!AdExecutionDomain.isDispatchChannel(channel)) {
      throw adExecutionErrors.unsupportedDispatchChannel(promotionRunId, channel);
    }

    return {
      ...context,
      channel
    };
  }

  private assertDispatchAssignments(
    context: PromotionRunExecutionContextSnapshot,
    assignments: readonly ActiveAssignmentSnapshot[]
  ) {
    if (assignments.length === 0) {
      throw adExecutionErrors.activeAssignmentNotFound(context.promotionRunId);
    }

    const channelMismatch = assignments.find(
      (assignment) => assignment.channel !== context.channel
    );

    if (channelMismatch) {
      throw adExecutionErrors.inconsistentAssignment(
        `promotion_run_id '${context.promotionRunId}' has assignment channel '${channelMismatch.channel}' but promotion channel is '${context.channel}'.`
      );
    }

    const conflicts = AdExecutionDomain.findAssignmentConflicts(assignments);

    if (conflicts.length > 0) {
      throw adExecutionErrors.inconsistentAssignment(conflicts.join(" "));
    }
  }

  private async createDispatchJob(
    context: PromotionRunExecutionContextSnapshot & { channel: DispatchChannel },
    assignments: readonly ActiveAssignmentSnapshot[]
  ) {
    const first = requireFirstAssignment(assignments);

    return this.writer.insertDispatchJob({
      dispatchJobId: randomUUID(),
      projectId: context.projectId,
      campaignId: context.campaignId,
      promotionId: context.promotionId,
      promotionRunId: context.promotionRunId,
      adExperimentId: first.adExperimentId,
      channel: context.channel,
      provider: this.dispatchSender.providerNameFor(context.channel),
      targetCount: assignments.length,
      metadata: {
        segment_id: first.segmentId,
        content_id: first.contentId,
        content_option_id: first.contentOptionId
      }
    });
  }

  private async dispatchGroup(
    channel: DispatchChannel,
    assignments: readonly ActiveAssignmentSnapshot[]
  ): Promise<DispatchAttemptSnapshot[]> {
    const attempts: DispatchAttemptSnapshot[] = [];

    for (const assignment of assignments) {
      attempts.push(await this.dispatchOne(channel, assignment));
    }

    return attempts;
  }

  private async dispatchOne(
    channel: DispatchChannel,
    assignment: ActiveAssignmentSnapshot
  ): Promise<DispatchAttemptSnapshot> {
    const redirectId = await this.createRedirectLink(assignment);
    const provider = this.dispatchSender.providerNameFor(channel);

    logDispatchAttempt(channel, provider, assignment, redirectId);

    try {
      const resolution = await this.recipientResolver.resolve({
        projectId: assignment.projectId,
        userId: assignment.userId,
        channel
      });

      if (!resolution) {
        const attempt = {
          userId: assignment.userId,
          redirectId,
          status: "failed",
          errorCode: "RECIPIENT_NOT_FOUND"
        } satisfies DispatchAttemptSnapshot;

        logDispatchResult(channel, provider, assignment, attempt);

        return attempt;
      }

      const sendResult = await this.dispatchSender.send(
        toDispatchSendInput(channel, assignment, resolution.recipient, redirectUrl(redirectId))
      );
      const attempt = toSentAttempt(assignment.userId, redirectId, sendResult);

      logDispatchResult(channel, sendResult.provider, assignment, attempt);

      return attempt;
    } catch (error) {
      const attempt = {
        userId: assignment.userId,
        redirectId,
        status: "failed",
        errorCode: "PROVIDER_SEND_FAILED"
      } satisfies DispatchAttemptSnapshot;

      logDispatchResult(channel, provider, assignment, attempt, getErrorName(error));

      return attempt;
    }
  }

  private async createRedirectLink(assignment: ActiveAssignmentSnapshot): Promise<string> {
    const redirectId = randomUUID();

    return this.writer.insertRedirectLink({
      redirectId,
      projectId: assignment.projectId,
      campaignId: assignment.campaignId,
      promotionId: assignment.promotionId,
      promotionRunId: assignment.promotionRunId,
      adExperimentId: assignment.adExperimentId,
      segmentId: assignment.segmentId,
      userId: assignment.userId,
      contentId: assignment.contentId,
      contentOptionId: assignment.contentOptionId,
      targetUrl: assignment.targetUrl,
      expiresAt: daysFromNow(7)
    });
  }
}

function toDispatchSendInput(
  channel: DispatchChannel,
  assignment: ActiveAssignmentSnapshot,
  recipient: string,
  targetUrl: string
): DispatchSendInput {
  if (channel === "email") {
    return {
      channel,
      recipient,
      subject: assignment.subject || assignment.title || "LoopAd promotion",
      body: [assignment.preheader, assignment.body, ctaLine(assignment.cta, targetUrl)]
        .filter(Boolean)
        .join("\n\n"),
      redirectUrl: targetUrl
    };
  }

  return {
    channel,
    recipient,
    subject: "",
    body: [assignment.message || assignment.body || assignment.title, targetUrl]
      .filter(Boolean)
      .join(" "),
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

function toStoredDispatchJobStatus(
  status: DispatchJobStatus
): Extract<DispatchJobStatus, "completed" | "failed"> {
  return status === "completed" ? "completed" : "failed";
}

function ctaLine(cta: string, targetUrl: string) {
  return cta ? `${cta}: ${targetUrl}` : targetUrl;
}

function redirectUrl(redirectId: string) {
  return `${env.publicBaseUrl.replace(/\/+$/, "")}/r/${encodeURIComponent(redirectId)}`;
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function daysFromNow(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function logDispatchAttempt(
  channel: DispatchChannel,
  provider: string,
  assignment: ActiveAssignmentSnapshot,
  redirectId: string
) {
  logWithContext("info", "Ad dispatch send attempt", {
    channel,
    provider,
    projectId: assignment.projectId,
    campaignId: assignment.campaignId,
    promotionId: assignment.promotionId,
    promotionRunId: assignment.promotionRunId,
    adExperimentId: assignment.adExperimentId,
    segmentId: assignment.segmentId,
    contentId: assignment.contentId,
    contentOptionId: assignment.contentOptionId,
    userId: assignment.userId,
    redirectId
  });
}

function logDispatchResult(
  channel: DispatchChannel,
  provider: string,
  assignment: ActiveAssignmentSnapshot,
  attempt: DispatchAttemptSnapshot,
  errorName?: string
) {
  logWithContext(attempt.status === "sent" ? "info" : "warn", "Ad dispatch send result", {
    channel,
    provider,
    projectId: assignment.projectId,
    campaignId: assignment.campaignId,
    promotionId: assignment.promotionId,
    promotionRunId: assignment.promotionRunId,
    adExperimentId: assignment.adExperimentId,
    segmentId: assignment.segmentId,
    contentId: assignment.contentId,
    contentOptionId: assignment.contentOptionId,
    userId: attempt.userId,
    redirectId: attempt.redirectId,
    status: attempt.status,
    errorCode: attempt.errorCode,
    providerMessageId: attempt.providerMessageId,
    errorName
  });
}

function getErrorName(error: unknown) {
  return error instanceof Error ? error.name : "UnknownError";
}

function requireFirstAssignment(assignments: readonly ActiveAssignmentSnapshot[]) {
  const first = assignments[0];

  if (!first) {
    throw new Error("Dispatch job requires at least one assignment.");
  }

  return first;
}
