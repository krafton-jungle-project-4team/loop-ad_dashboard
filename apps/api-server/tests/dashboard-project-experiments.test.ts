import assert from "node:assert/strict";
import { test } from "node:test";
import type { Transaction } from "@nestjs-cls/transactional";
import { DashboardCampaignSummarySchema } from "@loopad/shared";
import type { PgTypedTransactionalAdapter } from "../src/infra/database/pgtyped-transactional.adapter.js";
import type { DashboardQueryService } from "../src/features/dashboard/service/dashboard-query.service.js";
import type { DashboardProjectExperimentsService } from "../src/features/dashboard/service/dashboard-project-experiments.service.js";

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
            evaluationSampleSize: 100,
            evaluationStatus: "goal_not_met",
            evaluationTargetValue: 0.3,
            goalBasis: "all_segments",
            goalMetric: "booking_conversion_rate",
            goalTargetValue: 0.3,
            loopCount: 1,
            nextLoopCount: 2,
            nextLoopStatus: "planned",
            nextPromotionRunId: "run_2",
            promotionId: "promotion_1",
            promotionName: "여름 재방문",
            promotionRunId: "run_1",
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
