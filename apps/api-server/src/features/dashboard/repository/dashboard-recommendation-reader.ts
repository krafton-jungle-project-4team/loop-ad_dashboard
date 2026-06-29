import type { DashboardRecommendation } from "@loopad/shared";
import { Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";
import { PG_POOL } from "../../../infra/database/index.js";

type RecommendationRow = {
  recommendation_id: string;
  segment_id: string;
  title: string | null;
  reason: string | null;
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

@Injectable()
export class DashboardRecommendationReader {
  constructor(
    @Inject(PG_POOL)
    private readonly db: Pool
  ) {}

  async readRecommendations(
    projectId: string,
    recommendationResultId?: string
  ): Promise<DashboardRecommendation[]> {
    const result = await this.db.query<RecommendationRow>(
      `
        SELECT
          rr.id::text AS recommendation_id,
          rr.segment_hash AS segment_id,
          rr.summary_message AS title,
          COALESCE(ra.rationale, rr.root_causes_json::text) AS reason,
          rr.status,
          rr.created_at,
          ra.action_id,
          ra.action_type,
          COALESCE(ra.title, ac.title, ra.action_id) AS action_name,
          COALESCE(ra.description, ac.description, '') AS description,
          adc.id::text AS content_id,
          adc.image_url AS content_url,
          adc.created_at AS content_created_at
        FROM recommendation_results rr
        LEFT JOIN recommendation_actions ra
          ON ra.recommendation_result_id = rr.id
        LEFT JOIN action_catalog ac
          ON ac.action_id = ra.action_id
        LEFT JOIN segment_ad_mappings sam
          ON sam.recommendation_action_id = ra.id
        LEFT JOIN ad_creatives adc
          ON adc.id = sam.creative_id
        WHERE rr.project_id = $1
          AND ($2::text IS NULL OR rr.id::text = $2)
        ORDER BY rr.created_at DESC, ra.created_at ASC
      `,
      [projectId, recommendationResultId ?? null]
    );

    const recommendations = new Map<string, DashboardRecommendation>();

    for (const row of result.rows) {
      const recommendation = recommendations.get(row.recommendation_id) ?? {
        recommendation_id: row.recommendation_id,
        segment_id: row.segment_id,
        title: row.title ?? `Recommendation ${row.recommendation_id}`,
        reason: row.reason ?? "",
        status: row.status,
        created_at: row.created_at.toISOString(),
        actions: []
      };

      if (row.action_id && row.action_type && row.action_name) {
        recommendation.actions.push({
          action_id: row.action_id,
          action_type: row.action_type,
          action_name: row.action_name,
          description: row.description ?? "",
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
}
