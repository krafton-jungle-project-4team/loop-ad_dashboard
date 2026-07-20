import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { Pool } from "pg";
import { stopDashboardPromotion } from "../src/features/dashboard/database/__generated__/dashboard.queries.js";
import {
  scheduleDashboardPromotionRunEvaluation,
  scheduleDashboardPromotionRunLaunch,
  syncPendingDashboardPromotionAutomationJobs
} from "../src/features/dashboard/database/__generated__/promotion-automation.queries.js";
import { createTxDb } from "../src/infra/database/tx.js";

const databaseUrl = process.env.DASHBOARD_POSTGRES_TEST_URL;

test(
  "promotion automation SQL reschedules, revives, and cancels durable jobs",
  { skip: databaseUrl ? false : "DASHBOARD_POSTGRES_TEST_URL is not configured" },
  async () => {
    const pool = new Pool({ connectionString: databaseUrl });
    const client = await pool.connect();
    const suffix = randomUUID();
    const projectId = `automation-project-${suffix}`;
    const campaignId = `automation-campaign-${suffix}`;
    const promotionId = `automation-promotion-${suffix}`;
    const analysisId = `automation-analysis-${suffix}`;
    const generationId = `automation-generation-${suffix}`;
    const promotionRunId = `automation-run-${suffix}`;

    try {
      await client.query("BEGIN");
      await client.query(
        `
          INSERT INTO projects (project_id, project_name, domain, write_key)
          VALUES ($1, 'Automation SQL Test', 'https://example.com', $2)
        `,
        [projectId, `automation-write-key-${suffix}`]
      );
      await client.query(
        `
          INSERT INTO campaigns (campaign_id, project_id, name, status)
          VALUES ($1, $2, 'Automation SQL Test', 'active')
        `,
        [campaignId, projectId]
      );
      await client.query(
        `
          INSERT INTO promotions (
            promotion_id,
            project_id,
            campaign_id,
            channel,
            goal_metric,
            goal_target_value,
            goal_basis,
            execution_mode,
            scheduled_start_at,
            scheduled_end_at,
            loop_interval_unit,
            loop_interval_value,
            status
          )
          VALUES (
            $1,
            $2,
            $3,
            'onsite_banner',
            'booking_conversion_rate',
            0.1,
            'promotion_average',
            'automatic',
            now() + interval '2 hours',
            now() + interval '2 days',
            'hour',
            2,
            'approved'
          )
        `,
        [promotionId, projectId, campaignId]
      );
      await client.query(
        `
          INSERT INTO promotion_analyses (
            analysis_id,
            project_id,
            campaign_id,
            promotion_id,
            status
          )
          VALUES ($1, $2, $3, $4, 'completed')
        `,
        [analysisId, projectId, campaignId, promotionId]
      );
      await client.query(
        `
          INSERT INTO generation_runs (
            generation_id,
            analysis_id,
            project_id,
            campaign_id,
            promotion_id,
            status,
            started_at,
            finished_at
          )
          VALUES ($1, $2, $3, $4, $5, 'completed', now(), now())
        `,
        [generationId, analysisId, projectId, campaignId, promotionId]
      );
      await client.query(
        `
          INSERT INTO promotion_runs (
            promotion_run_id,
            project_id,
            campaign_id,
            promotion_id,
            analysis_id,
            generation_id,
            segment_scope_json,
            segment_scope_fingerprint
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            '["segment-a"]'::jsonb,
            encode(digest(convert_to('["segment-a"]', 'UTF8'), 'sha256'), 'hex')
          )
        `,
        [promotionRunId, projectId, campaignId, promotionId, analysisId, generationId]
      );

      const db = createTxDb(client);
      const launch = await db
        .query(scheduleDashboardPromotionRunLaunch, {
          jobId: `launch-${suffix}`,
          projectId,
          promotionRunId
        })
        .single();
      assert.equal(launch.jobStatus, "pending");
      assert.equal(launch.executionMode, "automatic");

      await client.query(
        `
          UPDATE promotions
          SET execution_mode = 'manual', scheduled_start_at = NULL
          WHERE promotion_id = $1
        `,
        [promotionId]
      );
      const cancelled = await db
        .query(syncPendingDashboardPromotionAutomationJobs, { projectId, promotionId })
        .multiple();
      assert.deepEqual(
        cancelled.map((row) => row.status),
        ["cancelled"]
      );

      await client.query(
        `
          UPDATE promotions
          SET
            execution_mode = 'automatic',
            scheduled_start_at = now() + interval '3 hours',
            loop_interval_value = 4
          WHERE promotion_id = $1
        `,
        [promotionId]
      );
      const revived = await db
        .query(syncPendingDashboardPromotionAutomationJobs, { projectId, promotionId })
        .multiple();
      assert.deepEqual(
        revived.map((row) => row.status),
        ["pending"]
      );
      assert.ok(revived[0]?.scheduledAt.getTime() > Date.now() + 2.5 * 60 * 60 * 1_000);

      const evaluation = await db
        .query(scheduleDashboardPromotionRunEvaluation, {
          jobId: `evaluation-${suffix}`,
          promotionRunId
        })
        .single();
      assert.equal(evaluation.status, "pending");
      assert.ok(evaluation.scheduledAt.getTime() > Date.now() + 3.5 * 60 * 60 * 1_000);

      await db.query(stopDashboardPromotion, { projectId, promotionId }).single();
      const stoppedJobs = await client.query<{ status: string }>(
        `
          SELECT status
          FROM promotion_automation_jobs
          WHERE promotion_run_id = $1
          ORDER BY job_type
        `,
        [promotionRunId]
      );
      assert.deepEqual(
        stoppedJobs.rows.map((row) => row.status),
        ["cancelled", "cancelled"]
      );
    } finally {
      await client.query("ROLLBACK");
      client.release();
      await pool.end();
    }
  }
);
