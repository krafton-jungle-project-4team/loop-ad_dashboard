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

  async readRecommendationContexts(
    projectId: string,
    analysisDate: string | undefined
  ): Promise<RecommendationContextRow[]> {
    return this.db
      .query(listRecommendationContexts, {
        analysisDate: normalizeAnalysisDate(analysisDate),
        projectId
      })
      .multiple();
  }
}

function normalizeAnalysisDate(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}
