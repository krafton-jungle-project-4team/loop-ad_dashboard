import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import type { Transaction } from "@nestjs-cls/transactional";
import { DashboardCampaignSummarySchema } from "@loopad/shared";
import type { PgTypedTransactionalAdapter } from "../src/infra/database/pgtyped-transactional.adapter.js";
import type { DashboardQueryService } from "../src/features/dashboard/service/dashboard-query.service.js";
import type { DashboardProjectExperimentsService } from "../src/features/dashboard/service/dashboard-project-experiments.service.js";

test("project experiments query excludes stopped experiments", () => {
  const sql = readFileSync(
    new URL(
      "../src/features/dashboard/database/project-experiments.sql",
      import.meta.url
    ),
    "utf8"
  );

  assert.match(
    sql,
    /WHERE ae\.project_id = :projectId\s+AND ae\.status <> 'stopped'/
  );
});

test("project experiments reader maps hierarchy, latest evaluation, and next loop", async () => {
  setRequiredEnv();
  const { DashboardProjectExperimentsReader } =
    await import("../src/features/dashboard/repository/dashboard-project-experiments-reader.js");
  const queries: unknown[] = [];
  const db = {
    query: (_query: unknown, params: unknown) => {
      queries.push(params);
      return {
        multiple: async () => [
          {
            adExperimentId: "experiment_1",
            assignmentCount: 120,
            campaignId: "campaign_1",
            campaignName: "여름 캠페인",
            channel: "email",
            contentId: "content_1",
            contentOptionId: "option_1",
            endedAt: null,
            evaluationActualValue: 0.24,
            evaluationBasis: "all_segments",
            evaluationCreatedAt: new Date("2026-07-11T01:00:00.000Z"),
            evaluationDenominatorCount: 100,
            evaluationFeedback: "목표에 근접했습니다.",
            evaluationMetric: "booking_conversion_rate",
            evaluationNextLoopRequired: true,
            evaluationNumeratorCount: 24,
            evaluationResultJson: {
              diagnosis: {
                audience_intent_analysis: {
                  version: "dec.audience-intent-analysis.v1",
                  title: "초기 고객군 안에서 현재 예약 의도의 차이가 확인됐습니다",
                  paragraphs: ["반복 조회 고객의 예약 가능성이 더 높게 관측됐습니다."],
                  cohort_comparison: {
                    lookback_days: 30,
                    repeat_detail_minimum_count: 2,
                    repeat_view_user_count: 40,
                    repeat_view_booking_count: 8,
                    repeat_view_conversion_rate: "0.200000",
                    comparison_user_count: 60,
                    comparison_booking_count: 3,
                    comparison_conversion_rate: "0.050000"
                  },
                  booking_value_comparison: {
                    currency: "KRW",
                    abandoned_user_count: 20,
                    completed_user_count: 11,
                    abandoned_median_revenue: "720000",
                    completed_median_revenue: "510000"
                  },
                  next_segment_hypothesis: {
                    lookback_days: 30,
                    condition_labels: [
                      "20~30대",
                      "최근 30일 제주·오키나와 숙소 상세 2회 이상",
                      "예약 시작 후 미완료"
                    ],
                    validation_note: "다음 실험에서 검증할 가설입니다."
                  }
                },
                data_origin: { kind: "demo_fixture", label: "시연 데이터" },
                evidence: ["광고 반응 고객 100명 중 예약 완료 24명"],
                evidence_strength: {
                  level: "sufficient",
                  reason: "단계별 이탈을 비교할 수 있는 관측 표본이 확보되었습니다.",
                  sample_size: 100
                },
                funnel: {
                  counting_method: "cumulative_user_reach_after_ad_response",
                  largest_dropoff: {
                    dropoff_count: 40,
                    dropoff_rate: "0.500000",
                    from_count: 80,
                    from_stage_key: "hotel_detail_view",
                    from_stage_label: "숙소 상세 조회",
                    to_count: 40,
                    to_stage_key: "booking_start",
                    to_stage_label: "예약 시작"
                  },
                  stages: [
                    {
                      conversion_rate_from_previous: null,
                      dropoff_count_from_previous: null,
                      dropoff_rate_from_previous: null,
                      key: "campaign_landing",
                      label: "광고 랜딩 도달",
                      user_count: 100
                    },
                    {
                      conversion_rate_from_previous: "0.800000",
                      dropoff_count_from_previous: 20,
                      dropoff_rate_from_previous: "0.200000",
                      key: "hotel_detail_view",
                      label: "숙소 상세 조회",
                      user_count: 80
                    }
                  ]
                },
                gap_percentage_points: "6.00",
                improvement_directions: ["예약 시작 CTA를 점검"],
                largest_dropoff: {
                  dropoff_count: 40,
                  dropoff_rate: "0.500000",
                  from_count: 80,
                  from_stage_key: "hotel_detail_view",
                  from_stage_label: "숙소 상세 조회",
                  to_count: 40,
                  to_stage_key: "booking_start",
                  to_stage_label: "예약 시작"
                },
                limitations: ["유효 이벤트의 고유 사용자만 집계했습니다."],
                observed_bottleneck: "hotel_detail_view_to_booking_start",
                status: "goal_not_met",
                summary: "숙소 상세 조회 이후 예약 시작 전 이탈이 가장 큽니다.",
                version: "dec.evaluation-diagnosis.v3"
              },
              evaluation_cutoff_at: "2026-07-11T01:00:00.000Z",
              window_start: "2026-07-10T01:00:00.000Z"
            },
            evaluationSampleSize: 100,
            evaluationStatus: "goal_not_met",
            evaluationTargetValue: 0.3,
            executionMode: "automatic",
            goalBasis: "all_segments",
            goalMetric: "booking_conversion_rate",
            goalTargetValue: 0.3,
            loopCount: 1,
            loopIntervalUnit: "hour",
            loopIntervalValue: 6,
            maxLoopCount: 3,
            nextLoopCount: 2,
            nextLoopStatus: "planned",
            nextPromotionRunId: "run_2",
            promotionId: "promotion_1",
            promotionName: "여름 재방문",
            promotionRunId: "run_1",
            scheduledEndAt: new Date("2026-07-20T00:00:00.000Z"),
            scheduledStartAt: new Date("2026-07-11T00:00:00.000Z"),
            segmentId: "segment_1",
            segmentName: "재방문 고객",
            startedAt: new Date("2026-07-11T00:00:00.000Z"),
            status: "running",
            updatedAt: new Date("2026-07-11T02:00:00.000Z")
          }
        ]
      };
    }
  } as unknown as Transaction<PgTypedTransactionalAdapter>;
  const reader = new DashboardProjectExperimentsReader(db);

  const response = await reader.list("project_1");

  assert.deepEqual(queries, [{ projectId: "project_1" }]);
  assert.equal(response.experiments[0]?.campaign_name, "여름 캠페인");
  assert.equal(response.experiments[0]?.promotion_name, "여름 재방문");
  assert.equal(response.experiments[0]?.segment_name, "재방문 고객");
  assert.equal(response.experiments[0]?.assignment_count, 120);
  assert.equal(response.experiments[0]?.latest_evaluation?.actual_value, 0.24);
  assert.equal(response.experiments[0]?.latest_evaluation?.next_loop_required, true);
  assert.equal(
    response.experiments[0]?.latest_evaluation?.diagnosis?.largest_dropoff?.dropoff_rate,
    0.5
  );
  assert.equal(
    response.experiments[0]?.latest_evaluation?.diagnosis?.data_origin.kind,
    "demo_fixture"
  );
  assert.equal(
    response.experiments[0]?.latest_evaluation?.diagnosis?.audience_intent_analysis
      ?.cohort_comparison.repeat_view_conversion_rate,
    0.2
  );
  assert.equal(
    response.experiments[0]?.latest_evaluation?.evaluation_cutoff_at,
    "2026-07-11T01:00:00.000Z"
  );
  assert.equal(response.experiments[0]?.execution_mode, "automatic");
  assert.equal(response.experiments[0]?.loop_interval_value, 6);
  assert.deepEqual(response.experiments[0]?.next_loop, {
    loop_count: 2,
    promotion_run_id: "run_2",
    status: "planned"
  });
});

