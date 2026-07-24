import assert from "node:assert/strict";
import test from "node:test";
import type {
  DashboardConfirmSegmentSuggestionsResult,
  DashboardPromotionScopedSegmentDefinition,
  DashboardPromotionSegmentSuggestion
} from "@loopad/shared";
import {
  createSegmentAssistantSession,
  INITIAL_SEGMENT_ASSISTANT_MESSAGE,
  persistSegmentAssistantSessionTargets,
  readSegmentAssistantSessionTargets,
  selectSegmentAssistantSource,
  segmentAssistantFailureMessage,
  segmentAssistantResponseMessage,
  segmentAssistantSessionKey,
  updateSegmentAssistantSessionStore
} from "../src/features/dashboard/model/segment-candidate-assistant.js";
import { selectedSegmentSummaries } from "../src/features/dashboard/model/segment-selection-summary.js";
import {
  confirmedCreatedSegmentTarget,
  promotionSegmentConfirmationRequest
} from "../src/features/dashboard/ui/pages/campaign/promotion/promotionSegmentConfirmationFlow.js";

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

test("confirmation result keeps the created segment tied to its returned analysis", () => {
  const result = {
    analysis_id: "analysis-confirmed",
    target_segments: [{ segment_id: "segment-ai" }, { segment_id: "segment-created" }]
  } as DashboardConfirmSegmentSuggestionsResult;

  assert.equal(
    confirmedCreatedSegmentTarget(result, ["segment-created"], "segment-created")?.segment_id,
    "segment-created"
  );
  assert.equal(confirmedCreatedSegmentTarget(result, [], "segment-created"), null);
});

test("segment assistant introduces both data lookup and segment creation", () => {
  assert.equal(
    INITIAL_SEGMENT_ASSISTANT_MESSAGE,
    "고객 행동 데이터의 인원과 비율을 물어보거나, 원하는 조건의 고객군을 직접 만들 수 있습니다."
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

test("segment assistant session preserves the created segment through confirmation", () => {
  const key = segmentAssistantSessionKey("demo_project", "promotion-1");
  let store = updateSegmentAssistantSessionStore({}, key, (session) => ({
    ...session,
    createdSegmentId: "segment-created"
  }));
  store = updateSegmentAssistantSessionStore(store, key, (session) =>
    session.createdSegmentId === "segment-created"
      ? { ...session, createdSegmentAnalysisId: "analysis-confirmed" }
      : session
  );

  assert.equal(store[key]?.createdSegmentId, "segment-created");
  assert.equal(store[key]?.createdSegmentAnalysisId, "analysis-confirmed");
});

test("segment assistant generation target survives a dashboard remount", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    }
  };
  const key = segmentAssistantSessionKey("project-1", "promotion-1");
  const store = updateSegmentAssistantSessionStore({}, key, (session) => ({
    ...session,
    createdSegmentAnalysisId: "analysis-confirmed",
    createdSegmentId: "segment-created"
  }));

  persistSegmentAssistantSessionTargets(store, storage);
  const restored = readSegmentAssistantSessionTargets(storage);

  assert.equal(restored[key]?.createdSegmentId, "segment-created");
  assert.equal(restored[key]?.createdSegmentAnalysisId, "analysis-confirmed");
  assert.deepEqual(restored[key]?.messages, createSegmentAssistantSession().messages);
});

test("segment assistant stores a query result with the assistant message", () => {
  const response = {
    action: "audience_query",
    assistant_message:
      "최근 30일 기준 조건에 맞는 고객은 10,012명이며, 분석 가능 사용자 20,312명의 49.29%입니다.",
    condition_labels: ["제주·오키나와 숙소 검색", "예약 완료 없음"],
    condition_diagnostics: [],
    lookback_days: 30,
    minimum_sample_size: 100,
    preview: {
      query_preview_id: "preview-1",
      sample_ratio: 0.4929,
      sample_size: 10012,
      sample_size_status: "valid",
      total_eligible_user_count: 20312
    },
    segment_name: "제주·오키나와 숙소 검색 고객",
    suggested_adjustments: []
  } as const;

  assert.deepEqual(segmentAssistantResponseMessage(3, response), {
    id: 3,
    role: "assistant",
    text: response.assistant_message,
    result: response
  });
});

test("segment assistant keeps the selected recommendation as editable session context", () => {
  const source = {
    suggestion_id: "suggestion-1",
    segment_id: "segment-1",
    title: "예약 직전 이탈 고객",
    strategy_role: "예약 이탈 회수형",
    condition_labels: [],
    reference_labels: ["예약 시작", "예약 완료 없음"],
    sample_size: 142
  } as const;
  const selected = selectSegmentAssistantSource(createSegmentAssistantSession(), source);

  assert.deepEqual(selected.sourceSuggestion, source);
  assert.equal(selected.result, null);
});

test("changing the AI recommendation clears stale conversation and refinement context", () => {
  const first = {
    suggestion_id: "suggestion-1",
    segment_id: "segment-1",
    title: "예약 직전 이탈 고객",
    strategy_role: "예약 이탈 회수형",
    condition_labels: [],
    reference_labels: ["예약 시작", "예약 미완료"],
    sample_size: 100
  } as const;
  const second = {
    ...first,
    suggestion_id: "suggestion-2",
    segment_id: "segment-2",
    title: "반복 탐색 고객",
    sample_size: 138
  } as const;
  const current = {
    ...selectSegmentAssistantSource(createSegmentAssistantSession(), first),
    messages: [
      { id: 0, role: "assistant" as const, text: INITIAL_SEGMENT_ASSISTANT_MESSAGE },
      { id: 1, role: "user" as const, text: "상세 조회 2회 이상" }
    ],
    nextMessageId: 2,
    sourceContext: {
      suggestion_id: "suggestion-1",
      segment_id: "segment-1",
      title: first.title,
      strategy_role: first.strategy_role,
      candidate_type: "funnel_recovery",
      sample_size: 100,
      base_condition_labels: ["예약 시작 후 미완료"],
      reference_labels: [...first.reference_labels],
      suggested_refinements: []
    }
  };

  const selected = selectSegmentAssistantSource(current, second);

  assert.deepEqual(selected.messages, [
    { id: 0, role: "assistant", text: INITIAL_SEGMENT_ASSISTANT_MESSAGE }
  ]);
  assert.equal(selected.nextMessageId, 1);
  assert.equal(selected.sourceContext, null);
  assert.equal(selected.isSourceContextLoading, true);
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
