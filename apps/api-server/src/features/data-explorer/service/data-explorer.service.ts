import { Inject, Injectable } from "@nestjs/common";
import {
  DataExplorerAiChatResponseSchema,
  DataExplorerAiQueryPlanResponseSchema,
  DataExplorerObjectDdlSchema,
  DataExplorerObjectDetailSchema,
  DataExplorerObjectsResponseSchema,
  DataExplorerQueryRunResponseSchema,
  DataExplorerSourcesResponseSchema,
  type DataExplorerAiChatRequest,
  type DataExplorerAiQueryPlanRequest,
  type DataExplorerObjectRef,
  type DataExplorerQueryRunRequest,
  type DataExplorerSourceId
} from "@loopad/shared";
import { suggestVisualizations } from "../domain/chart-suggester.domain.js";
import { DataExplorerDomain } from "../domain/index.js";
import { inferDataExplorerSourceId } from "../domain/query-plan.domain.js";
import { normalizeQueryBounds, validateSqlInput } from "../domain/sql-safety.domain.js";
import { dataExplorerErrors } from "../errors.js";
import { OpenAiDataExplorerQueryPlannerProvider } from "../provider/openai-query-planner.provider.js";
import { ClickHouseEventsReader } from "../repository/clickhouse-events-reader.js";
import { createDataExplorerLiveMetadata } from "../repository/data-explorer-live-metadata.js";
import type {
  DataExplorerSourceReader,
  ListObjectsInput
} from "../repository/data-explorer-source-reader.js";
import { PostgresContractReader } from "../repository/postgres-contract-reader.js";

/**
 * Data Explorer의 스키마 조회, SQL 실행, AI 질의를 조율한다.
 *
 * SQL 해석은 코드에서 과하게 판단하지 않고, AI와 DB 읽기 전용 설정에 맡긴다.
 */
@Injectable()
export class DataExplorerService {
  constructor(
    @Inject(PostgresContractReader)
    private readonly postgresContract: PostgresContractReader,
    @Inject(ClickHouseEventsReader)
    private readonly clickHouseEvents: ClickHouseEventsReader,
    @Inject(OpenAiDataExplorerQueryPlannerProvider)
    private readonly openAiQueryPlanner: OpenAiDataExplorerQueryPlannerProvider
  ) {}

  sources() {
    return DataExplorerSourcesResponseSchema.parse({
      sources: DataExplorerDomain.sources()
    });
  }

  async listObjects(input: ListObjectsInput) {
    const reader = this.reader(input.sourceId);

    try {
      return DataExplorerObjectsResponseSchema.parse({
        source_id: reader.sourceId,
        objects: await reader.listObjects(input),
        ...createDataExplorerLiveMetadata()
      });
    } catch (error) {
      throw dataExplorerErrors.schemaInspectionFailed({ cause: error });
    }
  }

  async getObjectDetail(ref: DataExplorerObjectRef) {
    const reader = this.reader(ref.source_id);

    try {
      return DataExplorerObjectDetailSchema.parse(await reader.getObjectDetail(ref));
    } catch (error) {
      throw dataExplorerErrors.schemaInspectionFailed({ cause: error });
    }
  }

  async getObjectDdl(ref: DataExplorerObjectRef) {
    const reader = this.reader(ref.source_id);

    try {
      return DataExplorerObjectDdlSchema.parse(await reader.getObjectDdl(ref));
    } catch (error) {
      throw dataExplorerErrors.schemaInspectionFailed({ cause: error });
    }
  }

