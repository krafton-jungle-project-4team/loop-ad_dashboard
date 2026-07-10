import type { DashboardAdExperiment } from "@loopad/shared";
import { canStartAdExperiment } from "./promotionUtils.js";

type ExperimentLaunchTarget = {
  adExperimentId: string;
  channel: string;
  status: string;
};

export type PromotionExperimentOperations = {
  buildAssignments: (promotionRunId: string) => Promise<unknown>;
  createRun: () => Promise<{
    experiments: ExperimentLaunchTarget[];
    promotionRunId: string;
  }>;
  dispatch: (promotionRunId: string) => Promise<unknown>;
  startExperiment: (adExperimentId: string) => Promise<unknown>;
};

export async function launchPromotionExperiment(
  input: { existingExperiments: DashboardAdExperiment[] },
  operations: PromotionExperimentOperations
) {
  const existingRunId = input.existingExperiments[0]?.promotion_run_id;
  const existingRunExperiments = existingRunId
    ? input.existingExperiments.filter(
        (experiment) => experiment.promotion_run_id === existingRunId
      )
    : [];
  const run = existingRunId
    ? {
        experiments: existingRunExperiments.map((experiment) => ({
          adExperimentId: experiment.ad_experiment_id,
          channel: experiment.channel,
          status: experiment.status
        })),
        promotionRunId: existingRunId
      }
    : await operations.createRun();

  await operations.buildAssignments(run.promotionRunId);

  const startableExperiments = run.experiments.filter((experiment) =>
    canStartAdExperiment(experiment.status)
  );
  await Promise.all(
    startableExperiments.map((experiment) => operations.startExperiment(experiment.adExperimentId))
  );

  const shouldDispatch = run.experiments.some(
    (experiment) => experiment.channel === "email" || experiment.channel === "sms"
  );
  if (shouldDispatch) {
    await operations.dispatch(run.promotionRunId);
  }

  return {
    dispatched: shouldDispatch,
    promotionRunId: run.promotionRunId,
    startedExperimentIds: startableExperiments.map((experiment) => experiment.adExperimentId)
  };
}
