import { z } from "zod";
import { CountSchema, JsonObjectSchema } from "./schema-primitives.js";

export const DASHBOARD_FALLBACK_SEGMENT_ID = "seg_existing_all";

export const OFFER_SETS = {
  base: {
    offer_set_id: "summer-base",
    expected_catalog_id: "black-friday-hotels",
    expected_catalog_version: "v2"
  },
  lastcall: {
    offer_set_id: "summer-lastcall",
    expected_catalog_id: "black-friday-hotels-lastcall",
    expected_catalog_version: "v3"
  }
} as const;

export const DashboardContentCandidateSchema = z.object({
  content_id: z.string(),
  content_option_id: z.string(),
  generation_id: z.string(),
  analysis_id: z.string(),
  promotion_id: z.string(),
  segment_id: z.string(),
  channel: z.string(),
  subject: z.string().nullable(),
  preheader: z.string().nullable(),
  title: z.string().nullable(),
  body: z.string().nullable(),
  cta: z.string().nullable(),
  message: z.string().nullable(),
  image_prompt: z.string().nullable(),
  image_url: z.string().nullable(),
  landing_url: z.string().nullable(),
  generation_prompt: z.string().nullable(),
  reason_summary: z.string().nullable(),
  data_evidence_json: JsonObjectSchema,
  message_strategy: z.string().nullable(),
  metadata_json: JsonObjectSchema,
  next_loop_preparation_id: z.string().min(1).nullable().default(null),
  status: z.string(),
  updated_at: z.string()
});
export type DashboardContentCandidate = z.infer<typeof DashboardContentCandidateSchema>;

export const DashboardStartPromotionGenerationRequestSchema = z
  .object({
    analysis_id: z.string().min(1),
    segment_id: z.string().min(1).optional(),
    content_option_count: z.number().int().min(1).max(10).optional(),
    operator_instruction: z.string().nullable().optional(),
    offer_set_id: z.literal(OFFER_SETS.lastcall.offer_set_id).optional(),
    expected_catalog_id: z.literal(OFFER_SETS.lastcall.expected_catalog_id).optional(),
    expected_catalog_version: z.literal(OFFER_SETS.lastcall.expected_catalog_version).optional()
  })
  .superRefine((request, context) => {
    const offerSetFields = [
      "offer_set_id",
      "expected_catalog_id",
      "expected_catalog_version"
    ] as const;
    const hasOfferSetRequest = offerSetFields.some((field) => request[field] !== undefined);
    if (!hasOfferSetRequest) {
      return;
    }

    if (!request.segment_id) {
      context.addIssue({
        code: "custom",
        message: "segment_id is required for offer-set generation",
        path: ["segment_id"]
      });
    }

    for (const field of offerSetFields) {
      if (request[field] === undefined) {
        context.addIssue({
          code: "custom",
          message: `${field} is required for offer-set generation`,
          path: [field]
        });
      }
    }
  });
export type DashboardStartPromotionGenerationRequest = z.infer<
  typeof DashboardStartPromotionGenerationRequestSchema
>;

export const DashboardStartPromotionGenerationResultSchema = z.object({
  generation_id: z.string(),
  promotion_id: z.string(),
  status: z.string(),
  content_candidate_count: CountSchema.optional()
});
export type DashboardStartPromotionGenerationResult = z.infer<
  typeof DashboardStartPromotionGenerationResultSchema
>;

export const DashboardApproveContentCandidateRequestSchema = z.object({
  operator_note: z.string().nullable().optional()
});
export type DashboardApproveContentCandidateRequest = z.infer<
  typeof DashboardApproveContentCandidateRequestSchema
>;

export const DashboardApproveContentCandidateResultSchema = z.object({
  content_id: z.string(),
  content_option_id: z.string(),
  promotion_id: z.string(),
  segment_id: z.string(),
  status: z.literal("approved")
});
export type DashboardApproveContentCandidateResult = z.infer<
  typeof DashboardApproveContentCandidateResultSchema
>;

export const DashboardUnapproveContentCandidateRequestSchema = z.object({
  operator_note: z.string().nullable().optional()
});
export type DashboardUnapproveContentCandidateRequest = z.infer<
  typeof DashboardUnapproveContentCandidateRequestSchema
