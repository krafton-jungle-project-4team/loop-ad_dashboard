import assert from "node:assert/strict";
import test from "node:test";
import type {
  DashboardPromotionScopedSegmentDefinition,
  DashboardPromotionSegmentSuggestion
} from "@loopad/shared";
import {
  buildSegmentAssistantInstruction,
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

test("segment assistant starts with a planner-friendly message", () => {
  assert.equal(
    INITIAL_SEGMENT_ASSISTANT_MESSAGE,
    "세그먼트 후보를 챗봇을 통해 직접 생성할 수 있습니다. 원하시는 세그먼트나 조건 등을 알려주세요."
  );
});

test("segment assistant keeps recent follow-up context as one segment instruction", () => {
  assert.equal(
    buildSegmentAssistantInstruction([" 최근 제주 숙소를 검색한 고객 ", "예약 완료 고객은 빼줘"]),
    "최근 제주 숙소를 검색한 고객\n후속 요청: 예약 완료 고객은 빼줘"
  );
});

test("segment assistant asks for detail only when Decision reports no matching audience", () => {
  assert.match(
    segmentAssistantFailureMessage(
      new Error("Decision API request failed. no segment candidates matched segment instruction")
    ),
    /조금 더 구체적으로/
  );
  assert.equal(
    segmentAssistantFailureMessage(new Error("Decision API request failed. timeout")),
    "세그먼트 후보를 만들지 못했습니다. 잠시 후 다시 시도해 주세요."
  );
});

test("segment assistant retains at most six recent user turns", () => {
  assert.equal(
    buildSegmentAssistantInstruction(["1", "2", "3", "4", "5", "6", "7"]),
    "2\n후속 요청: 3\n후속 요청: 4\n후속 요청: 5\n후속 요청: 6\n후속 요청: 7"
  );
});

test("segment assistant always retains the latest request within the API limit", () => {
  const instruction = buildSegmentAssistantInstruction(["제".repeat(2_100)]);

  assert.equal(instruction.length, 2_000);
  assert.equal(instruction, "제".repeat(2_000));
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
