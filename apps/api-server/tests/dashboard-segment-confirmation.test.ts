import assert from "node:assert/strict";
import test from "node:test";
import { promotionConfirmationAnalysisId } from "../src/features/dashboard/repository/dashboard-campaign-reader.js";

test("promotion confirmation reuses one bounded analysis id", () => {
  const first = promotionConfirmationAnalysisId("project-1", "promotion-1");
  const repeated = promotionConfirmationAnalysisId("project-1", "promotion-1");
  const otherPromotion = promotionConfirmationAnalysisId("project-1", "promotion-2");

  assert.equal(first, repeated);
  assert.notEqual(first, otherPromotion);
  assert.ok(first.length <= 100);
});
