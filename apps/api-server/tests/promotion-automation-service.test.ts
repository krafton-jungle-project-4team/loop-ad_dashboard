import assert from "node:assert/strict";
import test from "node:test";
import type { PromotionDispatchService } from "../src/features/ad-execution/service/promotion-dispatch.service.js";
import type { DashboardPromotionAutomationRepository } from "../src/features/dashboard/repository/dashboard-promotion-automation-repository.js";
import type { DashboardQueryService } from "../src/features/dashboard/service/dashboard-query.service.js";

test("자동 실행 작업은 실험 시작과 발송 뒤 평가 작업을 예약한다", async () => {
  setRequiredEnv();
  const { PromotionAutomationService } =
    await import("../src/features/dashboard/service/promotion-automation.service.js");
  const calls: string[] = [];
  const job = automationJob("launch_run");
  const service = new PromotionAutomationService(
    {
      claimDueJobs: async () => [job],
      listRunLaunchExperiments: async () => [
        {
          adExperimentId: "experiment-1",
          channel: "email",
          isFallback: false,
          promotionId: "promotion-1",
          segmentId: "segment-1",
          status: "planned"
        },
        {
          adExperimentId: "experiment-fallback",
          channel: "email",
          isFallback: true,
          promotionId: "promotion-1",
          segmentId: "seg_existing_all",
          status: "running"
        }
      ],
      scheduleRunEvaluation: async (promotionRunId) => {
        calls.push(`schedule-evaluation:${promotionRunId}`);
        return { jobId: "evaluation-job", scheduledAt: "2026-07-20T12:00:00.000Z" };
      },
      completeJob: async ({ jobId }) => {
        calls.push(`complete:${jobId}`);
        return { jobId, status: "completed" };
      },
      failJob: async () => {
        throw new Error("Unexpected failJob call.");
      }
    } as unknown as DashboardPromotionAutomationRepository,
    {
      startAdExperiment: async (_projectId, _promotionId, adExperimentId) => {
        calls.push(`start:${adExperimentId}`);
        return {} as never;
      }
    } as DashboardQueryService,
    {
      dispatchPromotionRun: async (promotionRunId) => {
        calls.push(`dispatch:${promotionRunId}`);
        return {} as never;
      }
    } as PromotionDispatchService
  );

  await service.runOnce();

  assert.deepEqual(calls, [
    "start:experiment-1",
    "dispatch:run-1",
    "schedule-evaluation:run-1",
    "complete:job-1"
  ]);
});

test("자동 평가 작업은 Dashboard 평가 흐름을 호출해 다음 루프 판단까지 위임한다", async () => {
  setRequiredEnv();
  const { PromotionAutomationService } =
    await import("../src/features/dashboard/service/promotion-automation.service.js");
  const calls: string[] = [];
  const job = automationJob("evaluate_run");
  const service = new PromotionAutomationService(
    {
      claimDueJobs: async () => [job],
      completeJob: async ({ jobId }) => {
        calls.push(`complete:${jobId}`);
        return { jobId, status: "completed" };
      },
      failJob: async () => {
        throw new Error("Unexpected failJob call.");
      }
    } as unknown as DashboardPromotionAutomationRepository,
    {
      evaluatePromotionRun: async (projectId, promotionRunId) => {
        calls.push(`evaluate:${projectId}:${promotionRunId}`);
        return {} as never;
      }
    } as DashboardQueryService,
    {} as PromotionDispatchService
  );

  await service.runOnce();

  assert.deepEqual(calls, ["evaluate:project-1:run-1", "complete:job-1"]);
});

function automationJob(jobType: "evaluate_run" | "launch_run") {
  return {
    attemptCount: 1,
    campaignId: "campaign-1",
    executionMode: "automatic" as const,
    jobId: "job-1",
    jobType,
    leaseToken: "3d18a844-1426-4430-8f01-f8ebbe18f7d8",
    loopCount: 1,
    loopIntervalUnit: "hour" as const,
    loopIntervalValue: 1,
    maxLoopCount: 3,
    projectId: "project-1",
    promotionId: "promotion-1",
    promotionRunId: "run-1",
    promotionRunStatus: "planned",
    promotionStatus: "running",
    scheduledAt: "2026-07-20T10:00:00.000Z",
    scheduledEndAt: null,
    scheduledStartAt: null
  };
}

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
  process.env.LOOPAD_DEMO_DISPATCH_RECIPIENTS ??= "[]";
}
