import assert from "node:assert/strict";
import { test } from "node:test";
import type { ClickHouseClient } from "@clickhouse/client";
import type { Transaction } from "@nestjs-cls/transactional";
import type { PgTypedTransactionalAdapter } from "../src/infra/database/pgtyped-transactional.adapter.js";

test("dashboard funnel metrics counts users through ordered funnel steps", async () => {
  setRequiredEnv();
  const { DashboardFunnelReader } =
    await import("../src/features/dashboard/repository/dashboard-funnel-reader.js");
  let clickhouseRequest:
    | {
        query: string;
        query_params?: Record<string, string>;
      }
    | undefined;
  const db = {
    query: () => ({
      multiple: async () => [
        {
          eventName: "promotion_impression",
          funnelId: "funnel_booking",
          stepName: "노출",
          stepOrder: 1
        },
        {
          eventName: "promotion_click",
          funnelId: "funnel_booking",
          stepName: "클릭",
          stepOrder: 2
        },
        {
          eventName: "booking_complete",
          funnelId: "funnel_booking",
          stepName: "예약 완료",
          stepOrder: 3
        }
      ],
      single: async () => ({
        funnelId: "funnel_booking",
        funnelName: "예약 퍼널"
      })
    })
  } as unknown as Transaction<PgTypedTransactionalAdapter>;
  const clickhouse = {
    query: async (request: { query: string; query_params?: Record<string, string> }) => {
      clickhouseRequest = request;
      return {
        json: async () => [
          { event_count: "12", step_order: "1" },
          { event_count: "8", step_order: "2" },
          { event_count: "3", step_order: "3" }
        ]
      };
    }
  } as unknown as ClickHouseClient;
  const reader = new DashboardFunnelReader(db, clickhouse);

  const metrics = await reader.getFunnelMetrics("hotel-client-a", "funnel_booking");

  assert.deepEqual(
    metrics.steps.map((step) => step.event_count),
    [12, 8, 3]
  );
  assert.deepEqual(clickhouseRequest?.query_params, {
    projectId: "hotel-client-a",
    stepEvent1: "promotion_impression",
    stepEvent2: "promotion_click",
    stepEvent3: "booking_complete"
  });
  assert.match(clickhouseRequest?.query ?? "", /INNER JOIN step_1_users previous/);
  assert.match(clickhouseRequest?.query ?? "", /fse\.event_time >= previous\.reached_at/);
});

test("dashboard funnel metrics scopes the first step to a session cohort", async () => {
  setRequiredEnv();
  const { DashboardFunnelReader } =
    await import("../src/features/dashboard/repository/dashboard-funnel-reader.js");
  let clickhouseRequest:
    | {
        query: string;
        query_params?: Record<string, string>;
      }
    | undefined;
  const db = {
    query: () => ({
      multiple: async () => [
        {
          eventName: "promotion_impression",
          funnelId: "funnel_booking",
          stepName: "노출",
          stepOrder: 1
        },
        {
          eventName: "booking_complete",
          funnelId: "funnel_booking",
          stepName: "예약 완료",
          stepOrder: 2
        }
      ],
      single: async () => ({
        funnelId: "funnel_booking",
        funnelName: "예약 퍼널"
      })
    })
  } as unknown as Transaction<PgTypedTransactionalAdapter>;
  const clickhouse = {
    query: async (request: { query: string; query_params?: Record<string, string> }) => {
      clickhouseRequest = request;
      return {
        json: async () => [
          { event_count: "10", step_order: "1" },
          { event_count: "4", step_order: "2" }
        ]
      };
    }
  } as unknown as ClickHouseClient;
  const reader = new DashboardFunnelReader(db, clickhouse);

  const metrics = await reader.getFunnelMetrics("hotel-client-a", "funnel_booking", {
    promotion_id: "promo_email_001",
    scope_type: "promotion"
  });

  assert.deepEqual(
    metrics.steps.map((step) => step.event_count),
    [10, 4]
  );
  assert.deepEqual(clickhouseRequest?.query_params, {
    projectId: "hotel-client-a",
    promotionId: "promo_email_001",
    stepEvent1: "promotion_impression",
    stepEvent2: "booking_complete"
  });
  assert.match(clickhouseRequest?.query ?? "", /step_1_sessions/);
  assert.match(clickhouseRequest?.query ?? "", /nullIf\(session_id, ''\) IS NOT NULL/);
  assert.match(
    clickhouseRequest?.query ?? "",
    /nullIf\(promotion_id, ''\) = \{promotionId:String\}/
  );
  assert.match(clickhouseRequest?.query ?? "", /ON previous\.session_id = fse\.session_id/);
  assert.match(clickhouseRequest?.query ?? "", /FROM step_2_sessions/);
});

test("dashboard funnel reader preview maps sequential step counts", async () => {
  setRequiredEnv();
  const { DashboardFunnelReader } =
    await import("../src/features/dashboard/repository/dashboard-funnel-reader.js");
  const queries: Array<{ query: string; query_params: Record<string, unknown> }> = [];
  const fakeClickhouse = {
    query: async (request: { query: string; query_params: Record<string, unknown> }) => {
      queries.push(request);
      return {
        json: async () => [
          { step_order: 1, event_count: "12" },
          { step_order: 2, event_count: "5" }
        ]
      };
    }
  };
  const reader = new DashboardFunnelReader(
    {} as ConstructorParameters<typeof DashboardFunnelReader>[0],
    fakeClickhouse as unknown as ConstructorParameters<typeof DashboardFunnelReader>[1]
  );

  const preview = await reader.previewFunnelMetrics("hotel-client-a", {
    steps: [
      { step_name: "숙소 상세 조회", event_name: "hotel_detail_view" },
      { step_name: "예약 완료", event_name: "booking_complete" }
    ]
  });

  assert.match(queries[0]?.query ?? "", /WITH/);
  assert.match(queries[0]?.query ?? "", /step_1_users/);
  assert.match(queries[0]?.query ?? "", /INNER JOIN step_1_users previous/);
  assert.deepEqual(queries[0]?.query_params, {
    projectId: "hotel-client-a",
    stepEvent1: "hotel_detail_view",
    stepEvent2: "booking_complete"
  });
  assert.deepEqual(preview.steps, [
    {
      step_order: 1,
      step_name: "숙소 상세 조회",
      event_name: "hotel_detail_view",
      event_count: 12
    },
    {
      step_order: 2,
      step_name: "예약 완료",
      event_name: "booking_complete",
      event_count: 5
    }
  ]);
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
