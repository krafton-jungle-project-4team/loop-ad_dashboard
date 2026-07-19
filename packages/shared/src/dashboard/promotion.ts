import { z } from "zod";
import { CountSchema, RateSchema } from "./schema-primitives.js";

const DashboardPromotionOfferIdSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9][a-z0-9._-]{0,99}$/);

const DashboardPromotionOfferDestinationUrlSchema = z
  .string()
  .trim()
  .url()
  .refine((value) => {
    try {
      const url = new URL(value);
      return (
        (url.protocol === "http:" || url.protocol === "https:") && !url.username && !url.password
      );
    } catch {
      return false;
    }
  });

export const DashboardPromotionOfferLinkSchema = z.object({
  offer_id: DashboardPromotionOfferIdSchema.optional(),
  destination_url: DashboardPromotionOfferDestinationUrlSchema
});
export type DashboardPromotionOfferLink = z.infer<typeof DashboardPromotionOfferLinkSchema>;

export const DashboardPromotionOfferLinksSchema = z
  .array(DashboardPromotionOfferLinkSchema)
  .max(8)
  .superRefine((links, context) => {
    const seenOfferIds = new Set<string>();
    const seenDestinationUrls = new Set<string>();
    for (const [index, link] of links.entries()) {
      if (link.offer_id && seenOfferIds.has(link.offer_id)) {
        context.addIssue({
          code: "custom",
          message: "offer_id must be unique",
          path: [index, "offer_id"]
        });
      }
      if (seenDestinationUrls.has(link.destination_url)) {
        context.addIssue({
          code: "custom",
          message: "destination_url must be unique",
          path: [index, "destination_url"]
        });
      }
      if (link.offer_id) {
        seenOfferIds.add(link.offer_id);
      }
      seenDestinationUrls.add(link.destination_url);
    }
  });

export const DashboardCampaignPromotionSchema = z.object({
  promotion_id: z.string(),
  channel: z.string(),
  marketing_theme: z.string(),
  goal_metric: z.string(),
  goal_target_value: z.number().nonnegative(),
  goal_basis: z.string(),
  min_sample_size: CountSchema,
  max_loop_count: CountSchema,
  current_loop_count: CountSchema,
  message_brief: z.string().nullable(),
  offer_type: z.string().nullable(),
  offer_links: DashboardPromotionOfferLinksSchema.default([]),
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

const DashboardPromotionLandingUrlSchema = z.string().trim().url();

export const DashboardCreatePromotionRequestSchema = z.object({
  channel: DashboardPromotionChannelSchema,
  marketing_theme: z.string().min(1),
  goal_metric: DashboardPromotionGoalMetricSchema,
  goal_target_value: z.number().nonnegative(),
  goal_basis: DashboardPromotionGoalBasisSchema,
  min_sample_size: z.number().int().nonnegative().default(1000),
  max_loop_count: z.number().int().min(1).default(3),
  message_brief: z.string().nullable().optional(),
  offer_type: z.string().nullable().optional(),
  offer_links: DashboardPromotionOfferLinksSchema.optional(),
  landing_url: DashboardPromotionLandingUrlSchema,
  landing_type: DashboardPromotionLandingTypeSchema.nullable().optional(),
  status: DashboardPromotionStatusSchema.default("draft")
});
export type DashboardCreatePromotionRequest = z.infer<typeof DashboardCreatePromotionRequestSchema>;

export const DashboardUpdatePromotionRequestSchema = z.object({
  channel: DashboardPromotionChannelSchema.optional(),
  marketing_theme: z.string().min(1).optional(),
  goal_metric: DashboardPromotionGoalMetricSchema.optional(),
  goal_target_value: z.number().nonnegative().optional(),
  goal_basis: DashboardPromotionGoalBasisSchema.optional(),
  min_sample_size: z.number().int().nonnegative().optional(),
  max_loop_count: z.number().int().min(1).optional(),
  message_brief: z.string().nullable().optional(),
  offer_type: z.string().nullable().optional(),
  offer_links: DashboardPromotionOfferLinksSchema.optional(),
  landing_url: DashboardPromotionLandingUrlSchema.optional(),
  landing_type: DashboardPromotionLandingTypeSchema.nullable().optional(),
  status: DashboardPromotionStatusSchema.optional()
});
export type DashboardUpdatePromotionRequest = z.infer<typeof DashboardUpdatePromotionRequestSchema>;

export const DashboardDeletePromotionResultSchema = z.object({
  promotion_id: z.string(),
  status: z.literal("stopped")
});
export type DashboardDeletePromotionResult = z.infer<typeof DashboardDeletePromotionResultSchema>;

export const DashboardPromotionSummarySchema = DashboardCampaignPromotionSchema.extend({
  campaign_id: z.string()
});
export type DashboardPromotionSummary = z.infer<typeof DashboardPromotionSummarySchema>;
