import { z } from "zod";
import { DashboardCampaignSummarySchema } from "./campaign.js";
import { DashboardCampaignSegmentSchema } from "./segment.js";
import { DashboardCampaignPromotionSchema, DashboardPromotionSummarySchema } from "./promotion.js";
import {
  DashboardCampaignRealtimeMetricsSchema,
  DashboardPromotionRealtimeMetricsSchema,
  DashboardRealtimeMetricsSchema,
  DashboardSegmentRealtimeMetricsSchema,
  DashboardSegmentRealtimeSummarySchema
} from "./realtime.js";
import { CountSchema, JsonObjectSchema } from "./schema-primitives.js";

export * from "./campaign.js";
export * from "./funnel.js";
export * from "./project.js";
export * from "./promotion.js";
export * from "./realtime.js";
export * from "./segment.js";

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