>;

export const DashboardUnapproveContentCandidateResultSchema = z.object({
  content_id: z.string(),
  content_option_id: z.string(),
  promotion_id: z.string(),
  segment_id: z.string(),
  status: z.literal("draft")
});
export type DashboardUnapproveContentCandidateResult = z.infer<
  typeof DashboardUnapproveContentCandidateResultSchema
>;

export const DashboardUpdateContentCandidateCopyRequestSchema = z.object({
  headline: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(5000),
  cta: z.string().trim().min(1).max(100)
});
export type DashboardUpdateContentCandidateCopyRequest = z.infer<
  typeof DashboardUpdateContentCandidateCopyRequestSchema
>;

export const DashboardUpdateContentCandidateCopyResultSchema = z.object({
  content_id: z.string(),
  promotion_id: z.string(),
  segment_id: z.string(),
  headline: z.string(),
  body: z.string(),
  cta: z.string(),
  html_url: z.string().url(),
  status: z.literal("draft"),
  updated_at: z.string()
});
export type DashboardUpdateContentCandidateCopyResult = z.infer<
  typeof DashboardUpdateContentCandidateCopyResultSchema
>;

export const DashboardReviseContentCandidateHtmlRequestSchema = z.object({
  feedback: z.string().trim().min(3).max(2000)
});
export type DashboardReviseContentCandidateHtmlRequest = z.infer<
  typeof DashboardReviseContentCandidateHtmlRequestSchema
>;

export const DashboardReviseContentCandidateHtmlResultSchema =
  DashboardUpdateContentCandidateCopyResultSchema.extend({
    change_summary: z.string().min(1).max(500)
  });
export type DashboardReviseContentCandidateHtmlResult = z.infer<
  typeof DashboardReviseContentCandidateHtmlResultSchema
>;

export const DASHBOARD_CONTENT_CANDIDATE_HTML_MAX_BYTES = 2_000_000;

const DashboardContentCandidateHtmlRevisionSchema = z.string().regex(/^[a-f0-9]{64}$/);
const DashboardContentCandidateEditableHtmlSchema = z
  .string()
  .min(1)
  .refine(
    (html) =>
      new TextEncoder().encode(html).byteLength <= DASHBOARD_CONTENT_CANDIDATE_HTML_MAX_BYTES,
    "HTML exceeds the 2 MB edit limit."
  );

export const DashboardContentCandidateHtmlSourceSchema = z.object({
  html: DashboardContentCandidateEditableHtmlSchema,
  revision: DashboardContentCandidateHtmlRevisionSchema,
  updated_at: z.string()
});
export type DashboardContentCandidateHtmlSource = z.infer<
  typeof DashboardContentCandidateHtmlSourceSchema
>;

export const DashboardSaveContentCandidateHtmlRequestSchema = z.object({
  html: DashboardContentCandidateEditableHtmlSchema,
  base_revision: DashboardContentCandidateHtmlRevisionSchema
});
export type DashboardSaveContentCandidateHtmlRequest = z.infer<
  typeof DashboardSaveContentCandidateHtmlRequestSchema
>;

export const DashboardSaveContentCandidateHtmlResultSchema =
  DashboardUpdateContentCandidateCopyResultSchema.extend({
    html: DashboardContentCandidateEditableHtmlSchema,
    revision: DashboardContentCandidateHtmlRevisionSchema
  });
export type DashboardSaveContentCandidateHtmlResult = z.infer<
  typeof DashboardSaveContentCandidateHtmlResultSchema
>;

export const DashboardPreviewContentCandidateHtmlRequestSchema = z.object({
  html: DashboardContentCandidateEditableHtmlSchema
});
export type DashboardPreviewContentCandidateHtmlRequest = z.infer<
  typeof DashboardPreviewContentCandidateHtmlRequestSchema
>;

export const DashboardPreviewContentCandidateHtmlResultSchema = z.object({
  html: DashboardContentCandidateEditableHtmlSchema
});
export type DashboardPreviewContentCandidateHtmlResult = z.infer<
  typeof DashboardPreviewContentCandidateHtmlResultSchema
>;

