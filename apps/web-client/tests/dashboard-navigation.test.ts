import assert from "node:assert/strict";
import test from "node:test";
import {
  dashboardNavigationGroups,
  getDashboardTabByPath
} from "../src/features/dashboard/model/dashboard-navigation.js";
import {
  defaultDashboardSearchQuery,
  normalizeDashboardQuery
} from "../src/features/dashboard/model/dashboard-query.js";

test("dashboard sidebar exposes flat overview, campaign operations, and tools groups", () => {
  assert.deepEqual(
    dashboardNavigationGroups.map((group) => ({
      items: group.items.map((item) => item.label),
      label: group.label
    })),
    [
      { items: ["메인", "사용자 여정"], label: "개요" },
      { items: ["캠페인", "프로모션", "세그먼트", "실험"], label: "캠페인 운영" },
      { items: ["데이터 탐색기", "워크플로우", "SDK 연동"], label: "도구" }
    ]
  );
  assert.equal(
    dashboardNavigationGroups.every((group) => group.items.every((item) => item.type === "link")),
    true
  );
});

test("dashboard keeps legacy paths available while exposing the experiment route", () => {
  assert.equal(getDashboardTabByPath("campaign-detail"), "campaign-detail");
  assert.equal(getDashboardTabByPath("campaign-metrics"), "campaign-metrics");
  assert.equal(getDashboardTabByPath("campaign-promotions"), "campaign-promotions");
  assert.equal(getDashboardTabByPath("promotion-metrics"), "promotion-metrics");
  assert.equal(getDashboardTabByPath("experiments"), "experiments");
});

test("legacy promotion performance view opens the promotion overview", () => {
  const query = normalizeDashboardQuery(
    { ...defaultDashboardSearchQuery, promotionView: "performance" },
    "demo_project"
  );

  assert.equal(query.promotionView, "overview");
});

test("legacy segment creative view opens the segment experiment workspace", () => {
  const query = normalizeDashboardQuery(
    { ...defaultDashboardSearchQuery, segmentView: "creative" },
    "demo_project"
  );

  assert.equal(query.segmentView, "experiments");
});
