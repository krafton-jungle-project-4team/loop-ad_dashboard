import assert from "node:assert/strict";
import test from "node:test";
import type { DashboardBuildPromotionRunAssignmentsResult } from "@loopad/shared";
import {
  launchPromotionExperiment,
  type PromotionExperimentOperations
} from "../src/features/dashboard/ui/pages/campaign/promotion/promotionExperimentFlow.js";

test("fallback 배정이 없으면 선택한 세그먼트 실험만 시작한다", async () => {
  const { calls, operations } = createOperations({
    experiments: [selectedExperiment(), fallbackExperiment()],
    assignmentResult: assignmentResult(false)
  });

  const result = await launchPromotionExperiment({ segmentIds: ["segment-1"] }, operations);

  assert.deepEqual(calls, ["create", "build:run-1", "start:experiment-selected", "dispatch:run-1"]);
  assert.deepEqual(result.startedExperimentIds, ["experiment-selected"]);
});

test("fallback 배정이 있으면 선택 실험과 fallback 실험을 시작한다", async () => {
  const { calls, operations } = createOperations({
    experiments: [selectedExperiment(), fallbackExperiment()],
    assignmentResult: assignmentResult(true)
  });

  const result = await launchPromotionExperiment({ segmentIds: ["segment-1"] }, operations);

  assert.deepEqual(calls, [
    "create",
    "build:run-1",
    "start:experiment-selected",
    "start:experiment-fallback",
    "dispatch:run-1"
  ]);
  assert.deepEqual(result.startedExperimentIds, ["experiment-selected", "experiment-fallback"]);
});

test("fallback_count가 있으면 fallback 실험을 시작한다", async () => {
  const { calls, operations } = createOperations({
    experiments: [selectedExperiment(), fallbackExperiment()],
    assignmentResult: {
      ...assignmentResult(false),
      fallback_count: 3,
      skipped_existing_count: 3
    }
  });

  await launchPromotionExperiment({ segmentIds: ["segment-1"] }, operations);

  assert.deepEqual(calls, [
    "create",
    "build:run-1",
    "start:experiment-selected",
    "start:experiment-fallback",
    "dispatch:run-1"
  ]);
});

test("이미 running인 필수 실험은 중복 시작하지 않고 dispatch 준비 완료로 본다", async () => {
  const { calls, operations } = createOperations({
    experiments: [
      { ...selectedExperiment(), status: "running" },
      { ...fallbackExperiment(), status: "running" }
    ],
    assignmentResult: assignmentResult(true)
  });

  const result = await launchPromotionExperiment({ segmentIds: ["segment-1"] }, operations);

  assert.deepEqual(calls, ["create", "build:run-1", "dispatch:run-1"]);
  assert.deepEqual(result.startedExperimentIds, []);
  assert.equal(result.dispatched, true);
});

test("fallback 실험 시작이 실패하면 dispatch하지 않는다", async () => {
  const { calls, operations } = createOperations({
    experiments: [selectedExperiment(), fallbackExperiment()],
    assignmentResult: assignmentResult(true),
    startFailureId: "experiment-fallback"
  });

  const result = await launchPromotionExperiment({ segmentIds: ["segment-1"] }, operations);

  assert.deepEqual(result.failedExperimentIds, ["experiment-fallback"]);
  assert.equal(result.dispatched, false);
  assert.equal(calls.includes("dispatch:run-1"), false);
});

test("fallback 실험과 배정이 없으면 선택한 세그먼트 실험을 시작한다", async () => {
  const { calls, operations } = createOperations({
    experiments: [selectedExperiment()],
    assignmentResult: assignmentResult(false)
  });

  const result = await launchPromotionExperiment({ segmentIds: ["segment-1"] }, operations);

  assert.deepEqual(calls, ["create", "build:run-1", "start:experiment-selected", "dispatch:run-1"]);
  assert.deepEqual(result.startedExperimentIds, ["experiment-selected"]);
});

test("fallback 배정이 있는데 fallback 실험이 없으면 시작과 dispatch를 중단한다", async () => {
  const { calls, operations } = createOperations({
    experiments: [selectedExperiment()],
    assignmentResult: assignmentResult(true)
  });

  await assert.rejects(
    () => launchPromotionExperiment({ segmentIds: ["segment-1"] }, operations),
    /fallback 배정에 필요한 기본 광고 실험이 없어요/
  );
  assert.deepEqual(calls, ["create", "build:run-1"]);
});

