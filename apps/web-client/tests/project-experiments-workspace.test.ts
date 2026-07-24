import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  DASHBOARD_FALLBACK_SEGMENT_ID,
  type DashboardEvaluatePromotionRunResult,
  type DashboardProjectExperiment
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
  projectExperimentSelectionQuery,
  repeatCreativeTargetForExperiment,
  userVisibleProjectExperiments
} from "../src/features/dashboard/ui/pages/campaign/promotion/experiment/projectExperimentUtils.js";

const workspaceSource = readFileSync(
  new URL(
    "../src/features/dashboard/ui/pages/campaign/promotion/experiment/components/ProjectExperimentWorkspace.tsx",
    import.meta.url
  ),
  "utf8"
);

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

test("empty fallback ads stay hidden", () => {
  const fallbackExperiment = createExperiment({
    ad_experiment_id: "experiment-fallback",
    assignment_count: 0,
    promotion_run_id: "run-default",
    segment_id: DASHBOARD_FALLBACK_SEGMENT_ID,
    segment_name: "Existing users fallback",
    status: "running"
  });
  const visibleExperiments = userVisibleProjectExperiments([...experiments, fallbackExperiment]);

  assert.equal(
    visibleExperiments.some((experiment) => experiment.ad_experiment_id === "experiment-fallback"),
    false
  );
});

test("fallback ads with assignments are visible", () => {
  const fallbackExperiment = createExperiment({
    ad_experiment_id: "experiment-fallback-assigned",
    assignment_count: 1,
    segment_id: DASHBOARD_FALLBACK_SEGMENT_ID,
    segment_name: "Assigned existing users fallback"
  });

  assert.deepEqual(
    userVisibleProjectExperiments([fallbackExperiment]).map(
      (experiment) => experiment.ad_experiment_id
    ),
    ["experiment-fallback-assigned"]
  );
});

test("fallback ads with evaluation samples are visible without assignments", () => {
  const fallbackExperiment = createExperiment({
    ad_experiment_id: "experiment-fallback-evaluated",
    assignment_count: 0,
    latest_evaluation: createEvaluation({
      actual_value: 0,
      denominator_count: 1,
      next_loop_required: true,
      numerator_count: 0,
      sample_size: 1,
      status: "goal_not_met"
    }),
    segment_id: DASHBOARD_FALLBACK_SEGMENT_ID,
    segment_name: "Evaluated existing users fallback"
  });

  assert.deepEqual(
    userVisibleProjectExperiments([fallbackExperiment]).map(
      (experiment) => experiment.ad_experiment_id
    ),
    ["experiment-fallback-evaluated"]
  );
});

test("fallback ads with zero evaluation samples stay hidden", () => {
  const fallbackExperiment = createExperiment({
    ad_experiment_id: "experiment-fallback-insufficient",
    assignment_count: 0,
    latest_evaluation: createEvaluation({
      actual_value: 0,
      denominator_count: 0,
      numerator_count: 0,
      sample_size: 0,
      status: "insufficient_data"
    }),
    segment_id: DASHBOARD_FALLBACK_SEGMENT_ID,
    segment_name: "Insufficient existing users fallback"
  });

  assert.deepEqual(userVisibleProjectExperiments([fallbackExperiment]), []);
});

test("next-loop targets stay within the selected promotion run", () => {
  const targets = failedTargetsForPromotionRun(experiments, "run-shared");

  assert.deepEqual(targets.failedAdExperimentIds, ["experiment-b", "experiment-c"]);
  assert.deepEqual(targets.failedSegmentIds, ["segment-b", "segment-c"]);
});

test("repeat creative generation targets only the selected experiment", () => {
  assert.deepEqual(repeatCreativeTargetForExperiment(experiments, experiments[1]!), {
    failedAdExperimentIds: ["experiment-b"],
    failedSegmentIds: ["segment-b"],
    sourcePromotionRunId: "run-shared"
  });
});

test("fallback repeat creative generation targets non-fallback experiments in the same run", () => {
  const targetExperiment = createExperiment({
    ad_experiment_id: "experiment-target",
    promotion_id: "promotion-repeat",
    promotion_run_id: "run-repeat",
    segment_id: "segment-target"
  });
  const otherRunExperiment = createExperiment({
    ad_experiment_id: "experiment-other-run",
    promotion_id: "promotion-repeat",
    promotion_run_id: "run-other",
    segment_id: "segment-other"
  });
  const fallbackExperiment = createExperiment({
    ad_experiment_id: "experiment-fallback-repeat",
    promotion_id: "promotion-repeat",
    promotion_run_id: "run-repeat",
    segment_id: DASHBOARD_FALLBACK_SEGMENT_ID
  });

  assert.deepEqual(
    repeatCreativeTargetForExperiment(
      [targetExperiment, otherRunExperiment, fallbackExperiment],
      fallbackExperiment
    ),
    {
      failedAdExperimentIds: ["experiment-target"],
      failedSegmentIds: ["segment-target"],
      sourcePromotionRunId: "run-repeat"
    }
  );
});

