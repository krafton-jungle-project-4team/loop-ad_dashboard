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

export type PromotionExperimentLaunchResult = {
  dispatched: boolean;
  failedExperimentIds: string[];
  promotionRunId: string;
  startedExperimentIds: string[];
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
  const startResults = await Promise.allSettled(
    startableExperiments.map((experiment) => operations.startExperiment(experiment.adExperimentId))
  );
  const startedExperimentIds: string[] = [];
  const failedExperimentIds: string[] = [];

  startResults.forEach((result, index) => {
    const experiment = startableExperiments[index];
    if (!experiment) {
      return;
    }
    if (result.status === "fulfilled") {
      startedExperimentIds.push(experiment.adExperimentId);
      return;
    }
    failedExperimentIds.push(experiment.adExperimentId);
  });

  const shouldDispatch = run.experiments.some(
    (experiment) => experiment.channel === "email" || experiment.channel === "sms"
  );
  const canDispatch = shouldDispatch && startedExperimentIds.length > 0;
  if (canDispatch) {
    await operations.dispatch(run.promotionRunId);
  }

  return {
    dispatched: canDispatch,
    failedExperimentIds,
    promotionRunId: run.promotionRunId,
    startedExperimentIds
  } satisfies PromotionExperimentLaunchResult;
}
