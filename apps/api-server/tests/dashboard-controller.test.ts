import assert from "node:assert/strict";
import { test } from "node:test";
import { z } from "zod";
import { AppError } from "../src/app-errors.js";
import type { DashboardQueryService } from "../src/features/dashboard/service/dashboard-query.service.js";

test("dashboard controller requires project_id for event catalog", async () => {
  setRequiredEnv();
  const { DashboardController } =
    await import("../src/features/dashboard/controller/dashboard.controller.js");
  const controller = new DashboardController(emptyDashboardQuery());

  await assert.rejects(
    () => controller.eventCatalog(undefined),
    (error) =>
      error instanceof AppError &&
      error.statusCode === 400 &&
      error.code === "DASHBOARD_PROJECT_ID_REQUIRED"
  );
});

test("dashboard controller parses event catalog response", async () => {
  setRequiredEnv();
  const { DashboardController } =
    await import("../src/features/dashboard/controller/dashboard.controller.js");
  const reads: string[] = [];
  const controller = new DashboardController({
    ...emptyDashboardQuery(),
    eventCatalog: async (projectId: string) => {
      reads.push(projectId);
      return {
        events: [
          {
            event_name: "hotel_detail_view",
            display_name: "숙소 상세 조회",
            event_count: 12
          }
        ]
      };
    }
  } as unknown as DashboardQueryService);

  const response = await controller.eventCatalog("hotel-client-a");

  assert.deepEqual(reads, ["hotel-client-a"]);
  assert.deepEqual(response.events, [
    {
      event_name: "hotel_detail_view",
      display_name: "숙소 상세 조회",
      event_count: 12
    }
  ]);
});

test("dashboard controller rejects invalid funnel create body", async () => {
  setRequiredEnv();
  const { DashboardController } =
    await import("../src/features/dashboard/controller/dashboard.controller.js");
  const controller = new DashboardController(emptyDashboardQuery());

  await assert.rejects(
    () =>
      controller.createFunnel("hotel-client-a", {
        funnel_name: "숙소 예약 퍼널",
        steps: [{ step_name: "숙소 상세 조회", event_name: "hotel_detail_view" }]
      }),
    (error) => error instanceof z.ZodError
  );
});

test("dashboard controller rejects unsupported funnel event names", async () => {
  setRequiredEnv();
  const { DashboardController } =
    await import("../src/features/dashboard/controller/dashboard.controller.js");
  const controller = new DashboardController(emptyDashboardQuery());

  await assert.rejects(
    () =>
      controller.createFunnel("hotel-client-a", {
        funnel_name: "숙소 예약 퍼널",
        steps: [
          { step_name: "숙소 상세 조회", event_name: "hotel_detail_view" },
          { step_name: "임의 이벤트", event_name: "unknown_event" }
        ]
      }),
    (error) => error instanceof z.ZodError
  );
});

test("dashboard controller parses create funnel body before delegating", async () => {
  setRequiredEnv();
  const { DashboardController } =
    await import("../src/features/dashboard/controller/dashboard.controller.js");
  const writes: unknown[] = [];
  const controller = new DashboardController({
    ...emptyDashboardQuery(),
    createFunnel: async (projectId, request) => {
      writes.push({ projectId, request });
      return {
        funnel_id: "funnel_hotel_booking",
        funnel_name: request.funnel_name,
        domain_type: "hotel",
        status: "active",
        steps: request.steps.map((step, index) => ({
          step_order: index + 1,
          step_name: step.step_name,
          event_name: step.event_name
        })),
        created_at: "2026-07-03T00:00:00.000Z",
        updated_at: "2026-07-03T00:00:00.000Z"
      };
    }
  } as unknown as DashboardQueryService);

  const response = await controller.createFunnel("hotel-client-a", {
    funnel_name: "숙소 예약 퍼널",
    steps: [
      { step_name: "숙소 상세 조회", event_name: "hotel_detail_view" },
      { step_name: "예약 완료", event_name: "booking_complete" }
    ]
  });

  assert.equal(writes.length, 1);
  assert.equal(response.steps[0]?.event_name, "hotel_detail_view");
  assert.equal(response.steps[1]?.step_name, "예약 완료");
});

function emptyDashboardQuery(): DashboardQueryService {
  return {
    createFunnel: async () => {
      throw new Error("Unexpected createFunnel call.");
    },
    eventCatalog: async () => ({ events: [] }),
    funnels: async () => ({ funnels: [] }),
    main: async () => ({ campaigns: [] })
  } as unknown as DashboardQueryService;
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
  process.env.LOOPAD_OPENAI_API_KEY ??= "test-openai-api-key";
  process.env.LOOPAD_AWS_REGION ??= "ap-northeast-2";
}
