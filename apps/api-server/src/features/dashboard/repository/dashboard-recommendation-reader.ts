import { InjectTransaction, type Transaction } from "@nestjs-cls/transactional";
import { Injectable } from "@nestjs/common";
import { PgTypedTransactionalAdapter } from "../../../infra/database/index.js";
import {
  listRecommendationContexts,
  type IListRecommendationContextsResult
} from "../database/__generated__/dashboard.queries.js";

export type RecommendationContextRow = IListRecommendationContextsResult;

@Injectable()
export class DashboardRecommendationReader {
  constructor(
    @InjectTransaction()
    private readonly db: Transaction<PgTypedTransactionalAdapter>
  ) {}

  async readRecommendationContexts(projectId: string): Promise<RecommendationContextRow[]> {
    return this.db.query(listRecommendationContexts, { projectId }).multiple();
  }
}
