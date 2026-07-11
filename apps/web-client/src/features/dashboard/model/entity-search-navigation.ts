import type { DashboardEntitySearchResult } from "@loopad/shared";
import type { DashboardQuery } from "./dashboard-types.js";

export type EntitySearchNavigationPatch = Pick<
  DashboardQuery,
  | "campaignView"
  | "createCampaign"
  | "createPromotion"
  | "promotionView"
  | "segmentView"
  | "selectedAdExperimentId"
  | "selectedCampaignId"
  | "selectedPromotionId"
  | "selectedSegmentId"
>;

export function entitySearchResultToDashboardPatch(
  result: DashboardEntitySearchResult
): EntitySearchNavigationPatch {
  return {
    campaignView: "manage",
    createCampaign: false,
    createPromotion: false,
    promotionView: "manage",
    segmentView: result.entity_type === "segment" ? "experiments" : "manage",
    selectedAdExperimentId: "",
    selectedCampaignId: result.campaign_id,
    selectedPromotionId: result.promotion_id ?? "",
    selectedSegmentId: result.segment_id ?? ""
  };
}
