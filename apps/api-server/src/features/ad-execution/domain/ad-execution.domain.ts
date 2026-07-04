import type {
  BannerResolveResponse,
  DispatchAttemptSummary,
  DispatchJobSummary,
  PromotionRunDispatchResponse
} from "@loopad/shared";
import { z } from "zod";

export const adExecutionChannelSchema = z.enum(["email", "sms", "onsite_banner"]);
export type AdExecutionChannel = z.infer<typeof adExecutionChannelSchema>;
export type DispatchChannel = Extract<AdExecutionChannel, "email" | "sms">;
export type DispatchJobStatus = "completed" | "partial_failed" | "failed";

const dateFromDbSchema = z.union([z.date(), z.string().pipe(z.coerce.date())]);
const jsonObjectSchema = z.record(z.string(), z.unknown());
const requiredStringSchema = z.string().min(1);
const nullableStringSchema = z.string().nullable();
const promotionIdsSchema = {
  projectId: requiredStringSchema,
  campaignId: requiredStringSchema,
  promotionId: requiredStringSchema
};
const runIdsSchema = {
  ...promotionIdsSchema,
  promotionRunId: requiredStringSchema
};
const contentIdsSchema = {
  contentId: requiredStringSchema,
  contentOptionId: requiredStringSchema
};
const timestampsSchema = {
  createdAt: dateFromDbSchema,
  updatedAt: dateFromDbSchema
};

export const promotionEntitySchema = z.object({
  ...promotionIdsSchema,
  name: requiredStringSchema,
  channel: adExecutionChannelSchema,
  targetAudience: requiredStringSchema,
  goalMetric: requiredStringSchema,
  targetValue: requiredStringSchema,
  goalBasis: requiredStringSchema,
  status: requiredStringSchema,
  metadataJson: jsonObjectSchema,
  ...timestampsSchema
});
export type PromotionEntity = z.infer<typeof promotionEntitySchema>;

export const promotionRunEntitySchema = z.object({
  promotionRunId: requiredStringSchema,
  ...promotionIdsSchema,
  analysisId: requiredStringSchema,
  generationId: requiredStringSchema,
  previousPromotionRunId: requiredStringSchema.nullable(),
  loopCount: z.number(),
  operatorInstruction: nullableStringSchema,
  status: requiredStringSchema,
  summaryJson: jsonObjectSchema,
  startedAt: dateFromDbSchema.nullable(),
  endedAt: dateFromDbSchema.nullable(),
  ...timestampsSchema
});
export type PromotionRunEntity = z.infer<typeof promotionRunEntitySchema>;

export const adExperimentEntitySchema = z.object({
  adExperimentId: requiredStringSchema,
  ...runIdsSchema,
  analysisId: requiredStringSchema,
  generationId: requiredStringSchema,
  segmentId: requiredStringSchema,
  segmentName: nullableStringSchema,
  ...contentIdsSchema,
  channel: adExecutionChannelSchema,
  loopCount: z.number(),
  status: requiredStringSchema,
  goalMetric: requiredStringSchema,
  goalTargetValue: requiredStringSchema,
  goalBasis: requiredStringSchema,
  startedAt: dateFromDbSchema.nullable(),
  endedAt: dateFromDbSchema.nullable(),
  ...timestampsSchema
});
export type AdExperimentEntity = z.infer<typeof adExperimentEntitySchema>;

export const activeAdServingAssignmentEntitySchema = z.object({
  promotionRunId: requiredStringSchema,
  userId: requiredStringSchema,
  segmentId: requiredStringSchema,
  adExperimentId: requiredStringSchema,
  ...contentIdsSchema,
  fallback: z.boolean(),
  similarityScore: requiredStringSchema.nullable(),
  ...promotionIdsSchema,
  channel: adExecutionChannelSchema,
  subject: nullableStringSchema,
  preheader: nullableStringSchema,
  title: nullableStringSchema,
  body: nullableStringSchema,
  cta: nullableStringSchema,
  message: nullableStringSchema,
  imagePrompt: nullableStringSchema,
  landingUrl: requiredStringSchema.nullable(),
  contentStatus: requiredStringSchema,
  adExperimentStatus: requiredStringSchema
});
export type ActiveAdServingAssignmentEntity = z.infer<typeof activeAdServingAssignmentEntitySchema>;

