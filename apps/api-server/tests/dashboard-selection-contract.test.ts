import assert from "node:assert/strict";
import test from "node:test";
import {
  DashboardDecideSegmentSuggestionRequestSchema,
  DashboardUnapproveContentCandidateResultSchema
} from "@loopad/shared";

test("segment suggestion selection can be checked and unchecked", () => {
  assert.deepEqual(DashboardDecideSegmentSuggestionRequestSchema.parse({ status: "accepted" }), {
    status: "accepted"
  });
  assert.deepEqual(DashboardDecideSegmentSuggestionRequestSchema.parse({ status: "suggested" }), {
    status: "suggested"
  });
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
