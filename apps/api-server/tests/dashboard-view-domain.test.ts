import assert from "node:assert/strict";
import { test } from "node:test";
import { DashboardViewDomain } from "../src/features/dashboard/domain/index.js";
import type { RecommendationContextRow } from "../src/features/dashboard/repository/dashboard-recommendation-reader.js";
import type { DashboardEventView } from "../src/features/dashboard/repository/read-models.js";
import type { DashboardSegmentMetricView } from "../src/features/dashboard/repository/read-models.js";

test("counts overall funnel session starts by distinct session id", () => {
  const analysis = DashboardViewDomain.analyzeEventViews([
    event({ event_name: "page_view", session_id: "session-a" }),
    event({ event_name: "page_view", session_id: "session-a" }),
    event({ event_name: "session_start", session_id: "session-a" }),
    event({ event_name: "product_view", session_id: "session-a" }),
    event({ event_name: "product_view", session_id: "session-a" }),
    event({ event_name: "page_view", session_id: "session-b" }),
    event({ event_name: "product_view", session_id: "session-b" }),
    event({ event_name: "add_to_cart", session_id: "session-a" }),
    event({ event_name: "checkout_start", session_id: "session-a" }),
    event({ event_name: "purchase", session_id: "session-a", revenue: 120_000 })
  ]);

  assert.deepEqual(analysis.funnel, {
    session_start_count: 2,
    product_view_count: 3,
    add_to_cart_count: 1,
    checkout_start_count: 1,
    purchase_count: 1
  });
});

test("counts device funnel session starts by distinct session id per device", () => {
  const analysis = DashboardViewDomain.analyzeEventViews([
    event({ event_name: "page_view", session_id: "session-a", device: "desktop" }),
    event({ event_name: "page_view", session_id: "session-a", device: "desktop" }),
    event({ event_name: "product_view", session_id: "session-b", device: "desktop" }),
    event({ event_name: "purchase", session_id: "session-b", device: "desktop" }),
    event({ event_name: "page_view", session_id: "session-a", device: "mobile" }),
    event({ event_name: "product_view", session_id: "session-c", device: "mobile" }),
    event({ event_name: "add_to_cart", session_id: "session-c", device: "mobile" })
  ]);

  const desktop = analysis.deviceFunnels.find((row) => row.device === "desktop");
  const mobile = analysis.deviceFunnels.find((row) => row.device === "mobile");

  assert.equal(desktop?.session_start_count, 2);
  assert.equal(desktop?.product_view_count, 1);
  assert.equal(desktop?.purchase_count, 1);
  assert.equal(mobile?.session_start_count, 2);
  assert.equal(mobile?.product_view_count, 1);
  assert.equal(mobile?.add_to_cart_count, 1);
});

test("counts customer group session starts by distinct session id within the group", () => {
  const analysis = DashboardViewDomain.analyzeEventViews([
    event({ event_name: "page_view", session_id: "session-a", segment_key: "vip" }),
    event({ event_name: "page_view", session_id: "session-a", segment_key: "vip" }),
    event({ event_name: "product_view", session_id: "session-b", segment_key: "vip" }),
    event({ event_name: "product_view", session_id: "session-b", segment_key: "vip" }),
    event({ event_name: "add_to_cart", session_id: "session-c", segment_key: "vip" }),
    event({ event_name: "purchase", session_id: "session-b", segment_key: "vip" }),
    event({ event_name: "product_view", session_id: "session-d", segment_key: "new" })
  ]);

  const vip = analysis.customerGroupsHigh.find((row) => row.customer_group_id === "vip");

  assert.equal(vip?.session_start_count, 3);
  assert.equal(vip?.product_view_count, 2);
  assert.equal(vip?.add_to_cart_count, 1);
  assert.equal(vip?.purchase_count, 1);
});

test("builds AI customers from segment daily metrics without anomaly rows", () => {
  const customerGroups = DashboardViewDomain.toAiCustomerGroups([
    segmentMetric({
      customer_group_id: "seg-explicit-rate",
      customer_group_name: "전환율 명시 세그먼트",
      product_view_count: 100,
      purchase_count: 1,
      view_to_purchase_rate: 0.35
    }),
    segmentMetric({
      customer_group_id: "seg-fallback-rate",
      customer_group_name: "전환율 fallback 세그먼트",
      product_view_count: 20,
      purchase_count: 4
    })
  ]);

  const response = DashboardViewDomain.toAiAnalysis(customerGroups, [], "seg-explicit-rate");
  const explicitRate = response.customers.find(
    (customer) => customer.customer_group_id === "seg-explicit-rate"
  );
  const fallbackRate = response.customers.find(
    (customer) => customer.customer_group_id === "seg-fallback-rate"
  );

  assert.equal(response.customers.length, 2);
  assert.equal(response.selected_customer?.customer_group.customer_group_id, "seg-explicit-rate");
  assert.equal(explicitRate?.conversion_rate, 0.35);
  assert.equal(fallbackRate?.conversion_rate, 0.2);
});

test("matches recommendation and generated content rows by segment key", () => {
  const customerGroups = DashboardViewDomain.toAiCustomerGroups([
    segmentMetric({ customer_group_id: "vip", customer_group_name: "VIP 고객군" })
  ]);
  const recommendationRows = [
    recommendationContext({
      segment_key: "vip",
      action_id: "banner-vip",
      action_type: "banner",
      action_title: "VIP 배너",
      action_description: "VIP 대상 배너를 노출합니다.",
      action_rationale: "VIP 세그먼트 전환 개선",
      sampled_value: "0.7",
      creative_id: "creative-vip",
      creative_created_at: new Date("2026-07-01T00:00:00.000Z"),
      creative_title: "VIP 혜택",
      creative_message: "지금 VIP 혜택을 확인하세요."
    }),
    recommendationContext({
      segment_key: "other",
      action_id: "banner-other",
      action_type: "banner"
    })
  ];

  const recommendation = DashboardViewDomain.toAiRecommendation(
    customerGroups,
    recommendationRows,
    "vip"
  );
  const generation = DashboardViewDomain.toAiGeneration(customerGroups, recommendationRows, "vip");

  assert.equal(recommendation.recommended_actions.length, 1);
  assert.equal(recommendation.recommended_actions[0]?.action_id, "banner-vip");
  assert.equal(generation.generated_items.length, 1);
  assert.equal(generation.generated_items[0]?.content?.content_id, "creative-vip");
});

function event(overrides: Partial<DashboardEventView> = {}): DashboardEventView {
  return {
    event_name: "page_view",
    session_id: "session-default",
    event_time: "2026-07-01 00:00:00",
    channel: "organic",
    age_group: "20s",
    gender: "unknown",
    category: "general",
    region: "KR",
    device: "desktop",
    segment_key: "segment-a",
    revenue: 0,
    ...overrides
  };
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

function recommendationContext(
  overrides: Partial<RecommendationContextRow> = {}
): RecommendationContextRow {
  return {
    action_description: null,
    action_id: null,
    action_rationale: null,
    action_status: "recommended",
    action_title: null,
    action_type: null,
    anomaly_json: {},
    created_at: new Date("2026-07-01T00:00:00.000Z"),
    creative_created_at: null,
    creative_id: null,
    creative_message: null,
    creative_status: "generated",
    creative_title: null,
    creative_type: "copy",
    image_url: null,
    landing_url: null,
    recommendation_result_id: "recommendation-1",
    root_causes_json: {},
    sampled_value: null,
    segment_json: {},
    segment_key: "segment-a",
    status: "ready",
    summary_message: null,
    ...overrides
  };
}
