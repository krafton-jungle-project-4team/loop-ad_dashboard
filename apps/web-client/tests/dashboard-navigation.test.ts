import assert from "node:assert/strict";
import test from "node:test";
import {
  dashboardNavigationGroups,
  getCanonicalDashboardPath,
  getDashboardTabByPath,
  getLegacyDashboardViewPatch
} from "../src/features/dashboard/model/dashboard-navigation.js";
import {
  defaultDashboardSearchQuery,
  normalizeCampaignWorkspaceView,
  normalizeDashboardQuery
} from "../src/features/dashboard/model/dashboard-query.js";

test("dashboard sidebar exposes the product-led flat navigation order", () => {
  assert.deepEqual(
    dashboardNavigationGroups.map((group) => ({
      items: group.items.map((item) => item.label),
      label: group.label
    })),
    [
      {
        items: ["캠페인", "실험", "통계", "사용자 여정", "워크플로우", "데이터 탐색기", "SDK 연동"],
        label: ""
      }
    ]
  );
  assert.equal(
    dashboardNavigationGroups.every((group) => group.items.every((item) => item.type === "link")),
    true
  );
});

test("dashboard keeps legacy paths available while exposing the experiment route", () => {
  assert.equal(getDashboardTabByPath("campaign-detail"), "campaigns");
  assert.equal(getDashboardTabByPath("campaign-metrics"), "campaigns");
  assert.equal(getDashboardTabByPath("campaign-promotions"), "campaigns");
  assert.equal(getDashboardTabByPath("promotion-metrics"), "campaigns");
  assert.equal(getDashboardTabByPath("experiments"), "experiments");
  assert.equal(getDashboardTabByPath("statistics"), "main");
  assert.equal(getDashboardTabByPath("main"), "main");
  assert.equal(getCanonicalDashboardPath("main"), "statistics");
  assert.equal(getCanonicalDashboardPath("segments"), "campaigns");
  assert.deepEqual(getLegacyDashboardViewPatch("campaign-detail"), {
    campaignView: "overview"
  });
  assert.deepEqual(getLegacyDashboardViewPatch("campaign-metrics"), {
    campaignView: "performance"
  });
});

test("legacy promotion performance view opens the promotion overview", () => {
  const query = normalizeDashboardQuery(
    { ...defaultDashboardSearchQuery, promotionView: "performance" },
    "demo_project"
  );

  assert.equal(query.promotionView, "overview");
});

test("legacy campaign experiment view opens the campaign overview", () => {
  assert.equal(normalizeCampaignWorkspaceView("experiments"), "overview");
});

test("legacy segment detail views open the segment experiment workspace", () => {
  const creativeQuery = normalizeDashboardQuery(
    { ...defaultDashboardSearchQuery, segmentView: "creative" },
    "demo_project"
  );
  const overviewQuery = normalizeDashboardQuery(
    { ...defaultDashboardSearchQuery, segmentView: "overview" },
    "demo_project"
  );

  assert.equal(creativeQuery.segmentView, "experiments");
  assert.equal(overviewQuery.segmentView, "experiments");
});
