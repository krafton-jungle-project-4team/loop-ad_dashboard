import {
  CreativeArtifactSchema,
  DashboardPromotionChannelSchema,
  DashboardPromotionGoalBasisSchema,
  DashboardPromotionGoalMetricSchema,
  isPromotionScheduleWithinCampaign,
  normalizePromotionSegmentAudience,
  normalizePromotionSegmentPerformanceEstimate,
  normalizePromotionSegmentRankComparison,
  type DashboardCampaignPromotion,
  type DashboardCampaignSegment,
  type DashboardCampaignSummary,
  type CreativeArtifact,
  type DashboardCreatePromotionRequest,
  type DashboardPromotionOffer,
  type DashboardUpdatePromotionRequest,
  type DashboardPromotionSegmentSuggestion,
  type DashboardSegmentAssistantSourceSuggestion,
  type DashboardSegmentDetail
} from "@loopad/shared";
import { formatInteger } from "../../../../model/dashboard-format.js";
import { formatMetricLabel } from "../../../../model/dashboard-labels.js";

export const promotionChannelOptions = DashboardPromotionChannelSchema.options;
export const promotionGoalMetricOptions = DashboardPromotionGoalMetricSchema.options.map(
  (metric) => ({ label: formatMetricLabel(metric), value: metric })
);
export const promotionGoalBasisOptions = DashboardPromotionGoalBasisSchema.options;
export const defaultPromotionLandingUrl =
  "https://demo-shoppingmall.dev.loop-ad.org/search?deal=summer";
export const onsiteBannerImagePollIntervalMs = 3000;
const PROMOTION_SCHEDULE_TIME_ZONE_OFFSET = "+09:00";
export type PromotionWorkspaceTab = "overview" | "segments" | "segment-detail";
export type PromotionWorkspaceMode = "promotion" | "segment";
export type PromotionAnalysisProgress = {
  analysisId: string | null;
  errorMessage: string | null;
  startedAt: number | null;
  status: "idle" | "pending" | "success" | "error";
};

export const defaultPromotionAnalysisProgress: PromotionAnalysisProgress = {
  analysisId: null,
  errorMessage: null,
  startedAt: null,
  status: "idle"
};
export const promotionAnalysisProgressCacheTimeMs = 1000 * 60 * 30;

export function canStartAdExperiment(status: string) {
  return status === "planned" || status === "approved";
}

export function uniquePromotionsById(
  promotions: DashboardCampaignPromotion[]
): DashboardCampaignPromotion[] {
  const promotionMap = new Map<string, DashboardCampaignPromotion>();
  for (const promotion of promotions) {
    if (!promotionMap.has(promotion.promotion_id)) {
      promotionMap.set(promotion.promotion_id, promotion);
    }
  }
  return [...promotionMap.values()];
}

export type PromotionCreateFormState = {
  channel: string;
  goalBasis: string;
  goalMetric: DashboardCreatePromotionRequest["goal_metric"];
  goalTargetValue: string;
  executionMode: DashboardCreatePromotionRequest["execution_mode"];
  landingUrl: string;
  loopIntervalUnit: DashboardCreatePromotionRequest["loop_interval_unit"];
  loopIntervalValue: string;
  marketingTheme: string;
  maxLoopCount: string;
  messageBrief: string;
  minSampleSize: string;
  offerLinks: Array<{
    offerId: string;
    destinationUrl: string;
  }>;
  scheduledEndAt: string;
  scheduledStartAt: string;
};

export function createEmptyPromotionFormState(
  campaign?: Pick<DashboardCampaignSummary, "start_date" | "end_date">
): PromotionCreateFormState {
  const scheduleBounds = promotionScheduleInputBounds(campaign);
  return {
    channel: "email",
    goalBasis: "promotion_average",
    goalMetric: "inflow_rate",
    goalTargetValue: "0.1",
    executionMode: "manual",
    landingUrl: defaultPromotionLandingUrl,
    loopIntervalUnit: "day",
    loopIntervalValue: "1",
    marketingTheme: "",
    maxLoopCount: "3",
    messageBrief: "",
    minSampleSize: "1000",
    offerLinks: [],
    scheduledEndAt: scheduleBounds.endAt,
    scheduledStartAt: scheduleBounds.startAt
  };
}

