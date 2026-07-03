import assert from "node:assert/strict";
import { test } from "node:test";
import type { DashboardCampaignReader } from "../src/features/dashboard/repository/dashboard-campaign-reader.js";

test("dashboard main returns campaign summaries from the campaign reader", async () => {
  setRequiredEnv();
  const { DashboardQueryService } =
    await import("../src/features/dashboard/service/dashboard-query.service.js");
  const reads: string[] = [];
  const service = new DashboardQueryService({
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
  } as unknown as DashboardCampaignReader);

  const main = await service.main("hotel-client-a");

  assert.deepEqual(reads, ["hotel-client-a"]);
  assert.equal(main.campaigns.length, 1);
  assert.equal(main.campaigns[0]?.campaign_id, "camp_summer_2026");
  assert.equal(main.campaigns[0]?.segment_count, 4);
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
}
