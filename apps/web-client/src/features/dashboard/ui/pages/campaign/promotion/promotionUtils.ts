import {
  DashboardPromotionChannelSchema,
  DashboardPromotionGoalBasisSchema,
  DashboardPromotionGoalMetricSchema,
  DashboardPromotionStatusSchema,
  normalizePromotionSegmentAudience,
  normalizePromotionSegmentPerformanceEstimate,
  normalizePromotionSegmentRankComparison,
  type DashboardCampaignPromotion,
  type DashboardCampaignSegment,
  type DashboardCreatePromotionSegmentDefinitionRequest,
  type DashboardCreatePromotionRequest,
  type DashboardUpdatePromotionRequest,
  type DashboardPromotionSegmentSuggestion,
  type DashboardSegmentDetail
} from "@loopad/shared";
import { formatInteger } from "../../../../model/dashboard-format.js";
import { formatMetricLabel } from "../../../../model/dashboard-labels.js";

export const promotionChannelOptions = DashboardPromotionChannelSchema.options;
export const promotionStatusOptions = DashboardPromotionStatusSchema.options;

export const promotionGoalMetricOptions = DashboardPromotionGoalMetricSchema.options.map(
  (metric) => ({ label: formatMetricLabel(metric), value: metric })
);
export const promotionGoalBasisOptions = DashboardPromotionGoalBasisSchema.options;
export const defaultPromotionLandingUrl =
  "https://demo-shoppingmall.dev.loop-ad.org/search?deal=summer";
export const onsiteBannerImagePollIntervalMs = 3000;
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
  landingUrl: string;
  marketingTheme: string;
  maxLoopCount: string;
  messageBrief: string;
  minSampleSize: string;
};

export function createEmptyPromotionFormState(): PromotionCreateFormState {
  return {
    channel: "email",
    goalBasis: "promotion_average",
    goalMetric: "inflow_rate",
    goalTargetValue: "0.1",
    landingUrl: defaultPromotionLandingUrl,
    marketingTheme: "",
    maxLoopCount: "3",
    messageBrief: "",
    minSampleSize: "1000"
  };
}

export function promotionToFormState(
  promotion: DashboardCampaignPromotion
): PromotionCreateFormState {
  return {
    channel: promotion.channel,
    goalBasis: promotion.goal_basis,
    goalMetric: promotion.goal_metric as PromotionCreateFormState["goalMetric"],
    goalTargetValue: String(promotion.goal_target_value),
    landingUrl: promotion.landing_url ?? "",
    marketingTheme: promotion.marketing_theme,
    maxLoopCount: String(promotion.max_loop_count),
    messageBrief: promotion.message_brief ?? "",
    minSampleSize: String(promotion.min_sample_size)
  };
}

export function promotionCreateFormToRequest(
  form: PromotionCreateFormState
): DashboardCreatePromotionRequest {
  return {
    channel: form.channel as DashboardCreatePromotionRequest["channel"],
    goal_basis: form.goalBasis as DashboardCreatePromotionRequest["goal_basis"],
    goal_metric: form.goalMetric,
    goal_target_value: nonnegativeNumber(form.goalTargetValue),
    landing_url: form.landingUrl.trim(),
    marketing_theme: form.marketingTheme.trim(),
    max_loop_count: positiveInteger(form.maxLoopCount),
    message_brief: form.messageBrief.trim() || null,
    min_sample_size: Math.trunc(nonnegativeNumber(form.minSampleSize)),
    status: "draft"
  };
}

export function promotionFormToUpdateRequest(
  form: PromotionCreateFormState,
  status: DashboardUpdatePromotionRequest["status"]
): DashboardUpdatePromotionRequest {
  return {
    ...promotionCreateFormToRequest(form),
    status
  };
}

export function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value.trim());

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export type PromotionSegmentCreateFormState = {
  naturalLanguageQuery: string;
  ruleJsonText: string;
  sampleRatio: string;
  sampleSize: string;
  segmentName: string;
  totalEligibleUserCount: string;
};

export function createEmptyPromotionSegmentFormState(): PromotionSegmentCreateFormState {
  return {
    naturalLanguageQuery: "",
    ruleJsonText: JSON.stringify({ source: "manual_rule" }, null, 2),
    sampleRatio: "0",
    sampleSize: "0",
    segmentName: "",
    totalEligibleUserCount: "0"
  };
}

export function promotionSegmentCreateFormToRequest(
  form: PromotionSegmentCreateFormState
): DashboardCreatePromotionSegmentDefinitionRequest {
  const sampleSize = Math.trunc(nonnegativeNumber(form.sampleSize));
  const totalEligibleUserCount = Math.trunc(nonnegativeNumber(form.totalEligibleUserCount));

  return {
    natural_language_query: form.naturalLanguageQuery.trim() || null,
    profile_json: {
      source: "dashboard_manual",
      total_eligible_user_count: totalEligibleUserCount
    },
    rule_json: parseJsonObject(form.ruleJsonText) ?? {},
    sample_ratio: nonnegativeNumber(form.sampleRatio),
    sample_size: sampleSize,
    segment_name: form.segmentName.trim(),
    source: "manual_rule",
    total_eligible_user_count: totalEligibleUserCount
  };
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

  return {
    title,
    rank_role: nonEmptyText(raw.rank_role) ?? undefined,
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

export function contentCandidateTitle(
  candidate: DashboardSegmentDetail["content_candidates"][number]
) {
  return candidate.title ?? candidate.subject ?? candidate.message ?? candidate.content_id;
}

export function contentCandidateMessage(
  candidate: DashboardSegmentDetail["content_candidates"][number]
) {
  return candidate.body ?? candidate.message ?? candidate.generation_prompt ?? "-";
}

export function hasPendingOnsiteBannerImage(detail: DashboardSegmentDetail | undefined) {
  return Boolean(
    detail?.content_candidates.some(
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
  if (status.includes("goal_met") || status === "active" || status === "running") {
    return "default" as const;
  }
  if (status.includes("not_met") || status === "failed" || status === "stopped") {
    return "destructive" as const;
  }
  if (status.includes("insufficient") || status.includes("near")) {
    return "secondary" as const;
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

export function parseJsonObject(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function segmentWorkflowCurrentStep({
  candidateCount,
  confirmedCandidateCount,
  selectedCandidateCount
}: {
  candidateCount: number;
  confirmedCandidateCount: number;
  selectedCandidateCount: number;
}): 1 | 2 | 3 | 4 {
  if (confirmedCandidateCount > 0) {
    return 4;
  }
  if (selectedCandidateCount > 0) {
    return 3;
  }
  return candidateCount > 0 ? 2 : 1;
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
