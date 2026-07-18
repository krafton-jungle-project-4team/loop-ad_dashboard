import assert from "node:assert/strict";
import test from "node:test";
import type {
  DashboardPromotionScopedSegmentDefinition,
  DashboardPromotionSegmentSuggestion
} from "@loopad/shared";
import {
  createSegmentAssistantSession,
  INITIAL_SEGMENT_ASSISTANT_MESSAGE,
  segmentAssistantFailureMessage,
  segmentAssistantResponseMessage,
  segmentAssistantSessionKey,
  updateSegmentAssistantSessionStore
} from "../src/features/dashboard/model/segment-candidate-assistant.js";
import { selectedSegmentSummaries } from "../src/features/dashboard/model/segment-selection-summary.js";
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

test("confirmation includes directly created segments with accepted AI suggestions", () => {
  const request = promotionSegmentConfirmationRequest(
    [suggestion("suggestion-1", "analysis-current", "accepted")],
    "analysis-current",
    ["segment-direct", "segment-direct"]
  );

  assert.deepEqual(request, {
    analysis_id: "analysis-current",
    segment_ids: ["segment-direct"],
    suggestion_ids: ["suggestion-1"]
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

test("segment assistant preserves an independent session for each promotion", () => {
  const firstKey = segmentAssistantSessionKey("demo_project", "promotion-1");
  const secondKey = segmentAssistantSessionKey("demo_project", "promotion-2");
  let store = updateSegmentAssistantSessionStore({}, firstKey, (session) => ({
    ...session,
    draft: "제주 미예약 고객",
    messages: [...session.messages, { id: 1, role: "user", text: "몇 명이야?" }],
    nextMessageId: 2
  }));
  store = updateSegmentAssistantSessionStore(store, secondKey, (session) => ({
    ...session,
    draft: "오키나와 반복 검색 고객"
  }));

  assert.equal(store[firstKey]?.draft, "제주 미예약 고객");
  assert.equal(store[firstKey]?.messages.at(-1)?.text, "몇 명이야?");
  assert.equal(store[secondKey]?.draft, "오키나와 반복 검색 고객");
  assert.deepEqual(createSegmentAssistantSession().messages, [
    { id: 0, role: "assistant", text: INITIAL_SEGMENT_ASSISTANT_MESSAGE }
  ]);
});

test("segment assistant stores a query result with the assistant message", () => {
  const response = {
    action: "audience_query",
    assistant_message:
      "최근 30일 기준 조건에 맞는 고객은 10,012명이며, 분석 가능 사용자 20,312명의 49.29%입니다.",
    condition_labels: ["제주·오키나와 숙소 검색", "예약 완료 없음"],
    lookback_days: 30,
    preview: {
      query_preview_id: "preview-1",
      sample_ratio: 0.4929,
      sample_size: 10012,
      sample_size_status: "valid",
      total_eligible_user_count: 20312
    },
    segment_name: "제주·오키나와 숙소 검색 고객"
  } as const;

  assert.deepEqual(segmentAssistantResponseMessage(3, response), {
    id: 3,
    role: "assistant",
    text: response.assistant_message,
    result: response
  });
});

test("selection summary identifies accepted AI and directly added segments", () => {
  const accepted = suggestion("suggestion-1", "analysis-current", "accepted");
  accepted.segment_name = "예약 직전 이탈 고객";
  accepted.sample_size = 42;
  accepted.display_copy = {
    action_hint: "",
    audience_summary: "",
    performance_estimate: {
      availability: "available",
      basis_label: "",
      confidence_label: "medium",
      formatted: "11.9%",
      label: "예상 예약 전환율",
      metric: "booking_conversion_rate",
      value: 0.119,
      window_label: ""
    },
    reason: "",
    signal_chips: [],
    strategy_role: "예약 이탈 회수형",
    title: "예약 직전 이탈 고객"
  };
  const pending = suggestion("suggestion-2", "analysis-current", "suggested");
  const manual = scopedSegment("manual-segment-1");
  manual.segment_name = "제주 미예약 고객";
  manual.sample_size = 120;

  assert.deepEqual(selectedSegmentSummaries([accepted, pending], [manual]), [
    {
      detail: "예약 이탈 회수형 · 예상 예약 전환율 11.9%",
      id: "suggestion:suggestion-1",
      name: "예약 직전 이탈 고객"
    },
    {
      detail: "직접 추가 · 조건 부합 120명",
      id: "scoped:manual-segment-1",
      name: "제주 미예약 고객"
    }
  ]);
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
  return {
    segment_id: segmentId,
    segment_name: segmentId,
    sample_size: 0
  } as DashboardPromotionScopedSegmentDefinition;
}
