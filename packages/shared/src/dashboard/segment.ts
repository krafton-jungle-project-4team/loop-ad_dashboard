import { z } from "zod";
import { CountSchema, JsonObjectSchema, RateSchema } from "./schema-primitives.js";

export const DashboardCampaignSegmentSchema = z.object({
  analysis_id: z.string(),
  audience_snapshot_id: z.string().nullable(),
  allocation_plan_id: z.string().nullable(),
  audience_reservation_state: z.string().nullable(),
  audience_snapshot_kind: z.string().nullable(),
  final_user_count: CountSchema.nullable(),
  audience_min_sample_size: CountSchema.nullable(),
  audience_meets_min_sample_size: z.boolean().nullable(),
  audience_status: z.string().nullable(),
  audience_snapshot_status: z.string().nullable(),
  source_audience_snapshot_id: z.string().nullable(),
  promotion_id: z.string(),
  segment_id: z.string(),
  segment_name: z.string(),
  source: z.string().nullable(),
  natural_language_query: z.string().nullable(),
  rule_json: JsonObjectSchema,
  profile_json: JsonObjectSchema,
  content_brief_json: JsonObjectSchema,
  data_evidence_json: JsonObjectSchema,
  estimated_size: CountSchema,
  sample_size: CountSchema,
  total_eligible_user_count: CountSchema,
  sample_ratio: z.number().nonnegative(),
  goal_metric: z.string(),
  latest_actual_value: RateSchema.nullable(),
  ad_experiment_id: z.string().nullable(),
  next_action: z.string(),
  priority: z.string().nullable(),
  status: z.string()
});
export type DashboardCampaignSegment = z.infer<typeof DashboardCampaignSegmentSchema>;

export const DashboardSegmentPreviewRowSchema = z.record(z.string(), z.unknown());
export type DashboardSegmentPreviewRow = z.infer<typeof DashboardSegmentPreviewRowSchema>;

export const DashboardSegmentSampleSizeStatusSchema = z.enum([
  "valid",
  "too_small",
  "too_large",
  "failed"
]);
export type DashboardSegmentSampleSizeStatus = z.infer<
  typeof DashboardSegmentSampleSizeStatusSchema
>;

export const DashboardSegmentQueryPreviewRequestSchema = z.object({
  natural_language_query: z.string().min(1),
  base_time_range: z
    .object({
      from: z.string().datetime(),
      to: z.string().datetime()
    })
    .optional()
});
export type DashboardSegmentQueryPreviewRequest = z.infer<
  typeof DashboardSegmentQueryPreviewRequestSchema
>;

export const DashboardSegmentQueryPreviewSchema = z.object({
  query_preview_id: z.string(),
  generated_sql: z.string(),
  sample_size: CountSchema,
  total_eligible_user_count: CountSchema,
  sample_ratio: z.number().nonnegative(),
  sample_size_status: DashboardSegmentSampleSizeStatusSchema,
  columns: z.array(z.string()),
  rows: z.array(DashboardSegmentPreviewRowSchema)
});
export type DashboardSegmentQueryPreview = z.infer<typeof DashboardSegmentQueryPreviewSchema>;

export const DashboardSegmentAssistantMessageSchema = z.object({
  role: z.enum(["assistant", "user"]),
  content: z.string().trim().min(1).max(2_000)
});
export type DashboardSegmentAssistantMessage = z.infer<
  typeof DashboardSegmentAssistantMessageSchema
>;

export const DashboardSegmentAssistantRequestSchema = z.object({
  message: z.string().trim().min(1).max(2_000),
  conversation: z.array(DashboardSegmentAssistantMessageSchema).max(12).default([])
});
export type DashboardSegmentAssistantRequest = z.infer<
  typeof DashboardSegmentAssistantRequestSchema
>;

export const DashboardSegmentAssistantActionSchema = z.enum([
  "audience_query",
  "segment_preview",
  "clarification"
]);
export type DashboardSegmentAssistantAction = z.infer<typeof DashboardSegmentAssistantActionSchema>;

