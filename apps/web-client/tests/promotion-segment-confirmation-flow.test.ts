import assert from "node:assert/strict";
import test from "node:test";
import { confirmAndAnalyzePromotionSegments } from "../src/features/dashboard/ui/pages/campaign/promotion/promotionSegmentConfirmationFlow.js";

test("candidate confirmation persists first and then analyzes unique confirmed segments", async () => {
  const calls: string[] = [];
  const result = await confirmAndAnalyzePromotionSegments(["segment-1", "segment-2", "segment-1"], {
    analyze: async (segmentIds) => {
      calls.push(`analyze:${segmentIds.join(",")}`);
      return {
        analysis_id: "analysis-confirmed",
        promotion_id: "promotion-1",
        status: "completed"
      };
    },
    confirm: async () => {
      calls.push("confirm");
      return {
        confirmed_segment_count: 2,
        promotion_id: "promotion-1",
        status: "confirmed"
      };
    }
  });

  assert.deepEqual(calls, ["confirm", "analyze:segment-1,segment-2"]);
  assert.equal(result.analysis.analysis_id, "analysis-confirmed");
  assert.equal(result.confirmation.confirmed_segment_count, 2);
});

test("candidate confirmation does not analyze when persistence fails", async () => {
  let analyzed = false;

  await assert.rejects(
    confirmAndAnalyzePromotionSegments(["segment-1"], {
      analyze: async () => {
        analyzed = true;
        return {
          analysis_id: "analysis-confirmed",
          promotion_id: "promotion-1",
          status: "completed"
        };
      },
      confirm: async () => {
        throw new Error("confirm failed");
      }
    }),
    /confirm failed/
  );

  assert.equal(analyzed, false);
});