test("Run 응답의 세그먼트 범위가 요청과 다르면 계약 오류로 실패한다", async () => {
  const { operations } = createOperations({
    experiments: [selectedExperiment(), fallbackExperiment()],
    segmentIds: ["segment-other"]
  });

  await assert.rejects(
    () => launchPromotionExperiment({ segmentIds: ["segment-1"] }, operations),
    /세그먼트 범위가 요청과 달라요/
  );
});

test("Run 응답에 범위 밖 일반 실험이 있으면 배정 전에 실패한다", async () => {
  const { calls, operations } = createOperations({
    experiments: [selectedExperiment(), otherSegmentExperiment(), fallbackExperiment()]
  });

  await assert.rejects(
    () => launchPromotionExperiment({ segmentIds: ["segment-1"] }, operations),
    /실험의 세그먼트와 광고 범위가 달라요/
  );
  assert.deepEqual(calls, ["create"]);
});

test("다음 루프의 복수 세그먼트와 fallback 실험을 함께 시작한다", async () => {
  const { calls, operations } = createOperations({
    assignmentResult: assignmentResult(true),
    experiments: [selectedExperiment(), otherSegmentExperiment(), fallbackExperiment()],
    segmentIds: ["segment-1", "segment-2"]
  });

  const result = await launchPromotionExperiment(
    { segmentIds: ["segment-1", "segment-2"] },
    operations
  );

  assert.deepEqual(calls, [
    "create",
    "build:run-1",
    "start:experiment-selected",
    "start:experiment-other",
    "start:experiment-fallback",
    "dispatch:run-1"
  ]);
  assert.deepEqual(result.failedExperimentIds, []);
});

test("실험 시작 후 dispatch가 실패하면 시작 결과를 유지한다", async () => {
  const { operations } = createOperations({
    dispatchFails: true,
    experiments: [selectedExperiment(), fallbackExperiment()],
    assignmentResult: assignmentResult(false)
  });

  const result = await launchPromotionExperiment({ segmentIds: ["segment-1"] }, operations);

  assert.deepEqual(result.startedExperimentIds, ["experiment-selected"]);
  assert.equal(result.dispatched, false);
  assert.equal(result.dispatchFailed, true);
});

function createOperations(input: {
  assignmentResult?: DashboardBuildPromotionRunAssignmentsResult;
  dispatchFails?: boolean;
  experiments: Array<{
    adExperimentId: string;
    channel: string;
    isFallback: boolean;
    segmentId: string;
    status: string;
  }>;
  segmentIds?: string[];
  startFailureId?: string;
}) {
  const calls: string[] = [];
  const operations: PromotionExperimentOperations = {
    buildAssignments: async (promotionRunId) => {
      calls.push(`build:${promotionRunId}`);
      return input.assignmentResult ?? assignmentResult(false);
    },
    createRun: async () => {
      calls.push("create");
      return {
        experiments: input.experiments,
        promotionRunId: "run-1",
        segmentIds: input.segmentIds ?? ["segment-1"]
      };
    },
    dispatch: async (promotionRunId) => {
      calls.push(`dispatch:${promotionRunId}`);
      if (input.dispatchFails) {
        throw new Error("dispatch failed");
      }
    },
    startExperiment: async (adExperimentId) => {
      calls.push(`start:${adExperimentId}`);
      if (input.startFailureId === adExperimentId) {
        throw new Error("start failed");
      }
    }
  };
  return { calls, operations };
}

function selectedExperiment() {
  return {
    adExperimentId: "experiment-selected",
    channel: "email",
    isFallback: false,
    segmentId: "segment-1",
    status: "planned"
  };
}

function fallbackExperiment() {
  return {
    adExperimentId: "experiment-fallback",
    channel: "email",
    isFallback: true,
    segmentId: "seg_existing_all",
    status: "planned"
  };
}

function otherSegmentExperiment() {
  return {
    adExperimentId: "experiment-other",
    channel: "email",
    isFallback: false,
    segmentId: "segment-2",
    status: "planned"
  };
}

function assignmentResult(hasFallback: boolean): DashboardBuildPromotionRunAssignmentsResult {
  return {
    promotion_run_id: "run-1",
    matching_mode: "hybrid",
    vector_version: "v1",
    ann_candidate_limit: 100,
    ann_candidate_count: 80,
    exact_reranked_pair_count: 60,
    assignment_count: 40,
    batch_has_fallback: hasFallback,
    completion_scope: "current_request",
    fallback_count: hasFallback ? 10 : 0,
    below_threshold_fallback_count: 0,
    no_candidate_fallback_count: hasFallback ? 10 : 0,
    invalid_user_vector_fallback_count: 0,
    ann_underfilled_user_count: 0,
    skipped_existing_count: 0,
    insufficient_segment_count: 0,
    status: "completed"
  };
}
