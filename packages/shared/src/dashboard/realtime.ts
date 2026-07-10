import { z } from "zod";
import { CountSchema, RateSchema } from "./schema-primitives.js";

export const DashboardRealtimeEventSchema = z.object({
  event_name: z.string(),
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
export type DashboardRealtimeBreakdownItem = z.infer<typeof DashboardRealtimeBreakdownItemSchema>;

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
export type DashboardSegmentRealtimeMetrics = z.infer<typeof DashboardSegmentRealtimeMetricsSchema>;

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
export type DashboardSegmentRealtimeSummary = z.infer<typeof DashboardSegmentRealtimeSummarySchema>;
