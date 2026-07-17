import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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

test("promotion confirmation scopes AI and manual selections to requested ids", () => {
  const dashboardSql = readFileSync(
    new URL("../src/features/dashboard/database/dashboard.sql", import.meta.url),
    "utf8"
  );
  const queryStart = dashboardSql.indexOf(
    "/* @name ConfirmDashboardPromotionSegmentSuggestions */"
  );
  const queryEnd = dashboardSql.indexOf(
    "/* @name UpdateDashboardPromotionTargetSegment */",
    queryStart
  );
  const confirmationSql = dashboardSql.slice(queryStart, queryEnd);

  assert.match(confirmationSql, /pss\.analysis_id = :analysisId/);
  assert.match(confirmationSql, /pss\.suggestion_id = ANY\(:suggestionIds\)/);
  assert.match(confirmationSql, /sd\.segment_id = ANY\(:segmentIds\)/);
});
