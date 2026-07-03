import type {
  BannerResolveResponse,
  DispatchJobSummary,
  PromotionRunDispatchResponse
} from "@loopad/shared";

export type AdExecutionChannel = "email" | "sms" | "onsite_banner";
export type DispatchChannel = Extract<AdExecutionChannel, "email" | "sms">;
export type DispatchJobStatus = "completed" | "partial_failed" | "failed";

export interface PromotionRunExecutionContextSnapshot {
  promotionRunId: string;
  projectId: string;
  campaignId: string;
  promotionId: string;
  promotionRunStatus: string;
  channel: AdExecutionChannel;
}

export interface ActiveAssignmentSnapshot {
  promotionRunId: string;
  projectId: string;
  campaignId: string;
  promotionId: string;
  userId: string;
  segmentId: string;
  adExperimentId: string;
  contentId: string;
  contentOptionId: string;
  channel: AdExecutionChannel;
  subject: string;
  preheader: string;
  title: string;
  body: string;
  cta: string;
  message: string;
  targetUrl: string;
}

export interface BannerAssignmentSnapshot {
  promotionRunId: string;
  segmentId: string;
  adExperimentId: string;
  contentId: string;
  contentOptionId: string;
  title: string;
  body: string;
  cta: string;
  targetUrl: string;
}

export interface RedirectLinkSnapshot {
  redirectId: string;
  projectId: string;
  campaignId: string;
  promotionId: string;
  promotionRunId: string;
  adExperimentId: string;
  segmentId: string;
  userId: string;
  contentId: string;
  contentOptionId: string;
  targetUrl: string;
  expiresAt: Date | null;
  promotionChannel: AdExecutionChannel;
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
    writeKey: string | null;
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

  findAssignmentConflicts(assignments: readonly ActiveAssignmentSnapshot[]): string[] {
    const bySegment = new Map<string, ActiveAssignmentSnapshot>();
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
    assignments: readonly ActiveAssignmentSnapshot[]
  ): ActiveAssignmentSnapshot[][] {
    const groups = new Map<string, ActiveAssignmentSnapshot[]>();

    for (const assignment of assignments) {
      const current = groups.get(assignment.adExperimentId) ?? [];
      current.push(assignment);
      groups.set(assignment.adExperimentId, current);
    }

    return [...groups.values()];
  },

  toBannerResponse(assignment: BannerAssignmentSnapshot): BannerResolveResponse {
    return {
      promotion_run_id: assignment.promotionRunId,
      ad_experiment_id: assignment.adExperimentId,
      segment_id: assignment.segmentId,
      content_id: assignment.contentId,
      content_option_id: assignment.contentOptionId,
      title: assignment.title,
      body: assignment.body,
      cta: assignment.cta,
      target_url: assignment.targetUrl
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
    assignments: readonly ActiveAssignmentSnapshot[],
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

  toRedirectClickFields(link: RedirectLinkSnapshot): RedirectClickFields {
    return {
      campaignId: link.campaignId,
      promotionId: link.promotionId,
      promotionRunId: link.promotionRunId,
      adExperimentId: link.adExperimentId,
      segmentId: link.segmentId,
      contentId: link.contentId,
      contentOptionId: link.contentOptionId,
      promotionChannel: link.promotionChannel,
      redirectId: link.redirectId,
      targetUrl: link.targetUrl
    };
  },

  toRedirectClickEvent(link: RedirectLinkSnapshot): RedirectClickEventSnapshot {
    return {
      name: "campaign_redirect_click",
      projectId: link.projectId,
      identity: {
        userId: link.userId,
        sessionId: `redirect:${link.redirectId}`
      },
      fields: AdExecutionDomain.toRedirectClickFields(link)
    };
  },

  toRedirectPage(
    link: RedirectLinkSnapshot,
    eventSdk: RedirectPageSnapshot["eventSdk"]
  ): RedirectPageSnapshot {
    return {
      targetUrl: link.targetUrl,
      eventSdk,
      event: AdExecutionDomain.toRedirectClickEvent(link)
    };
  },

  toRedirectClickProperties(link: RedirectLinkSnapshot): Record<string, string> {
    const fields = AdExecutionDomain.toRedirectClickFields(link);

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

function requireFirstAssignment(assignments: readonly ActiveAssignmentSnapshot[]) {
  const first = assignments[0];

  if (!first) {
    throw new Error("Dispatch job summary requires at least one assignment.");
  }

  return first;
}

function sum(
  items: readonly DispatchJobSummary[],
  key: keyof Pick<DispatchJobSummary, "target_count" | "dispatched_count" | "failed_count">
) {
  return items.reduce((total, item) => total + item[key], 0);
}
