import { z } from "zod";

export const PromotionChannelSchema = z.enum(["email", "sms", "onsite_banner"]);
export type PromotionChannel = z.infer<typeof PromotionChannelSchema>;

export const AdExecutionContractIdsSchema = z.object({
  promotion_run_id: z.string().min(1),
  ad_experiment_id: z.string().min(1),
  segment_id: z.string().min(1),
  content_id: z.string().min(1),
  content_option_id: z.string().min(1)
});
export type AdExecutionContractIds = z.infer<typeof AdExecutionContractIdsSchema>;

export const BannerResolveQuerySchema = z.object({
  project_id: z.string().min(1),
  promotion_run_id: z.string().min(1),
  user_id: z.string().min(1),
  placement_id: z.string().min(1)
});
export type BannerResolveQuery = z.infer<typeof BannerResolveQuerySchema>;

export const BannerResolveResponseSchema = AdExecutionContractIdsSchema.extend({
  project_id: z.string().min(1),
  user_id: z.string().min(1),
  campaign_id: z.string().min(1),
  promotion_id: z.string().min(1),
  promotion_channel: z.literal("onsite_banner"),
  placement_id: z.string().min(1),
  title: z.string(),
  body: z.string(),
  cta: z.string(),
  target_url: z.string()
});
export type BannerResolveResponse = z.infer<typeof BannerResolveResponseSchema>;

export const PromotionRunDispatchParamsSchema = z.object({
  promotion_run_id: z.string().min(1)
});
export type PromotionRunDispatchParams = z.infer<typeof PromotionRunDispatchParamsSchema>;

export const DispatchJobSummarySchema = z.object({
  dispatch_job_id: z.string().min(1),
  promotion_run_id: z.string().min(1),
  ad_experiment_id: z.string().min(1),
  segment_id: z.string().min(1),
  channel: z.enum(["email", "sms"]),
  status: z.enum(["completed", "partial_failed", "failed"]),
  target_count: z.number().int().nonnegative(),
  dispatched_count: z.number().int().nonnegative(),
  failed_count: z.number().int().nonnegative()
});
export type DispatchJobSummary = z.infer<typeof DispatchJobSummarySchema>;

export const PromotionRunDispatchResponseSchema = z.object({
  promotion_run_id: z.string().min(1),
  channel: z.enum(["email", "sms"]),
  target_count: z.number().int().nonnegative(),
  dispatched_count: z.number().int().nonnegative(),
  failed_count: z.number().int().nonnegative(),
  jobs: z.array(DispatchJobSummarySchema)
});
export type PromotionRunDispatchResponse = z.infer<typeof PromotionRunDispatchResponseSchema>;
