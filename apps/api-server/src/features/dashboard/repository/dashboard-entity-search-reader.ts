import type {
  DashboardEntitySearchResponse,
  DashboardEntitySearchType,
  DashboardEntityType
} from "@loopad/shared";
import { InjectTransaction, type Transaction } from "@nestjs-cls/transactional";
import { Injectable } from "@nestjs/common";
import { PgTypedTransactionalAdapter } from "../../../infra/database/pgtyped-transactional.adapter.js";
import { searchDashboardEntities } from "../database/__generated__/entity-search.queries.js";

@Injectable()
export class DashboardEntitySearchReader {
  constructor(
    @InjectTransaction()
    private readonly db: Transaction<PgTypedTransactionalAdapter>
  ) {}

  async search(
    projectId: string,
    query: string,
    entityType: DashboardEntitySearchType
  ): Promise<DashboardEntitySearchResponse> {
    const rows = await this.db
      .query(searchDashboardEntities, { entityType, projectId, query })
      .multiple();

    return {
      results: rows.map((row) => ({
        campaign_id: row.campaignId,
        display_name: row.displayName,
        entity_id: row.entityId,
        entity_type: row.entityType as DashboardEntityType,
        promotion_id: row.promotionId,
        segment_id: row.segmentId,
        status: row.status,
        updated_at: row.updatedAt.toISOString()
      }))
    };
  }
}
