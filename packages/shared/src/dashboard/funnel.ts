import { z } from "zod";
import { CountSchema } from "./schema-primitives.js";

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

export const DashboardFunnelSummarySchema = z.object({
  funnel_id: z.string(),
  funnel_name: z.string(),
  domain_type: z.string(),
  status: z.string(),
  step_count: CountSchema,
  created_at: z.string(),
  updated_at: z.string()
});
export type DashboardFunnelSummary = z.infer<typeof DashboardFunnelSummarySchema>;

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
  funnels: z.array(DashboardFunnelSummarySchema)
});
export type DashboardFunnelList = z.infer<typeof DashboardFunnelListSchema>;

export const DashboardFunnelMetricStepSchema = DashboardFunnelStepSchema.extend({
  event_count: CountSchema
});
export type DashboardFunnelMetricStep = z.infer<typeof DashboardFunnelMetricStepSchema>;

export const DashboardFunnelMetricsScopeSchema = z.discriminatedUnion("scope_type", [
  z.object({
    scope_type: z.literal("campaign"),
    campaign_id: z.string().min(1)
  }),
  z.object({
    scope_type: z.literal("promotion"),
    promotion_id: z.string().min(1)
  }),
  z.object({
    scope_type: z.literal("segment"),
    promotion_id: z.string().min(1).optional(),
    segment_id: z.string().min(1)
  })
]);
export type DashboardFunnelMetricsScope = z.infer<typeof DashboardFunnelMetricsScopeSchema>;

export const DashboardFunnelMetricsDateRangeSchema = z.enum([
  "today",
  "last-14-days",
  "last-30-days",
  "campaign"
]);
export type DashboardFunnelMetricsDateRange = z.infer<typeof DashboardFunnelMetricsDateRangeSchema>;

export const DashboardFunnelMeasurementBasisSchema = z.enum(["unique_user", "session"]);
export type DashboardFunnelMeasurementBasis = z.infer<typeof DashboardFunnelMeasurementBasisSchema>;

export const DashboardFunnelMetricsSchema = z.object({
  date_range: DashboardFunnelMetricsDateRangeSchema.default("last-14-days"),
  funnel_id: z.string(),
  funnel_name: z.string(),
  measurement_basis: DashboardFunnelMeasurementBasisSchema.default("unique_user"),
  steps: z.array(DashboardFunnelMetricStepSchema)
});
export type DashboardFunnelMetrics = z.infer<typeof DashboardFunnelMetricsSchema>;

export const DashboardFunnelPreviewRequestSchema = z.object({
  steps: z
    .array(
      z.object({
        step_name: z.string().min(1),
        event_name: DashboardFunnelEventNameSchema
      })
    )
    .min(1)
});
export type DashboardFunnelPreviewRequest = z.infer<typeof DashboardFunnelPreviewRequestSchema>;

export const DashboardFunnelPreviewSchema = z.object({
  steps: z.array(DashboardFunnelMetricStepSchema)
});
export type DashboardFunnelPreview = z.infer<typeof DashboardFunnelPreviewSchema>;

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

export const DashboardUpdateFunnelRequestSchema = DashboardCreateFunnelRequestSchema;
export type DashboardUpdateFunnelRequest = z.infer<typeof DashboardUpdateFunnelRequestSchema>;

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
