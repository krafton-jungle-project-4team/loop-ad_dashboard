import type { DashboardCreatePromotionRunResult } from "@loopad/shared";

export function promotionRunLaunchTarget(run: DashboardCreatePromotionRunResult) {
  return {
    experiments: run.ad_experiments.map((experiment) => ({
      adExperimentId: experiment.ad_experiment_id,
      channel: experiment.channel,
      isFallback: experiment.is_fallback,
      segmentId: experiment.segment_id,
      status: experiment.status
    })),
    promotionRunId: run.promotion_run_id,
    segmentIds: run.segment_ids
  };
}
