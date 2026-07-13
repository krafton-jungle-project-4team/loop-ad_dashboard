import type { DashboardAdExperiment } from "@loopad/shared";
import { canStartAdExperiment } from "./promotionUtils.js";

type ExperimentLaunchTarget = {
  adExperimentId: string;
  channel: string;
  segmentId: string;
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
  dispatchFailed: boolean;
  failedExperimentIds: string[];
  promotionRunId: string;
  startedExperimentIds: string[];
};

export async function launchPromotionExperiment(
  input: { existingExperiments: DashboardAdExperiment[]; segmentId: string },
  operations: PromotionExperimentOperations
) {
  const segmentExperiments = input.existingExperiments.filter(
    (experiment) => experiment.segment_id === input.segmentId
  );
  const existingRunId = segmentExperiments[0]?.promotion_run_id;
  const existingRunExperiments = existingRunId
    ? segmentExperiments.filter((experiment) => experiment.promotion_run_id === existingRunId)
    : [];
  const run = existingRunId
    ? {
        experiments: existingRunExperiments.map((experiment) => ({
          adExperimentId: experiment.ad_experiment_id,
          channel: experiment.channel,
          segmentId: experiment.segment_id,
          status: experiment.status
        })),
        promotionRunId: existingRunId
      }
    : await operations.createRun();

  const targetExperiment = run.experiments.find(
    (experiment) => experiment.segmentId === input.segmentId
  );
  if (!targetExperiment) {
    throw new Error("선택한 세그먼트의 광고 실험을 찾지 못했습니다.");
  }

  await operations.buildAssignments(run.promotionRunId);

  const startedExperimentIds: string[] = [];
  const failedExperimentIds: string[] = [];

  if (canStartAdExperiment(targetExperiment.status)) {
    try {
      await operations.startExperiment(targetExperiment.adExperimentId);
      startedExperimentIds.push(targetExperiment.adExperimentId);
    } catch {
      failedExperimentIds.push(targetExperiment.adExperimentId);
    }
  }

  const shouldDispatch = targetExperiment.channel === "email" || targetExperiment.channel === "sms";
  const canDispatch = shouldDispatch && startedExperimentIds.length > 0;
  let dispatchFailed = false;
  if (canDispatch) {
    try {
      await operations.dispatch(run.promotionRunId);
    } catch {
      dispatchFailed = true;
    }
  }

  return {
    dispatched: canDispatch && !dispatchFailed,
    dispatchFailed,
    failedExperimentIds,
    promotionRunId: run.promotionRunId,
    startedExperimentIds
  } satisfies PromotionExperimentLaunchResult;
}
