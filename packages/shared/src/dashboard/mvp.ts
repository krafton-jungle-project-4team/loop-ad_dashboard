import { z } from "zod";

const RateSchema = z.number().min(0).max(1);
const CountSchema = z.number().int().nonnegative();
const JsonObjectSchema = z.record(z.string(), z.unknown());

export const DashboardCampaignSummarySchema = z.object({
  campaign_id: z.string(),
  campaign_name: z.string(),
  objective: z.string().nullable(),
  target_audience: z.string(),
  primary_metric: z.string().nullable(),
  status: z.string(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  max_loop_count: CountSchema,
  current_loop_count: CountSchema,
  promotion_count: CountSchema,
  segment_count: CountSchema,
  ad_experiment_count: CountSchema,
  latest_goal_achievement_rate: RateSchema.nullable(),
  next_action: z.string(),
  updated_at: z.string()
});
export type DashboardCampaignSummary = z.infer<typeof DashboardCampaignSummarySchema>;

export const DashboardMainSchema = z.object({
  campaigns: z.array(DashboardCampaignSummarySchema)
});
export type DashboardMain = z.infer<typeof DashboardMainSchema>;

export const DashboardCampaignPrimaryMetricSchema = z.enum([
  "inflow_rate",
  "booking_conversion_rate",
  "funnel_step_rate",
  "promotion_click_rate",
  "goal_achievement_rate"
]);
export type DashboardCampaignPrimaryMetric = z.infer<
  typeof DashboardCampaignPrimaryMetricSchema
>;

export const DashboardCampaignStatusSchema = z.enum([
  "draft",
  "active",
  "paused",
  "completed",
  "stopped"
]);
export type DashboardCampaignStatus = z.infer<typeof DashboardCampaignStatusSchema>;

export const DashboardCreateCampaignRequestSchema = z.object({
  campaign_name: z.string().min(1),
  objective: z.string().nullable().optional(),
  target_audience: z.string().min(1).default("existing_users"),
  primary_metric: DashboardCampaignPrimaryMetricSchema.nullable().optional(),
  start_date: z.string().date().nullable().optional(),
  end_date: z.string().date().nullable().optional(),
  status: DashboardCampaignStatusSchema.default("draft")
});
export type DashboardCreateCampaignRequest = z.infer<
  typeof DashboardCreateCampaignRequestSchema
>;

export const DashboardUpdateCampaignRequestSchema = z.object({
  campaign_name: z.string().min(1).optional(),
  objective: z.string().nullable().optional(),
  target_audience: z.string().min(1).optional(),
  primary_metric: DashboardCampaignPrimaryMetricSchema.nullable().optional(),
  start_date: z.string().date().nullable().optional(),
  end_date: z.string().date().nullable().optional(),
  status: DashboardCampaignStatusSchema.optional()
});
export type DashboardUpdateCampaignRequest = z.infer<
  typeof DashboardUpdateCampaignRequestSchema
>;

export const DashboardDeleteCampaignResultSchema = z.object({
  campaign_id: z.string(),
  status: z.literal("stopped")
});
export type DashboardDeleteCampaignResult = z.infer<
  typeof DashboardDeleteCampaignResultSchema
>;

export const DashboardCampaignPromotionSchema = z.object({
  promotion_id: z.string(),
  channel: z.string(),
  marketing_theme: z.string(),
  target_audience: z.string(),
  goal_metric: z.string(),
  goal_target_value: z.number().nonnegative(),
  goal_basis: z.string(),
  min_sample_size: CountSchema,
  max_loop_count: CountSchema,
  current_loop_count: CountSchema,
  message_brief: z.string().nullable(),
  offer_type: z.string().nullable(),
  landing_url: z.string().nullable(),
  landing_type: z.string().nullable(),
  status: z.string(),
  target_segment_count: CountSchema,
  ad_experiment_count: CountSchema,
  latest_actual_value: RateSchema.nullable(),
  next_action: z.string(),
  updated_at: z.string()
});
export type DashboardCampaignPromotion = z.infer<typeof DashboardCampaignPromotionSchema>;

export const DashboardPromotionChannelSchema = z.enum(["email", "sms", "onsite_banner"]);
export type DashboardPromotionChannel = z.infer<typeof DashboardPromotionChannelSchema>;

export const DashboardPromotionGoalMetricSchema = z.enum([
  "inflow_rate",
  "booking_conversion_rate",
  "funnel_step_rate"
]);
export type DashboardPromotionGoalMetric = z.infer<typeof DashboardPromotionGoalMetricSchema>;

export const DashboardPromotionGoalBasisSchema = z.enum(["promotion_average", "all_segments"]);
export type DashboardPromotionGoalBasis = z.infer<typeof DashboardPromotionGoalBasisSchema>;

export const DashboardPromotionLandingTypeSchema = z.enum([
  "search_page",
  "hotel_detail_page",
  "booking_resume"
]);
export type DashboardPromotionLandingType = z.infer<typeof DashboardPromotionLandingTypeSchema>;

export const DashboardPromotionStatusSchema = z.enum([
  "draft",
  "analysis_ready",
  "content_ready",
  "approved",
  "running",
  "evaluating",
  "partial_goal_met",
  "goal_met",
  "goal_not_met",
  "stopped"
]);
export type DashboardPromotionStatus = z.infer<typeof DashboardPromotionStatusSchema>;

export const DashboardCreatePromotionRequestSchema = z.object({
  channel: DashboardPromotionChannelSchema,
  marketing_theme: z.string().min(1),
  target_audience: z.string().min(1).default("existing_users"),
  goal_metric: DashboardPromotionGoalMetricSchema,
  goal_target_value: z.number().nonnegative(),
  goal_basis: DashboardPromotionGoalBasisSchema,
  min_sample_size: z.number().int().nonnegative().default(1000),
  max_loop_count: z.number().int().min(1).default(3),
  message_brief: z.string().nullable().optional(),
  offer_type: z.string().nullable().optional(),
  landing_url: z.string().nullable().optional(),
  landing_type: DashboardPromotionLandingTypeSchema.nullable().optional(),
  status: DashboardPromotionStatusSchema.default("draft")
});
export type DashboardCreatePromotionRequest = z.infer<
  typeof DashboardCreatePromotionRequestSchema
>;

export const DashboardUpdatePromotionRequestSchema = z.object({
  channel: DashboardPromotionChannelSchema.optional(),
  marketing_theme: z.string().min(1).optional(),
  target_audience: z.string().min(1).optional(),
  goal_metric: DashboardPromotionGoalMetricSchema.optional(),
  goal_target_value: z.number().nonnegative().optional(),
  goal_basis: DashboardPromotionGoalBasisSchema.optional(),
  min_sample_size: z.number().int().nonnegative().optional(),
  max_loop_count: z.number().int().min(1).optional(),
  message_brief: z.string().nullable().optional(),
  offer_type: z.string().nullable().optional(),
  landing_url: z.string().nullable().optional(),
  landing_type: DashboardPromotionLandingTypeSchema.nullable().optional(),
  status: DashboardPromotionStatusSchema.optional()
});
export type DashboardUpdatePromotionRequest = z.infer<
  typeof DashboardUpdatePromotionRequestSchema
>;

export const DashboardDeletePromotionResultSchema = z.object({
  promotion_id: z.string(),
  status: z.literal("stopped")
});
export type DashboardDeletePromotionResult = z.infer<
  typeof DashboardDeletePromotionResultSchema
>;

export const DashboardPromotionSummarySchema = DashboardCampaignPromotionSchema.extend({
  campaign_id: z.string()
});
export type DashboardPromotionSummary = z.infer<typeof DashboardPromotionSummarySchema>;

export const DashboardCampaignSegmentSchema = z.object({
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

export const DashboardApproveContentCandidateRequestSchema = z.object({
  operator_note: z.string().nullable().optional()
});
export type DashboardApproveContentCandidateRequest = z.infer<
  typeof DashboardApproveContentCandidateRequestSchema
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
  status: z.string()
});
export type DashboardAdExperiment = z.infer<typeof DashboardAdExperimentSchema>;

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

export const DashboardFunnelEventNameSchema = z.enum([
  "page_view",
  "promotion_impression",
  "promotion_click",
  "campaign_redirect_click",
  "campaign_landing",
  "hotel_search",
  "hotel_click",
  "hotel_detail_view",
  "booking_start",
  "booking_complete",
  "booking_cancel"
]);
export type DashboardFunnelEventName = z.infer<typeof DashboardFunnelEventNameSchema>;

export const DashboardRealtimeEventSchema = z.object({
  event_name: DashboardFunnelEventNameSchema,
  event_count: CountSchema,
  unique_user_count: CountSchema
});
export type DashboardRealtimeEvent = z.infer<typeof DashboardRealtimeEventSchema>;

export const DashboardRealtimeTimeBucketSchema = z.object({
  time_bucket: z.string(),
  event_count: CountSchema,
  unique_user_count: CountSchema
});
export type DashboardRealtimeTimeBucket = z.infer<typeof DashboardRealtimeTimeBucketSchema>;

export const DashboardRealtimeBreakdownItemSchema = z.object({
  key: z.string(),
  label: z.string(),
  event_count: CountSchema,
  unique_user_count: CountSchema
});
export type DashboardRealtimeBreakdownItem = z.infer<
  typeof DashboardRealtimeBreakdownItemSchema
>;

export const DashboardDeliveryStatusSchema = z.object({
  scheduled_count: CountSchema,
  sent_count: CountSchema,
  delivered_count: CountSchema,
  opened_count: CountSchema,
  clicked_count: CountSchema,
  bounced_count: CountSchema,
  failed_count: CountSchema
});
export type DashboardDeliveryStatus = z.infer<typeof DashboardDeliveryStatusSchema>;

export const DashboardBannerResponseSchema = z.object({
  promotion_impression_count: CountSchema,
  promotion_click_count: CountSchema,
  promotion_click_rate: RateSchema,
  banner_position: z.string().nullable(),
  hotel_search_count: CountSchema,
  hotel_detail_view_count: CountSchema,
  booking_complete_count: CountSchema
});
export type DashboardBannerResponse = z.infer<typeof DashboardBannerResponseSchema>;

export const DashboardRealtimeMetricsSchema = z.object({
  total_event_count: CountSchema,
  recent_5m_event_count: CountSchema,
  recent_1h_event_count: CountSchema,
  peak_time: z.string().nullable(),
  events: z.array(DashboardRealtimeEventSchema),
  time_buckets: z.array(DashboardRealtimeTimeBucketSchema),
  channel_breakdown: z.array(DashboardRealtimeBreakdownItemSchema),
  landing_type_breakdown: z.array(DashboardRealtimeBreakdownItemSchema),
  hotel_cluster_breakdown: z.array(DashboardRealtimeBreakdownItemSchema),
  delivery_status: DashboardDeliveryStatusSchema,
  banner_response: DashboardBannerResponseSchema
});
export type DashboardRealtimeMetrics = z.infer<typeof DashboardRealtimeMetricsSchema>;

export const DashboardCampaignRealtimeMetricsSchema = DashboardRealtimeMetricsSchema.extend({
  campaign_id: z.string()
});
export type DashboardCampaignRealtimeMetrics = z.infer<
  typeof DashboardCampaignRealtimeMetricsSchema
>;

export const DashboardPromotionRealtimeMetricsSchema = DashboardRealtimeMetricsSchema.extend({
  promotion_id: z.string()
});
export type DashboardPromotionRealtimeMetrics = z.infer<
  typeof DashboardPromotionRealtimeMetricsSchema
>;

export const DashboardSegmentRealtimeMetricsSchema = DashboardRealtimeMetricsSchema.extend({
  promotion_id: z.string(),
  segment_id: z.string()
});
export type DashboardSegmentRealtimeMetrics = z.infer<
  typeof DashboardSegmentRealtimeMetricsSchema
>;

export const DashboardSegmentRealtimeSummarySchema = z.object({
  promotion_id: z.string(),
  segment_id: z.string(),
  segment_user_count: CountSchema,
  delivery_count: CountSchema,
  reach_count: CountSchema,
  promotion_impression_count: CountSchema,
  promotion_click_count: CountSchema,
  campaign_redirect_click_count: CountSchema,
  campaign_landing_count: CountSchema,
  booking_start_count: CountSchema,
  booking_complete_count: CountSchema
});
export type DashboardSegmentRealtimeSummary = z.infer<
  typeof DashboardSegmentRealtimeSummarySchema
>;

export const DashboardCampaignDetailSchema = z.object({
  campaign: DashboardCampaignSummarySchema,
  promotions: z.array(DashboardCampaignPromotionSchema),
  segments: z.array(DashboardCampaignSegmentSchema),
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
export type DashboardPromotionSegmentStatus = z.infer<
  typeof DashboardPromotionSegmentStatusSchema
>;

export const DashboardAttachSegmentRequestSchema = z.object({
  segment_id: z.string().min(1),
  segment_name: z.string().min(1).optional(),
  priority: DashboardSegmentPrioritySchema.nullable().optional(),
  status: DashboardPromotionSegmentStatusSchema.default("planned")
});
export type DashboardAttachSegmentRequest = z.infer<
  typeof DashboardAttachSegmentRequestSchema
>;

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
export type DashboardStartNextLoopRequest = z.infer<
  typeof DashboardStartNextLoopRequestSchema
>;

export const DashboardNextLoopAnalysisSchema = z.object({
  analysis_id: z.string(),
  promotion_id: z.string(),
  focus_segment_ids: z.array(z.string()),
  status: z.literal("requested")
});
export type DashboardNextLoopAnalysis = z.infer<typeof DashboardNextLoopAnalysisSchema>;

export const DashboardFunnelStepSchema = z.object({
  step_order: CountSchema,
  step_name: z.string(),
  event_name: DashboardFunnelEventNameSchema
});
export type DashboardFunnelStep = z.infer<typeof DashboardFunnelStepSchema>;

export const DashboardFunnelSchema = z.object({
  funnel_id: z.string(),
  funnel_name: z.string(),
  domain_type: z.string(),
  status: z.string(),
  steps: z.array(DashboardFunnelStepSchema),
  created_at: z.string(),
  updated_at: z.string()
});
export type DashboardFunnel = z.infer<typeof DashboardFunnelSchema>;

export const DashboardFunnelListSchema = z.object({
  funnels: z.array(DashboardFunnelSchema)
});
export type DashboardFunnelList = z.infer<typeof DashboardFunnelListSchema>;

export const DashboardFunnelMetricStepSchema = DashboardFunnelStepSchema.extend({
  event_count: CountSchema
});
export type DashboardFunnelMetricStep = z.infer<typeof DashboardFunnelMetricStepSchema>;

export const DashboardFunnelMetricsSchema = z.object({
  funnel_id: z.string(),
  funnel_name: z.string(),
  steps: z.array(DashboardFunnelMetricStepSchema)
});
export type DashboardFunnelMetrics = z.infer<typeof DashboardFunnelMetricsSchema>;

export const DashboardCreateFunnelRequestSchema = z.object({
  funnel_name: z.string().min(1),
  steps: z
    .array(
      z.object({
        step_name: z.string().min(1),
        event_name: DashboardFunnelEventNameSchema
      })
    )
    .min(2)
});
export type DashboardCreateFunnelRequest = z.infer<typeof DashboardCreateFunnelRequestSchema>;

export const DashboardDeleteFunnelResultSchema = z.object({
  funnel_id: z.string(),
  deleted: z.literal(true)
});
export type DashboardDeleteFunnelResult = z.infer<typeof DashboardDeleteFunnelResultSchema>;

export const DashboardEventCatalogItemSchema = z.object({
  event_name: DashboardFunnelEventNameSchema,
  display_name: z.string(),
  event_count: CountSchema
});
export type DashboardEventCatalogItem = z.infer<typeof DashboardEventCatalogItemSchema>;

export const DashboardEventCatalogSchema = z.object({
  events: z.array(DashboardEventCatalogItemSchema)
});
export type DashboardEventCatalog = z.infer<typeof DashboardEventCatalogSchema>;