export const DashboardSegmentAssistantResponseSchema = z.object({
  action: DashboardSegmentAssistantActionSchema,
  assistant_message: z.string().min(1),
  segment_name: z.string().nullable(),
  lookback_days: CountSchema,
  condition_labels: z.array(z.string()),
  preview: DashboardSegmentQueryPreviewSchema.nullable()
});
export type DashboardSegmentAssistantResponse = z.infer<
  typeof DashboardSegmentAssistantResponseSchema
>;

export const DashboardSaveSegmentRequestSchema = z.object({
  query_preview_id: z.string().min(1),
  segment_name: z.string().min(1)
});
export type DashboardSaveSegmentRequest = z.infer<typeof DashboardSaveSegmentRequestSchema>;

export const DashboardSavedSegmentStatusSchema = z.enum(["active", "archived"]);
export type DashboardSavedSegmentStatus = z.infer<typeof DashboardSavedSegmentStatusSchema>;

export const DashboardSavedSegmentSchema = z.object({
  segment_id: z.string(),
  project_id: z.string(),
  segment_name: z.string(),
  source: z.literal("custom_chatkit"),
  query_preview_id: z.string(),
  natural_language_query: z.string().nullable(),
  generated_sql: z.string().nullable(),
  sample_size: CountSchema,
  total_eligible_user_count: CountSchema,
  sample_ratio: z.number().nonnegative(),
  status: DashboardSavedSegmentStatusSchema
});
export type DashboardSavedSegment = z.infer<typeof DashboardSavedSegmentSchema>;

export const DashboardPromotionSegmentSuggestionStatusSchema = z.enum([
  "suggested",
  "accepted",
  "dismissed",
  "confirmed"
]);
export type DashboardPromotionSegmentSuggestionStatus = z.infer<
  typeof DashboardPromotionSegmentSuggestionStatusSchema
>;

export const DashboardPromotionSegmentSuggestionSourceSchema = z.enum([
  "ai_generated",
  "ai_ranked_existing"
]);
export type DashboardPromotionSegmentSuggestionSource = z.infer<
  typeof DashboardPromotionSegmentSuggestionSourceSchema
>;

export const DashboardPromotionSegmentSuggestionPerformanceEstimateSchema = z.object({
  metric: z.string(),
  label: z.string(),
  availability: z.enum(["available", "unavailable"]).optional(),
  unit: z.string().optional(),
  value: RateSchema.optional(),
  formatted: z.string().optional(),
  expected_count: z.number().nonnegative().optional(),
  expected_count_formatted: z.string().optional(),
  expected_count_label: z.string().optional(),
  observed_value: RateSchema.optional(),
  basis_label: z.string().optional(),
  window_days: CountSchema.optional(),
  window_label: z.string().optional(),
  confidence_label: z.enum(["high", "medium", "low"]).optional(),
  confidence_reason: z.string().optional(),
  unavailable_reason: z.string().optional(),
  method: z.string().optional(),
  prior_user_count: CountSchema.optional(),
  calibration_status: z.string().optional()
});
export type DashboardPromotionSegmentSuggestionPerformanceEstimate = z.infer<
  typeof DashboardPromotionSegmentSuggestionPerformanceEstimateSchema
>;

