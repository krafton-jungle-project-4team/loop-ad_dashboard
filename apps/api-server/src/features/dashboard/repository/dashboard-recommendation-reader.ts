import type { DashboardRecommendation } from "@loopad/shared";
import { InjectTransaction, type Transaction } from "@nestjs-cls/transactional";
import { Injectable } from "@nestjs/common";
import { type PgTypedTransactionalAdapter } from "../../../infra/database/index.js";
import { listRecommendationRows } from "../database/__generated__/dashboard.queries.js";

@Injectable()
export class DashboardRecommendationReader {
  constructor(
    @InjectTransaction()
    private readonly db: Transaction<PgTypedTransactionalAdapter>
  ) {}

  async readRecommendations(
    projectId: string,
    recommendationResultId?: string
  ): Promise<DashboardRecommendation[]> {
    const rows = await this.db
      .query(listRecommendationRows, {
        projectId,
        recommendationResultId: recommendationResultId ?? null
      })
      .multiple();

    const recommendations = new Map<string, DashboardRecommendation>();

    for (const row of rows) {
      const recommendation = recommendations.get(row.recommendationId) ?? {
        recommendation_id: row.recommendationId,
        segment_id: row.segmentId,
        title: row.title ?? `Recommendation ${row.recommendationId}`,
        reason: row.reason ?? "",
        status: row.status,
        created_at: row.createdAt.toISOString(),
        actions: []
      };

      if (row.actionId && row.actionType && row.actionName) {
        recommendation.actions.push({
          action_id: row.actionId,
          action_type: row.actionType,
          action_name: row.actionName,
          description: row.description ?? "",
          content:
            row.contentId && row.contentUrl && row.contentCreatedAt
              ? {
                  content_id: row.contentId,
                  content_url: row.contentUrl,
                  created_at: row.contentCreatedAt.toISOString()
                }
              : null
        });
      }

      recommendations.set(row.recommendationId, recommendation);
    }

    return Array.from(recommendations.values());
  }
}
