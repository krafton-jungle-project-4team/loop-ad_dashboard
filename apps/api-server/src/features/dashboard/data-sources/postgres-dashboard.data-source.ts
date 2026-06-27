import { Injectable } from "@nestjs/common";
import {
  AiJobResultPayloadSchema,
  type AiJobKind,
  type AiJobResult,
  type AiJobStatus
} from "@loopad/shared";
import { postgres } from "../../../infra/database/postgres.js";

type RecommendationResultRow = {
  id: string;
  kind: AiJobKind;
  status: AiJobStatus;
  result_payload: unknown;
  error_message: string | null;
  created_at: Date;
  completed_at: Date | null;
};

@Injectable()
export class PostgresDashboardDataSource {
  async getAiResult(resultId: string): Promise<AiJobResult | undefined> {
    const table = await postgres.query<{ exists: boolean }>(
      "SELECT to_regclass('public.recommendation_results') IS NOT NULL AS exists"
    );
    if (!table.rows[0]?.exists) {
      return undefined;
    }

    const result = await postgres.query<RecommendationResultRow>(
      `
        SELECT id, kind, status, result_payload, error_message, created_at, completed_at
        FROM recommendation_results
        WHERE id = $1
      `,
      [resultId]
    );
    const row = result.rows[0];
    if (!row) {
      return undefined;
    }
    return {
      resultId: row.id,
      kind: row.kind,
      status: row.status,
      result: row.result_payload ? AiJobResultPayloadSchema.parse(row.result_payload) : undefined,
      errorMessage: row.error_message ?? undefined,
      createdAt: row.created_at.toISOString(),
      completedAt: row.completed_at?.toISOString()
    };
  }
}
