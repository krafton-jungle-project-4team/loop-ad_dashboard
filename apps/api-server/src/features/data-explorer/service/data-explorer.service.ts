import { Inject, Injectable } from "@nestjs/common";
import {
  DataExplorerAiChatResponseSchema,
  DataExplorerAiQueryPlanResponseSchema,
  DataExplorerObjectDdlSchema,
  DataExplorerObjectDetailSchema,
  DataExplorerObjectsResponseSchema,
  DataExplorerQueryRunResponseSchema,
  DataExplorerQueryRunsResponseSchema,
  DataExplorerQueryValidateResponseSchema,
  DataExplorerSourcesResponseSchema,
  type DataExplorerAiChatRequest,
  type DataExplorerAiQueryPlanRequest,
  type DataExplorerObjectRef,
  type DataExplorerQueryRunRequest,
  type DataExplorerQueryValidateRequest,
  type DataExplorerSourceId
} from "@loopad/shared";
import { OpenAiDataExplorerQueryPlanner } from "../chatkit/openai-query-planner.js";
import { inferDataExplorerSourceId } from "../chatkit/query-plan-builder.js";
import { DataExplorerDomain } from "../domain/index.js";
import { dataExplorerErrors } from "../errors.js";
import { DataExplorerQueryRunsRepository } from "../repositories/query-runs.repository.js";
import { normalizeQueryBounds } from "../sql/query-limiter.js";
import { validateReadOnlySql } from "../sql/sql-safety-validator.js";
import { suggestVisualizations } from "../visualization/chart-suggester.js";
import { ClickHouseEventsAdapter } from "../adapters/clickhouse-events.adapter.js";
import type { DataSourceAdapter, ListObjectsInput } from "../adapters/data-source-adapter.js";
import { PostgresContractAdapter } from "../adapters/postgres-contract.adapter.js";

@Injectable()
export class DataExplorerService {
  constructor(
    @Inject(PostgresContractAdapter)
    private readonly postgresContract: PostgresContractAdapter,
    @Inject(ClickHouseEventsAdapter)
    private readonly clickHouseEvents: ClickHouseEventsAdapter,
    @Inject(DataExplorerQueryRunsRepository)
    private readonly queryRuns: DataExplorerQueryRunsRepository,
    @Inject(OpenAiDataExplorerQueryPlanner)
    private readonly openAiQueryPlanner: OpenAiDataExplorerQueryPlanner
  ) {}

  sources() {
    return DataExplorerSourcesResponseSchema.parse({
      sources: DataExplorerDomain.sources()
    });
  }

  async listObjects(input: ListObjectsInput) {
    const adapter = this.adapter(input.sourceId);

    try {
      return DataExplorerObjectsResponseSchema.parse({
        source_id: adapter.sourceId,
        objects: await adapter.listObjects(input),
        ...DataExplorerDomain.freshLiveMetadata()
      });
    } catch (error) {
      throw dataExplorerErrors.schemaInspectionFailed({ cause: error });
    }
  }

  async getObjectDetail(ref: DataExplorerObjectRef) {
    const adapter = this.adapter(ref.source_id);

    try {
      return DataExplorerObjectDetailSchema.parse(await adapter.getObjectDetail(ref));
    } catch (error) {
      throw dataExplorerErrors.schemaInspectionFailed({ cause: error });
    }
  }

  async getObjectDdl(ref: DataExplorerObjectRef) {
    const adapter = this.adapter(ref.source_id);

    try {
      return DataExplorerObjectDdlSchema.parse(await adapter.getObjectDdl(ref));
    } catch (error) {
      throw dataExplorerErrors.schemaInspectionFailed({ cause: error });
    }
  }

  validateQuery(input: DataExplorerQueryValidateRequest) {
    const validation = validateReadOnlySql({
      sourceId: input.source_id,
      sqlText: input.sql_text,
      rowLimit: input.row_limit,
      timeoutMs: input.timeout_ms
    });

    return DataExplorerQueryValidateResponseSchema.parse({
      source_id: input.source_id,
      validation
    });
  }

