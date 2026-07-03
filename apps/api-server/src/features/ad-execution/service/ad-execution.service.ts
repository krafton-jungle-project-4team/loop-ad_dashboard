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
  type ActiveAdServingAssignmentEntity,
  type AdExperimentEntity,
  type DispatchAttemptSnapshot,
  type DispatchChannel,
  type DispatchJobStatus,
  type PromotionEntity,
  type PromotionRunEntity,
  type RedirectPageSnapshot
} from "../domain/index.js";
import { AdExecutionReader, AdExecutionWriter } from "../repository/index.js";

const LOOPAD_EVENT_SDK_URL =
  "https://krafton-jungle-project-4team.github.io/loop-ad_event_sdk/loop-ad-event-sdk.iife.js";
const LOOPAD_EVENT_WRITE_KEY = "public_write_key";
const LOCAL_DASHBOARD_PUBLIC_BASE_URL = "http://localhost:8080";
const DEV_DASHBOARD_PUBLIC_BASE_URL = "https://dashboard.api.dev.loop-ad.org";
const LOOPAD_EVENT_SDK = Object.freeze({
  url: LOOPAD_EVENT_SDK_URL,
  writeKey: LOOPAD_EVENT_WRITE_KEY
});

interface DispatchContext {
  promotionRun: PromotionRunEntity;
  promotion: PromotionEntity;
  channel: DispatchChannel;
}

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
        result: {
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

    if (!isHttpUrl(link.destinationUrl)) {
      throw adExecutionErrors.redirectTargetUrlInvalid(redirectId);
    }

    const adExperiment = await this.requireRedirectAdExperiment(link.adExperimentId);

    return AdExecutionDomain.toRedirectPage(link, adExperiment.channel, LOOPAD_EVENT_SDK);
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
      promotion,
      channel
    };
  }

  private async requireRedirectAdExperiment(
    adExperimentId: string | null
  ): Promise<AdExperimentEntity> {
    if (!adExperimentId) {
      throw adExecutionErrors.inconsistentAssignment(
        "redirect link is missing ad_experiment_id."
      );
    }

    const adExperiment = await this.reader.findAdExperiment(adExperimentId);

    if (!adExperiment) {
      throw adExecutionErrors.inconsistentAssignment(
        `redirect link references missing ad_experiment_id '${adExperimentId}'.`
      );
    }

    return adExperiment;
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

  private async createDispatchJob(
    context: DispatchContext,
    assignments: readonly ActiveAdServingAssignmentEntity[]
  ) {
    const first = requireFirstAssignment(assignments);

    return this.writer.insertDispatchJob({
      dispatchJobId: randomUUID(),
      projectId: context.promotionRun.projectId,
      campaignId: context.promotionRun.campaignId,
      promotionId: context.promotionRun.promotionId,
      promotionRunId: context.promotionRun.promotionRunId,
      adExperimentId: first.adExperimentId,
      channel: context.channel,
      provider: this.dispatchSender.providerNameFor(context.channel),
      targetCount: assignments.length,
      request: {
        segment_id: first.segmentId,
        content_id: first.contentId,
        content_option_id: first.contentOptionId
      }
    });
  }

  private async dispatchGroup(
    channel: DispatchChannel,
    assignments: readonly ActiveAdServingAssignmentEntity[]
  ): Promise<DispatchAttemptSnapshot[]> {
    const attempts: DispatchAttemptSnapshot[] = [];

    for (const assignment of assignments) {
      attempts.push(await this.dispatchOne(channel, assignment));
    }

    return attempts;
  }

  private async dispatchOne(
    channel: DispatchChannel,
    assignment: ActiveAdServingAssignmentEntity
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

  private async createRedirectLink(assignment: ActiveAdServingAssignmentEntity): Promise<string> {
    const redirectId = randomUUID();

    return this.writer.insertRedirectLink({
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
      destinationUrl: requireAssignmentText(assignment.landingUrl, "landing_url"),
      metadata: {},
      expiresAt: daysFromNow(7)
    });
  }
}

function toDispatchSendInput(
  channel: DispatchChannel,
  assignment: ActiveAdServingAssignmentEntity,
  recipient: string,
  targetUrl: string
): DispatchSendInput {
  if (channel === "email") {
    return {
      channel,
      recipient,
      subject: assignment.subject ?? "",
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
    body: [assignment.message, targetUrl].filter(Boolean).join(" "),
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

function ctaLine(cta: string | null, targetUrl: string) {
  return cta ? `${cta}: ${targetUrl}` : targetUrl;
}

function redirectUrl(redirectId: string) {
  return `${dashboardPublicBaseUrl()}/r/${encodeURIComponent(redirectId)}`;
}

function dashboardPublicBaseUrl() {
  return env.env === "dev" ? DEV_DASHBOARD_PUBLIC_BASE_URL : LOCAL_DASHBOARD_PUBLIC_BASE_URL;
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
  assignment: ActiveAdServingAssignmentEntity,
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
  assignment: ActiveAdServingAssignmentEntity,
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

function requireFirstAssignment(assignments: readonly ActiveAdServingAssignmentEntity[]) {
  const first = assignments[0];

  if (!first) {
    throw new Error("Dispatch job requires at least one assignment.");
  }

  return first;
}

function requireAssignmentText(value: string | null, field: string): string {
  if (!value) {
    throw adExecutionErrors.inconsistentAssignment(`Active assignment is missing ${field}.`);
  }

  return value;
}
