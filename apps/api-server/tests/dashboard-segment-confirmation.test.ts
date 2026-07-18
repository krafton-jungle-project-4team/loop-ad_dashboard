import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  DashboardCampaignReader,
  promotionConfirmationAnalysisId
} from "../src/features/dashboard/repository/dashboard-campaign-reader.js";

test("promotion confirmation reuses one bounded analysis id", () => {
  const first = promotionConfirmationAnalysisId("project-1", "promotion-1");
  const repeated = promotionConfirmationAnalysisId("project-1", "promotion-1");
  const otherPromotion = promotionConfirmationAnalysisId("project-1", "promotion-2");

  assert.equal(first, repeated);
  assert.notEqual(first, otherPromotion);
  assert.ok(first.length <= 100);
});

test("V2 confirmation only enriches Decision-created target rows", () => {
  const dashboardSql = readFileSync(
    new URL("../src/features/dashboard/database/dashboard.sql", import.meta.url),
    "utf8"
  );
  const queryStart = dashboardSql.indexOf(
    "/* @name ConfirmDashboardV2PromotionSegmentSuggestions */"
  );
  const queryEnd = dashboardSql.indexOf(
    "/* @name UpdateDashboardPromotionTargetSegment */",
    queryStart
  );
  const confirmationSql = dashboardSql.slice(queryStart, queryEnd);

  assert.match(confirmationSql, /pss\.analysis_id = :sourceAnalysisId/);
  assert.match(confirmationSql, /pss\.suggestion_id = ANY\(:suggestionIds\)/);
  assert.match(confirmationSql, /pss\.status IN \('accepted', 'confirmed'\)/);
  assert.match(confirmationSql, /target\.analysis_id = :confirmationAnalysisId/);
  assert.match(confirmationSql, /target\.audience_snapshot_id IS NOT NULL/);
  assert.match(confirmationSql, /target\.allocation_plan_id IS NOT NULL/);
  assert.doesNotMatch(confirmationSql, /INSERT INTO promotion_target_segments/);
  assert.doesNotMatch(confirmationSql, /INSERT INTO segment_vectors/);
});

test("V2 confirmation waits until Decision target rows become visible", async () => {
  const rows = [
    { confirmedSegmentCount: 0, updatedSuggestionCount: 0 },
    { confirmedSegmentCount: 2, updatedSuggestionCount: 2 }
  ];
  let queryCount = 0;
  const reader = new DashboardCampaignReader({
    query: () => ({
      single: async () => {
        const row = rows[queryCount];
        queryCount += 1;
        assert.ok(row);
        return row;
      }
    })
  } as never);

  const confirmedCount = await reader.confirmV2PromotionSegmentSuggestions({
    confirmationAnalysisId: "analysis-confirmed",
    confirmedBy: "operator-1",
    projectId: "project-1",
    promotionId: "promotion-1",
    sourceAnalysisId: "analysis-source",
    suggestionIds: ["suggestion-1", "suggestion-2"]
  });

  assert.equal(confirmedCount, 2);
  assert.equal(queryCount, 2);
});

test("removing a target segment invalidates its generation scope", () => {
  const dashboardSql = readFileSync(
    new URL("../src/features/dashboard/database/dashboard.sql", import.meta.url),
    "utf8"
  );
  const queryStart = dashboardSql.indexOf("/* @name StopDashboardPromotionTargetSegment */");
  const queryEnd = dashboardSql.indexOf("/* @name InsertDashboardNextLoopAnalysis */", queryStart);
  const stopSegmentSql = dashboardSql.slice(queryStart, queryEnd);

  assert.match(
    stopSegmentSql,
    /SELECT project_id, promotion_id, segment_id, analysis_id\s+FROM promotion_target_segments/
  );
  assert.match(stopSegmentSql, /UPDATE generation_runs gr[\s\S]*SET status = 'failed'/);
  assert.match(stopSegmentSql, /last_error_code = 'generation_invalidated_by_segment_change'/);
  assert.match(stopSegmentSql, /worker_id = NULL,[\s\S]*lease_expires_at = NULL/);
  assert.match(
    stopSegmentSql,
    /archived_generation_content_candidates AS \([\s\S]*UPDATE content_candidates cc[\s\S]*SET status = 'archived'/
  );
  assert.match(stopSegmentSql, /cc\.generation_id = gr\.generation_id/);
  assert.match(stopSegmentSql, /cc\.segment_id <> target\.segment_id/);
});
