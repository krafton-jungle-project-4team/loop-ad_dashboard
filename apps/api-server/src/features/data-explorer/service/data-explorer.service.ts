import { Inject, Injectable } from "@nestjs/common";
import {
  DataExplorerAiChatResponseSchema,
  DataExplorerAiQueryPlanResponseSchema,
  DataExplorerObjectDetailSchema,
  DataExplorerObjectsResponseSchema,
  DataExplorerQueryRunResponseSchema,
  type DataExplorerAiChatRequest,
  type DataExplorerObjectRef,
  type DataExplorerObjectSummary,
  type DataExplorerQueryRunRequest
} from "@loopad/shared";
import { suggestVisualizations } from "../domain/chart-suggester.domain.js";
import { normalizeQueryBounds, validateSqlInput } from "../domain/sql-safety.domain.js";
import { dataExplorerErrors } from "../errors.js";
import { OpenAiDataExplorerQueryPlannerProvider } from "../provider/openai-query-planner.provider.js";
import {
  ClickHouseEventsReader,
  type ListObjectsInput
} from "../repository/clickhouse-events-reader.js";
import { LogContextScope, dms, log } from "../../../infra/logger/index.js";

/**
 * Data Explorer의 스키마 조회, SQL 실행, AI 질의를 조율한다.
 *
 * 현재 데이터 소스는 ClickHouse 하나라서 별도 소스 라우팅을 두지 않는다.
 */
@Injectable()
export class DataExplorerService {
  constructor(
    @Inject(ClickHouseEventsReader)
    private readonly clickHouseEvents: ClickHouseEventsReader,
    @Inject(OpenAiDataExplorerQueryPlannerProvider)
    private readonly openAiQueryPlanner: OpenAiDataExplorerQueryPlannerProvider
  ) {}

  @LogContextScope()
  async listObjects(input: ListObjectsInput) {
    const startedAt = Date.now();
    log.info("started", { input });

    try {
      const response = DataExplorerObjectsResponseSchema.parse({
        objects: await this.clickHouseEvents.listObjects(input)
      });

      log.info("completed", { response, durationMs: dms(startedAt) });
      return response;
    } catch (error) {
      log.warn("schema_inspection_failed", { err: error, input });
      throw dataExplorerErrors.schemaInspectionFailed({ cause: error });
    }
  }

  @LogContextScope()
  async getObjectDetail(ref: DataExplorerObjectRef) {
    const startedAt = Date.now();
    log.assignContext({ objectId: ref.object_name });
    log.info("started", { ref });

    try {
      const response = DataExplorerObjectDetailSchema.parse(
        await this.clickHouseEvents.getObjectDetail(ref)
      );

      log.info("completed", { response, durationMs: dms(startedAt) });
      return response;
    } catch (error) {
      log.warn("schema_inspection_failed", { err: error, ref });
      throw dataExplorerErrors.schemaInspectionFailed({ cause: error });
    }
  }

  @LogContextScope()
  async runQuery(input: DataExplorerQueryRunRequest) {
    const startedAt = Date.now();
    const bounds = normalizeQueryBounds({
      rowLimit: input.row_limit,
      timeoutMs: input.timeout_ms
    });
    const validation = validateSqlInput({
      sqlText: input.sql_text
    });
    const queryRunId = createQueryRunId();
    log.assignContext({ projectId: input.project_id, queryId: queryRunId });
    log.info("started", { input, queryRunId });

    if (validation.status !== "valid") {
      log.warn("sql_validation_failed", { input, validation });
      throw dataExplorerErrors.sqlValidationFailed();
    }

    try {
      const result = await this.clickHouseEvents.executeReadOnlyQuery({
        sqlText: validation.normalized_sql,
        rowLimit: bounds.rowLimit,
        timeoutMs: bounds.timeoutMs
      });
      const suggestedVisualizations = suggestVisualizations(result.columns);
      const response = DataExplorerQueryRunResponseSchema.parse({
        query_run_id: queryRunId,
        status: "succeeded",
        duration_ms: result.durationMs,
        row_count: result.rows.length,
        truncated: result.truncated,
        columns: result.columns,
        rows: result.rows,
        suggested_visualizations: suggestedVisualizations,
        validation
      });

      log.info("completed", { response, durationMs: dms(startedAt) });
      return response;
    } catch (error) {
      log.warn("query_execution_failed", { err: error, input, validation });
      throw dataExplorerErrors.queryExecutionFailed({ cause: error });
    }
  }

  private createAiQueryPlan(sqlText: string) {
    try {
      const validation = validateSqlInput({
        sqlText
      });

      if (validation.status !== "valid") {
        log.warn("query_plan_validation_failed", { sqlText, validation });
        throw dataExplorerErrors.queryPlanFailed();
      }

      const queryPlan = DataExplorerAiQueryPlanResponseSchema.parse({
        query_plan_id: createQueryRunId("qry_plan"),
        generated_sql: validation.normalized_sql,
        validation
      });

      log.info("query_plan_created", { queryPlan });
      return queryPlan;
    } catch (error) {
      log.warn("query_plan_failed", { err: error, sqlText });
      throw dataExplorerErrors.queryPlanFailed({ cause: error });
    }
  }

  @LogContextScope()
  async runAiChat(input: DataExplorerAiChatRequest) {
    const startedAt = Date.now();
    log.assignContext({ projectId: input.project_id });
    log.info("started", { input });

    const detail = await this.getPreferredObjectDetail();
    log.assignContext({ objectId: detail.object.object_name });
    log.info("preferred_object_loaded", { detail });
    const response = await this.openAiQueryPlanner.runChatAgent({
      currentResult: input.current_result,
      detail,
      manualActions: {
        runQuery: async ({ sqlText }) => {
          const queryPlan = this.createAiQueryPlan(sqlText);
          const queryResult = await this.runQuery({
            origin: "chatkit",
            project_id: input.project_id,
            row_limit: 500,
            sql_text: queryPlan.generated_sql,
            timeout_ms: 10_000
          });

          return {
            queryPlan,
            queryResult
          };
        },
        writeQuery: async ({ sqlText }) => this.createAiQueryPlan(sqlText)
      },
      message: input.message,
      projectId: input.project_id
    });

    const parsed = DataExplorerAiChatResponseSchema.parse({
      action: response.action,
      assistant_message: response.assistantMessage,
      query_plan: response.queryPlan,
      query_result: response.queryResult
    });

    log.info("completed", { response: parsed, durationMs: dms(startedAt) });
    return parsed;
  }

  private async getPreferredObjectDetail() {
    const objects = await this.clickHouseEvents.listObjects({ q: "" });
    const object = pickReferencedObject(objects);
    if (!object) {
      log.warn("preferred_object_not_found", { objects });
      throw dataExplorerErrors.queryPlanFailed();
    }

    return this.clickHouseEvents.getObjectDetail(object);
  }
}

function pickReferencedObject(
  objects: DataExplorerObjectSummary[]
): DataExplorerObjectSummary | null {
  return (
    objects.find((object) => object.object_name === "raw_events") ??
    objects.find((object) => object.object_name === "events") ??
    objects.find((object) => object.object_type === "table") ??
    objects.find((object) => object.object_type === "view") ??
    objects[0] ??
    null
  );
}

function createQueryRunId(prefix = "qry_run"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
