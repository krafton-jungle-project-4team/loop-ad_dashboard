import assert from "node:assert/strict";
import { test } from "node:test";
import type { TransactionHost } from "@nestjs-cls/transactional";
import type { DashboardCampaignReader } from "../src/features/dashboard/repository/dashboard-campaign-reader.js";
import type { DashboardFunnelReader } from "../src/features/dashboard/repository/dashboard-funnel-reader.js";
import type { PgTypedTransactionalAdapter } from "../src/infra/database/pgtyped-transactional.adapter.js";

test("dashboard main returns campaign summaries from the campaign reader", async () => {
  setRequiredEnv();
  const { DashboardQueryService } =
    await import("../src/features/dashboard/service/dashboard-query.service.js");
  const reads: string[] = [];
  const service = new DashboardQueryService(
    {
      listCampaigns: async (projectId: string) => {
        reads.push(projectId);
        return [
          {
            campaign_id: "camp_summer_2026",
            campaign_name: "2026 여름 특가 세일",
            objective: "기존 유저의 여름 숙박 예약 전환 증가",
            primary_metric: "booking_conversion_rate",
            status: "active",
            start_date: "2026-07-15",
            end_date: "2026-08-31",
            promotion_count: 3,
            segment_count: 4,
            ad_experiment_count: 4,
            latest_goal_achievement_rate: 0.72,
            updated_at: "2026-07-03T00:00:00.000Z"
          }
        ];
      }
    } as unknown as DashboardCampaignReader,
    emptyFunnelReader(),
    passthroughTransactionHost()
  );

  const main = await service.main("hotel-client-a");

  assert.deepEqual(reads, ["hotel-client-a"]);
  assert.equal(main.campaigns.length, 1);
  assert.equal(main.campaigns[0]?.campaign_id, "camp_summer_2026");
  assert.equal(main.campaigns[0]?.segment_count, 4);
});

test("dashboard event catalog returns collected funnel event options", async () => {
  setRequiredEnv();
  const { DashboardQueryService } =
    await import("../src/features/dashboard/service/dashboard-query.service.js");
  const reads: string[] = [];
  const service = new DashboardQueryService(
    emptyCampaignReader(),
    {
      ...emptyFunnelReader(),
      listEventCatalog: async (projectId: string) => {
        reads.push(projectId);
        return [
          {
            event_name: "hotel_detail_view",
            display_name: "숙소 상세 조회",
            event_count: 32
          }
        ];
      }
    } as unknown as DashboardFunnelReader,
    passthroughTransactionHost()
  );

  const eventCatalog = await service.eventCatalog("hotel-client-a");

  assert.deepEqual(reads, ["hotel-client-a"]);
  assert.deepEqual(eventCatalog.events, [
    {
      event_name: "hotel_detail_view",
      display_name: "숙소 상세 조회",
      event_count: 32
    }
  ]);
});

test("dashboard create funnel delegates selected events to the funnel reader", async () => {
  setRequiredEnv();
  const { DashboardQueryService } =
    await import("../src/features/dashboard/service/dashboard-query.service.js");
  const writes: unknown[] = [];
  const service = new DashboardQueryService(
    emptyCampaignReader(),
    {
      ...emptyFunnelReader(),
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
    } as unknown as DashboardFunnelReader,
    passthroughTransactionHost()
  );

  const funnel = await service.createFunnel("hotel-client-a", {
    funnel_name: "숙소 예약 퍼널",
    steps: [
      { step_name: "숙소 상세 조회", event_name: "hotel_detail_view" },
      { step_name: "예약 시작", event_name: "booking_start" },
      { step_name: "예약 완료", event_name: "booking_complete" }
    ]
  });

  assert.equal(writes.length, 1);
  assert.equal(funnel.steps[0]?.event_name, "hotel_detail_view");
  assert.equal(funnel.steps[2]?.step_name, "예약 완료");
});

function emptyCampaignReader(): DashboardCampaignReader {
  return {
    listCampaigns: async () => []
  } as unknown as DashboardCampaignReader;
}

function emptyFunnelReader(): DashboardFunnelReader {
  return {
    createFunnel: async () => {
      throw new Error("Unexpected createFunnel call.");
    },
    listEventCatalog: async () => [],
    listFunnels: async () => []
  } as unknown as DashboardFunnelReader;
}

function passthroughTransactionHost(): TransactionHost<PgTypedTransactionalAdapter> {
  return {
    withTransaction: async (callback: () => Promise<unknown>) => callback()
  } as unknown as TransactionHost<PgTypedTransactionalAdapter>;
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
  process.env.LOOPAD_DEMO_DISPATCH_RECIPIENTS ??= JSON.stringify([
    {
      userId: "user-1",
      email: "demo-recipient-1@loop-ad.org",
      phoneNumber: "+821012345001"
    }
  ]);
}
