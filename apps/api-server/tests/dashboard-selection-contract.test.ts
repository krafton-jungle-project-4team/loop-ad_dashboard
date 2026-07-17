import assert from "node:assert/strict";
import test from "node:test";
import {
  DashboardConfirmSegmentSuggestionsRequestSchema,
  DashboardDecideSegmentSuggestionRequestSchema,
  DashboardUnapproveContentCandidateResultSchema,
  DashboardUpdateContentCandidateCopyRequestSchema
} from "@loopad/shared";

test("segment suggestion selection can be checked and unchecked", () => {
  assert.deepEqual(DashboardDecideSegmentSuggestionRequestSchema.parse({ status: "accepted" }), {
    status: "accepted"
  });
  assert.deepEqual(DashboardDecideSegmentSuggestionRequestSchema.parse({ status: "suggested" }), {
    status: "suggested"
  });
});

test("segment confirmation requires an exact current selection", () => {
  assert.deepEqual(
    DashboardConfirmSegmentSuggestionsRequestSchema.parse({
      analysis_id: "analysis-current",
      suggestion_ids: ["suggestion-current"],
      segment_ids: ["segment-manual"]
    }),
    {
      analysis_id: "analysis-current",
      suggestion_ids: ["suggestion-current"],
      segment_ids: ["segment-manual"]
    }
  );
  assert.deepEqual(
    DashboardConfirmSegmentSuggestionsRequestSchema.parse({
      analysis_id: null,
      suggestion_ids: [],
      segment_ids: ["segment-manual"]
    }),
    {
      analysis_id: null,
      suggestion_ids: [],
      segment_ids: ["segment-manual"]
    }
  );

  assert.throws(
    () =>
      DashboardConfirmSegmentSuggestionsRequestSchema.parse({
        analysis_id: null,
        suggestion_ids: ["suggestion-current"],
        segment_ids: []
      }),
    /analysis_id/
  );
  assert.throws(
    () =>
      DashboardConfirmSegmentSuggestionsRequestSchema.parse({
        analysis_id: "analysis-current",
        suggestion_ids: [],
        segment_ids: []
      }),
    /at least one/
  );
});

test("content candidate copy update trims and validates editable text", () => {
  assert.deepEqual(
    DashboardUpdateContentCandidateCopyRequestSchema.parse({
      headline: "  여름 휴가를 지금 예약하세요  ",
      body: "  남은 객실을 특별가로 만나보세요.  ",
      cta: "  예약하기  "
    }),
    {
      headline: "여름 휴가를 지금 예약하세요",
      body: "남은 객실을 특별가로 만나보세요.",
      cta: "예약하기"
    }
  );
});

test("content candidate selection cancellation returns the candidate to draft", () => {
  const result = DashboardUnapproveContentCandidateResultSchema.parse({
    content_id: "content_vip_a",
    content_option_id: "option_a",
    promotion_id: "promo_banner_001",
    segment_id: "seg_vip",
    status: "draft"
  });

  assert.equal(result.status, "draft");
});
