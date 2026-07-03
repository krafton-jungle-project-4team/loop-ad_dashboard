import { z } from "zod";

const RateSchema = z.number().min(0).max(1);
const CountSchema = z.number().int().nonnegative();
const MoneySchema = z.number().nonnegative();

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

export const DashboardChartPointSchema = z.object({
  label: z.string(),
  value: z.number()
});
export type DashboardChartPoint = z.infer<typeof DashboardChartPointSchema>;

export const DashboardSegmentItemSchema = z.object({
  label: z.string(),
  value: z.number(),
  share: RateSchema
});
export type DashboardSegmentItem = z.infer<typeof DashboardSegmentItemSchema>;

export const DashboardFunnelStepSchema = z.object({
  key: z.string(),
  label: z.string(),
  count: CountSchema,
  rate_from_previous: RateSchema,
  drop_off_rate: RateSchema
});
export type DashboardFunnelStep = z.infer<typeof DashboardFunnelStepSchema>;

export const DashboardDeviceConversionRowSchema = z.object({
  device: z.string(),
  session_start_count: CountSchema,
  product_view_count: CountSchema,
  add_to_cart_count: CountSchema,
  checkout_start_count: CountSchema,
  purchase_count: CountSchema,
  view_to_cart_rate: RateSchema,
  cart_to_purchase_rate: RateSchema,
  view_to_purchase_rate: RateSchema
});
export type DashboardDeviceConversionRow = z.infer<typeof DashboardDeviceConversionRowSchema>;

export const DashboardCustomerBehaviorRowSchema = z.object({
  customer_group_id: z.string(),
  customer_group_name: z.string(),
  conversion_rate: RateSchema,
  major_drop_off_rate: RateSchema,
  expected_revenue: MoneySchema,
  observed_signal: z.string()
});
export type DashboardCustomerBehaviorRow = z.infer<typeof DashboardCustomerBehaviorRowSchema>;

export const DashboardPurchaseConversionSchema = z.object({
  funnel_steps: z.array(DashboardFunnelStepSchema),
  device_rows: z.array(DashboardDeviceConversionRowSchema),
  customer_behavior_rows: z.array(DashboardCustomerBehaviorRowSchema)
});
export type DashboardPurchaseConversion = z.infer<typeof DashboardPurchaseConversionSchema>;

export const DashboardCustomerSegmentSchema = z.object({
  customer_group_id: z.string(),
  customer_group_name: z.string(),
  channel: z.string(),
  age_group: z.string(),
  gender: z.string(),
  category: z.string(),
  region: z.string(),
  device: z.string(),
  conversion_rate: RateSchema,
  major_drop_off_stage: z.string(),
  expected_revenue: MoneySchema
});
export type DashboardCustomerSegment = z.infer<typeof DashboardCustomerSegmentSchema>;

export const DashboardMetricValueSchema = z.object({
  label: z.string(),
  value: z.number(),
  value_type: z.enum(["money", "rate", "delta"])
});
export type DashboardMetricValue = z.infer<typeof DashboardMetricValueSchema>;

export const DashboardStageFlowSchema = z.object({
  key: z.string(),
  label: z.string(),
  rate: RateSchema
});
export type DashboardStageFlow = z.infer<typeof DashboardStageFlowSchema>;

export const DashboardCustomerDetailSchema = z.object({
  customer_group: DashboardCustomerSegmentSchema,
  metrics: z.array(DashboardMetricValueSchema),
  case_analysis: z.array(z.string()),
  purchase_history: z.array(DashboardSegmentItemSchema),
  rationale: z.array(z.string()),
  stage_flow: z.array(DashboardStageFlowSchema)
});
export type DashboardCustomerDetail = z.infer<typeof DashboardCustomerDetailSchema>;

export const DashboardAiAnalysisSchema = z.object({
  sort: z.literal("high"),
  customers: z.array(DashboardCustomerSegmentSchema),
  selected_customer: DashboardCustomerDetailSchema.nullable()
});
export type DashboardAiAnalysis = z.infer<typeof DashboardAiAnalysisSchema>;

export const DashboardRecommendationActionSchema = z.object({
  action_id: z.string(),
  action_type: z.string(),
  title: z.string(),
  description: z.string(),
  rationale: z.string(),
  probability: RateSchema.nullable(),
  status: z.string()
});
export type DashboardRecommendationAction = z.infer<typeof DashboardRecommendationActionSchema>;

export const DashboardAiRecommendationSchema = z.object({
  sort: z.literal("high"),
  customers: z.array(DashboardCustomerSegmentSchema),
  selected_customer: DashboardCustomerDetailSchema.nullable(),
  recommended_actions: z.array(DashboardRecommendationActionSchema),
  recommendation_rationale: z.array(z.string())
});
export type DashboardAiRecommendation = z.infer<typeof DashboardAiRecommendationSchema>;

export const DashboardGeneratedContentSchema = z.object({
  content_id: z.string(),
  content_type: z.enum(["copy", "image", "video", "landing"]),
  title: z.string(),
  message: z.string().nullable(),
  content_url: z.string().nullable(),
  status: z.string(),
  created_at: z.string()
});
export type DashboardGeneratedContent = z.infer<typeof DashboardGeneratedContentSchema>;

export const DashboardGenerationItemSchema = z.object({
  action: DashboardRecommendationActionSchema,
  content: DashboardGeneratedContentSchema.nullable()
});
export type DashboardGenerationItem = z.infer<typeof DashboardGenerationItemSchema>;

export const DashboardAiGenerationSchema = z.object({
  customers: z.array(DashboardCustomerSegmentSchema),
  selected_customer: DashboardCustomerSegmentSchema.nullable(),
  generated_items: z.array(DashboardGenerationItemSchema)
});
export type DashboardAiGeneration = z.infer<typeof DashboardAiGenerationSchema>;