export const DashboardRejectContentCandidateRequestSchema = z.object({
  operator_note: z.string().nullable().optional()
});
export type DashboardRejectContentCandidateRequest = z.infer<
  typeof DashboardRejectContentCandidateRequestSchema
>;

export const DashboardRejectContentCandidateResultSchema = z.object({
  content_id: z.string(),
  promotion_id: z.string(),
  segment_id: z.string(),
  status: z.literal("rejected"),
  rejected_at: z.string()
});
export type DashboardRejectContentCandidateResult = z.infer<
  typeof DashboardRejectContentCandidateResultSchema
>;

export const DashboardAdExperimentSchema = z.object({
  ad_experiment_id: z.string(),
  promotion_run_id: z.string(),
  promotion_id: z.string(),
  segment_id: z.string(),
  content_id: z.string(),
  content_option_id: z.string(),
  channel: z.string(),
  loop_count: CountSchema,
  goal_metric: z.string(),
  goal_target_value: z.number().nonnegative(),
  goal_basis: z.string(),
  assignment_count: CountSchema.default(0),
  is_fallback: z.boolean(),
  status: z.string()
});
export type DashboardAdExperiment = z.infer<typeof DashboardAdExperimentSchema>;

export const DashboardStartAdExperimentResultSchema = DashboardAdExperimentSchema.extend({
  status: z.literal("running")
});
export type DashboardStartAdExperimentResult = z.infer<
  typeof DashboardStartAdExperimentResultSchema
>;

export const DashboardCreatePromotionRunRequestSchema = z.object({
  analysis_id: z.string().min(1).optional(),
  generation_id: z.string().min(1).optional(),
  segment_ids: z.array(z.string().min(1)).length(1),
  loop_count: z.number().int().min(1).default(1),
  next_loop_preparation_id: z.string().min(1).nullable().optional()
});
export type DashboardCreatePromotionRunRequest = z.infer<
  typeof DashboardCreatePromotionRunRequestSchema
>;

export const DashboardPromotionRunAdExperimentSchema = z.object({
  ad_experiment_id: z.string(),
  segment_id: z.string(),
  segment_name: z.string().nullable().optional(),
  content_id: z.string(),
  content_option_id: z.string(),
  channel: z.string(),
  is_fallback: z.boolean(),
  loop_count: CountSchema,
  status: z.string()
});
export type DashboardPromotionRunAdExperiment = z.infer<
  typeof DashboardPromotionRunAdExperimentSchema
>;

export const DashboardCreatePromotionRunResultSchema = z.object({
  promotion_run_id: z.string(),
  project_id: z.string(),
  campaign_id: z.string(),
  promotion_id: z.string(),
  analysis_id: z.string(),
  generation_id: z.string(),
  loop_count: CountSchema,
  status: z.string(),
  goal_snapshot_json: JsonObjectSchema,
  segment_ids: z.array(z.string().min(1)).min(1),
  ad_experiments: z.array(DashboardPromotionRunAdExperimentSchema)
});
export type DashboardCreatePromotionRunResult = z.infer<
  typeof DashboardCreatePromotionRunResultSchema
>;

export const DashboardBuildPromotionRunAssignmentsResultSchema = z.object({
  promotion_run_id: z.string(),
  matching_mode: z.string(),
  vector_version: z.string(),
  ann_candidate_limit: CountSchema,
  ann_candidate_count: CountSchema,
  exact_reranked_pair_count: CountSchema,
  assignment_count: CountSchema,
  batch_has_fallback: z.boolean(),
  completion_scope: z.literal("current_request"),
  fallback_count: CountSchema,
  below_threshold_fallback_count: CountSchema,
  no_candidate_fallback_count: CountSchema,
  invalid_user_vector_fallback_count: CountSchema,
  ann_underfilled_user_count: CountSchema,
  skipped_existing_count: CountSchema,
  insufficient_segment_count: CountSchema,
  status: z.string(),
  activation_status: z
    .enum(["manual_start_required", "scheduled", "automatic_start_queued"])
    .default("manual_start_required"),
  scheduled_start_at: z.string().nullable().default(null)
});
export type DashboardBuildPromotionRunAssignmentsResult = z.infer<
  typeof DashboardBuildPromotionRunAssignmentsResultSchema
