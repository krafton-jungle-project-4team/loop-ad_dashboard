import { z } from "zod";

const RateSchema = z.number().min(0).max(1);
const CountSchema = z.number().int().nonnegative();
const JsonObjectSchema = z.record(z.string(), z.unknown());

export const DashboardCampaignSummarySchema = z.object({
  campaign_id: z.string(),
  campaign_name: z.string(),
  objective: z.string().nullable(),
  primary_metric: z.string().nullable(),
  status: z.string(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  promotion_count: CountSchema,
  segment_count: CountSchema,
  ad_experiment_count: CountSchema,
  latest_goal_achievement_rate: RateSchema.nullable(),
  updated_at: z.string()
});
export type DashboardCampaignSummary = z.infer<typeof DashboardCampaignSummarySchema>;

export const DashboardMainSchema = z.object({
  campaigns: z.array(DashboardCampaignSummarySchema)
});
export type DashboardMain = z.infer<typeof DashboardMainSchema>;

export const DashboardCampaignPromotionSchema = z.object({
  promotion_id: z.string(),
  channel: z.string(),
  marketing_theme: z.string(),
  goal_metric: z.string(),
  goal_target_value: z.number().nonnegative(),
  goal_basis: z.string(),
  status: z.string(),
  target_segment_count: CountSchema,
  ad_experiment_count: CountSchema,
  latest_actual_value: RateSchema.nullable(),
  updated_at: z.string()
});
export type DashboardCampaignPromotion = z.infer<typeof DashboardCampaignPromotionSchema>;

export const DashboardPromotionSummarySchema = DashboardCampaignPromotionSchema.extend({
  campaign_id: z.string(),
  target_audience: z.string(),
  min_sample_size: CountSchema,
  offer_type: z.string().nullable(),
  landing_url: z.string().nullable()
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

export const DashboardRealtimeMetricsSchema = z.object({
  total_event_count: CountSchema,
  events: z.array(DashboardRealtimeEventSchema)
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

export const DashboardCampaignDetailSchema = z.object({
  campaign: DashboardCampaignSummarySchema,
  promotions: z.array(DashboardCampaignPromotionSchema),
  segments: z.array(DashboardCampaignSegmentSchema),
  experiment_metrics: z.array(DashboardCampaignExperimentMetricSchema),
  realtime_metrics: DashboardCampaignRealtimeMetricsSchema
});
export type DashboardCampaignDetail = z.infer<typeof DashboardCampaignDetailSchema>;

export const DashboardPromotionDetailSchema = z.object({
  promotion: DashboardPromotionSummarySchema,
  segments: z.array(DashboardCampaignSegmentSchema),
  experiment_metrics: z.array(DashboardCampaignExperimentMetricSchema),
  realtime_metrics: DashboardPromotionRealtimeMetricsSchema
});
export type DashboardPromotionDetail = z.infer<typeof DashboardPromotionDetailSchema>;

export const DashboardSegmentDetailSchema = z.object({
  segment: DashboardCampaignSegmentSchema,
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
  status: z.string()
});
export type DashboardSavedSegment = z.infer<typeof DashboardSavedSegmentSchema>;

export const DashboardSavedSegmentListSchema = z.object({
  segments: z.array(DashboardSavedSegmentSchema)
});
export type DashboardSavedSegmentList = z.infer<typeof DashboardSavedSegmentListSchema>;

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
