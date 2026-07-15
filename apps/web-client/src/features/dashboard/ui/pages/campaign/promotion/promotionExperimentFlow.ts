import {
  DASHBOARD_FALLBACK_SEGMENT_ID,
  type DashboardBuildPromotionRunAssignmentsResult
} from "@loopad/shared";
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
  input: { segmentIds: string[] },
  operations: PromotionExperimentOperations
) {
  const run = await operations.createRun();
  const { fallbackExperiment, selectedExperiments } = validateRunContract(run, input.segmentIds);

  const assignmentResult = await operations.buildAssignments(run.promotionRunId);
  const fallbackRequired =
    assignmentResult.batch_has_fallback || assignmentResult.fallback_count > 0;
  if (fallbackRequired && !fallbackExperiment) {
    throw new Error("기본 광고 배정은 있지만 기본 광고 실험이 없어요. 다시 시도해 주세요.");
  }

  const requiredExperiments =
    fallbackRequired && fallbackExperiment
      ? [...selectedExperiments, fallbackExperiment]
      : selectedExperiments;
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

  const channel = selectedExperiments[0]!.channel;
  const shouldDispatch = channel === "email" || channel === "sms";
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

function validateRunContract(run: PromotionRunLaunchTarget, requestedSegmentIds: string[]) {
  const scope = uniqueSorted(run.segmentIds);
  const requestedScope = uniqueSorted(requestedSegmentIds);
  if (
    scope.length !== run.segmentIds.length ||
    requestedScope.length !== requestedSegmentIds.length ||
    !sameStringArray(scope, requestedScope)
  ) {
    throw new Error("만든 실험의 세그먼트 범위가 요청과 달라요. 다시 시도해 주세요.");
  }

  const fallbackExperiments = run.experiments.filter(
    (experiment) => experiment.isFallback && experiment.segmentId === DASHBOARD_FALLBACK_SEGMENT_ID
  );
  const invalidFallbackFlags = run.experiments.some(
    (experiment) =>
      experiment.isFallback !== (experiment.segmentId === DASHBOARD_FALLBACK_SEGMENT_ID)
  );
  if (invalidFallbackFlags || fallbackExperiments.length > 1) {
    throw new Error("기본 광고 실험 정보가 올바르지 않아요. 다시 시도해 주세요.");
  }

  const selectedExperiments = run.experiments.filter((experiment) => !experiment.isFallback);
  if (
    selectedExperiments.length !== scope.length ||
    !sameStringArray(
      uniqueSorted(selectedExperiments.map((experiment) => experiment.segmentId)),
      scope
    ) ||
    scope.some(
      (segmentId) =>
        selectedExperiments.filter((experiment) => experiment.segmentId === segmentId).length !== 1
    )
  ) {
    throw new Error("실험의 세그먼트와 광고 범위가 달라요. 다시 시도해 주세요.");
  }

  return {
    fallbackExperiment: fallbackExperiments[0],
    selectedExperiments
  };
}

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function sameStringArray(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
