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
        campaign_id: requiredText(row.campaignId, "campaignId"),
        display_name: requiredText(row.displayName, "displayName"),
        entity_id: requiredText(row.entityId, "entityId"),
        entity_type: requiredText(row.entityType, "entityType") as DashboardEntityType,
        promotion_id: row.promotionId,
        segment_id: row.segmentId,
        status: requiredText(row.status, "status"),
        updated_at: requiredDate(row.updatedAt, "updatedAt").toISOString()
      }))
    };
  }
}

function requiredText(value: string | null, field: string): string {
  if (!value) {
    throw new Error(`Entity search returned an empty ${field}.`);
  }
  return value;
}

function requiredDate(value: Date | null, field: string): Date {
  if (!value) {
    throw new Error(`Entity search returned an empty ${field}.`);
  }
  return value;
}
