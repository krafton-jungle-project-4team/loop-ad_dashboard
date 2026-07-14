import assert from "node:assert/strict";
import test from "node:test";
import {
  dashboardNavigationGroups,
  getCanonicalDashboardPath,
  getDashboardNavigationSearch,
  getDashboardTabByPath,
  getLegacyDashboardViewPatch
} from "../src/features/dashboard/model/dashboard-navigation.js";
import {
  defaultDashboardSearchQuery,
  normalizeCampaignWorkspaceView,
  normalizeDashboardQuery,
  normalizePromotionWorkspaceView
} from "../src/features/dashboard/model/dashboard-query.js";

test("dashboard sidebar exposes the product-led flat navigation order", () => {
  assert.deepEqual(
    dashboardNavigationGroups.map((group) => ({
      items: group.items.map((item) => item.label),
      label: group.label
    })),
    [
      {
        items: ["캠페인", "실험", "통계"],
        label: ""
      },
      {
        items: ["워크플로우", "데이터 탐색기", "SDK 관리"],
        label: ""
      }
    ]
  );
  assert.equal(
    dashboardNavigationGroups.every((group) => group.items.every((item) => item.type === "link")),
    true
  );
  assert.equal(
    dashboardNavigationGroups.some((group) =>
      group.items.some((item) => item.label.includes("개발자"))
    ),
    false
  );
});

test("campaign sidebar navigation returns to the campaign list root", () => {
  const nestedCampaignQuery = {
    ...defaultDashboardSearchQuery,
    campaignView: "performance" as const,
    createPromotion: true,
    promotionView: "performance" as const,
    selectedAdExperimentId: "experiment-1",
    selectedCampaignId: "campaign-1",
    selectedPromotionId: "promotion-1",
    selectedSegmentId: "segment-1"
  };

  assert.deepEqual(getDashboardNavigationSearch("campaigns", nestedCampaignQuery), {
    ...nestedCampaignQuery,
    campaignView: "manage",
    createCampaign: false,
    createPromotion: false,
    promotionView: "manage",
    segmentView: "manage",
    selectedAdExperimentId: "",
    selectedCampaignId: "",
    selectedPromotionId: "",
    selectedSegmentId: ""
  });
  assert.equal(
    getDashboardNavigationSearch("experiments", nestedCampaignQuery),
    nestedCampaignQuery
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
  assert.equal(getDashboardTabByPath("funnels"), "main");
  assert.equal(getCanonicalDashboardPath("funnels"), "statistics");
  assert.equal(getCanonicalDashboardPath("main"), "statistics");
  assert.equal(getCanonicalDashboardPath("segments"), "campaigns");
  assert.deepEqual(getLegacyDashboardViewPatch("campaign-detail"), {
    campaignView: "manage"
  });
  assert.deepEqual(getLegacyDashboardViewPatch("campaign-metrics"), {
    campaignView: "performance"
  });
  assert.deepEqual(getLegacyDashboardViewPatch("funnels"), {
    statisticsView: "user-paths"
  });
});

test("legacy promotion overview opens the promotion performance view", () => {
  const query = normalizeDashboardQuery(
    { ...defaultDashboardSearchQuery, promotionView: "overview" },
    "demo_project"
  );

  assert.equal(query.promotionView, "performance");
  assert.equal(normalizePromotionWorkspaceView("performance"), "performance");
});

test("legacy campaign detail views open campaign management", () => {
  assert.equal(normalizeCampaignWorkspaceView("overview"), "manage");
  assert.equal(normalizeCampaignWorkspaceView("experiments"), "manage");
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
