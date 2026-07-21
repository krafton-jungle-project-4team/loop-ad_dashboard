import assert from "node:assert/strict";
import test from "node:test";
import {
  DASHBOARD_CONTENT_CANDIDATE_HTML_MAX_BYTES,
  DashboardConfirmSegmentSuggestionsRequestSchema,
  DashboardContentCandidateHtmlSourceSchema,
  DashboardDecideSegmentSuggestionRequestSchema,
  DashboardPreviewContentCandidateHtmlRequestSchema,
  DashboardPreviewContentCandidateHtmlResultSchema,
  DashboardReviseContentCandidateHtmlRequestSchema,
  DashboardSaveContentCandidateHtmlRequestSchema,
  DashboardSaveContentCandidateHtmlResultSchema,
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
      segment_ids: []
    }),
    {
      analysis_id: "analysis-current",
      suggestion_ids: ["suggestion-current"],
      segment_ids: []
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

test("content candidate HTML feedback is trimmed and bounded", () => {
  assert.deepEqual(
    DashboardReviseContentCandidateHtmlRequestSchema.parse({
      feedback: "  혜택과 예약 버튼이 먼저 보이게 바꿔줘  "
    }),
    { feedback: "혜택과 예약 버튼이 먼저 보이게 바꿔줘" }
  );
  assert.throws(
    () => DashboardReviseContentCandidateHtmlRequestSchema.parse({ feedback: "  " }),
    /too small/i
  );
});

test("content candidate HTML source, preview, and save contracts carry a sha256 revision", () => {
  const revision = "a".repeat(64);
  assert.deepEqual(
    DashboardContentCandidateHtmlSourceSchema.parse({
      html: "<p>현재 본문</p>",
      revision,
      updated_at: "2026-07-21T00:00:00.000Z"
    }),
    {
      html: "<p>현재 본문</p>",
      revision,
      updated_at: "2026-07-21T00:00:00.000Z"
    }
  );
  assert.deepEqual(
    DashboardPreviewContentCandidateHtmlRequestSchema.parse({ html: "<p>미리보기</p>" }),
    {
      html: "<p>미리보기</p>"
    }
  );
  assert.deepEqual(
    DashboardPreviewContentCandidateHtmlResultSchema.parse({ html: "<p>정상</p>" }),
    {
      html: "<p>정상</p>"
    }
  );
  assert.deepEqual(
    DashboardSaveContentCandidateHtmlRequestSchema.parse({
      base_revision: revision,
      html: "<p>수정 본문</p>"
    }),
    { base_revision: revision, html: "<p>수정 본문</p>" }
  );
  assert.equal(
    DashboardSaveContentCandidateHtmlResultSchema.parse({
      body: "본문",
      content_id: "content-a",
      cta: "예약",
      headline: "제목",
      html: "<p>정상</p>",
      html_url: "https://api.example/content.html",
      promotion_id: "promotion-a",
      revision,
      segment_id: "segment-a",
      status: "draft",
      updated_at: "2026-07-21T00:00:00.000Z"
    }).revision,
    revision
  );
  assert.throws(
    () =>
      DashboardSaveContentCandidateHtmlRequestSchema.parse({
        base_revision: "not-a-sha256",
        html: "<p>수정 본문</p>"
      }),
    /invalid/i
  );
  assert.throws(() =>
    DashboardPreviewContentCandidateHtmlRequestSchema.parse({
      html: "x".repeat(DASHBOARD_CONTENT_CANDIDATE_HTML_MAX_BYTES + 1)
    })
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