export function promotionToFormState(
  promotion: DashboardCampaignPromotion,
  campaign?: Pick<DashboardCampaignSummary, "start_date" | "end_date">
): PromotionCreateFormState {
  const scheduleBounds = promotionScheduleInputBounds(campaign);
  return {
    channel: promotion.channel,
    goalBasis: promotion.goal_basis,
    goalMetric: promotion.goal_metric as PromotionCreateFormState["goalMetric"],
    goalTargetValue: String(promotion.goal_target_value),
    executionMode: promotion.execution_mode,
    landingUrl: promotion.landing_url ?? "",
    loopIntervalUnit: promotion.loop_interval_unit,
    loopIntervalValue: String(promotion.loop_interval_value),
    marketingTheme: promotion.marketing_theme,
    maxLoopCount: String(promotion.max_loop_count),
    messageBrief: promotion.message_brief ?? "",
    minSampleSize: String(promotion.min_sample_size),
    offerLinks: (promotion.offer_links ?? []).map((link) => ({
      offerId: link.offer_id ?? "",
      destinationUrl: link.destination_url
    })),
    scheduledEndAt: toDateTimeLocalValue(promotion.scheduled_end_at) || scheduleBounds.endAt,
    scheduledStartAt: toDateTimeLocalValue(promotion.scheduled_start_at) || scheduleBounds.startAt
  };
}

export function promotionCreateFormToRequest(
  form: PromotionCreateFormState
): DashboardCreatePromotionRequest {
  return {
    ...promotionFormRequestFields(form),
    status: "draft"
  };
}

export function promotionFormToUpdateRequest(
  form: PromotionCreateFormState
): DashboardUpdatePromotionRequest {
  return promotionFormRequestFields(form);
}

export function promotionFormNumericValidation(form: PromotionCreateFormState) {
  return {
    goalTargetValue: positiveNumberInputIsValid(form.goalTargetValue),
    loopIntervalValue:
      form.executionMode !== "automatic" || positiveIntegerInputIsValid(form.loopIntervalValue),
    maxLoopCount: positiveIntegerInputIsValid(form.maxLoopCount),
    minSampleSize: positiveIntegerInputIsValid(form.minSampleSize)
  };
}

export function promotionNumericFieldsAreValid(form: PromotionCreateFormState) {
  return Object.values(promotionFormNumericValidation(form)).every(Boolean);
}

function promotionFormRequestFields(form: PromotionCreateFormState) {
  return {
    channel: form.channel as DashboardCreatePromotionRequest["channel"],
    goal_basis: form.goalBasis as DashboardCreatePromotionRequest["goal_basis"],
    goal_metric: form.goalMetric,
    goal_target_value: nonnegativeNumber(form.goalTargetValue),
    execution_mode: form.executionMode,
    landing_url: form.landingUrl.trim(),
    loop_interval_unit: form.loopIntervalUnit,
    loop_interval_value: positiveInteger(form.loopIntervalValue),
    marketing_theme: form.marketingTheme.trim(),
    max_loop_count: positiveInteger(form.maxLoopCount),
    message_brief: form.messageBrief.trim() || null,
    min_sample_size: Math.trunc(nonnegativeNumber(form.minSampleSize)),
    offer_links:
      form.channel === "email"
        ? form.offerLinks.map((link) => ({
            destination_url: link.destinationUrl.trim(),
            offer_id: link.offerId.trim()
          }))
        : [],
    scheduled_end_at: nullableIsoDateTime(form.scheduledEndAt),
    scheduled_start_at: nullableIsoDateTime(form.scheduledStartAt)
  };
}

export function promotionScheduleIsValid(form: PromotionCreateFormState) {
  if (!form.scheduledStartAt || !form.scheduledEndAt) {
    return true;
  }
  return Date.parse(form.scheduledEndAt) > Date.parse(form.scheduledStartAt);
}

export function promotionScheduleFitsCampaign(
  form: PromotionCreateFormState,
  campaign?: Pick<DashboardCampaignSummary, "start_date" | "end_date">
) {
  return !campaign || isPromotionScheduleWithinCampaign(promotionFormRequestFields(form), campaign);
}

