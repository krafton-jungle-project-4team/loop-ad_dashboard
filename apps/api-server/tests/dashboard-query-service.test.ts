import assert from "node:assert/strict";
import { test } from "node:test";
import type { DashboardEventQuery } from "../src/features/dashboard/repository/dashboard-event-query.js";
import type { DashboardRecommendationReader } from "../src/features/dashboard/repository/dashboard-recommendation-reader.js";
import type { DashboardSegmentMetricsReader } from "../src/features/dashboard/repository/dashboard-segment-metrics-reader.js";
import type { DashboardSegmentMetricView } from "../src/features/dashboard/repository/read-models.js";

test("AI dashboard queries use segment metrics without calling ClickHouse events", async () => {
  setRequiredEnv();
  const { DashboardQueryService } =
    await import("../src/features/dashboard/service/dashboard-query.service.js");
  const metricReads: Array<{ projectId: string; analysisDate: string | undefined }> = [];
  const recommendationReads: Array<{ projectId: string; analysisDate: string | undefined }> = [];
  let clickHouseCalls = 0;
  const service = new DashboardQueryService(
    {
      queryEventViews: async () => {
        clickHouseCalls += 1;
        throw new Error("AI dashboard query must not read ClickHouse events.");
      }
    } as unknown as DashboardEventQuery,
    {
      readRecommendationContexts: async (projectId: string, analysisDate: string | undefined) => {
        recommendationReads.push({ projectId, analysisDate });
        return [];
      }
    } as unknown as DashboardRecommendationReader,
    {
      readSegmentMetrics: async (projectId: string, analysisDate: string | undefined) => {
        metricReads.push({ projectId, analysisDate });
        return [];
      }
    } as unknown as DashboardSegmentMetricsReader
  );

  const analysis = await service.aiAnalysis("demo-shop", "unknown", "2026-07-01");
  const recommendation = await service.aiRecommendation("demo-shop", "unknown", "2026-07-01");
  const generation = await service.aiGeneration("demo-shop", "unknown", "2026-07-01");

  assert.equal(clickHouseCalls, 0);
  assert.deepEqual(
    metricReads.map((read) => read.analysisDate),
    ["2026-07-01", "2026-07-01", "2026-07-01"]
  );
  assert.deepEqual(
    recommendationReads.map((read) => read.analysisDate),
    ["2026-07-01", "2026-07-01", "2026-07-01"]
  );
  assert.deepEqual(analysis.customers, []);
  assert.equal(analysis.selected_customer, null);
  assert.deepEqual(recommendation.customers, []);
  assert.equal(recommendation.selected_customer, null);
  assert.deepEqual(recommendation.recommended_actions, []);
  assert.deepEqual(recommendation.recommendation_rationale, []);
  assert.deepEqual(generation.customers, []);
  assert.equal(generation.selected_customer, null);
  assert.deepEqual(generation.generated_items, []);
});

test("AI dashboard keeps segment metric customers when recommendations are empty for the date", async () => {
  setRequiredEnv();
  const { DashboardQueryService } =
    await import("../src/features/dashboard/service/dashboard-query.service.js");
  const service = new DashboardQueryService(
    {
      queryEventViews: async () => {
        throw new Error("AI dashboard query must not read ClickHouse events.");
      }
    } as unknown as DashboardEventQuery,
    {
      readRecommendationContexts: async () => []
    } as unknown as DashboardRecommendationReader,
    {
      readSegmentMetrics: async () => [
        segmentMetric({ customer_group_id: "vip", customer_group_name: "VIP 고객군" })
      ]
    } as unknown as DashboardSegmentMetricsReader
  );

  const analysis = await service.aiAnalysis("demo-shop", "vip", "2026-07-01");
  const recommendation = await service.aiRecommendation("demo-shop", "vip", "2026-07-01");
  const generation = await service.aiGeneration("demo-shop", "vip", "2026-07-01");

  assert.equal(analysis.customers.length, 1);
  assert.equal(analysis.selected_customer?.customer_group.customer_group_id, "vip");
  assert.equal(recommendation.customers.length, 1);
  assert.deepEqual(recommendation.recommended_actions, []);
  assert.equal(generation.customers.length, 1);
  assert.deepEqual(generation.generated_items, []);
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

function segmentMetric(
  overrides: Partial<DashboardSegmentMetricView> = {}
): DashboardSegmentMetricView {
  return {
    segment_id: "1",
    analysis_date: "2026-07-01",
    customer_group_id: "segment-a",
    customer_group_name: "기본 세그먼트",
    channel: "organic",
    age_group: "20s",
    gender: "unknown",
    category: "general",
    region: "미상",
    device: "desktop",
    user_count: 10,
    session_start_count: 10,
    page_view_count: 20,
    product_view_count: 10,
    add_to_cart_count: 5,
    checkout_start_count: 3,
    purchase_count: 1,
    ad_impression_count: 0,
    ad_click_count: 0,
    revenue: 120_000,
    ...overrides
  };
}