export function normalizePromotionSegmentPerformanceEstimate(
  value: unknown
): DashboardPromotionSegmentSuggestionPerformanceEstimate | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const raw = value as Record<string, unknown>;
  const metric = normalizedNonEmptyString(raw.metric);
  const label = normalizedNonEmptyString(raw.label);
  if (!metric || !label) {
    return undefined;
  }

  const estimatedValue = normalizedRate(raw.value);
  const requestedAvailability = normalizedNonEmptyString(raw.availability);
  const hasRawValue = raw.value !== undefined && raw.value !== null && raw.value !== "";
  if (hasRawValue && estimatedValue === null) {
    return undefined;
  }
  const availability =
    requestedAvailability === "unavailable" || estimatedValue === null
      ? "unavailable"
      : "available";
  const confidenceLabel = normalizedNonEmptyString(raw.confidence_label);
  const expectedCount = normalizedNonNegativeNumber(raw.expected_count);
  return {
    metric,
    label,
    availability,
    unit: normalizedNonEmptyString(raw.unit) ?? undefined,
    value: estimatedValue ?? undefined,
    formatted: estimatedValue === null ? undefined : `${(estimatedValue * 100).toFixed(1)}%`,
    expected_count: expectedCount ?? undefined,
    expected_count_formatted:
      expectedCount === null ? undefined : `약 ${expectedCount.toFixed(1)}명`,
    expected_count_label: normalizedNonEmptyString(raw.expected_count_label) ?? undefined,
    observed_value: normalizedRate(raw.observed_value) ?? undefined,
    basis_label: normalizedNonEmptyString(raw.basis_label) ?? undefined,
    window_days: normalizedPositiveCount(raw.window_days) ?? undefined,
    window_label: normalizedNonEmptyString(raw.window_label) ?? undefined,
    confidence_label:
      confidenceLabel === "high" || confidenceLabel === "medium" || confidenceLabel === "low"
        ? confidenceLabel
        : undefined,
    confidence_reason: normalizedNonEmptyString(raw.confidence_reason) ?? undefined,
    unavailable_reason: normalizedNonEmptyString(raw.unavailable_reason) ?? undefined,
    method: normalizedNonEmptyString(raw.method) ?? undefined,
    prior_user_count: normalizedCount(raw.prior_user_count) ?? undefined,
    calibration_status: normalizedNonEmptyString(raw.calibration_status) ?? undefined
  };
}

export const DashboardPromotionSegmentSuggestionAudienceSchema = z.object({
  total_eligible_user_count: CountSchema,
  matching_user_count: CountSchema,
  selected_user_count: CountSchema,
  matching_user_ratio: RateSchema.optional(),
  selected_user_ratio: RateSchema.optional(),
  selection_ratio_within_matching: RateSchema.optional(),
  selection_limited: z.boolean().optional(),
  selection_basis: z.string().optional(),
  selected_user_role: z.string().optional()
});
export type DashboardPromotionSegmentSuggestionAudience = z.infer<
  typeof DashboardPromotionSegmentSuggestionAudienceSchema
>;

export function normalizePromotionSegmentAudience(
  value: unknown
): DashboardPromotionSegmentSuggestionAudience | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const raw = value as Record<string, unknown>;
  const totalEligibleUserCount = normalizedCount(raw.total_eligible_user_count);
  const matchingUserCount = normalizedCount(raw.matching_user_count);
  const selectedUserCount = normalizedCount(raw.selected_user_count);
  if (totalEligibleUserCount === null || matchingUserCount === null || selectedUserCount === null) {
    return undefined;
  }
  return {
    total_eligible_user_count: totalEligibleUserCount,
    matching_user_count: matchingUserCount,
    selected_user_count: selectedUserCount,
    matching_user_ratio: normalizedRate(raw.matching_user_ratio) ?? undefined,
    selected_user_ratio: normalizedRate(raw.selected_user_ratio) ?? undefined,
    selection_ratio_within_matching:
      normalizedRate(raw.selection_ratio_within_matching) ?? undefined,
    selection_limited:
      typeof raw.selection_limited === "boolean" ? raw.selection_limited : undefined,
    selection_basis: normalizedNonEmptyString(raw.selection_basis) ?? undefined,
    selected_user_role: normalizedNonEmptyString(raw.selected_user_role) ?? undefined
  };
}

export const DashboardPromotionSegmentSuggestionRankComparisonSchema = z.object({
  reference_rank: CountSchema,
  metric: z.string(),
  metric_label: z.string(),
  direction: z.enum(["higher", "lower", "similar"]),
  delta_percentage_points: z.number(),
  summary: z.string()
});
export type DashboardPromotionSegmentSuggestionRankComparison = z.infer<
  typeof DashboardPromotionSegmentSuggestionRankComparisonSchema
>;

