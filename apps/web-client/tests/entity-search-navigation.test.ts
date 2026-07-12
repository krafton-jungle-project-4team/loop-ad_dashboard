import assert from "node:assert/strict";
import test from "node:test";
import type { DashboardEntitySearchResult } from "@loopad/shared";
import { entitySearchResultToDashboardPatch } from "../src/features/dashboard/model/entity-search-navigation.js";

test("entity search results retain only the ancestors required by their hierarchy depth", () => {
  const campaign = result({ entity_type: "campaign", promotion_id: null, segment_id: null });
  const promotion = result({ entity_type: "promotion", segment_id: null });
  const segment = result({ entity_type: "segment" });

  assert.deepEqual(entitySearchResultToDashboardPatch(campaign), {
    campaignView: "manage",
    createCampaign: false,
    createPromotion: false,
    promotionView: "manage",
    segmentView: "manage",
    selectedAdExperimentId: "",
    selectedCampaignId: "campaign-1",
    selectedPromotionId: "",
    selectedSegmentId: ""
  });
  assert.equal(entitySearchResultToDashboardPatch(promotion).selectedPromotionId, "promotion-1");
  assert.deepEqual(
    {
      segmentView: entitySearchResultToDashboardPatch(segment).segmentView,
      selectedSegmentId: entitySearchResultToDashboardPatch(segment).selectedSegmentId
    },
    { segmentView: "experiments", selectedSegmentId: "segment-1" }
  );
});

function result(overrides: Partial<DashboardEntitySearchResult>): DashboardEntitySearchResult {
  return {
    campaign_id: "campaign-1",
    display_name: "검색 결과",
    entity_id: "segment-1",
    entity_type: "segment",
    promotion_id: "promotion-1",
    segment_id: "segment-1",
    status: "active",
    updated_at: "2026-07-12T00:00:00.000Z",
    ...overrides
  };
}
