import { z } from "zod";

export const EventNameSchema = z.enum([
  "page_view",
  "product_view",
  "add_to_cart",
  "checkout_start",
  "purchase",
  "ad_click",
  "message_click",
  "coupon_issued",
  "coupon_used",
  "product_impression",
  "search",
  "leave_page"
]);
export type EventName = z.infer<typeof EventNameSchema>;

export const FunnelStepKeySchema = z.enum([
  "page_view",
  "product_view",
  "add_to_cart",
  "checkout_start",
  "purchase"
]);

export const MetricValueSchema = z.object({
  label: z.string(),
  value: z.string(),
  description: z.string().optional(),
  delta: z.string().optional()
});
export type MetricValue = z.infer<typeof MetricValueSchema>;

export const NamedPerformanceSchema = z.object({
  name: z.string(),
  value: z.number(),
  displayValue: z.string()
});
export type NamedPerformance = z.infer<typeof NamedPerformanceSchema>;

export const TimeSeriesPointSchema = z.object({
  label: z.string(),
  value: z.number(),
  displayValue: z.string().optional()
});
export type TimeSeriesPoint = z.infer<typeof TimeSeriesPointSchema>;

export const FunnelStepSchema = z.object({
  key: FunnelStepKeySchema,
  label: z.string(),
  userCount: z.number(),
  displayUserCount: z.string(),
  conversionRate: z.number(),
  dropOffRate: z.number()
});
export type FunnelStep = z.infer<typeof FunnelStepSchema>;

export const CustomerSegmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  channel: z.string(),
  ageGroup: z.string(),
  gender: z.string(),
  category: z.string(),
  region: z.string(),
  device: z.string(),
  conversionRate: z.string(),
  majorDropOffStep: z.string()
});
export type CustomerSegment = z.infer<typeof CustomerSegmentSchema>;

export const DashboardOverviewSchema = z.object({
  metrics: z.object({
    purchaseConversionRate: MetricValueSchema,
    checkoutDropOffRate: MetricValueSchema,
    realtimePurchases: MetricValueSchema,
    forecastRevenue: MetricValueSchema,
    recentEventCount: MetricValueSchema,
    recentPurchaseCount: MetricValueSchema
  }),
  recentBehaviorEvents: z.array(TimeSeriesPointSchema),
  recentPurchases: z.array(TimeSeriesPointSchema),
  forecast: z.object({
    title: z.string(),
    plannedRevenue: z.array(TimeSeriesPointSchema),
    actualRevenue: z.array(TimeSeriesPointSchema)
  }),
  segmentPerformance: z.object({
    channels: z.array(NamedPerformanceSchema),
    regions: z.array(NamedPerformanceSchema),
    ageGender: z.array(NamedPerformanceSchema),
    devices: z.array(NamedPerformanceSchema),
    categories: z.array(NamedPerformanceSchema)
  })
});
export type DashboardOverview = z.infer<typeof DashboardOverviewSchema>;

export const FunnelComparisonRowSchema = z.object({
  segment: z.string(),
  steps: z.array(FunnelStepSchema)
});
export type FunnelComparisonRow = z.infer<typeof FunnelComparisonRowSchema>;

export const CustomerBehaviorRowSchema = z.object({
  segment: z.string(),
  conversionRate: z.string(),
  dropOffRate: z.string(),
  forecastRevenue: z.string(),
  observedSignals: z.array(z.string())
});
export type CustomerBehaviorRow = z.infer<typeof CustomerBehaviorRowSchema>;

export const ConversionReportSchema = z.object({
  funnel: z.array(FunnelStepSchema),
  deviceComparison: z.array(FunnelComparisonRowSchema),
  channelComparison: z.array(FunnelComparisonRowSchema),
  customerBehaviors: z.array(CustomerBehaviorRowSchema)
});
export type ConversionReport = z.infer<typeof ConversionReportSchema>;

export const InsightDetailSchema = z.object({
  segment: CustomerSegmentSchema,
  actualConversionRate: z.string(),
  expectedConversionRate: z.string(),
  conversionGap: z.string(),
  forecastRevenue: z.string(),
  purchaseHistory: z.array(NamedPerformanceSchema),
  observedSignals: z.array(z.string()),
  summary: z.string(),
  purchaseFlow: z.array(FunnelStepSchema)
});
export type InsightDetail = z.infer<typeof InsightDetailSchema>;

export const InsightReportSchema = z.object({
  topSegments: z.array(CustomerSegmentSchema),
  bottomSegments: z.array(CustomerSegmentSchema),
  selectedInsight: InsightDetailSchema.optional()
});
export type InsightReport = z.infer<typeof InsightReportSchema>;

export const RecommendationActionSchema = z.object({
  id: z.string(),
  segment: CustomerSegmentSchema,
  action: z.string(),
  rationale: z.string(),
  expectedConversionLift: z.string(),
  forecastRevenue: z.string(),
  priority: z.enum(["high", "medium", "low"]),
  channels: z.array(z.string()),
  purchaseFlow: z.array(FunnelStepSchema)
});
export type RecommendationAction = z.infer<typeof RecommendationActionSchema>;

export const RecommendationReportSchema = z.object({
  actions: z.array(RecommendationActionSchema)
});
export type RecommendationReport = z.infer<typeof RecommendationReportSchema>;

export const GeneratedCreativeSchema = z.object({
  id: z.string(),
  segment: CustomerSegmentSchema,
  copy: z.object({
    headline: z.string(),
    body: z.string(),
    cta: z.string()
  }),
  imageAsset: z.object({ label: z.string(), url: z.string().optional() }).optional(),
  videoAsset: z.object({ label: z.string(), thumbnailUrl: z.string().optional() }).optional(),
  channels: z.array(z.string()),
  approvalStatus: z.enum(["pending", "approved", "rejected"]),
  abTestStatus: z.enum(["not_started", "running", "paused", "completed"])
});
export type GeneratedCreative = z.infer<typeof GeneratedCreativeSchema>;

export const CreativeReportSchema = z.object({
  creatives: z.array(GeneratedCreativeSchema)
});
export type CreativeReport = z.infer<typeof CreativeReportSchema>;

export function createApiSuccessResponseSchema<TData>(dataSchema: z.ZodType<TData>) {
  return z.object({
    requestId: z.string(),
    data: dataSchema
  });
}
