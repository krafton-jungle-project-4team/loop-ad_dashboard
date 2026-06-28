import { z } from "zod";
import { EventNameSchema } from "../events/event-name.js";

const RateSchema = z.number().min(0).max(1);
const CountSchema = z.number().int().nonnegative();

export const DashboardEventCountSchema = z.object({
  event_name: EventNameSchema,
  count: CountSchema
});
export type DashboardEventCount = z.infer<typeof DashboardEventCountSchema>;

export const DashboardRecentEventSchema = z.object({
  event_time: z.string(),
  project_id: z.string(),
  user_id: z.string(),
  session_id: z.string(),
  event_name: EventNameSchema,
  segment_id: z.string().nullish(),
  experiment_id: z.string().nullish(),
  recommendation_id: z.string().nullish(),
  action_id: z.string().nullish(),
  content_id: z.string().nullish(),
  decision_id: z.string().nullish(),
  page_url: z.string().nullish(),
  product_id: z.string().nullish(),
  category: z.string().nullish(),
  device: z.string().nullish()
});
export type DashboardRecentEvent = z.infer<typeof DashboardRecentEventSchema>;

export const DashboardEventsSummarySchema = z.object({
  recent_event_count: CountSchema,
  event_counts: z.array(DashboardEventCountSchema),
  recent_events: z.array(DashboardRecentEventSchema)
});
export type DashboardEventsSummary = z.infer<typeof DashboardEventsSummarySchema>;

export const DashboardSegmentFunnelSchema = z.object({
  segment_id: z.string(),
  product_view_count: CountSchema,
  add_to_cart_count: CountSchema,
  purchase_count: CountSchema,
  view_to_cart_rate: RateSchema,
  cart_to_purchase_rate: RateSchema,
  view_to_purchase_rate: RateSchema
});
export type DashboardSegmentFunnel = z.infer<typeof DashboardSegmentFunnelSchema>;

export const DashboardFunnelSchema = z.object({
  product_view_count: CountSchema,
  add_to_cart_count: CountSchema,
  purchase_count: CountSchema,
  view_to_cart_rate: RateSchema,
  cart_to_purchase_rate: RateSchema,
  view_to_purchase_rate: RateSchema,
  segment_funnels: z.array(DashboardSegmentFunnelSchema)
});
export type DashboardFunnel = z.infer<typeof DashboardFunnelSchema>;

export const DashboardGeneratedContentSchema = z.object({
  content_id: z.string(),
  content_url: z.string(),
  created_at: z.string()
});
export type DashboardGeneratedContent = z.infer<typeof DashboardGeneratedContentSchema>;

export const DashboardRecommendationActionSchema = z.object({
  action_id: z.string(),
  action_type: z.string(),
  action_name: z.string(),
  description: z.string(),
  content: DashboardGeneratedContentSchema.nullable()
});
export type DashboardRecommendationAction = z.infer<typeof DashboardRecommendationActionSchema>;

export const DashboardRecommendationSchema = z.object({
  recommendation_id: z.string(),
  segment_id: z.string(),
  title: z.string(),
  reason: z.string(),
  status: z.string(),
  created_at: z.string(),
  actions: z.array(DashboardRecommendationActionSchema)
});
export type DashboardRecommendation = z.infer<typeof DashboardRecommendationSchema>;

export const DashboardRecommendationsSchema = z.object({
  recommendations: z.array(DashboardRecommendationSchema)
});
export type DashboardRecommendations = z.infer<typeof DashboardRecommendationsSchema>;

export const DashboardExperimentActionProbabilitySchema = z.object({
  action_id: z.string(),
  action_name: z.string(),
  probability: RateSchema,
  impressions: CountSchema,
  clicks: CountSchema,
  purchases: CountSchema,
  updated_at: z.string()
});
export type DashboardExperimentActionProbability = z.infer<
  typeof DashboardExperimentActionProbabilitySchema
>;

export const DashboardExperimentSchema = z.object({
  experiment_id: z.string(),
  project_id: z.string(),
  segment_id: z.string(),
  recommendation_id: z.string(),
  status: z.string(),
  goal_metric: z.string(),
  target_value: z.number(),
  winner_action_id: z.string().nullable(),
  started_at: z.string().nullable(),
  ended_at: z.string().nullable(),
  created_at: z.string(),
  action_probabilities: z.array(DashboardExperimentActionProbabilitySchema)
});
export type DashboardExperiment = z.infer<typeof DashboardExperimentSchema>;

export const DashboardExperimentPerformanceActionSchema =
  DashboardExperimentActionProbabilitySchema.omit({ updated_at: true }).extend({
    ctr: RateSchema,
    cvr: RateSchema
  });
export type DashboardExperimentPerformanceAction = z.infer<
  typeof DashboardExperimentPerformanceActionSchema
>;

export const DashboardExperimentPerformanceSchema = z.object({
  experiment_id: z.string(),
  actions: z.array(DashboardExperimentPerformanceActionSchema)
});
export type DashboardExperimentPerformance = z.infer<typeof DashboardExperimentPerformanceSchema>;
