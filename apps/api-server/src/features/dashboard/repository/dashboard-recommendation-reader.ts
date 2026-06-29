import { Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";
import { PG_POOL } from "../../../infra/database/index.js";

export type RecommendationContextRow = {
  recommendation_result_id: string;
  segment_hash: string;
  segment_json: Record<string, unknown>;
  status: string;
  anomaly_json: Record<string, unknown>;
  root_causes_json: Record<string, unknown>;
  summary_message: string | null;
  created_at: Date;
  action_id: string | null;
  action_type: string | null;
  action_title: string | null;
  action_description: string | null;
  action_rationale: string | null;
  action_status: string | null;
  sampled_value: number | null;
  creative_id: string | null;
  creative_type: string | null;
  creative_title: string | null;
  creative_message: string | null;
  image_url: string | null;
  landing_url: string | null;
  creative_status: string | null;
  creative_created_at: Date | null;
};

@Injectable()
export class DashboardRecommendationReader {
  constructor(
    @Inject(PG_POOL)
    private readonly db: Pool
  ) {}

  async readRecommendationContexts(projectId: string): Promise<RecommendationContextRow[]> {
    const result = await this.db.query<RecommendationContextRow>(
      `
        SELECT
          rr.id::text AS recommendation_result_id,
          rr.segment_hash,
          rr.segment_json,
          rr.status,
          rr.anomaly_json,
          rr.root_causes_json,
          rr.summary_message,
          rr.created_at,
          ra.action_id,
          ra.action_type,
          COALESCE(ra.title, ac.title, ra.action_id) AS action_title,
          COALESCE(ra.description, ac.description, '') AS action_description,
          COALESCE(ra.rationale, '') AS action_rationale,
          ra.status AS action_status,
          ra.sampled_value,
          adc.id::text AS creative_id,
          adc.creative_type,
          adc.title AS creative_title,
          adc.message AS creative_message,
          adc.image_url,
          adc.landing_url,
          adc.status AS creative_status,
          adc.created_at AS creative_created_at
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
        ORDER BY rr.created_at DESC, ra.priority_score DESC NULLS LAST, ra.created_at ASC
      `,
      [projectId]
    );
    return result.rows;
  }
}
