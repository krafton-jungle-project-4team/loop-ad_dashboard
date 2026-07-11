import assert from "node:assert/strict";
import test from "node:test";
import {
  promotionAnalysisPath,
  promotionSegmentRecommendationPath
} from "../src/features/dashboard/api/promotion-api-paths.js";

test("AI recommendation request uses the dedicated recommend endpoint", () => {
  assert.equal(
    promotionSegmentRecommendationPath("promotion/1"),
    "/dashboard/v1/promotions/promotion%2F1/segment-suggestions/recommend"
  );
});

test("confirmed segment analysis uses the dedicated analyses endpoint", () => {
  assert.equal(
    promotionAnalysisPath("promotion/1"),
    "/dashboard/v1/promotions/promotion%2F1/analyses"
  );
});
