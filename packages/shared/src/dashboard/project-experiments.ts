import { z } from "zod";
import { CountSchema } from "./schema-primitives.js";

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
