import { z } from "zod";

export const SEGMENT_ASSISTANT_EVENT_NAMES = [
  "page_view",
  "hotel_search",
  "hotel_click",
  "hotel_detail_view",
  "promotion_impression",
  "promotion_click",
  "campaign_redirect_click",
  "campaign_landing",
  "booking_start",
  "booking_complete",
  "booking_cancel"
] as const;
export type SegmentAssistantEventName = (typeof SEGMENT_ASSISTANT_EVENT_NAMES)[number];

export const SEGMENT_ASSISTANT_PROPERTY_KEYS = [
  "deal",
  "free_cancellation",
  "breakfast_included",
  "age_group",
  "gender",
  "region",
  "preferred_category",
  "user_segment",
  "adult_count",
  "child_count",
  "rooms",
  "hotel_id",
  "hotel_name",
  "hotel_city",
  "hotel_country",
  "hotel_market",
  "hotel_cluster",
  "hotel_star_rating",
  "hotel_guest_rating",
  "price",
  "property_type",
  "room_type",
  "revenue"
] as const;

export const SegmentAssistantPropertyFilterSchema = z
  .object({
    key: z.enum(SEGMENT_ASSISTANT_PROPERTY_KEYS),
    operator: z.enum(["equals", "contains", "exists", "gte", "lte"]),
    value: z.string().trim().min(1).max(200)
  })
  .superRefine((filter, context) => {
    if (
      (filter.operator === "gte" || filter.operator === "lte") &&
      !Number.isFinite(Number(filter.value))
    ) {
      context.addIssue({
        code: "custom",
        message: "numeric comparison filters require a numeric value",
        path: ["value"]
      });
    }
  });
export type SegmentAssistantPropertyFilter = z.infer<typeof SegmentAssistantPropertyFilterSchema>;

export const SegmentAssistantAudienceConditionSchema = z
  .object({
    label: z.string().trim().min(1).max(120),
    event_name: z.enum(SEGMENT_ASSISTANT_EVENT_NAMES),
    minimum_count: z.number().int().min(0).max(10_000),
    maximum_count: z.number().int().min(0).max(10_000).nullable(),
    destination: z.string().trim().min(1).max(120).nullable(),
    checkin_months: z.array(z.number().int().min(1).max(12)).max(12),
    property_filters: z.array(SegmentAssistantPropertyFilterSchema).max(8)
  })
  .superRefine((condition, context) => {
    if (condition.maximum_count !== null && condition.maximum_count < condition.minimum_count) {
      context.addIssue({
        code: "custom",
        message: "maximum_count must be greater than or equal to minimum_count",
        path: ["maximum_count"]
      });
    }
  });
export type SegmentAssistantAudienceCondition = z.infer<
  typeof SegmentAssistantAudienceConditionSchema
>;

export const SegmentAssistantPlanSchema = z
  .object({
    action: z.enum(["audience_query", "segment_preview", "clarification"]),
    segment_name: z.string().trim().min(1).max(100).nullable(),
    lookback_days: z.number().int().min(1).max(365),
    conditions: z.array(SegmentAssistantAudienceConditionSchema).max(8),
    clarification_message: z.string().trim().min(1).max(500).nullable()
  })
  .superRefine((plan, context) => {
    if (plan.action === "segment_preview" && !plan.segment_name) {
      context.addIssue({
        code: "custom",
        message: "segment preview requires segment_name",
        path: ["segment_name"]
      });
    }
  });
export type SegmentAssistantPlan = z.infer<typeof SegmentAssistantPlanSchema>;

export const SegmentAssistantSourceAudienceSchema = z.object({
  suggestion_id: z.string().min(1),
  segment_id: z.string().min(1),
  candidate_type: z.string().min(1),
  title: z.string().min(1),
  base_condition_labels: z.array(z.string().min(1)).max(12),
  hard_predicate_keys: z.array(z.string().min(1)).max(12),
  reference_labels: z.array(z.string().min(1)).max(12),
  base_user_ids: z.array(z.string().min(1)).min(1).max(5_000)
});
export type SegmentAssistantSourceAudience = z.infer<typeof SegmentAssistantSourceAudienceSchema>;

export const SegmentAssistantExecutionStateSchema = z.object({
  assistant_plan: SegmentAssistantPlanSchema,
  source_audience: SegmentAssistantSourceAudienceSchema.optional()
});
export type SegmentAssistantExecutionState = z.infer<typeof SegmentAssistantExecutionStateSchema>;
