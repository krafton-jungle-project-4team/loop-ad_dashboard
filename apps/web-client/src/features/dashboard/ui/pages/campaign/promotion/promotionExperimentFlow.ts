import type { DashboardBuildPromotionRunAssignmentsResult } from "@loopad/shared";
import { canStartAdExperiment } from "./promotionUtils.js";

type ExperimentLaunchTarget = {
  adExperimentId: string;
  channel: string;
  isFallback: boolean;
  segmentId: string;
  status: string;
};

type PromotionRunLaunchTarget = {
  experiments: ExperimentLaunchTarget[];
  promotionRunId: string;
  segmentIds: string[];
};

export type PromotionExperimentOperations = {
  buildAssignments: (
    promotionRunId: string
  ) => Promise<DashboardBuildPromotionRunAssignmentsResult>;
  createRun: () => Promise<PromotionRunLaunchTarget>;
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
  input: { segmentId: string },
  operations: PromotionExperimentOperations
) {
  const run = await operations.createRun();
  assertRequestedSegmentScope(run.segmentIds, input.segmentId);

  const selectedExperiments = run.experiments.filter(
    (experiment) => !experiment.isFallback && experiment.segmentId === input.segmentId
  );
  if (selectedExperiments.length !== 1) {
    throw new Error("선택한 세그먼트의 광고 실험이 정확히 하나여야 합니다.");
  }
  const targetExperiment = selectedExperiments[0]!;
  const fallbackExperiments = run.experiments.filter((experiment) => experiment.isFallback);
  if (fallbackExperiments.length > 1) {
    throw new Error("fallback 광고 실험은 하나만 존재해야 합니다.");
  }

  const assignmentResult = await operations.buildAssignments(run.promotionRunId);
  const fallbackRequired =
    assignmentResult.run_has_fallback || assignmentResult.run_fallback_count > 0;
  const fallbackExperiment = fallbackExperiments[0];
  if (fallbackRequired && !fallbackExperiment) {
    throw new Error("fallback 배정이 있지만 fallback 광고 실험이 없습니다.");
  }

  const requiredExperiments = fallbackRequired
    ? [targetExperiment, fallbackExperiment!]
    : [targetExperiment];
  const startedExperimentIds: string[] = [];
  const failedExperimentIds: string[] = [];

  for (const experiment of requiredExperiments) {
    if (experiment.status === "running") {
      continue;
    }
    if (!canStartAdExperiment(experiment.status)) {
      throw new Error(
        `광고 실험 '${experiment.adExperimentId}'은(는) 시작할 수 없는 상태입니다: ${experiment.status}`
      );
    }
    try {
      await operations.startExperiment(experiment.adExperimentId);
      startedExperimentIds.push(experiment.adExperimentId);
    } catch {
      failedExperimentIds.push(experiment.adExperimentId);
    }
  }

  const shouldDispatch = targetExperiment.channel === "email" || targetExperiment.channel === "sms";
  const canDispatch = shouldDispatch && failedExperimentIds.length === 0;
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

function assertRequestedSegmentScope(segmentIds: string[], requestedSegmentId: string) {
  if (segmentIds.length !== 1 || segmentIds[0] !== requestedSegmentId) {
    throw new Error("생성된 실험 Run의 세그먼트 범위가 요청과 일치하지 않습니다.");
  }
}
