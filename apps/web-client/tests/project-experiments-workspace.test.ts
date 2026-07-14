import assert from "node:assert/strict";
import test from "node:test";
import type {
  DashboardEvaluatePromotionRunResult,
  DashboardProjectExperiment
} from "@loopad/shared";
import {
  defaultDashboardSearchQuery,
  normalizeDashboardQuery
} from "../src/features/dashboard/model/dashboard-query.js";
import {
  failedTargetsForPromotionRun,
  filterProjectExperiments,
  normalizeProjectExperimentFilters,
  paginateProjectExperiments,
  promotionRunIdsForRunningExperiments,
  projectExperimentSelectionQuery,
  repeatCreativeTargetForExperiment
} from "../src/features/dashboard/ui/pages/campaign/promotion/experiment/projectExperimentUtils.js";

const experiments = [
  createExperiment({
    ad_experiment_id: "experiment-a",
    campaign_id: "campaign-a",
    campaign_name: "봄 캠페인",
    promotion_id: "promotion-a",
    promotion_name: "첫 구매",
    segment_id: "segment-a",
    status: "running"
  }),
  createExperiment({
    ad_experiment_id: "experiment-b",
    campaign_id: "campaign-a",
    campaign_name: "봄 캠페인",
    promotion_id: "promotion-b",
    promotion_name: "재방문",
    promotion_run_id: "run-shared",
    segment_id: "segment-b",
    status: "completed",
    latest_evaluation: createEvaluation({
      next_loop_required: true,
      status: "goal_not_met"
    })
  }),
  createExperiment({
    ad_experiment_id: "experiment-c",
    campaign_id: "campaign-b",
    campaign_name: "여름 캠페인",
    promotion_id: "promotion-c",
    promotion_name: "휴면 복귀",
    promotion_run_id: "run-shared",
    segment_id: "segment-c",
    status: "completed",
    latest_evaluation: createEvaluation({
      next_loop_required: true,
      status: "goal_not_met"
    })
  })
];

test("project experiment filters narrow the project list by campaign, promotion and status", () => {
  const filtered = filterProjectExperiments(experiments, {
    campaignId: "campaign-a",
    promotionId: "promotion-b",
    status: "completed"
  });

  assert.deepEqual(
    filtered.map((experiment) => experiment.ad_experiment_id),
    ["experiment-b"]
  );
});

test("project experiment filters safely reset values that are outside the available hierarchy", () => {
  assert.deepEqual(
    normalizeProjectExperimentFilters(experiments, {
      campaignId: "campaign-a",
      promotionId: "promotion-c",
      status: "missing"
    }),
    { campaignId: "campaign-a", promotionId: "all", status: "all" }
  );
});

test("project experiment pagination clamps invalid pages", () => {
  assert.deepEqual(paginateProjectExperiments(experiments, 99, 2), {
    page: 2,
    pageCount: 2,
    rows: [experiments[2]]
  });
});

test("project experiment selection persists the experiment and every ancestor id", () => {
  assert.deepEqual(projectExperimentSelectionQuery(experiments[0]!), {
    selectedAdExperimentId: "experiment-a",
    selectedCampaignId: "campaign-a",
    selectedPromotionId: "promotion-a",
    selectedSegmentId: "segment-a"
  });

  const normalized = normalizeDashboardQuery(
    { ...defaultDashboardSearchQuery, selectedAdExperimentId: "  experiment-a  " },
    "project-a"
  );
  assert.equal(normalized.selectedAdExperimentId, "experiment-a");
});

test("running experiment evaluation targets each promotion run only once across campaigns", () => {
  const runningExperiments = [
    ...experiments,
    createExperiment({
      ad_experiment_id: "experiment-d",
      campaign_id: "campaign-b",
      promotion_run_id: "run-default",
      status: "running"
    }),
    createExperiment({
      ad_experiment_id: "experiment-e",
      campaign_id: "campaign-c",
      promotion_run_id: "run-another",
      status: "running"
    })
  ];

  assert.deepEqual(promotionRunIdsForRunningExperiments(runningExperiments), [
    "run-another",
    "run-default"
  ]);
});

test("next-loop targets stay within the selected promotion run", () => {
  const targets = failedTargetsForPromotionRun(experiments, "run-shared");

  assert.deepEqual(targets.failedAdExperimentIds, ["experiment-b", "experiment-c"]);
  assert.deepEqual(targets.failedSegmentIds, ["segment-b", "segment-c"]);
});

test("repeat creative generation targets only the selected experiment", () => {
  assert.deepEqual(repeatCreativeTargetForExperiment(experiments[1]!), {
    failedAdExperimentIds: ["experiment-b"],
    failedSegmentIds: ["segment-b"]
  });
});

test("fresh evaluation results take precedence over stale project-list evaluations", () => {
  const evaluationResult: DashboardEvaluatePromotionRunResult = {
    ad_experiment_results: [],
    failed_ad_experiment_ids: ["experiment-new"],
    failed_segment_ids: ["segment-new"],
    next_loop_required: true,
    promotion_id: "promotion-b",
    promotion_run_id: "run-shared",
    status: "evaluated"
  };

  assert.deepEqual(failedTargetsForPromotionRun(experiments, "run-shared", evaluationResult), {
    failedAdExperimentIds: ["experiment-new"],
    failedSegmentIds: ["segment-new"]
  });
});

function createExperiment(
  overrides: Partial<DashboardProjectExperiment>
): DashboardProjectExperiment {
  return {
    ad_experiment_id: "experiment-default",
    assignment_count: 30,
    campaign_id: "campaign-default",
    campaign_name: "기본 캠페인",
    channel: "email",
    content_id: "content-default",
    content_option_id: "option-default",
    ended_at: null,
    goal_basis: "all_segments",
    goal_metric: "booking_conversion_rate",
    goal_target_value: 0.1,
    latest_evaluation: null,
    loop_count: 1,
    next_loop: null,
    promotion_id: "promotion-default",
    promotion_name: "기본 프로모션",
    promotion_run_id: "run-default",
    segment_id: "segment-default",
    segment_name: "기본 세그먼트",
    started_at: null,
    status: "planned",
    updated_at: "2026-07-12T00:00:00.000Z",
    ...overrides
  };
}

function createEvaluation(
  overrides: Partial<NonNullable<DashboardProjectExperiment["latest_evaluation"]>>
): NonNullable<DashboardProjectExperiment["latest_evaluation"]> {
  return {
    actual_value: 0.04,
    basis: "all_segments",
    created_at: "2026-07-12T00:00:00.000Z",
    denominator_count: 100,
    feedback: null,
    metric: "booking_conversion_rate",
    next_loop_required: false,
    numerator_count: 4,
    sample_size: 100,
    status: "goal_met",
    target_value: 0.1,
    ...overrides
  };
}
