import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { DashboardConfirmSegmentSuggestionsRequestSchema } from "@loopad/shared";
import {
  DashboardCampaignReader,
  promotionConfirmationAnalysisId
} from "../src/features/dashboard/repository/dashboard-campaign-reader.js";
import { confirmDashboardV2PromotionSegmentSuggestions } from "../src/features/dashboard/database/__generated__/dashboard.queries.js";

test("promotion confirmation reuses one bounded analysis id", () => {
  const first = promotionConfirmationAnalysisId("project-1", "promotion-1");
  const repeated = promotionConfirmationAnalysisId("project-1", "promotion-1");
  const otherPromotion = promotionConfirmationAnalysisId("project-1", "promotion-2");

  assert.equal(first, repeated);
  assert.notEqual(first, otherPromotion);
});

test("promotion confirmation accepts current-analysis suggestions and active manual ids", () => {
  const parsed = DashboardConfirmSegmentSuggestionsRequestSchema.parse({
    analysis_id: "analysis_recommend_001",
    segment_ids: ["seg_manual"],
    suggestion_ids: ["suggestion_destination"]
  });

  assert.deepEqual(parsed.segment_ids, ["seg_manual"]);
  assert.deepEqual(parsed.suggestion_ids, ["suggestion_destination"]);
  assert.throws(() =>
    DashboardConfirmSegmentSuggestionsRequestSchema.parse({
      analysis_id: null,
      segment_ids: [],
      suggestion_ids: []
    })
  );
  assert.throws(() =>
    DashboardConfirmSegmentSuggestionsRequestSchema.parse({
      analysis_id: null,
      segment_ids: [],
      suggestion_ids: ["suggestion_destination"]
    })
  );
  assert.throws(() =>
    DashboardConfirmSegmentSuggestionsRequestSchema.parse({
      analysis_id: "analysis_recommend_001",
      segment_ids: [],
      suggestion_ids: ["suggestion_destination", "suggestion_destination"]
    })
  );
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
  assert.match(confirmationSql, /status = 'approved'/);
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

test("V2 confirmation generated query binds parameters at valid SQL positions", async () => {
  let executedSql = "";
  let executedValues: unknown[] = [];

  await confirmDashboardV2PromotionSegmentSuggestions.run(
    {
      confirmationAnalysisId: "analysis-confirmed",
      confirmedBy: "operator-1",
      projectId: "project-1",
      promotionId: "promotion-1",
      sourceAnalysisId: "analysis-source",
      suggestionIds: ["suggestion-1", "suggestion-2"]
    },
    {
      query: async (sql: string, values: unknown[]) => {
        executedSql = sql;
        executedValues = values;
        return { rowCount: 0, rows: [] };
      }
    } as never
  );

  assert.match(executedSql, /pss\.project_id = \$1/);
  assert.match(executedSql, /pss\.promotion_id = \$2/);
  assert.match(executedSql, /pss\.analysis_id = \$3/);
  assert.match(executedSql, /pss\.suggestion_id = ANY\(\$4\)/);
  assert.match(executedSql, /confirmed_by = \$5/);
  assert.match(executedSql, /target\.analysis_id = \$6/);
  assert.doesNotMatch(executedSql, /\$\d+[A-Za-z_]/);
  assert.deepEqual(executedValues, [
    "project-1",
    "promotion-1",
    "analysis-source",
    ["suggestion-1", "suggestion-2"],
    "operator-1",
    "analysis-confirmed"
  ]);
});

test("removing a target segment stops downstream work and releases its audience reservation", () => {
  const dashboardSql = readFileSync(
    new URL("../src/features/dashboard/database/dashboard.sql", import.meta.url),
    "utf8"
  );
  const queryStart = dashboardSql.indexOf("/* @name StopDashboardPromotionTargetSegment */");
  const queryEnd = dashboardSql.indexOf("/* @name InsertDashboardNextLoopAnalysis */", queryStart);
  const stopSegmentSql = dashboardSql.slice(queryStart, queryEnd);

  assert.match(
    stopSegmentSql,
    /SELECT project_id, promotion_id, segment_id, analysis_id,\s+audience_snapshot_id, allocation_plan_id,\s+audience_reservation_state\s+FROM promotion_target_segments/
  );
  assert.match(stopSegmentSql, /legacy_target AS \([\s\S]*audience_snapshot_id IS NULL/);
  assert.match(stopSegmentSql, /snapshot_target AS \([\s\S]*audience_snapshot_id IS NOT NULL/);
  assert.match(stopSegmentSql, /UPDATE generation_runs gr[\s\S]*SET status = 'failed'/);
  assert.match(stopSegmentSql, /last_error_code = 'generation_invalidated_by_segment_change'/);
  assert.match(stopSegmentSql, /worker_id = NULL,[\s\S]*lease_expires_at = NULL/);
  assert.match(
    stopSegmentSql,
    /archived_generation_content_candidates AS \([\s\S]*UPDATE content_candidates cc[\s\S]*SET status = 'archived'/
  );
  assert.match(stopSegmentSql, /cc\.generation_id = gr\.generation_id/);
  assert.match(stopSegmentSql, /cc\.segment_id <> target\.segment_id/);
  assert.match(
    stopSegmentSql,
    /stopped_snapshot_experiments AS \([\s\S]*UPDATE ad_experiments ae[\s\S]*SET status = 'stopped'/
  );
  assert.match(
    stopSegmentSql,
    /stopped_snapshot_target AS \([\s\S]*UPDATE promotion_target_segments pts[\s\S]*SET status = 'stopped'/
  );
  assert.match(
    stopSegmentSql,
    /@name ReleaseDashboardPromotionTargetAudience[\s\S]*advance_promotion_audience_exclusion_revision/
  );
  assert.match(
    stopSegmentSql,
    /released_exclusion_members AS \([\s\S]*SET state = 'released'[\s\S]*excluded\.state IN \('reserved', 'consumed'\)/
  );
  assert.match(
    stopSegmentSql,
    /excluded\.target_analysis_id = advanced\.analysis_id[\s\S]*excluded\.final_snapshot_id = advanced\.audience_snapshot_id/
  );
  assert.match(
    stopSegmentSql,
    /released_target AS \([\s\S]*SET audience_reservation_state = 'released'/
  );
  assert.match(
    stopSegmentSql,
    /@name ReleaseDashboardPromotionAllocationPlan[\s\S]*plan\.status IN \('finalized', 'locked'\)/
  );
  assert.match(
    stopSegmentSql,
    /promotion_run_target_bindings binding[\s\S]*binding\.allocation_plan_id = plan\.allocation_plan_id/
  );
  assert.match(
    stopSegmentSql,
    /other\.status <> 'stopped'[\s\S]*other\.audience_reservation_state <> 'released'/
  );
  assert.doesNotMatch(stopSegmentSql, /DELETE FROM promotion_run_target_bindings/);
  assert.doesNotMatch(stopSegmentSql, /DELETE FROM ad_experiment_units/);
  assert.doesNotMatch(stopSegmentSql, /DELETE FROM user_segment_assignments/);
});
