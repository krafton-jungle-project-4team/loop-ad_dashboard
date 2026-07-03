import type {
  BannerResolveResponse,
  DispatchJobSummary,
  PromotionRunDispatchResponse
} from "@loopad/shared";

export type AdExecutionChannel = "email" | "sms" | "onsite_banner";
export type DispatchChannel = Extract<AdExecutionChannel, "email" | "sms">;
export type DispatchJobStatus = "completed" | "partial_failed" | "failed";
export type JsonObject = Record<string, unknown>;

export interface PromotionEntity {
  promotionId: string;
  projectId: string;
  campaignId: string;
  name: string;
  channel: AdExecutionChannel;
  targetAudience: string;
  goalMetric: string;
  targetValue: string;
  goalBasis: string;
  status: string;
  metadataJson: JsonObject;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromotionRunEntity {
  promotionRunId: string;
  projectId: string;
  campaignId: string;
  promotionId: string;
  analysisId: string;
  generationId: string;
  previousPromotionRunId: string | null;
  loopCount: number;
  operatorInstruction: string | null;
  status: string;
  summaryJson: JsonObject;
  startedAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdExperimentEntity {
  adExperimentId: string;
  projectId: string;
  campaignId: string;
  promotionId: string;
  promotionRunId: string;
  analysisId: string;
  generationId: string;
  segmentId: string;
  segmentName: string | null;
  contentId: string;
  contentOptionId: string;
  channel: AdExecutionChannel;
  loopCount: number;
  status: string;
  goalMetric: string;
  goalTargetValue: string;
  goalBasis: string;
  startedAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActiveAdServingAssignmentEntity {
  promotionRunId: string;
  userId: string;
  segmentId: string;
  adExperimentId: string;
  contentId: string;
  contentOptionId: string;
  fallback: boolean;
  similarityScore: string | null;
  projectId: string;
  campaignId: string;
  promotionId: string;
  channel: AdExecutionChannel;
  subject: string | null;
  preheader: string | null;
  title: string | null;
  body: string | null;
  cta: string | null;
  message: string | null;
  imagePrompt: string | null;
  landingUrl: string | null;
  contentStatus: string;
  adExperimentStatus: string;
}

export interface RedirectLinkEntity {
  redirectLinkId: string;
  projectId: string;
  campaignId: string;
  promotionId: string;
  promotionRunId: string;
  adExperimentId: string | null;
  segmentId: string | null;
  userId: string | null;
  contentId: string | null;
  contentOptionId: string | null;
  redirectToken: string;
  destinationUrl: string;
  status: string;
  metadataJson: JsonObject;
  expiresAt: Date | null;
  clickedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RedirectClickFields {
  campaignId: string;
  promotionId: string;
  promotionRunId: string;
  adExperimentId: string;
  segmentId: string;
  contentId: string;
  contentOptionId: string;
  promotionChannel: AdExecutionChannel;
  redirectId: string;
  targetUrl: string;
}

export interface RedirectClickEventSnapshot {
  name: "campaign_redirect_click";
  projectId: string;
  identity: {
    userId: string;
    sessionId: string;
  };
  fields: RedirectClickFields;
}

export interface RedirectPageSnapshot {
  targetUrl: string;
  eventSdk: {
    url: string;
    writeKey: string;
  };
  event: RedirectClickEventSnapshot;
}

export interface DispatchAttemptSnapshot {
  userId: string;
  redirectId: string;
  status: "sent" | "failed";
  errorCode?: string;
  providerMessageId?: string;
}

export const AdExecutionDomain = {
  isDispatchChannel(channel: string): channel is DispatchChannel {
    return channel === "email" || channel === "sms";
  },

  findAssignmentConflicts(assignments: readonly ActiveAdServingAssignmentEntity[]): string[] {
    const bySegment = new Map<string, ActiveAdServingAssignmentEntity>();
    const conflicts: string[] = [];

    for (const assignment of assignments) {
      const previous = bySegment.get(assignment.segmentId);

      if (!previous) {
        bySegment.set(assignment.segmentId, assignment);
        continue;
      }

      if (
        previous.adExperimentId !== assignment.adExperimentId ||
        previous.contentId !== assignment.contentId ||
        previous.contentOptionId !== assignment.contentOptionId
      ) {
        conflicts.push(
          `promotion_run_id '${assignment.promotionRunId}' has conflicting active content for segment_id '${assignment.segmentId}'.`
        );
      }
    }

    return [...new Set(conflicts)];
  },

  groupAssignmentsByAdExperiment(
    assignments: readonly ActiveAdServingAssignmentEntity[]
  ): ActiveAdServingAssignmentEntity[][] {
    const groups = new Map<string, ActiveAdServingAssignmentEntity[]>();

    for (const assignment of assignments) {
      const current = groups.get(assignment.adExperimentId) ?? [];
      current.push(assignment);
      groups.set(assignment.adExperimentId, current);
    }

    return [...groups.values()];
  },

  toBannerResponse(assignment: ActiveAdServingAssignmentEntity): BannerResolveResponse {
    return {
      promotion_run_id: assignment.promotionRunId,
      ad_experiment_id: assignment.adExperimentId,
      segment_id: assignment.segmentId,
      content_id: assignment.contentId,
      content_option_id: assignment.contentOptionId,
      title: assignment.title ?? "",
      body: assignment.body ?? "",
      cta: assignment.cta ?? "",
      target_url: requiredText(assignment.landingUrl, "landing_url")
    };
  },

  getDispatchStatus(dispatchedCount: number, failedCount: number): DispatchJobStatus {
    if (dispatchedCount > 0 && failedCount === 0) {
      return "completed";
    }

    if (dispatchedCount > 0) {
      return "partial_failed";
    }

    return "failed";
  },

  toDispatchJobSummary(
    dispatchJobId: string,
    channel: DispatchChannel,
    assignments: readonly ActiveAdServingAssignmentEntity[],
    attempts: readonly DispatchAttemptSnapshot[]
  ): DispatchJobSummary {
    const first = requireFirstAssignment(assignments);
    const dispatchedCount = attempts.filter((attempt) => attempt.status === "sent").length;
    const failedCount = attempts.length - dispatchedCount;

    return {
      dispatch_job_id: dispatchJobId,
      promotion_run_id: first.promotionRunId,
      ad_experiment_id: first.adExperimentId,
      segment_id: first.segmentId,
      channel,
      status: AdExecutionDomain.getDispatchStatus(dispatchedCount, failedCount),
      target_count: attempts.length,
      dispatched_count: dispatchedCount,
      failed_count: failedCount
    };
  },

  toDispatchResponse(
    promotionRunId: string,
    channel: DispatchChannel,
    jobs: readonly DispatchJobSummary[]
  ): PromotionRunDispatchResponse {
    return {
      promotion_run_id: promotionRunId,
      channel,
      target_count: sum(jobs, "target_count"),
      dispatched_count: sum(jobs, "dispatched_count"),
      failed_count: sum(jobs, "failed_count"),
      jobs: [...jobs]
    };
  },

  toRedirectClickFields(
    link: RedirectLinkEntity,
    promotionChannel: AdExecutionChannel
  ): RedirectClickFields {
    return {
      campaignId: link.campaignId,
      promotionId: link.promotionId,
      promotionRunId: link.promotionRunId,
      adExperimentId: requiredText(link.adExperimentId, "ad_experiment_id"),
      segmentId: requiredText(link.segmentId, "segment_id"),
      contentId: requiredText(link.contentId, "content_id"),
      contentOptionId: requiredText(link.contentOptionId, "content_option_id"),
      promotionChannel,
      redirectId: link.redirectToken,
      targetUrl: link.destinationUrl
    };
  },

  toRedirectClickEvent(
    link: RedirectLinkEntity,
    promotionChannel: AdExecutionChannel
  ): RedirectClickEventSnapshot {
    return {
      name: "campaign_redirect_click",
      projectId: link.projectId,
      identity: {
        userId: requiredText(link.userId, "user_id"),
        sessionId: `redirect:${link.redirectToken}`
      },
      fields: AdExecutionDomain.toRedirectClickFields(link, promotionChannel)
    };
  },

  toRedirectPage(
    link: RedirectLinkEntity,
    promotionChannel: AdExecutionChannel,
    eventSdk: RedirectPageSnapshot["eventSdk"]
  ): RedirectPageSnapshot {
    return {
      targetUrl: link.destinationUrl,
      eventSdk,
      event: AdExecutionDomain.toRedirectClickEvent(link, promotionChannel)
    };
  },

  toRedirectClickProperties(
    link: RedirectLinkEntity,
    promotionChannel: AdExecutionChannel
  ): Record<string, string> {
    const fields = AdExecutionDomain.toRedirectClickFields(link, promotionChannel);

    return {
      campaign_id: fields.campaignId,
      promotion_id: fields.promotionId,
      promotion_run_id: fields.promotionRunId,
      ad_experiment_id: fields.adExperimentId,
      segment_id: fields.segmentId,
      content_id: fields.contentId,
      content_option_id: fields.contentOptionId,
      promotion_channel: fields.promotionChannel,
      redirect_id: fields.redirectId,
      target_url: fields.targetUrl
    };
  }
};

function requireFirstAssignment(assignments: readonly ActiveAdServingAssignmentEntity[]) {
  const first = assignments[0];

  if (!first) {
    throw new Error("Dispatch job summary requires at least one assignment.");
  }

  return first;
}

function requiredText(value: string | null | undefined, field: string): string {
  if (!value) {
    throw new Error(`Ad execution entity is missing ${field}.`);
  }

  return value;
}

function sum(
  items: readonly DispatchJobSummary[],
  key: keyof Pick<DispatchJobSummary, "target_count" | "dispatched_count" | "failed_count">
) {
  return items.reduce((total, item) => total + item[key], 0);
}