export function promotionScheduleInputBounds(
  campaign?: Pick<DashboardCampaignSummary, "start_date" | "end_date">
) {
  return {
    endAt: campaign?.end_date ? `${campaign.end_date}T23:59` : "",
    startAt: campaign?.start_date ? `${campaign.start_date}T00:00` : ""
  };
}

export function promotionOfferLinksAreValid(form: PromotionCreateFormState) {
  if (form.channel !== "email") {
    return true;
  }
  if (form.offerLinks.length === 0 || form.offerLinks.length > 8) {
    return false;
  }

  const destinationUrls = form.offerLinks.map((link) => link.destinationUrl.trim());
  const offerIds = form.offerLinks.map((link) => link.offerId.trim());
  return (
    offerIds.every(Boolean) &&
    new Set(offerIds).size === offerIds.length &&
    new Set(destinationUrls).size === destinationUrls.length &&
    destinationUrls.every(isValidHttpUrl)
  );
}

export function promotionOfferLinksMatchCatalog(
  form: PromotionCreateFormState,
  offers: DashboardPromotionOffer[]
) {
  if (form.channel !== "email") {
    return true;
  }

  const destinationsByOfferId = new Map(
    offers.map((offer) => [offer.offer_id, offer.destination_url])
  );
  return form.offerLinks.every(
    (link) => destinationsByOfferId.get(link.offerId) === link.destinationUrl
  );
}

export function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value.trim());

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function nullableIsoDateTime(value: string) {
  if (!value) {
    return null;
  }
  const localDateTime = value.length === 16 ? `${value}:00` : value;
  return new Date(`${localDateTime}${PROMOTION_SCHEDULE_TIME_ZONE_OFFSET}`).toISOString();
}

function toDateTimeLocalValue(value: string | null) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  const koreaTime = new Date(date.getTime() + 9 * 60 * 60 * 1_000);
  return koreaTime.toISOString().slice(0, 16);
}

export function latestSegmentPerSegmentId(segments: DashboardCampaignSegment[]) {
  const latestSegments = new Map<string, DashboardCampaignSegment>();
  for (const segment of segments) {
    const current = latestSegments.get(segment.segment_id);
    if (!current || compareSegmentLoopRecency(segment, current) < 0) {
      latestSegments.set(segment.segment_id, segment);
    }
  }
  return Array.from(latestSegments.values()).sort(compareSegmentLoopRecency);
}

export function compareSegmentLoopRecency(
  segmentA: DashboardCampaignSegment,
  segmentB: DashboardCampaignSegment
) {
  const loopDelta = segmentLoopCount(segmentB) - segmentLoopCount(segmentA);
  if (loopDelta !== 0) {
    return loopDelta;
  }
  return segmentB.analysis_id.localeCompare(segmentA.analysis_id);
}

export function segmentLoopCount(segment: DashboardCampaignSegment) {
  const loopMatch = /(?:^|_)loop_(\d+)(?:$|_)/.exec(segment.analysis_id);
  if (!loopMatch) {
    return 1;
  }
  const loopCount = Number(loopMatch[1]);
  return Number.isFinite(loopCount) && loopCount > 0 ? loopCount : 1;
}

export function formatGoalValue(value: number) {
  return value <= 1 ? `${formatInteger(value * 100)}%` : formatInteger(value);
}