test("fallback repeat creative generation stays disabled without a non-fallback target", () => {
  const fallbackExperiment = createExperiment({
    ad_experiment_id: "experiment-fallback-only",
    promotion_id: "promotion-fallback-only",
    promotion_run_id: "run-fallback-only",
    segment_id: DASHBOARD_FALLBACK_SEGMENT_ID
  });

  assert.deepEqual(repeatCreativeTargetForExperiment([fallbackExperiment], fallbackExperiment), {
    failedAdExperimentIds: [],
    failedSegmentIds: [],
    sourcePromotionRunId: "run-fallback-only"
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

test("experiment detail renders structured user-path evidence as a line chart without provenance badges", () => {
  assert.match(workspaceSource, /사용자 경로와 이탈 원인/);
  assert.match(workspaceSource, /가장 큰 이탈 구간/);
  assert.match(workspaceSource, /다음 실험에서 확인할 항목/);
  assert.match(workspaceSource, /diagnosis\.funnel\.stages/);
  assert.match(workspaceSource, /<LineChart data=\{stages\}/);
  assert.match(workspaceSource, /dataKey="user_count"/);
  assert.match(workspaceSource, /단계별 고객 수 꺾은선 그래프/);
  assert.doesNotMatch(workspaceSource, /EvaluationOriginBadge/);
  assert.doesNotMatch(workspaceSource, /demo_fixture/);
});

test("experiment workspace prioritizes the result summary before deeper analysis", () => {
  assert.match(workspaceSource, /ExperimentOverviewStrip/);
  assert.match(workspaceSource, /핵심 결과/);
  assert.match(workspaceSource, /<TabsTrigger value="summary">요약<\/TabsTrigger>/);
  assert.match(workspaceSource, /<TabsTrigger value="funnel">사용자 경로 분석<\/TabsTrigger>/);
  assert.match(workspaceSource, /<TabsTrigger value="history">반복 이력<\/TabsTrigger>/);
  assert.match(workspaceSource, /NextExperimentPanel/);
  assert.match(workspaceSource, /EvaluationCauseAnalysisSection/);
  assert.match(workspaceSource, /price_abandonment_analysis/);
  assert.match(workspaceSource, /1박 가격/);
  assert.match(workspaceSource, /예약 미완료 고객 중앙값/);
  assert.match(workspaceSource, /AI 원인 분석/);
  assert.match(workspaceSource, /관측 기반 가설/);
  assert.match(workspaceSource, /다음 세그먼트 가설/);
  assert.match(workspaceSource, /다음 실험 준비하기/);
  assert.match(workspaceSource, /\{formatInteger\(experiment\.loop_count\)\}번째 실험/);
  assert.doesNotMatch(workspaceSource, /ExperimentSummaryCard/);
  assert.doesNotMatch(workspaceSource, /\uD37C\uB110/);
});

test("experiment metrics show the experiment result before the target", () => {
  assert.match(
    workspaceSource,
    /left=\{formatGoalValue\(evaluation\?\.actual_value \?\? null\)\}\s*right=\{formatGoalValue\(\s*evaluation\?\.target_value \?\? experiment\.goal_target_value\s*\)\}/
  );
  assert.match(
    workspaceSource,
    /실험결과 \{formatGoalValue\(evaluation\.actual_value\)\}[\s\S]*?\/ 목표 \{formatGoalValue\(evaluation\.target_value \?\? experiment\.goal_target_value\)\}/
  );
  assert.match(
    workspaceSource,
    /label="실험결과 \/ 목표"\s*value=\{`\$\{formatGoalValue\(evaluation\?\.actual_value \?\? null\)\} \/ \$\{formatGoalValue\(evaluation\?\.target_value \?\? experiment\.goal_target_value\)\}`\}/
  );
  assert.doesNotMatch(workspaceSource, />목표 \/ 결과</);
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
    execution_mode: "manual",
    goal_basis: "all_segments",
    goal_metric: "booking_conversion_rate",
    goal_target_value: 0.1,
    latest_evaluation: null,
    loop_count: 1,
    loop_interval_unit: "day",
    loop_interval_value: 1,
    max_loop_count: 3,
    next_loop: null,
    promotion_id: "promotion-default",
    promotion_name: "기본 프로모션",
    promotion_run_id: "run-default",
    scheduled_end_at: null,
    scheduled_start_at: null,
    segment_id: "segment-default",
    segment_name: "기본 고객군",
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
    diagnosis: null,
    evaluation_cutoff_at: null,
    feedback: null,
    metric: "booking_conversion_rate",
    next_loop_required: false,
    numerator_count: 4,
    sample_size: 100,
    status: "goal_met",
    target_value: 0.1,
    window_start: null,
    ...overrides
  };
}
