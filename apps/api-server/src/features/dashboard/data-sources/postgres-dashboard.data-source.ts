import { Injectable } from "@nestjs/common";
import type {
  DashboardExperiment,
  DashboardExperimentActionProbability,
  DashboardRecommendation
} from "@loopad/shared";
import { postgres } from "../../../infra/database/postgres.js";

type RecommendationRow = {
  recommendation_id: string;
  segment_id: string;
  title: string;
  reason: string;
  status: string;
  created_at: Date;
  action_id: string | null;
  action_type: string | null;
  action_name: string | null;
  description: string | null;
  content_id: string | null;
  content_url: string | null;
  content_created_at: Date | null;
};

type ExperimentRow = {
  experiment_id: string;
  project_id: string;
  segment_id: string;
  recommendation_id: string;
  status: string;
  goal_metric: string;
  target_value: number | string;
  winner_action_id: string | null;
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
export class PostgresDashboardDataSource {
  async readRecommendations(projectId: string): Promise<DashboardRecommendation[]> {
    const result = await postgres.query<RecommendationRow>(
      `
        SELECT
          r.id AS recommendation_id,
          r.segment_id,
          r.title,
          r.reason,
          r.status,
          r.created_at,
          ra.id AS action_id,
          ra.action_type,
          ra.action_name,
          ra.description,
          gc.id AS content_id,
          gc.content_url,
          gc.created_at AS content_created_at
        FROM recommendations r
        LEFT JOIN recommendation_actions ra
          ON ra.recommendation_id = r.id
        LEFT JOIN LATERAL (
          SELECT id, content_url, created_at
          FROM generated_contents
          WHERE project_id = r.project_id
            AND recommendation_id = r.id
            AND action_id = ra.id
          ORDER BY created_at DESC
          LIMIT 1
        ) gc ON true
        WHERE r.project_id = $1
        ORDER BY r.created_at DESC, ra.created_at ASC
      `,
      [projectId]
    );

    const recommendations = new Map<string, DashboardRecommendation>();

    for (const row of result.rows) {
      const recommendation = recommendations.get(row.recommendation_id) ?? {
        recommendation_id: row.recommendation_id,
        segment_id: row.segment_id,
        title: row.title,
        reason: row.reason,
        status: row.status,
        created_at: row.created_at.toISOString(),
        actions: []
      };

      if (row.action_id && row.action_type && row.action_name && row.description) {
        recommendation.actions.push({
          action_id: row.action_id,
          action_type: row.action_type,
          action_name: row.action_name,
          description: row.description,
          content:
            row.content_id && row.content_url && row.content_created_at
              ? {
                  content_id: row.content_id,
                  content_url: row.content_url,
                  created_at: row.content_created_at.toISOString()
                }
              : null
        });
      }

      recommendations.set(row.recommendation_id, recommendation);
    }

    return Array.from(recommendations.values());
  }

  async readExperiment(
    projectId: string,
    experimentId: string
  ): Promise<DashboardExperiment | null> {
    const experiment = await postgres.query<ExperimentRow>(
      `
        SELECT
          id AS experiment_id,
          project_id,
          segment_id,
          recommendation_id,
          status,
          goal_metric,
          target_value,
          winner_action_id,
          started_at,
          ended_at,
          created_at
        FROM experiments
        WHERE project_id = $1
          AND id = $2
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
      recommendation_id: row.recommendation_id,
      status: row.status,
      goal_metric: row.goal_metric,
      target_value: Number(row.target_value),
      winner_action_id: row.winner_action_id,
      started_at: row.started_at?.toISOString() ?? null,
      ended_at: row.ended_at?.toISOString() ?? null,
      created_at: row.created_at.toISOString(),
      action_probabilities: await this.readExperimentActionProbabilities(
        row.recommendation_id,
        row.experiment_id
      )
    };
  }

  private async readExperimentActionProbabilities(
    recommendationId: string,
    experimentId: string
  ): Promise<DashboardExperimentActionProbability[]> {
    const result = await postgres.query<ExperimentActionProbabilityRow>(
      `
        SELECT
          eap.action_id,
          ra.action_name,
          eap.probability,
          eap.impressions,
          eap.clicks,
          eap.purchases,
          eap.updated_at
        FROM experiment_action_probs eap
        INNER JOIN recommendation_actions ra
          ON ra.id = eap.action_id
          AND ra.recommendation_id = $1
        WHERE eap.experiment_id = $2
        ORDER BY eap.probability DESC, eap.action_id ASC
      `,
      [recommendationId, experimentId]
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