  async runQuery(input: DataExplorerQueryRunRequest) {
    const reader = this.reader(input.source_id);
    const bounds = normalizeQueryBounds({
      rowLimit: input.row_limit,
      timeoutMs: input.timeout_ms
    });
    const validation = validateSqlInput({
      sqlText: input.sql_text
    });
    const queryRunId = createQueryRunId();

    if (validation.status !== "valid") {
      throw dataExplorerErrors.sqlValidationFailed();
    }

    try {
      const result = await reader.executeReadOnlyQuery({
        sqlText: validation.normalized_sql,
        rowLimit: bounds.rowLimit,
        timeoutMs: bounds.timeoutMs
      });
      const suggestedVisualizations = suggestVisualizations(result.columns);
      const response = {
        query_run_id: queryRunId,
        status: "succeeded" as const,
        source_id: input.source_id,
        duration_ms: result.durationMs,
        row_count: result.rows.length,
        truncated: result.truncated,
        columns: result.columns,
        rows: result.rows,
        suggested_visualizations: suggestedVisualizations,
        validation
      };

      return DataExplorerQueryRunResponseSchema.parse(response);
    } catch (error) {
      throw dataExplorerErrors.queryExecutionFailed({ cause: error });
    }
  }

  private async createAiQueryPlan(input: DataExplorerAiQueryPlanRequest) {
    const sourceId = input.source_id ?? inferDataExplorerSourceId(input.natural_language_query);
    const reader = this.reader(sourceId);

    try {
      const objects = await reader.searchObjects({
        q: "",
        sourceId
      });
      const object = DataExplorerDomain.pickReferencedObject(objects);
      if (!object) {
        throw dataExplorerErrors.queryPlanFailed();
      }

      const detail = await reader.getObjectDetail(object);
      const plan = await this.openAiQueryPlanner.createQueryPlan({
        detail,
        request: input,
        sourceId
      });
      const validation = validateSqlInput({
        sqlText: plan.generatedSql
      });

      if (validation.status !== "valid") {
        throw dataExplorerErrors.queryPlanFailed();
      }

      return DataExplorerAiQueryPlanResponseSchema.parse({
        query_plan_id: createQueryRunId("qry_plan"),
        source_id: sourceId,
        generated_sql: plan.generatedSql,
        validation
      });
    } catch (error) {
      throw dataExplorerErrors.queryPlanFailed({ cause: error });
    }
  }

  async runAiChat(input: DataExplorerAiChatRequest) {
    if (input.current_result) {
      const analysis = await this.openAiQueryPlanner.analyzeResult({
        currentResult: input.current_result,
        message: input.message
      });
      return DataExplorerAiChatResponseSchema.parse({
        action: "result_analysis",
        assistant_message: formatResultAnalysis(analysis),
        query_plan: null,
        query_result: null
      });
    }

    const queryPlan = await this.createAiQueryPlan({
      natural_language_query: input.message,
      project_id: input.project_id,
      source_id: input.source_id
    });
    const queryResult = await this.runQuery({
      origin: "chatkit",
      project_id: input.project_id,
      row_limit: 500,
      source_id: queryPlan.source_id,
      sql_text: queryPlan.generated_sql,
      timeout_ms: 10_000
    });

    return DataExplorerAiChatResponseSchema.parse({
      action: "query_run",
      assistant_message: `${queryResult.row_count}개 행을 조회했습니다. 아래 탭에서 테이블과 시각화를 확인하세요.`,
      query_plan: queryPlan,
      query_result: queryResult
    });
  }

  private reader(sourceId: DataExplorerSourceId): DataExplorerSourceReader {
    if (sourceId === "postgres_contract") {
      return this.postgresContract;
    }
    if (sourceId === "clickhouse_events") {
      return this.clickHouseEvents;
    }
    throw dataExplorerErrors.sourceNotFound();
  }
}

function createQueryRunId(prefix = "qry_run"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function formatResultAnalysis(input: { summary: string; insights: string[]; caveats: string[] }) {
  const insights = input.insights.map((insight) => `- ${insight}`).join("\n");
  const caveats = input.caveats.map((caveat) => `- ${caveat}`).join("\n");

  return [
    input.summary,
    insights ? `\n인사이트\n${insights}` : "",
    caveats ? `\n주의할 점\n${caveats}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}
