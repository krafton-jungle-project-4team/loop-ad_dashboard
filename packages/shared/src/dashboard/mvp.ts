import { z } from "zod";
import { DashboardCampaignSummarySchema } from "./campaign.js";
import { DashboardCampaignPromotionSchema, DashboardPromotionSummarySchema } from "./promotion.js";
import {
  DashboardCampaignRealtimeMetricsSchema,
  DashboardPromotionRealtimeMetricsSchema,
  DashboardRealtimeMetricsSchema,
  DashboardSegmentRealtimeMetricsSchema,
  DashboardSegmentRealtimeSummarySchema
} from "./realtime.js";
import { CountSchema, JsonObjectSchema, RateSchema } from "./schema-primitives.js";

export * from "./campaign.js";
export * from "./funnel.js";
export * from "./project.js";
export * from "./promotion.js";
export * from "./realtime.js";

export const DashboardCampaignSegmentSchema = z.object({
  analysis_id: z.string(),
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

export const DashboardContentCandidateSchema = z.object({
  content_id: z.string(),
  content_option_id: z.string(),
  generation_id: z.string(),
  analysis_id: z.string(),
  promotion_id: z.string(),
  segment_id: z.string(),
  channel: z.string(),
  subject: z.string().nullable(),
  preheader: z.string().nullable(),
  title: z.string().nullable(),
  body: z.string().nullable(),
  cta: z.string().nullable(),
  message: z.string().nullable(),
  image_prompt: z.string().nullable(),
  image_url: z.string().nullable(),
  landing_url: z.string().nullable(),
  generation_prompt: z.string().nullable(),
  reason_summary: z.string().nullable(),
  data_evidence_json: JsonObjectSchema,
  message_strategy: z.string().nullable(),
  metadata_json: JsonObjectSchema,
  status: z.string(),
  updated_at: z.string()
});
export type DashboardContentCandidate = z.infer<typeof DashboardContentCandidateSchema>;

export const DashboardStartPromotionGenerationRequestSchema = z.object({
  analysis_id: z.string().min(1),
  content_option_count: z.number().int().min(1).max(10).optional(),
  operator_instruction: z.string().nullable().optional()
});
export type DashboardStartPromotionGenerationRequest = z.infer<
  typeof DashboardStartPromotionGenerationRequestSchema
>;

export const DashboardStartPromotionGenerationResultSchema = z.object({
  generation_id: z.string(),
  promotion_id: z.string(),
  status: z.string(),
  content_candidate_count: CountSchema.optional()
});
export type DashboardStartPromotionGenerationResult = z.infer<
  typeof DashboardStartPromotionGenerationResultSchema
>;

export const DashboardApproveContentCandidateRequestSchema = z.object({
  operator_note: z.string().nullable().optional()
});
export type DashboardApproveContentCandidateRequest = z.infer<
  typeof DashboardApproveContentCandidateRequestSchema
>;

export const DashboardApproveContentCandidateResultSchema = z.object({
  content_id: z.string(),
  content_option_id: z.string(),
  promotion_id: z.string(),
  segment_id: z.string(),
  status: z.literal("approved")
});
export type DashboardApproveContentCandidateResult = z.infer<
  typeof DashboardApproveContentCandidateResultSchema
>;

export const DashboardRejectContentCandidateRequestSchema = z.object({
  operator_note: z.string().nullable().optional()
});
export type DashboardRejectContentCandidateRequest = z.infer<
  typeof DashboardRejectContentCandidateRequestSchema
>;

export const DashboardRejectContentCandidateResultSchema = z.object({
  content_id: z.string(),
  promotion_id: z.string(),
  segment_id: z.string(),
  status: z.literal("rejected"),
  rejected_at: z.string()
});
export type DashboardRejectContentCandidateResult = z.infer<
  typeof DashboardRejectContentCandidateResultSchema
>;

export const DashboardAdExperimentSchema = z.object({
  ad_experiment_id: z.string(),
  promotion_run_id: z.string(),
  promotion_id: z.string(),
  segment_id: z.string(),
  content_id: z.string(),
  content_option_id: z.string(),
  channel: z.string(),
  loop_count: CountSchema,
  goal_metric: z.string(),
  goal_target_value: z.number().nonnegative(),
  goal_basis: z.string(),
  assignment_count: CountSchema.default(0),
  status: z.string()
});
export type DashboardAdExperiment = z.infer<typeof DashboardAdExperimentSchema>;

export const DashboardStartAdExperimentResultSchema = DashboardAdExperimentSchema.extend({
  status: z.literal("running")
});
export type DashboardStartAdExperimentResult = z.infer<
  typeof DashboardStartAdExperimentResultSchema
>;

export const DashboardCreatePromotionRunRequestSchema = z.object({
  analysis_id: z.string().min(1).optional(),
  generation_id: z.string().min(1).optional(),
  loop_count: z.number().int().min(1).default(1)
});
export type DashboardCreatePromotionRunRequest = z.infer<
  typeof DashboardCreatePromotionRunRequestSchema
>;

export const DashboardPromotionRunAdExperimentSchema = z.object({
  ad_experiment_id: z.string(),
  segment_id: z.string(),
  segment_name: z.string().nullable().optional(),
  content_id: z.string(),
  content_option_id: z.string(),
  channel: z.string(),
  loop_count: CountSchema,
  status: z.string()
});
export type DashboardPromotionRunAdExperiment = z.infer<
  typeof DashboardPromotionRunAdExperimentSchema
>;

export const DashboardCreatePromotionRunResultSchema = z.object({
  promotion_run_id: z.string(),
  project_id: z.string(),
  campaign_id: z.string(),
  promotion_id: z.string(),
  analysis_id: z.string(),
  generation_id: z.string(),
  loop_count: CountSchema,
  status: z.string(),
  goal_snapshot_json: JsonObjectSchema,
  ad_experiments: z.array(DashboardPromotionRunAdExperimentSchema)
});
export type DashboardCreatePromotionRunResult = z.infer<
  typeof DashboardCreatePromotionRunResultSchema
>;

export const DashboardBuildPromotionRunAssignmentsResultSchema = z.object({
  promotion_run_id: z.string(),
  matching_mode: z.string(),
  vector_version: z.string(),
  ann_candidate_limit: CountSchema,
  ann_candidate_count: CountSchema,
  exact_reranked_pair_count: CountSchema,
  assignment_count: CountSchema,
  batch_has_fallback: z.boolean(),
  fallback_count: CountSchema,
  below_threshold_fallback_count: CountSchema,
  no_candidate_fallback_count: CountSchema,
  invalid_user_vector_fallback_count: CountSchema,
  ann_underfilled_user_count: CountSchema,
  skipped_existing_count: CountSchema,
  insufficient_segment_count: CountSchema,
  status: z.string()
});
export type DashboardBuildPromotionRunAssignmentsResult = z.infer<
  typeof DashboardBuildPromotionRunAssignmentsResultSchema
>;

export const DashboardEvaluatePromotionRunRequestSchema = z.object({});
export type DashboardEvaluatePromotionRunRequest = z.infer<
  typeof DashboardEvaluatePromotionRunRequestSchema
>;

export const DashboardPromotionRunAdExperimentEvaluationSchema = z.object({
  ad_experiment_id: z.string(),
  segment_id: z.string(),
  actual_value: z.coerce.number().nonnegative(),
  status: z.string()
});
export type DashboardPromotionRunAdExperimentEvaluation = z.infer<
  typeof DashboardPromotionRunAdExperimentEvaluationSchema
>;

export const DashboardEvaluatePromotionRunResultSchema = z.object({
  promotion_run_id: z.string(),
  promotion_id: z.string(),
  status: z.string(),
  ad_experiment_results: z.array(DashboardPromotionRunAdExperimentEvaluationSchema),
  next_loop_required: z.boolean(),
  failed_segment_ids: z.array(z.string()),
  failed_ad_experiment_ids: z.array(z.string())
});
export type DashboardEvaluatePromotionRunResult = z.infer<
  typeof DashboardEvaluatePromotionRunResultSchema
>;

export const DashboardCreateNextLoopRequestSchema = z.object({
  failed_segment_ids: z.array(z.string()).default([]),
  failed_ad_experiment_ids: z.array(z.string()).default([]),
  operator_instruction: z.string().nullable().optional()
});
export type DashboardCreateNextLoopRequest = z.infer<typeof DashboardCreateNextLoopRequestSchema>;

export const DashboardCreateNextLoopResultSchema = z.object({
  previous_promotion_run_id: z.string(),
  next_promotion_run_id: z.string().nullable(),
  promotion_id: z.string(),
  loop_count: CountSchema,
  next_analysis_id: z.string().nullable(),
  next_generation_id: z.string().nullable(),
  next_ad_experiments: z.array(DashboardPromotionRunAdExperimentSchema)
});
export type DashboardCreateNextLoopResult = z.infer<typeof DashboardCreateNextLoopResultSchema>;

export const DashboardCampaignExperimentMetricSchema = z.object({
  promotion_id: z.string(),
  promotion_run_id: z.string(),
  ad_experiment_id: z.string().nullable(),
  segment_id: z.string().nullable(),
  content_id: z.string().nullable(),
  content_option_id: z.string().nullable(),
  metric: z.string(),
  target_value: z.number().nonnegative(),
  actual_value: z.number().nonnegative(),
  numerator_count: CountSchema,
  denominator_count: CountSchema,
  sample_size: CountSchema,
  basis: z.string(),
  status: z.string(),
  feedback: z.string().nullable(),
  next_loop_required: z.boolean(),
  result_json: JsonObjectSchema,
  created_at: z.string()
});
export type DashboardCampaignExperimentMetric = z.infer<
  typeof DashboardCampaignExperimentMetricSchema
>;

export const DashboardMainSchema = z.object({
  campaigns: z.array(DashboardCampaignSummarySchema),
  realtime_metrics: DashboardRealtimeMetricsSchema
});
export type DashboardMain = z.infer<typeof DashboardMainSchema>;

export const DashboardCampaignDetailSchema = z.object({
  campaign: DashboardCampaignSummarySchema,
  promotions: z.array(DashboardCampaignPromotionSchema),
  segments: z.array(DashboardCampaignSegmentSchema),
  ad_experiments: z.array(DashboardAdExperimentSchema),
  content_candidates: z.array(DashboardContentCandidateSchema),
  experiment_metrics: z.array(DashboardCampaignExperimentMetricSchema),
  realtime_metrics: DashboardCampaignRealtimeMetricsSchema
});
export type DashboardCampaignDetail = z.infer<typeof DashboardCampaignDetailSchema>;

export const DashboardPromotionAnalysisSchema = z.object({
  analysis_id: z.string(),
  promotion_id: z.string(),
  focus_segment_ids: z.array(z.string()),
  operator_instruction: z.string().nullable(),
  input_snapshot_json: JsonObjectSchema,
  profile_summary_json: JsonObjectSchema,
  output_json: JsonObjectSchema.nullable(),
  status: z.string(),
  created_at: z.string(),
  updated_at: z.string()
});
export type DashboardPromotionAnalysis = z.infer<typeof DashboardPromotionAnalysisSchema>;

export const DashboardPromotionDetailSchema = z.object({
  promotion: DashboardPromotionSummarySchema,
  analyses: z.array(DashboardPromotionAnalysisSchema),
  segments: z.array(DashboardCampaignSegmentSchema),
  experiment_metrics: z.array(DashboardCampaignExperimentMetricSchema),
  realtime_metrics: DashboardPromotionRealtimeMetricsSchema,
  segment_realtime_summaries: z.array(DashboardSegmentRealtimeSummarySchema)
});
export type DashboardPromotionDetail = z.infer<typeof DashboardPromotionDetailSchema>;

export const DashboardSegmentDetailSchema = z.object({
  segment: DashboardCampaignSegmentSchema,
  ad_experiments: z.array(DashboardAdExperimentSchema),
  content_candidates: z.array(DashboardContentCandidateSchema),
  experiment_metrics: z.array(DashboardCampaignExperimentMetricSchema),
  realtime_metrics: DashboardSegmentRealtimeMetricsSchema
});
export type DashboardSegmentDetail = z.infer<typeof DashboardSegmentDetailSchema>;

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
  value: RateSchema,
  formatted: z.string(),
  observed_value: RateSchema.optional(),
  basis_label: z.string().optional(),
  method: z.string().optional(),
  prior_user_count: CountSchema.optional(),
  calibration_status: z.enum(["not_backtested", "backtested"]).optional()
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
  const estimatedValue = normalizedRate(raw.value);
  if (!metric || !label || estimatedValue === null) {
    return undefined;
  }

  const calibrationStatus = normalizedNonEmptyString(raw.calibration_status);
  return {
    metric,
    label,
    value: estimatedValue,
    formatted: `${(estimatedValue * 100).toFixed(1)}%`,
    observed_value: normalizedRate(raw.observed_value) ?? undefined,
    basis_label: normalizedNonEmptyString(raw.basis_label) ?? undefined,
    method: normalizedNonEmptyString(raw.method) ?? undefined,
    prior_user_count: normalizedCount(raw.prior_user_count) ?? undefined,
    calibration_status:
      calibrationStatus === "not_backtested" || calibrationStatus === "backtested"
        ? calibrationStatus
        : undefined
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

export const DashboardPromotionSegmentSuggestionDisplayCopySchema = z.object({
  title: z.string(),
  rank_role: z.string().optional(),
  audience_summary: z.string(),
  performance_estimate: DashboardPromotionSegmentSuggestionPerformanceEstimateSchema.optional(),
  signal_chips: z.array(z.string()),
  reason: z.string(),
  difference_summary: z.string().optional(),
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

export const DashboardPromotionSegmentSuggestionListSchema = z.object({
  suggestions: z.array(DashboardPromotionSegmentSuggestionSchema)
});
export type DashboardPromotionSegmentSuggestionList = z.infer<
  typeof DashboardPromotionSegmentSuggestionListSchema
>;

export const DashboardDecideSegmentSuggestionRequestSchema = z.object({
  status: z.enum(["accepted", "dismissed"])
});
export type DashboardDecideSegmentSuggestionRequest = z.infer<
  typeof DashboardDecideSegmentSuggestionRequestSchema
>;

export const DashboardConfirmSegmentSuggestionsRequestSchema = z.object({
  confirmed_by: z.string().min(1).nullable().optional()
});
export type DashboardConfirmSegmentSuggestionsRequest = z.infer<
  typeof DashboardConfirmSegmentSuggestionsRequestSchema
>;

export const DashboardConfirmSegmentSuggestionsResultSchema = z.object({
  promotion_id: z.string(),
  confirmed_segment_count: CountSchema,
  status: z.literal("confirmed")
});
export type DashboardConfirmSegmentSuggestionsResult = z.infer<
  typeof DashboardConfirmSegmentSuggestionsResultSchema
>;

export const DashboardStartPromotionAnalysisRequestSchema = z.object({
  operator_instruction: z.string().nullable().optional()
});
export type DashboardStartPromotionAnalysisRequest = z.infer<
  typeof DashboardStartPromotionAnalysisRequestSchema
>;

export const DashboardStartPromotionAnalysisResultSchema = z.object({
  analysis_id: z.string(),
  promotion_id: z.string(),
  status: z.string()
});
export type DashboardStartPromotionAnalysisResult = z.infer<
  typeof DashboardStartPromotionAnalysisResultSchema
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