export function formatPercentValue(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

type SegmentDisplayCopy = NonNullable<DashboardPromotionSegmentSuggestion["display_copy"]>;

export function segmentAssistantSourceSuggestion(
  suggestion: DashboardPromotionSegmentSuggestion
): DashboardSegmentAssistantSourceSuggestion {
  // Recommendation chips describe the candidate; they are not executable predicates.
  return {
    suggestion_id: suggestion.suggestion_id,
    segment_id: suggestion.segment_id,
    title: suggestion.display_copy?.title ?? suggestion.segment_name,
    strategy_role:
      suggestion.display_copy?.strategy_role ?? suggestion.display_copy?.rank_role ?? null,
    condition_labels: [],
    reference_labels: suggestion.display_copy?.signal_chips ?? [],
    sample_size: suggestion.sample_size
  };
}

export function campaignSegmentDisplayCopy(
  segment: DashboardCampaignSegment
): SegmentDisplayCopy | null {
  return normalizeSegmentDisplayCopy(segment.data_evidence_json.display_copy);
}

export function normalizeSegmentDisplayCopy(value: unknown): SegmentDisplayCopy | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const title = nonEmptyText(raw.title);
  const audienceSummary = nonEmptyText(raw.audience_summary);
  const reason = nonEmptyText(raw.reason);
  const actionHint = nonEmptyText(raw.action_hint);
  if (!title || !audienceSummary || !reason || !actionHint) {
    return null;
  }

  const signalChips = Array.isArray(raw.signal_chips)
    ? raw.signal_chips.map(nonEmptyText).filter((chip): chip is string => chip !== null)
    : [];
  const performanceEstimate = normalizePromotionSegmentPerformanceEstimate(
    raw.performance_estimate
  );
  const audience = normalizePromotionSegmentAudience(raw.audience);
  const rankComparison = normalizePromotionSegmentRankComparison(raw.rank_comparison);
  const recommendationTier = nonEmptyText(raw.recommendation_tier);

  return {
    title,
    strategy_role: nonEmptyText(raw.strategy_role) ?? undefined,
    strength_summary: nonEmptyText(raw.strength_summary) ?? undefined,
    tradeoff_summary: nonEmptyText(raw.tradeoff_summary) ?? undefined,
    rank_role: nonEmptyText(raw.rank_role) ?? undefined,
    recommendation_tier:
      recommendationTier === "primary" || recommendationTier === "small_high_intent"
        ? recommendationTier
        : undefined,
    recommendation_tier_label: nonEmptyText(raw.recommendation_tier_label) ?? undefined,
    recommendation_tier_reason: nonEmptyText(raw.recommendation_tier_reason) ?? undefined,
    recommendation_rank: nonNegativeInteger(raw.recommendation_rank) ?? undefined,
    rank_eligible: typeof raw.rank_eligible === "boolean" ? raw.rank_eligible : undefined,
    minimum_primary_sample_size: nonNegativeInteger(raw.minimum_primary_sample_size) ?? undefined,
    audience_summary: audienceSummary,
    audience,
    performance_estimate: performanceEstimate,
    signal_chips: signalChips,
    reason,
    difference_summary: nonEmptyText(raw.difference_summary) ?? undefined,
    rank_comparison: rankComparison,
    action_hint: actionHint
  };
}

export function segmentAudienceSummary(sampleSize: number, sampleRatio: number) {
  return `평가 대상 ${formatInteger(sampleSize)}명 · 비율 ${formatInteger(sampleRatio * 100)}%`;
}

