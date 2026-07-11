import { z } from "zod";
import { CountSchema, RateSchema } from "./schema-primitives.js";

export const DashboardCampaignSummarySchema = z.object({
  campaign_id: z.string(),
  campaign_name: z.string(),
  objective: z.string().nullable(),
  primary_metric: z.string().nullable(),
  status: z.string(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  max_loop_count: CountSchema,
  current_loop_count: CountSchema,
  promotion_count: CountSchema,
  segment_count: CountSchema,
  ad_experiment_count: CountSchema,
  running_ad_experiment_count: CountSchema.default(0),
  latest_goal_achievement_rate: RateSchema.nullable(),
  next_action: z.string(),
  updated_at: z.string()
});
export type DashboardCampaignSummary = z.infer<typeof DashboardCampaignSummarySchema>;

export const DashboardCampaignPrimaryMetricSchema = z.enum([
  "inflow_rate",
  "booking_conversion_rate",
  "funnel_step_rate",
  "promotion_click_rate",
  "goal_achievement_rate"
]);
export type DashboardCampaignPrimaryMetric = z.infer<typeof DashboardCampaignPrimaryMetricSchema>;

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
  primary_metric: DashboardCampaignPrimaryMetricSchema.nullable().optional(),
  start_date: z.string().date().nullable().optional(),
  end_date: z.string().date().nullable().optional(),
  status: DashboardCampaignStatusSchema.default("draft")
});
export type DashboardCreateCampaignRequest = z.infer<typeof DashboardCreateCampaignRequestSchema>;

export const DashboardUpdateCampaignRequestSchema = z.object({
  campaign_name: z.string().min(1).optional(),
  objective: z.string().nullable().optional(),
  primary_metric: DashboardCampaignPrimaryMetricSchema.nullable().optional(),
  start_date: z.string().date().nullable().optional(),
  end_date: z.string().date().nullable().optional(),
  status: DashboardCampaignStatusSchema.optional()
});
export type DashboardUpdateCampaignRequest = z.infer<typeof DashboardUpdateCampaignRequestSchema>;

export const DashboardDeleteCampaignResultSchema = z.object({
  campaign_id: z.string(),
  status: z.literal("deleted")
});
export type DashboardDeleteCampaignResult = z.infer<typeof DashboardDeleteCampaignResultSchema>;