export const redirectLinkEntitySchema = z.object({
  redirectLinkId: requiredStringSchema,
  ...runIdsSchema,
  adExperimentId: requiredStringSchema.nullable(),
  segmentId: requiredStringSchema.nullable(),
  userId: requiredStringSchema.nullable(),
  contentId: requiredStringSchema.nullable(),
  contentOptionId: requiredStringSchema.nullable(),
  redirectToken: requiredStringSchema,
  destinationUrl: requiredStringSchema,
  status: requiredStringSchema,
  metadataJson: jsonObjectSchema,
  expiresAt: dateFromDbSchema.nullable(),
  clickedAt: dateFromDbSchema.nullable(),
  ...timestampsSchema
});
export type RedirectLinkEntity = z.infer<typeof redirectLinkEntitySchema>;

export interface RedirectClickFields {
  campaign_id: string;
  promotion_id: string;
  promotion_run_id: string;
  ad_experiment_id: string;
  segment_id: string;
  content_id: string;
  content_option_id: string;
  promotion_channel: AdExecutionChannel;
  redirect_id: string;
  target_url: string;
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
  redirectId?: string;
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

  toBannerResponse(
    assignment: ActiveAdServingAssignmentEntity,
    placementId: string
  ): BannerResolveResponse {
    return {
      project_id: assignment.projectId,
      user_id: assignment.userId,
      campaign_id: assignment.campaignId,
      promotion_id: assignment.promotionId,
      promotion_run_id: assignment.promotionRunId,
      ad_experiment_id: assignment.adExperimentId,
      segment_id: assignment.segmentId,
      content_id: assignment.contentId,
      content_option_id: assignment.contentOptionId,
      promotion_channel: "onsite_banner",
      placement_id: placementId,
      title: requiredStringSchema.parse(assignment.title),
      body: requiredStringSchema.parse(assignment.body),
      cta: requiredStringSchema.parse(assignment.cta),
      target_url: requiredStringSchema.parse(assignment.landingUrl)
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
      failed_count: failedCount,
      attempts: attempts.map(toDispatchAttemptSummary)
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

  toRedirectClickEvent(
    link: RedirectLinkEntity,
    promotionChannel: AdExecutionChannel
  ): RedirectClickEventSnapshot {
    return {
      name: "campaign_redirect_click",
      projectId: link.projectId,
      identity: {
        userId: requiredStringSchema.parse(link.userId),
        sessionId: `redirect:${link.redirectToken}`
      },
      fields: {
        campaign_id: link.campaignId,
        promotion_id: link.promotionId,
        promotion_run_id: link.promotionRunId,
        ad_experiment_id: requiredStringSchema.parse(link.adExperimentId),
        segment_id: requiredStringSchema.parse(link.segmentId),
        content_id: requiredStringSchema.parse(link.contentId),
        content_option_id: requiredStringSchema.parse(link.contentOptionId),
        promotion_channel: promotionChannel,
        redirect_id: link.redirectToken,
        target_url: link.destinationUrl
      }
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
  }
};

function requireFirstAssignment(assignments: readonly ActiveAdServingAssignmentEntity[]) {
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

function toDispatchAttemptSummary(attempt: DispatchAttemptSnapshot): DispatchAttemptSummary {
  return {
    user_id: attempt.userId,
    status: attempt.status,
    ...optionalSummaryField("redirect_id", attempt.redirectId),
    ...optionalSummaryField("error_code", attempt.errorCode),
    ...optionalSummaryField("provider_message_id", attempt.providerMessageId)
  };
}

function optionalSummaryField<TKey extends string>(
  key: TKey,
  value: string | undefined
): Partial<Record<TKey, string>> {
  return value ? ({ [key]: value } as Record<TKey, string>) : {};
}