export function nonEmptyText(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function nonNegativeInteger(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.trunc(parsed) : null;
}

export function contentCandidateTitle(
  candidate: DashboardSegmentDetail["content_candidates"][number]
) {
  return candidate.title ?? candidate.subject ?? candidate.message ?? "광고 소재 후보";
}

export function contentCandidateMessage(
  candidate: DashboardSegmentDetail["content_candidates"][number]
) {
  return candidate.body ?? candidate.message ?? candidate.generation_prompt ?? "-";
}

export function contentCandidateHtmlArtifact(
  candidate: DashboardSegmentDetail["content_candidates"][number]
): CreativeArtifact | null {
  const creative = candidate.metadata_json.creative;
  if (!creative || typeof creative !== "object" || Array.isArray(creative)) {
    return null;
  }

  const parsedArtifact = CreativeArtifactSchema.safeParse(
    (creative as Record<string, unknown>).artifact
  );
  if (!parsedArtifact.success || parsedArtifact.data.creative_format === "sms_text") {
    return null;
  }

  return parsedArtifact.data;
}

export function contentCandidateIsReadyForSelection(
  candidate: DashboardSegmentDetail["content_candidates"][number]
) {
  const imageIsReady = !candidate.image_prompt || Boolean(candidate.image_url);
  if (!imageIsReady) {
    return false;
  }

  if (candidate.channel !== "email" && candidate.channel !== "onsite_banner") {
    return true;
  }

  const htmlArtifact = contentCandidateHtmlArtifact(candidate);
  return Boolean(htmlArtifact?.artifact_status === "published" && htmlArtifact.public_url);
}

export function activeContentCandidates(
  detail: DashboardSegmentDetail,
  generationId?: string,
  requireGenerationId = false
) {
  if (requireGenerationId && !generationId) {
    return [];
  }
  return detail.content_candidates.filter(
    (candidate) =>
      candidate.analysis_id === detail.segment.analysis_id &&
      candidate.status !== "archived" &&
      (!generationId || candidate.generation_id === generationId)
  );
}

export function allContentCandidatesAreRejected(
  candidates: DashboardSegmentDetail["content_candidates"]
) {
  return candidates.length > 0 && candidates.every((candidate) => candidate.status === "rejected");
}

export function nextExperimentLoopCount(
  detail: DashboardSegmentDetail,
  resumablePromotionRunId?: string | null
) {
  const latestLoopCount = detail.ad_experiments.reduce(
    (highestLoopCount, experiment) => Math.max(highestLoopCount, experiment.loop_count),
    0
  );
  const resumableLoopCount = resumablePromotionRunId
    ? detail.ad_experiments.reduce(
        (highestLoopCount, experiment) =>
          experiment.promotion_run_id === resumablePromotionRunId
            ? Math.max(highestLoopCount, experiment.loop_count)
            : highestLoopCount,
        0
      )
    : 0;

  if (resumableLoopCount > 0 && resumableLoopCount === latestLoopCount) {
    return resumableLoopCount;
  }

  return latestLoopCount + 1;
}

export function hasPendingOnsiteBannerImage(detail: DashboardSegmentDetail | undefined) {
  return Boolean(
    detail &&
    activeContentCandidates(detail).some(
      (candidate) =>
        candidate.channel === "onsite_banner" && candidate.image_prompt && !candidate.image_url
    )
  );
}

export function insufficientReason(metric: DashboardSegmentDetail["experiment_metrics"][number]) {
  const reason =
    pickJsonString(metric.result_json, ["insufficient_reason", "reason", "message", "note"]) ??
    metric.feedback;
  const minimumRequiredSampleSize = pickJsonNumber(metric.result_json, [
    "minimum_required_sample_size",
    "min_sample_size"
  ]);
  const assignedUserCount = pickJsonNumber(metric.result_json, [
    "assigned_user_count",
    "final_assigned_user_count"
  ]);
  const sampleReason =
    minimumRequiredSampleSize === null
      ? null
      : `최소 필요 ${formatInteger(minimumRequiredSampleSize)}명`;
  const assignedReason =
    assignedUserCount === null ? null : `최종 배정 ${formatInteger(assignedUserCount)}명`;

  return [reason, assignedReason, sampleReason].filter(Boolean).join(" · ") || "-";
}

export function pickJsonString(value: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const item = value[key];
    if (typeof item === "string" && item.trim()) {
      return item;
    }
  }
  return null;
}

export function pickJsonNumber(value: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const item = value[key];
    if (typeof item === "number" && Number.isFinite(item)) {
      return item;
    }
    if (typeof item === "string") {
      const numberValue = Number(item);
      if (Number.isFinite(numberValue)) {
        return numberValue;
      }
    }
  }
  return null;
}

export function statusBadgeVariant(status: string) {
  if (status.includes("goal_met") || status === "approved") {
    return "status-success" as const;
  }
  if (status === "active" || status === "running") {
    return "status-info" as const;
  }
  if (status.includes("not_met") || status === "failed" || status === "stopped") {
    return "status-danger" as const;
  }
  if (status.includes("insufficient") || status.includes("near")) {
    return "status-warning" as const;
  }
  return "outline" as const;
}

export function formatJsonObject(value: Record<string, unknown>): string {
  return Object.entries(value)
    .slice(0, 3)
    .map(([key, item]) => `${key}: ${formatJsonValue(item)}`)
    .join(" · ");
}

export function formatJsonValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(formatJsonValue).join(", ");
  }
  if (value && typeof value === "object") {
    return Object.keys(value).join(", ");
  }
  return "";
}

export function mutationErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "문제가 생겼어요. 다시 시도해 주세요.";
}

export function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

export function nonnegativeNumber(value: string): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : 0;
}

export function positiveInteger(value: string): number {
  const numberValue = Math.trunc(Number(value));
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : 1;
}

function positiveNumberInputIsValid(value: string) {
  if (!value.trim()) {
    return false;
  }
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0;
}

function positiveIntegerInputIsValid(value: string) {
  if (!value.trim()) {
    return false;
  }
  const numberValue = Number(value);
  return Number.isInteger(numberValue) && numberValue >= 1;
}
