import assert from "node:assert/strict";
import test from "node:test";
import type {
  DashboardPromotionScopedSegmentDefinition,
  DashboardPromotionSegmentSuggestion
} from "@loopad/shared";
import {
  INITIAL_SEGMENT_ASSISTANT_MESSAGE,
  segmentAssistantFailureMessage
} from "../src/features/dashboard/model/segment-candidate-assistant.js";
import { promotionSegmentConfirmationRequest } from "../src/features/dashboard/ui/pages/campaign/promotion/promotionSegmentConfirmationFlow.js";

test("confirmation sends only accepted suggestions from the selected analysis", () => {
  const request = promotionSegmentConfirmationRequest(
    [
      suggestion("suggestion-old", "analysis-old", "accepted"),
      suggestion("suggestion-1", "analysis-current", "accepted"),
      suggestion("suggestion-2", "analysis-current", "suggested")
    ],
    [scopedSegment("manual-segment-1")],
    "analysis-current"
  );

  assert.deepEqual(request, {
    analysis_id: "analysis-current",
    segment_ids: ["manual-segment-1"],
    suggestion_ids: ["suggestion-1"]
  });
});

test("manual-only confirmation does not select a stale analysis", () => {
  const request = promotionSegmentConfirmationRequest(
    [],
    [scopedSegment("manual-segment-1")],
    "analysis-previous"
  );

  assert.deepEqual(request, {
    analysis_id: null,
    segment_ids: ["manual-segment-1"],
    suggestion_ids: []
  });
});

test("confirmation does not choose an arbitrary analysis from mixed suggestions", () => {
  const request = promotionSegmentConfirmationRequest(
    [
      suggestion("suggestion-old", "analysis-old", "accepted"),
      suggestion("suggestion-current", "analysis-current", "accepted")
    ],
    [scopedSegment("manual-segment-1")],
    null
  );

  assert.deepEqual(request, {
    analysis_id: null,
    segment_ids: ["manual-segment-1"],
    suggestion_ids: []
  });
});

test("segment assistant introduces both data lookup and segment creation", () => {
  assert.equal(
    INITIAL_SEGMENT_ASSISTANT_MESSAGE,
    "고객 행동 데이터의 인원과 비율을 물어보거나, 원하는 조건의 세그먼트를 직접 만들 수 있습니다."
  );
});

test("segment assistant uses a generic message for transport failures", () => {
  assert.equal(
    segmentAssistantFailureMessage(new Error("Dashboard API request failed. timeout")),
    "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요."
  );
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

function scopedSegment(segmentId: string) {
  return { segment_id: segmentId } as DashboardPromotionScopedSegmentDefinition;
}