  async runQuery(input: DataExplorerQueryRunRequest) {
    const adapter = this.adapter(input.source_id);
    const bounds = normalizeQueryBounds({
      rowLimit: input.row_limit,
      timeoutMs: input.timeout_ms
    });
    const validation = validateReadOnlySql({
      sourceId: input.source_id,
      sqlText: input.sql_text,
      rowLimit: bounds.rowLimit,
      timeoutMs: bounds.timeoutMs
    });
    const queryRunId = DataExplorerDomain.createQueryRunId();
    const executedAt = new Date().toISOString();

    if (validation.status !== "valid") {
      this.queryRuns.save({
        query_run_id: queryRunId,
        project_id: input.project_id,
        source_id: input.source_id,
        origin: input.origin,
        sql_text: validation.normalized_sql,
        row_count: 0,
        truncated: false,
        duration_ms: 0,
        status: "failed",
        error_summary: "SQL validation failed.",
        executed_at: executedAt
      });
      throw dataExplorerErrors.sqlValidationFailed();
    }

    try {
      const result = await adapter.executeReadOnlyQuery({
        projectId: input.project_id,
        sqlText: validation.normalized_sql,
        params: input.params,
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

      this.queryRuns.save({
        query_run_id: queryRunId,
        project_id: input.project_id,
        source_id: input.source_id,
        origin: input.origin,
        sql_text: validation.normalized_sql,
        row_count: response.row_count,
        truncated: response.truncated,
        duration_ms: response.duration_ms,
        status: "succeeded",
        error_summary: null,
        executed_at: executedAt
      });

      return DataExplorerQueryRunResponseSchema.parse(response);
    } catch (error) {
      this.queryRuns.save({
        query_run_id: queryRunId,
        project_id: input.project_id,
        source_id: input.source_id,
        origin: input.origin,
        sql_text: validation.normalized_sql,
        row_count: 0,
        truncated: false,
        duration_ms: 0,
        status: "failed",
        error_summary: "Read-only query execution failed.",
        executed_at: executedAt
      });
      throw dataExplorerErrors.queryExecutionFailed({ cause: error });
    }
  }

  async createAiQueryPlan(input: DataExplorerAiQueryPlanRequest) {
    const sourceId = input.source_id ?? inferDataExplorerSourceId(input.natural_language_query);
    const adapter = this.adapter(sourceId);

    try {
      const objects = await adapter.searchObjects({
        projectId: input.project_id,
        q: "",
        sourceId
      });
      const object = DataExplorerDomain.pickReferencedObject(objects);
      if (!object) {
        throw dataExplorerErrors.queryPlanFailed();
      }

      const detail = await adapter.getObjectDetail(object);
      const plan = await this.openAiQueryPlanner.createQueryPlan({
        detail,
        request: input,
        sourceId
      });
      const validation = validateReadOnlySql({
        sourceId,
        sqlText: plan.generatedSql,
        rowLimit: 500,
        timeoutMs: 10_000
      });

      if (validation.status !== "valid") {
        throw dataExplorerErrors.queryPlanFailed({
          cause: new Error("OpenAI generated SQL did not pass the read-only validator.")
        });
      }

      return DataExplorerAiQueryPlanResponseSchema.parse({
        query_plan_id: DataExplorerDomain.createQueryRunId("qry_plan"),
        source_id: sourceId,
        schema_context: [DataExplorerDomain.toSchemaContext(detail)],
        generated_sql: plan.generatedSql,
        params: plan.params,
        referenced_objects: [detail.object],
        suggested_visualizations: plan.suggestedVisualizations,
        validation
      });
    } catch (error) {
      throw dataExplorerErrors.queryPlanFailed({ cause: error });
    }
  }

  async runAiQuery(input: DataExplorerQueryRunRequest) {
    return this.runQuery({
      ...input,
      origin: "chatkit"
    });
  }

  async runAiChat(input: DataExplorerAiChatRequest) {
    if (input.current_result && shouldAnalyzeCurrentResult(input.message)) {
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
      force_live_schema: true,
      natural_language_query: input.message,
      project_id: input.project_id,
      source_id: input.source_id
    });
    const queryResult = await this.runQuery({
      action_run_id: queryPlan.query_plan_id,
      chat_session_id: undefined,
      origin: "chatkit",
      params: queryPlan.params,
      project_id: input.project_id,
      row_limit: 500,
      schema_context: [],
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

  listQueryRuns(input: { projectId: string; sourceId?: DataExplorerSourceId }) {
    return DataExplorerQueryRunsResponseSchema.parse({
      query_runs: this.queryRuns.list(input)
    });
  }

  private adapter(sourceId: DataExplorerSourceId): DataSourceAdapter {
    if (sourceId === "postgres_contract") {
      return this.postgresContract;
    }
    if (sourceId === "clickhouse_events") {
      return this.clickHouseEvents;
    }
    throw dataExplorerErrors.sourceNotFound();
  }
}

function shouldAnalyzeCurrentResult(message: string) {
  const normalized = message.toLowerCase();
  return [
    "해석",
    "분석",
    "요약",
    "인사이트",
    "설명",
    "왜",
    "interpret",
    "analyze",
    "analysis",
    "explain",
    "summary",
    "insight"
  ].some((keyword) => normalized.includes(keyword));
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
