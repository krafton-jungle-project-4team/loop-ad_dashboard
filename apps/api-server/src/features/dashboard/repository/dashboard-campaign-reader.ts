import type { DashboardCampaignSummary } from "@loopad/shared";
import { Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";
import { PG_POOL } from "../../../infra/database/index.js";

type CampaignSummaryRow = {
  campaign_id: string;
  campaign_name: string;
  objective: string | null;
  primary_metric: string | null;
  status: string;
  start_date: Date | string | null;
  end_date: Date | string | null;
  promotion_count: number | string | null;
  segment_count: number | string | null;
  ad_experiment_count: number | string | null;
  latest_goal_achievement_rate: number | string | null;
  updated_at: Date | string;
};

@Injectable()
export class DashboardCampaignReader {
  constructor(
    @Inject(PG_POOL)
    private readonly postgres: Pool
  ) {}

  async listCampaigns(projectId: string): Promise<DashboardCampaignSummary[]> {
    const result = await this.postgres.query<CampaignSummaryRow>(
      `
        SELECT
          c.campaign_id,
          c.name AS campaign_name,
          c.objective,
          c.primary_metric,
          c.status,
          c.start_date,
          c.end_date,
          COUNT(DISTINCT p.promotion_id)::int AS promotion_count,
          COUNT(DISTINCT pts.segment_id)::int AS segment_count,
          COUNT(DISTINCT ae.ad_experiment_id)::int AS ad_experiment_count,
          MAX(pe.actual_value)::float8 AS latest_goal_achievement_rate,
          c.updated_at
        FROM campaigns c
        LEFT JOIN promotions p
          ON p.campaign_id = c.campaign_id
        LEFT JOIN promotion_target_segments pts
          ON pts.campaign_id = c.campaign_id
        LEFT JOIN ad_experiments ae
          ON ae.campaign_id = c.campaign_id
        LEFT JOIN promotion_evaluations pe
          ON pe.campaign_id = c.campaign_id
        WHERE c.project_id = $1
        GROUP BY c.campaign_id
        ORDER BY c.updated_at DESC, c.created_at DESC
      `,
      [projectId]
    );

    return result.rows.map(toCampaignSummary);
  }
}

function toCampaignSummary(row: CampaignSummaryRow): DashboardCampaignSummary {
  return {
    campaign_id: row.campaign_id,
    campaign_name: row.campaign_name,
    objective: row.objective,
    primary_metric: row.primary_metric,
    status: row.status,
    start_date: formatDate(row.start_date),
    end_date: formatDate(row.end_date),
    promotion_count: countValue(row.promotion_count),
    segment_count: countValue(row.segment_count),
    ad_experiment_count: countValue(row.ad_experiment_count),
    latest_goal_achievement_rate: nullableRate(row.latest_goal_achievement_rate),
    updated_at: formatDateTime(row.updated_at)
  };
}

function countValue(value: number | string | null): number {
  return Math.max(0, Math.trunc(numberValue(value)));
}

function nullableRate(value: number | string | null): number | null {
  return value === null ? null : Math.min(Math.max(numberValue(value), 0), 1);
}

function numberValue(value: number | string | null): number {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function formatDate(value: Date | string | null): string | null {
  if (!value) {
    return null;
  }
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}

function formatDateTime(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}
