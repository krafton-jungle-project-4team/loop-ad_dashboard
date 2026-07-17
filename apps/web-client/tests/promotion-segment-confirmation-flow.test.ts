import assert from "node:assert/strict";
import test from "node:test";
import type { DashboardPromotionSegmentSuggestion } from "@loopad/shared";
import { promotionSegmentConfirmationRequest } from "../src/features/dashboard/ui/pages/campaign/promotion/promotionSegmentConfirmationFlow.js";

test("confirmation sends only accepted suggestions from the selected analysis", () => {
  const request = promotionSegmentConfirmationRequest(
    [
      suggestion("suggestion-old", "analysis-old", "accepted"),
      suggestion("suggestion-1", "analysis-current", "accepted"),
      suggestion("suggestion-2", "analysis-current", "suggested")
    ],
    "analysis-current"
  );

  assert.deepEqual(request, {
    analysis_id: "analysis-current",
    segment_ids: [],
    suggestion_ids: ["suggestion-1"]
  });
});

test("empty AI confirmation does not select a stale analysis", () => {
  const request = promotionSegmentConfirmationRequest([], "analysis-previous");

  assert.deepEqual(request, {
    analysis_id: null,
    segment_ids: [],
    suggestion_ids: []
  });
});

test("confirmation does not choose an arbitrary analysis from mixed suggestions", () => {
  const request = promotionSegmentConfirmationRequest(
    [
      suggestion("suggestion-old", "analysis-old", "accepted"),
      suggestion("suggestion-current", "analysis-current", "accepted")
    ],
    null
  );

  assert.deepEqual(request, {
    analysis_id: null,
    segment_ids: [],
    suggestion_ids: []
  });
});

function suggestion(
  suggestionId: string,
  analysisId: string,
  status: DashboardPromotionSegmentSuggestion["suggestion_status"]
) {
  return {
    analysis_id: analysisId,
    suggestion_id: suggestionId,
    suggestion_status: status
  } as DashboardPromotionSegmentSuggestion;
}
