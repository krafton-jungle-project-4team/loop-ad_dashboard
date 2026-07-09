import { z } from "zod";

export const PromotionChannelSchema = z.enum(["email", "sms", "onsite_banner"]);
export type PromotionChannel = z.infer<typeof PromotionChannelSchema>;

export const CreativeFormatSchema = z.enum(["email_html", "sms_text", "banner_html"]);
export type CreativeFormat = z.infer<typeof CreativeFormatSchema>;

export const ArtifactStatusSchema = z.enum(["not_required", "pending", "published", "failed"]);
export type ArtifactStatus = z.infer<typeof ArtifactStatusSchema>;

export const CreativeArtifactSchema = z.object({
  creative_format: CreativeFormatSchema,
  artifact_status: ArtifactStatusSchema,
  storage_key: z.string().min(1).optional(),
  public_url: z.string().url().optional(),
  sha256: z.string().min(1).optional(),
  bytes: z.number().int().nonnegative().optional(),
  content_type: z.string().min(1).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  error_code: z.string().min(1).optional()
});
export type CreativeArtifact = z.infer<typeof CreativeArtifactSchema>;

export const LoopAdAttributionSchema = z.object({
  project_id: z.string().min(1),
  campaign_id: z.string().min(1),
  promotion_id: z.string().min(1),
  promotion_run_id: z.string().min(1),
  ad_experiment_id: z.string().min(1),
  segment_id: z.string().min(1),
  content_id: z.string().min(1),
  content_option_id: z.string().min(1),
  creative_id: z.string().min(1),
  promotion_channel: PromotionChannelSchema,
  target_url: z.string().min(1),
  placement_id: z.string().min(1).optional(),
  redirect_id: z.string().min(1).optional()
});
export type LoopAdAttribution = z.infer<typeof LoopAdAttributionSchema>;

export const BannerResolveQuerySchema = z.object({
  project_id: z.string().min(1),
  promotion_run_id: z.string().min(1),
  user_id: z.string().min(1),
  placement_id: z.string().min(1)
});
export type BannerResolveQuery = z.infer<typeof BannerResolveQuerySchema>;

export const BannerResolveResponseSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("empty"),
    placement_id: z.string().min(1),
    reason: z.enum(["assignment_not_found", "artifact_not_ready", "artifact_failed"])
  }),
  z.object({
    status: z.literal("filled"),
    placement_id: z.string().min(1),
    creative: z.object({
      creative_id: z.string().min(1),
      creative_format: z.literal("banner_html"),
      html_url: z.string().url(),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
      click_url: z.string().url(),
      target_url: z.string().url(),
      sandbox: z.object({
        allow_scripts: z.literal(true),
        allow_same_origin: z.literal(false),
        allow_popups: z.boolean()
      })
    }),
    attribution: LoopAdAttributionSchema
  })
]);
export type BannerResolveResponse = z.infer<typeof BannerResolveResponseSchema>;

export const PromotionRunDispatchParamsSchema = z.object({
  promotion_run_id: z.string().min(1)
});
export type PromotionRunDispatchParams = z.infer<typeof PromotionRunDispatchParamsSchema>;

export const DispatchAttemptSummarySchema = z.object({
  user_id: z.string().min(1),
  redirect_id: z.string().min(1).optional(),
  status: z.enum(["sent", "failed"]),
  error_code: z.string().min(1).optional(),
  provider_message_id: z.string().min(1).optional()
});
export type DispatchAttemptSummary = z.infer<typeof DispatchAttemptSummarySchema>;

export const DispatchJobSummarySchema = z.object({
  dispatch_job_id: z.string().min(1),
  promotion_run_id: z.string().min(1),
  ad_experiment_id: z.string().min(1),
  segment_id: z.string().min(1),
  channel: z.enum(["email", "sms"]),
  status: z.enum(["completed", "partial_failed", "failed"]),
  target_count: z.number().int().nonnegative(),
  dispatched_count: z.number().int().nonnegative(),
  failed_count: z.number().int().nonnegative(),
  attempts: z.array(DispatchAttemptSummarySchema)
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