export function normalizePromotionSegmentRankComparison(
  value: unknown
): DashboardPromotionSegmentSuggestionRankComparison | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const raw = value as Record<string, unknown>;
  const referenceRank = normalizedPositiveCount(raw.reference_rank);
  const metric = normalizedNonEmptyString(raw.metric);
  const metricLabel = normalizedNonEmptyString(raw.metric_label);
  const direction = normalizedNonEmptyString(raw.direction);
  const deltaPercentagePoints = normalizedNumber(raw.delta_percentage_points);
  const summary = normalizedNonEmptyString(raw.summary);
  if (
    referenceRank === null ||
    !metric ||
    !metricLabel ||
    (direction !== "higher" && direction !== "lower" && direction !== "similar") ||
    deltaPercentagePoints === null ||
    !summary
  ) {
    return undefined;
  }
  return {
    reference_rank: referenceRank,
    metric,
    metric_label: metricLabel,
    direction,
    delta_percentage_points: deltaPercentagePoints,
    summary
  };
}

function normalizedNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalizedRate(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), 1) : null;
}

function normalizedCount(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : null;
}

function normalizedPositiveCount(value: unknown): number | null {
  const count = normalizedCount(value);
  return count !== null && count > 0 ? count : null;
}

function normalizedNumber(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizedNonNegativeNumber(value: unknown): number | null {
  const number = normalizedNumber(value);
  return number === null ? null : Math.max(0, number);
}

export const DashboardPromotionSegmentSuggestionDisplayCopySchema = z.object({
  title: z.string(),
  strategy_role: z.string().optional(),
  strength_summary: z.string().optional(),
  tradeoff_summary: z.string().optional(),
  rank_role: z.string().optional(),
  recommendation_tier: z.enum(["primary", "small_high_intent"]).optional(),
  recommendation_tier_label: z.string().optional(),
  recommendation_tier_reason: z.string().optional(),
  recommendation_rank: CountSchema.optional(),
  rank_eligible: z.boolean().optional(),
  minimum_primary_sample_size: CountSchema.optional(),
  audience_summary: z.string(),
  audience: DashboardPromotionSegmentSuggestionAudienceSchema.optional(),
  performance_estimate: DashboardPromotionSegmentSuggestionPerformanceEstimateSchema.optional(),
  signal_chips: z.array(z.string()),
  reason: z.string(),
  difference_summary: z.string().optional(),
  rank_comparison: DashboardPromotionSegmentSuggestionRankComparisonSchema.optional(),
  action_hint: z.string()
});
export type DashboardPromotionSegmentSuggestionDisplayCopy = z.infer<
  typeof DashboardPromotionSegmentSuggestionDisplayCopySchema
>;

export const DashboardPromotionSegmentSuggestionReportSchema = z.object({
  version: z.string().optional(),
  source: z.string().optional(),
  title: z.string(),
  summary: z.string(),
  promotion_interpretation: z.array(z.string()).optional(),
  why_recommended: z.array(z.string()),
  evidence: z.array(z.string()),
  candidate_strengths: z.array(z.string()).optional(),
  selection_considerations: z.array(z.string()).optional(),
  difference_from_other_ranks: z.array(z.string()).optional(),
  action_hint: z.string(),
  caution: z.string(),
  confidence_label: z.enum(["high", "medium", "low"]).optional()
});
export type DashboardPromotionSegmentSuggestionReport = z.infer<
  typeof DashboardPromotionSegmentSuggestionReportSchema
>;

export const DashboardPromotionSegmentSuggestionSchema = z.object({
  suggestion_id: z.string(),
  analysis_id: z.string(),
  audience_snapshot_id: z.string().nullable(),
  campaign_id: z.string(),
  promotion_id: z.string(),
  segment_id: z.string(),
  suggested_rank: CountSchema,
  suggestion_source: DashboardPromotionSegmentSuggestionSourceSchema,
  suggestion_status: DashboardPromotionSegmentSuggestionStatusSchema,
  score_json: JsonObjectSchema,
  reason_json: JsonObjectSchema,
  display_copy: DashboardPromotionSegmentSuggestionDisplayCopySchema.nullable(),
  ai_report: DashboardPromotionSegmentSuggestionReportSchema.nullable(),
  segment_name: z.string(),
  segment_source: z.enum(["ai_suggested", "custom_chatkit", "manual_rule", "system_default"]),
  rule_json: JsonObjectSchema,
  profile_json: JsonObjectSchema,
  sample_size: CountSchema,
  sample_ratio: z.number().nonnegative(),
  created_at: z.string(),
  updated_at: z.string(),
  decided_at: z.string().nullable()
});
export type DashboardPromotionSegmentSuggestion = z.infer<
  typeof DashboardPromotionSegmentSuggestionSchema
>;

export const DashboardAudienceAllocationPreviewSegmentSchema = z.object({
  segment_id: z.string(),
  allocated_user_count: CountSchema,
  targetable: z.boolean(),
  meets_min_sample_size: z.boolean(),
  audience_status: z.string()
});
export type DashboardAudienceAllocationPreviewSegment = z.infer<
  typeof DashboardAudienceAllocationPreviewSegmentSchema
>;

export const DashboardAudienceAllocationPreviewSchema = z.object({
  selected_segment_ids: z.array(z.string()),
  candidate_batch_analysis_id: z.string(),
  exclusion_revision: CountSchema,
  preview_version: z.string(),
  allocation_policy_version: z.string(),
  allocation_policy_hash: z.string(),
  total_allocated_user_count: CountSchema,
  per_segment: z.array(DashboardAudienceAllocationPreviewSegmentSchema)
});
export type DashboardAudienceAllocationPreview = z.infer<
  typeof DashboardAudienceAllocationPreviewSchema
>;

export const DashboardAudienceAllocationPreviewContextSchema = z.object({
  preview_version: z.string(),
  candidate_batch_analysis_id: z.string(),
  candidate_segment_ids: z.array(z.string()),
  exclusion_revision: CountSchema,
  allocation_policy_version: z.string(),
  allocation_policy_hash: z.string(),
  allocation_previews: z.array(DashboardAudienceAllocationPreviewSchema)
});
export type DashboardAudienceAllocationPreviewContext = z.infer<
  typeof DashboardAudienceAllocationPreviewContextSchema
>;

export const DashboardPromotionSegmentSuggestionListSchema = z.object({
  suggestions: z.array(DashboardPromotionSegmentSuggestionSchema),
  audience_allocation_preview_context: DashboardAudienceAllocationPreviewContextSchema.nullable()
});
export type DashboardPromotionSegmentSuggestionList = z.infer<
  typeof DashboardPromotionSegmentSuggestionListSchema
>;

export const DashboardDecideSegmentSuggestionRequestSchema = z.object({
  status: z.enum(["suggested", "accepted", "dismissed"])
});
export type DashboardDecideSegmentSuggestionRequest = z.infer<
  typeof DashboardDecideSegmentSuggestionRequestSchema
>;

const DashboardConfirmSegmentSelectionIdsSchema = z
  .array(z.string().trim().min(1))
  .refine((ids) => new Set(ids).size === ids.length, "selection ids must not contain duplicates");

export const DashboardConfirmSegmentSuggestionsRequestSchema = z
  .object({
    analysis_id: z.string().trim().min(1).nullable(),
    suggestion_ids: DashboardConfirmSegmentSelectionIdsSchema,
    segment_ids: DashboardConfirmSegmentSelectionIdsSchema,
    confirmed_by: z.string().min(1).nullable().optional()
  })
  .superRefine((request, context) => {
    if (request.suggestion_ids.length > 0 && request.analysis_id === null) {
      context.addIssue({
        code: "custom",
        message: "analysis_id is required when suggestion_ids are provided",
        path: ["analysis_id"]
      });
    }

    if (request.suggestion_ids.length === 0 && request.segment_ids.length === 0) {
      context.addIssue({
        code: "custom",
        message: "at least one suggestion_id or segment_id is required",
        path: ["suggestion_ids"]
      });
    }

    if (request.suggestion_ids.length > 3) {
      context.addIssue({
        code: "custom",
        message: "at most three suggestion_ids can be confirmed together",
        path: ["suggestion_ids"]
      });
    }
  });
export type DashboardConfirmSegmentSuggestionsRequest = z.infer<
  typeof DashboardConfirmSegmentSuggestionsRequestSchema
>;

export const DashboardConfirmSegmentSuggestionsResultSchema = z.object({
  analysis_id: z.string(),
  promotion_id: z.string(),
  confirmed_segment_count: CountSchema,
  status: z.literal("confirmed"),
  target_segments: z.array(
    z.object({
      segment_id: z.string(),
      audience_snapshot_id: z.string().nullable(),
      final_audience_count: CountSchema.nullable(),
      meets_min_sample_size: z.boolean().nullable(),
      targetable: z.boolean().nullable(),
      audience_status: z.string().nullable()
    })
  )
});
export type DashboardConfirmSegmentSuggestionsResult = z.infer<
  typeof DashboardConfirmSegmentSuggestionsResultSchema
>;

export const DashboardRecommendPromotionSegmentsRequestSchema = z.object({
  operator_instruction: z.string().trim().min(1).max(2_000).nullable().optional(),
  segment_instruction: z.string().trim().min(1).max(2_000).nullable().optional()
});
export type DashboardRecommendPromotionSegmentsRequest = z.infer<
  typeof DashboardRecommendPromotionSegmentsRequestSchema
>;

export const DashboardPromotionAnalysisTargetSegmentSchema = z.object({
  segment_id: z.string(),
  segment_name: z.string(),
  segment_vector_id: z.string(),
  estimated_size: CountSchema,
  audience_snapshot_id: z.string().nullable().optional(),
  eligible_user_count: CountSchema.nullable().optional(),
  behavior_match_count: CountSchema.nullable().optional(),
  final_audience_count: CountSchema.nullable().optional(),
  meets_min_sample_size: z.boolean().nullable().optional(),
  targetable: z.boolean().nullable().optional(),
  audience_status: z.string().nullable().optional(),
  selection_method: z.string().nullable().optional(),
  recall_lower_bound: z.number().nullable().optional(),
  content_brief: z.object({
    message_direction: z.string(),
    keywords: z.array(z.string())
  })
});
export type DashboardPromotionAnalysisTargetSegment = z.infer<
  typeof DashboardPromotionAnalysisTargetSegmentSchema
>;

export const DashboardPromotionAnalysisResultSchema = z.object({
  analysis_id: z.string(),
  promotion_id: z.string(),
  status: z.string(),
  target_segments: z.array(DashboardPromotionAnalysisTargetSegmentSchema).default([])
});
export type DashboardPromotionAnalysisResult = z.infer<
  typeof DashboardPromotionAnalysisResultSchema
>;

export const DashboardAnalyzePromotionSegmentsRequestSchema = z.object({
  segment_ids: z
    .array(z.string().trim().min(1))
    .min(1)
    .max(3)
    .refine(
      (segmentIds) => new Set(segmentIds).size === segmentIds.length,
      "segment_ids must not contain duplicates"
    ),
  operator_instruction: z.string().nullable().optional()
});
export type DashboardAnalyzePromotionSegmentsRequest = z.infer<
  typeof DashboardAnalyzePromotionSegmentsRequestSchema
>;

export const DashboardPromotionScopedSegmentSourceSchema = z.enum([
  "custom_chatkit",
  "manual_rule"
]);
export type DashboardPromotionScopedSegmentSource = z.infer<
  typeof DashboardPromotionScopedSegmentSourceSchema
>;

export const DashboardPromotionScopedSegmentDefinitionSchema = z.object({
  segment_id: z.string(),
  campaign_id: z.string(),
  promotion_id: z.string(),
  segment_name: z.string(),
  source: DashboardPromotionScopedSegmentSourceSchema,
  query_preview_id: z.string().nullable(),
  natural_language_query: z.string().nullable(),
  generated_sql: z.string().nullable(),
  rule_json: JsonObjectSchema,
  profile_json: JsonObjectSchema,
  sample_size: CountSchema,
  total_eligible_user_count: CountSchema,
  sample_ratio: z.number().nonnegative(),
  status: DashboardSavedSegmentStatusSchema
});
export type DashboardPromotionScopedSegmentDefinition = z.infer<
  typeof DashboardPromotionScopedSegmentDefinitionSchema
>;

export const DashboardPromotionScopedSegmentDefinitionListSchema = z.object({
  segments: z.array(DashboardPromotionScopedSegmentDefinitionSchema)
});
export type DashboardPromotionScopedSegmentDefinitionList = z.infer<
  typeof DashboardPromotionScopedSegmentDefinitionListSchema
>;

export const DashboardArchivePromotionScopedSegmentDefinitionResultSchema = z.object({
  promotion_id: z.string(),
  segment_id: z.string(),
  status: z.literal("archived")
});
export type DashboardArchivePromotionScopedSegmentDefinitionResult = z.infer<
  typeof DashboardArchivePromotionScopedSegmentDefinitionResultSchema
>;

export const DashboardCreatePromotionSegmentDefinitionRequestSchema = z.object({
  segment_name: z.string().min(1),
  source: DashboardPromotionScopedSegmentSourceSchema.default("manual_rule"),
  query_preview_id: z.string().min(1).nullable().optional(),
  natural_language_query: z.string().nullable().optional(),
  rule_json: JsonObjectSchema.default({}),
  profile_json: JsonObjectSchema.default({}),
  sample_size: CountSchema.default(0),
  total_eligible_user_count: CountSchema.default(0),
  sample_ratio: z.number().nonnegative().default(0)
});
export type DashboardCreatePromotionSegmentDefinitionRequest = z.infer<
  typeof DashboardCreatePromotionSegmentDefinitionRequestSchema
>;

export const DashboardSegmentPrioritySchema = z.enum(["low", "medium", "high"]);
export type DashboardSegmentPriority = z.infer<typeof DashboardSegmentPrioritySchema>;

export const DashboardPromotionSegmentStatusSchema = z.enum([
  "planned",
  "content_ready",
  "approved",
  "running",
  "goal_met",
  "goal_not_met",
  "insufficient_data",
  "stopped"
]);
export type DashboardPromotionSegmentStatus = z.infer<typeof DashboardPromotionSegmentStatusSchema>;

export const DashboardAttachSegmentRequestSchema = z.object({
  segment_id: z.string().min(1),
  segment_name: z.string().min(1).optional(),
  priority: DashboardSegmentPrioritySchema.nullable().optional(),
  status: DashboardPromotionSegmentStatusSchema.default("planned")
});
export type DashboardAttachSegmentRequest = z.infer<typeof DashboardAttachSegmentRequestSchema>;

export const DashboardUpdatePromotionSegmentRequestSchema = z.object({
  segment_name: z.string().min(1).optional(),
  priority: DashboardSegmentPrioritySchema.nullable().optional(),
  status: DashboardPromotionSegmentStatusSchema.optional()
});
export type DashboardUpdatePromotionSegmentRequest = z.infer<
  typeof DashboardUpdatePromotionSegmentRequestSchema
>;

export const DashboardDeletePromotionSegmentResultSchema = z.object({
  promotion_id: z.string(),
  segment_id: z.string(),
  status: z.literal("stopped")
});
export type DashboardDeletePromotionSegmentResult = z.infer<
  typeof DashboardDeletePromotionSegmentResultSchema
>;

export const DashboardStartNextLoopRequestSchema = z.object({
  focus_segment_ids: z.array(z.string().min(1)).min(1),
  operator_instruction: z.string().nullable().optional()
});
export type DashboardStartNextLoopRequest = z.infer<typeof DashboardStartNextLoopRequestSchema>;

export const DashboardNextLoopAnalysisSchema = z.object({
  analysis_id: z.string(),
  promotion_id: z.string(),
  focus_segment_ids: z.array(z.string()),
  status: z.literal("requested")
});
export type DashboardNextLoopAnalysis = z.infer<typeof DashboardNextLoopAnalysisSchema>;
