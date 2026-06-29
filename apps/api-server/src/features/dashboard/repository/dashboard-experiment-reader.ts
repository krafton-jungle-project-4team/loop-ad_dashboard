import type { DashboardExperiment, DashboardExperimentActionProbability } from "@loopad/shared";
import { Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";
import { PG_POOL } from "../../../infra/database/index.js";

type ExperimentRow = {
  experiment_id: string;
  project_id: string;
  segment_id: string;
  segment_hash: string;
  recommendation_id: string;
  recommendation_action_id: string;
  bandit_policy_id: string | null;
  bandit_arm_id: string | null;
  action_id: string;
  action_type: string;
  status: string;
  goal_metric: string | null;
  started_at: Date | null;
  ended_at: Date | null;
  created_at: Date;
};

type ExperimentActionProbabilityRow = {
  action_id: string;
  action_name: string;
  probability: number | string;
  impressions: number | string;
  clicks: number | string;
  purchases: number | string;
  updated_at: Date;
};

@Injectable()
export class DashboardExperimentReader {
  constructor(
    @Inject(PG_POOL)
    private readonly db: Pool
  ) {}

  async readExperiment(
    projectId: string,
    experimentId: string
  ): Promise<DashboardExperiment | null> {
    const experiment = await this.db.query<ExperimentRow>(
      `
        SELECT
          e.id::text AS experiment_id,
          e.project_id,
          e.segment_hash AS segment_id,
          e.segment_hash,
          e.recommendation_result_id::text AS recommendation_id,
          e.recommendation_action_id::text AS recommendation_action_id,
          e.bandit_policy_id::text AS bandit_policy_id,
          e.bandit_arm_id::text AS bandit_arm_id,
          e.action_id,
          e.action_type,
          e.status,
          e.primary_metric AS goal_metric,
          e.started_at,
          e.ended_at,
          e.created_at
        FROM experiments e
        WHERE e.project_id = $1
          AND e.id::text = $2
      `,
      [projectId, experimentId]
    );
    const row = experiment.rows[0];
    if (!row) {
      return null;
    }

    return {
      experiment_id: row.experiment_id,
      project_id: row.project_id,
      segment_id: row.segment_id,
      segment_hash: row.segment_hash,
      recommendation_id: row.recommendation_id,
      recommendation_action_id: row.recommendation_action_id,
      bandit_policy_id: row.bandit_policy_id,
      bandit_arm_id: row.bandit_arm_id,
      action_id: row.action_id,
      action_type: row.action_type,
      status: row.status,
      goal_metric: row.goal_metric ?? "purchase_rate",
      started_at: row.started_at?.toISOString() ?? null,
      ended_at: row.ended_at?.toISOString() ?? null,
      created_at: row.created_at.toISOString(),
      action_probabilities: row.bandit_policy_id
        ? await this.readExperimentActionProbabilities(row.bandit_policy_id)
        : []
    };
  }

  private async readExperimentActionProbabilities(
    banditPolicyId: string
  ): Promise<DashboardExperimentActionProbability[]> {
    const result = await this.db.query<ExperimentActionProbabilityRow>(
      `
        WITH arm_scores AS (
          SELECT
            ba.action_id,
            COALESCE(ac.title, ba.action_id) AS action_name,
            ba.alpha / NULLIF(ba.alpha + ba.beta, 0) AS score,
            ba.impressions,
            0::bigint AS clicks,
            ba.conversions AS purchases,
            ba.updated_at
          FROM bandit_arms ba
          LEFT JOIN action_catalog ac
            ON ac.action_id = ba.action_id
          WHERE ba.bandit_policy_id::text = $1
            AND ba.status = 'active'
        )
        SELECT
          action_id,
          action_name,
          CASE
            WHEN SUM(score) OVER () > 0 THEN score / SUM(score) OVER ()
            ELSE 0
          END AS probability,
          impressions,
          clicks,
          purchases,
          updated_at
        FROM arm_scores
        ORDER BY probability DESC, action_id ASC
      `,
      [banditPolicyId]
    );

    return result.rows.map((row) => ({
      action_id: row.action_id,
      action_name: row.action_name,
      probability: Number(row.probability),
      impressions: Number(row.impressions),
      clicks: Number(row.clicks),
      purchases: Number(row.purchases),
      updated_at: row.updated_at.toISOString()
    }));
  }
}