test("experiments controller requires project_id and validates the response", async () => {
  setRequiredEnv();
  const { DashboardController } =
    await import("../src/features/dashboard/controller/dashboard.controller.js");
  const reads: string[] = [];
  const experiments = {
    list: async (projectId: string) => {
      reads.push(projectId);
      return { experiments: [] };
    }
  } as unknown as DashboardProjectExperimentsService;
  const controller = new DashboardController({} as DashboardQueryService, undefined, experiments);

  await assert.rejects(() => controller.experiments(undefined));
  assert.deepEqual(await controller.experiments("project_1"), { experiments: [] });
  assert.deepEqual(reads, ["project_1"]);
});

test("campaign summary keeps the running experiment count backward compatible", () => {
  const parsed = DashboardCampaignSummarySchema.parse({
    ad_experiment_count: 0,
    campaign_id: "campaign_1",
    campaign_name: "캠페인",
    current_loop_count: 0,
    end_date: null,
    latest_goal_achievement_rate: null,
    max_loop_count: 0,
    next_action: "campaign_start",
    objective: null,
    primary_metric: null,
    promotion_count: 0,
    segment_count: 0,
    start_date: null,
    status: "draft",
    updated_at: "2026-07-11T00:00:00.000Z"
  });

  assert.equal(parsed.running_ad_experiment_count, 0);
});

function setRequiredEnv() {
  process.env.LOOPAD_ENV ??= "local";
  process.env.LOOPAD_SERVICE_ID ??= "dashboard-api";
  process.env.PORT ??= "8080";
  process.env.LOOPAD_AURORA_HOST ??= "localhost";
  process.env.LOOPAD_AURORA_PORT ??= "15432";
  process.env.LOOPAD_AURORA_DATABASE ??= "loopad";
  process.env.LOOPAD_AURORA_USERNAME ??= "loopad";
  process.env.LOOPAD_AURORA_PASSWORD ??= "loopad";
  process.env.LOOPAD_CLICKHOUSE_URL ??= "http://localhost:18123";
  process.env.LOOPAD_CLICKHOUSE_DATABASE ??= "loopad";
  process.env.LOOPAD_CLICKHOUSE_USERNAME ??= "loopad_app";
  process.env.LOOPAD_CLICKHOUSE_PASSWORD ??= "loopad_local_password";
  process.env.LOOPAD_DECISION_API_BASE_URL ??= "http://localhost:8081";
  process.env.LOOPAD_INTERNAL_API_KEY ??= "test-internal-key";
  process.env.LOOPAD_OPENAI_API_KEY ??= "test-openai-api-key";
  process.env.LOOPAD_DEMO_DISPATCH_RECIPIENTS ??= JSON.stringify([
    {
      email: "demo-recipient-1@loop-ad.org",
      phoneNumber: "+821012345001",
      userId: "user-1"
    }
  ]);
}
