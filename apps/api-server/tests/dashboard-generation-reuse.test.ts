import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getDashboardPromotionGenerationResult } from "../src/features/dashboard/database/__generated__/dashboard.queries.js";

test("promotion generation is reused only for the current approved target segments", () => {
  const dashboardSql = readFileSync(
    new URL("../src/features/dashboard/database/dashboard.sql", import.meta.url),
    "utf8"
  );
  const queryStart = dashboardSql.indexOf("/* @name GetDashboardPromotionGenerationResult */");
  const queryEnd = dashboardSql.indexOf(
    "/* @name ListDashboardCampaignAdExperiments */",
    queryStart
  );
  const generationResultSql = dashboardSql.slice(queryStart, queryEnd);

  assert.match(
    generationResultSql,
    /jsonb_typeof\(gr\.input_json -> 'target_segment_ids'\) = 'array'/
  );
  assert.match(
    generationResultSql,
    /jsonb_array_length\(gr\.input_json -> 'target_segment_ids'\) = \([\s\S]*SELECT COUNT\(\*\)::int/
  );
  assert.match(generationResultSql, /pts\.analysis_id = gr\.analysis_id/);
  assert.match(generationResultSql, /pts\.status = 'approved'/);
  assert.match(
    generationResultSql,
    /NOT \(gr\.input_json -> 'target_segment_ids' \? pts\.segment_id\)/
  );
});

test("generated promotion generation query includes the target segment guard", async () => {
  let executedSql = "";
  let executedValues: unknown[] = [];

  await getDashboardPromotionGenerationResult.run(
    {
      analysisId: "analysis-1",
      projectId: "project-1",
      promotionId: "promotion-1"
    },
    {
      query: async (sql: string, values: unknown[]) => {
        executedSql = sql;
        executedValues = values;
        return { rowCount: 0, rows: [] };
      }
    } as never
  );

  assert.match(executedSql, /jsonb_array_length\(gr\.input_json -> 'target_segment_ids'\)/);
  assert.match(executedSql, /pts\.status = 'approved'/);
  assert.match(executedSql, /gr\.project_id = \$1/);
  assert.match(executedSql, /gr\.promotion_id = \$2/);
  assert.match(executedSql, /gr\.analysis_id = \$3/);
  assert.deepEqual(executedValues, ["project-1", "promotion-1", "analysis-1"]);
});
