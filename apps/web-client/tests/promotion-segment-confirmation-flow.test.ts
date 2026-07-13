import assert from "node:assert/strict";
import test from "node:test";
import { confirmedSegmentSelectionId } from "../src/features/dashboard/ui/pages/campaign/promotion/promotionSegmentConfirmationFlow.js";

test("directly added segment becomes the selection when no AI candidate was confirmed", () => {
  assert.equal(confirmedSegmentSelectionId([], ["manual-segment-1"]), "manual-segment-1");
});
