import { z } from "zod";
import { CountSchema } from "./schema-primitives.js";

const JsonNumericSchema = z
  .union([z.number(), z.string().regex(/^\d+(?:\.\d+)?$/)])
  .transform((value) => Number(value))
  .pipe(z.number().finite().nonnegative());
const JsonRateSchema = JsonNumericSchema.pipe(z.number().max(1));

export const DashboardEvaluationFunnelStageSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  user_count: CountSchema,
  conversion_rate_from_previous: JsonRateSchema.nullable(),
  dropoff_count_from_previous: CountSchema.nullable(),
  dropoff_rate_from_previous: JsonRateSchema.nullable()
});
export type DashboardEvaluationFunnelStage = z.infer<typeof DashboardEvaluationFunnelStageSchema>;

export const DashboardEvaluationLargestDropoffSchema = z.object({
  from_stage_key: z.string().min(1),
  from_stage_label: z.string().min(1),
  to_stage_key: z.string().min(1),
  to_stage_label: z.string().min(1),
  from_count: CountSchema,
  to_count: CountSchema,
  dropoff_count: CountSchema,
  dropoff_rate: JsonRateSchema
});
export type DashboardEvaluationLargestDropoff = z.infer<
  typeof DashboardEvaluationLargestDropoffSchema
>;

export const DashboardExperimentEvaluationDiagnosisSchema = z.object({
  version: z.string().min(1),
  status: z.string().min(1),
  summary: z.string().min(1),
  observed_bottleneck: z.string().min(1),
  largest_dropoff: DashboardEvaluationLargestDropoffSchema.nullable(),
  evidence: z.array(z.string().min(1)),
  improvement_directions: z.array(z.string().min(1)),
  gap_percentage_points: JsonNumericSchema,
  evidence_strength: z.object({
    level: z.enum(["unavailable", "insufficient", "limited", "sufficient"]),
    sample_size: CountSchema,
    reason: z.string().min(1)
  }),
  limitations: z.array(z.string().min(1)),
  data_origin: z.object({
    kind: z.enum(["observed", "demo_fixture", "mixed"]),
    label: z.string().min(1)
  }),
  funnel: z.object({
    counting_method: z.string().min(1),
    stages: z.array(DashboardEvaluationFunnelStageSchema).min(2),
    largest_dropoff: DashboardEvaluationLargestDropoffSchema.nullable()
  })
});
export type DashboardExperimentEvaluationDiagnosis = z.infer<
  typeof DashboardExperimentEvaluationDiagnosisSchema
>;

export const DashboardProjectExperimentLatestEvaluationSchema = z.object({
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
  evaluation_cutoff_at: z.string().nullable(),
  window_start: z.string().nullable(),
  diagnosis: DashboardExperimentEvaluationDiagnosisSchema.nullable(),
  created_at: z.string()
});
export type DashboardProjectExperimentLatestEvaluation = z.infer<
  typeof DashboardProjectExperimentLatestEvaluationSchema
>;

export const DashboardProjectExperimentNextLoopSchema = z.object({
  promotion_run_id: z.string(),
  loop_count: CountSchema,
  status: z.string()
});
export type DashboardProjectExperimentNextLoop = z.infer<
  typeof DashboardProjectExperimentNextLoopSchema
>;

export const DashboardProjectExperimentSchema = z.object({
  ad_experiment_id: z.string(),
  promotion_run_id: z.string(),
  campaign_id: z.string(),
  campaign_name: z.string(),
  promotion_id: z.string(),
  promotion_name: z.string(),
  segment_id: z.string(),
  segment_name: z.string(),
  content_id: z.string(),
  content_option_id: z.string(),
  channel: z.string(),
  loop_count: CountSchema,
  max_loop_count: CountSchema,
  execution_mode: z.enum(["manual", "automatic"]),
  scheduled_start_at: z.string().nullable(),
  scheduled_end_at: z.string().nullable(),
  loop_interval_unit: z.enum(["hour", "day"]),
  loop_interval_value: CountSchema,
  goal_metric: z.string(),
  goal_target_value: z.number().nonnegative(),
  goal_basis: z.string(),
  assignment_count: CountSchema,
  status: z.string(),
  started_at: z.string().nullable(),
  ended_at: z.string().nullable(),
  updated_at: z.string(),
  latest_evaluation: DashboardProjectExperimentLatestEvaluationSchema.nullable(),
  next_loop: DashboardProjectExperimentNextLoopSchema.nullable()
});
export type DashboardProjectExperiment = z.infer<typeof DashboardProjectExperimentSchema>;

export const DashboardProjectExperimentListSchema = z.object({
  experiments: z.array(DashboardProjectExperimentSchema)
});
export type DashboardProjectExperimentList = z.infer<typeof DashboardProjectExperimentListSchema>;
