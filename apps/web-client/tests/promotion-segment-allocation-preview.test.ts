import assert from "node:assert/strict";
import test from "node:test";
import type {
  DashboardAudienceAllocationPreviewContext,
  DashboardPromotionSegmentSuggestion
} from "@loopad/shared";
import { selectedAudienceAllocationPreview } from "../src/features/dashboard/ui/pages/campaign/promotion/components/PromotionSegmentSuggestions.js";

test("allocation preview follows the exact currently selected customer group combination", () => {
  const context: DashboardAudienceAllocationPreviewContext = {
    allocation_policy_hash: "sha256:policy",
    allocation_policy_version: "hotel_segment_allocation.v1",
    candidate_batch_analysis_id: "analysis-recommendation",
    candidate_segment_ids: ["segment-a", "segment-b"],
    exclusion_revision: 12,
    preview_version: "audience_allocation_preview.v1",
    allocation_previews: [
      preview(["segment-a"], 100, 100),
      preview(["segment-a", "segment-b"], 190, 85)
    ]
  };

  const selected = selectedAudienceAllocationPreview(context, [
    suggestion("segment-b", "suggested"),
    suggestion("segment-a", "accepted")
  ]);

  assert.deepEqual(selected?.selected_segment_ids, ["segment-a"]);
  assert.equal(selected?.per_segment[0]?.allocated_user_count, 100);
});

function preview(selectedSegmentIds: string[], total: number, firstCount: number) {
  return {
    allocation_policy_hash: "sha256:policy",
    allocation_policy_version: "hotel_segment_allocation.v1",
    candidate_batch_analysis_id: "analysis-recommendation",
    exclusion_revision: 12,
    preview_version: "audience_allocation_preview.v1",
    selected_segment_ids: selectedSegmentIds,
    total_allocated_user_count: total,
    per_segment: selectedSegmentIds.map((segmentId, index) => ({
      allocated_user_count: index === 0 ? firstCount : total - firstCount,
      audience_status: "targetable",
      meets_min_sample_size: true,
      segment_id: segmentId,
      targetable: true
    }))
  };
}

function suggestion(
  segmentId: string,
  status: DashboardPromotionSegmentSuggestion["suggestion_status"]
) {
  return {
    analysis_id: "analysis-recommendation",
    segment_id: segmentId,
    suggestion_status: status
  } as DashboardPromotionSegmentSuggestion;
}
