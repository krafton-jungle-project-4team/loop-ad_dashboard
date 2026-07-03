import { z } from "zod";

const RateSchema = z.number().min(0).max(1);
const CountSchema = z.number().int().nonnegative();

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
export type DashboardCreateFunnelRequest = z.infer<typeof DashboardCreateFunnelRequestSchema>;

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
