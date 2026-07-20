import { z } from "zod";
import { DashboardCampaignSummarySchema } from "./campaign.js";
import { DashboardCampaignPromotionSchema, DashboardPromotionSummarySchema } from "./promotion.js";
import {
  DashboardAdExperimentSchema,
  DashboardCampaignExperimentMetricSchema,
  DashboardContentCandidateSchema,
  DashboardStartPromotionGenerationResultSchema
} from "./promotion-run.js";
import {
  DashboardCampaignRealtimeMetricsSchema,
  DashboardPromotionRealtimeMetricsSchema,
  DashboardRealtimeMetricsSchema,
  DashboardSegmentRealtimeMetricsSchema,
  DashboardSegmentRealtimeSummarySchema
} from "./realtime.js";
import { JsonObjectSchema } from "./schema-primitives.js";
import { DashboardCampaignSegmentSchema } from "./segment.js";

export const DashboardMainSchema = z.object({
  campaigns: z.array(DashboardCampaignSummarySchema),
  realtime_metrics: DashboardRealtimeMetricsSchema
});
export type DashboardMain = z.infer<typeof DashboardMainSchema>;

export const DashboardCampaignDetailSchema = z.object({
  campaign: DashboardCampaignSummarySchema,
  promotions: z.array(DashboardCampaignPromotionSchema),
  segments: z.array(DashboardCampaignSegmentSchema),
  ad_experiments: z.array(DashboardAdExperimentSchema),
  content_candidates: z.array(DashboardContentCandidateSchema),
  experiment_metrics: z.array(DashboardCampaignExperimentMetricSchema),
  realtime_metrics: DashboardCampaignRealtimeMetricsSchema
});
export type DashboardCampaignDetail = z.infer<typeof DashboardCampaignDetailSchema>;

export const DashboardPromotionAnalysisSchema = z.object({
  analysis_id: z.string(),
  promotion_id: z.string(),
  focus_segment_ids: z.array(z.string()),
  operator_instruction: z.string().nullable(),
  input_snapshot_json: JsonObjectSchema,
  profile_summary_json: JsonObjectSchema,
  output_json: JsonObjectSchema.nullable(),
  status: z.string(),
  created_at: z.string(),
  updated_at: z.string()
});
export type DashboardPromotionAnalysis = z.infer<typeof DashboardPromotionAnalysisSchema>;

export const DashboardPromotionDetailSchema = z.object({
  promotion: DashboardPromotionSummarySchema,
  analyses: z.array(DashboardPromotionAnalysisSchema),
  generation: DashboardStartPromotionGenerationResultSchema.nullable().default(null),
  segments: z.array(DashboardCampaignSegmentSchema),
  experiment_metrics: z.array(DashboardCampaignExperimentMetricSchema),
  realtime_metrics: DashboardPromotionRealtimeMetricsSchema,
  segment_realtime_summaries: z.array(DashboardSegmentRealtimeSummarySchema)
});
export type DashboardPromotionDetail = z.infer<typeof DashboardPromotionDetailSchema>;

export const DashboardSegmentDetailSchema = z.object({
  segment: DashboardCampaignSegmentSchema,
  generation: DashboardStartPromotionGenerationResultSchema.nullable().default(null),
  ad_experiments: z.array(DashboardAdExperimentSchema),
  content_candidates: z.array(DashboardContentCandidateSchema),
  experiment_metrics: z.array(DashboardCampaignExperimentMetricSchema),
  realtime_metrics: DashboardSegmentRealtimeMetricsSchema
});
export type DashboardSegmentDetail = z.infer<typeof DashboardSegmentDetailSchema>;