>;

export const DashboardEvaluatePromotionRunRequestSchema = z.object({});
export type DashboardEvaluatePromotionRunRequest = z.infer<
  typeof DashboardEvaluatePromotionRunRequestSchema
>;

export const DashboardEvaluateAdExperimentResultSchema = z.object({
  evaluation_id: z.string(),
  ad_experiment_id: z.string(),
  promotion_run_id: z.string(),
  promotion_id: z.string(),
  segment_id: z.string(),
  metric: z.string(),
  target_value: z.coerce.number().nonnegative(),
  actual_value: z.coerce.number().nonnegative(),
  numerator_count: CountSchema,
  denominator_count: CountSchema,
  sample_size: CountSchema,
  basis: z.string(),
  status: z.string(),
  next_loop_required: z.boolean(),
  feedback: z.string().nullable()
});
export type DashboardEvaluateAdExperimentResult = z.infer<
  typeof DashboardEvaluateAdExperimentResultSchema
>;

export const DashboardPromotionRunAdExperimentEvaluationSchema = z.object({
  ad_experiment_id: z.string(),
  segment_id: z.string(),
  actual_value: z.coerce.number().nonnegative(),
  status: z.string()
});
export type DashboardPromotionRunAdExperimentEvaluation = z.infer<
  typeof DashboardPromotionRunAdExperimentEvaluationSchema
>;

export const DashboardEvaluatePromotionRunResultSchema = z.object({
  promotion_run_id: z.string(),
  promotion_id: z.string(),
  status: z.string(),
  ad_experiment_results: z.array(DashboardPromotionRunAdExperimentEvaluationSchema),
  next_loop_required: z.boolean(),
  failed_segment_ids: z.array(z.string()),
  failed_ad_experiment_ids: z.array(z.string())
});
export type DashboardEvaluatePromotionRunResult = z.infer<
  typeof DashboardEvaluatePromotionRunResultSchema
>;

export const DashboardCreateNextLoopRequestSchema = z.object({
  failed_segment_ids: z.array(z.string()).default([]),
  failed_ad_experiment_ids: z.array(z.string()).default([]),
  operator_instruction: z.string().nullable().optional(),
  content_approval_mode: z.enum(["automatic", "manual"]).default("automatic")
});
export type DashboardCreateNextLoopRequest = z.infer<typeof DashboardCreateNextLoopRequestSchema>;

export const DashboardCreateNextLoopResultSchema = z.object({
  previous_promotion_run_id: z.string(),
  next_promotion_run_id: z.string().nullable(),
  promotion_id: z.string(),
  loop_count: CountSchema,
  segment_ids: z.array(z.string().min(1)).min(1),
  next_analysis_id: z.string().nullable(),
  next_generation_id: z.string().nullable(),
  next_ad_experiments: z.array(DashboardPromotionRunAdExperimentSchema),
  status: z.enum(["awaiting_content_approval", "activated", "rejected"]).nullable().default(null),
  content_approval_required: z.boolean().default(false),
  next_loop_preparation_id: z.string().min(1).nullable().default(null),
  pending_content_ids: z.array(z.string()).default([])
});
export type DashboardCreateNextLoopResult = z.infer<typeof DashboardCreateNextLoopResultSchema>;

export const DashboardCampaignExperimentMetricSchema = z.object({
  promotion_id: z.string(),
  promotion_run_id: z.string(),
  ad_experiment_id: z.string().nullable(),
  segment_id: z.string().nullable(),
  content_id: z.string().nullable(),
  content_option_id: z.string().nullable(),
  metric: z.string(),
  target_value: z.number().nonnegative(),
  actual_value: z.number().nonnegative(),
  numerator_count: CountSchema,
  denominator_count: CountSchema,
  sample_size: CountSchema,
  basis: z.string(),
  status: z.string(),
  feedback: z.string().nullable(),
  next_loop_required: z.boolean(),
  result_json: JsonObjectSchema,
  created_at: z.string()
});
export type DashboardCampaignExperimentMetric = z.infer<
  typeof DashboardCampaignExperimentMetricSchema
>;
