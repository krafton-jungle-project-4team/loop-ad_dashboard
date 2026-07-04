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

  async listObjects(input: ListObjectsInput) {
    try {
      return DataExplorerObjectsResponseSchema.parse({
        objects: await this.clickHouseEvents.listObjects(input)
      });
    } catch (error) {
      throw dataExplorerErrors.schemaInspectionFailed({ cause: error });
    }
  }

  async getObjectDetail(ref: DataExplorerObjectRef) {
    try {
      return DataExplorerObjectDetailSchema.parse(await this.clickHouseEvents.getObjectDetail(ref));
    } catch (error) {
      throw dataExplorerErrors.schemaInspectionFailed({ cause: error });
    }
  }

  async runQuery(input: DataExplorerQueryRunRequest) {
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
      const result = await this.clickHouseEvents.executeReadOnlyQuery({
        sqlText: validation.normalized_sql,
        rowLimit: bounds.rowLimit,
        timeoutMs: bounds.timeoutMs
      });
      const suggestedVisualizations = suggestVisualizations(result.columns);

      return DataExplorerQueryRunResponseSchema.parse({
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
    } catch (error) {
      throw dataExplorerErrors.queryExecutionFailed({ cause: error });
    }
  }

  private createAiQueryPlan(sqlText: string) {
    try {
      const validation = validateSqlInput({
        sqlText
      });

      if (validation.status !== "valid") {
        throw dataExplorerErrors.queryPlanFailed();
      }

      return DataExplorerAiQueryPlanResponseSchema.parse({
        query_plan_id: createQueryRunId("qry_plan"),
        generated_sql: validation.normalized_sql,
        validation
      });
    } catch (error) {
      throw dataExplorerErrors.queryPlanFailed({ cause: error });
    }
  }

  async runAiChat(input: DataExplorerAiChatRequest) {
    const detail = await this.getPreferredObjectDetail();
    const response = await this.openAiQueryPlanner.runChatAgent({
      currentResult: input.current_result,
      detail,
      message: input.message,
      projectId: input.project_id,
      tools: {
        analyzeResult: async (analysis) => formatResultAnalysis(analysis),
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
      }
    });

    return DataExplorerAiChatResponseSchema.parse({
      action: response.action,
      assistant_message: response.assistantMessage,
      query_plan: response.queryPlan,
      query_result: response.queryResult
    });
  }

  private async getPreferredObjectDetail() {
    const objects = await this.clickHouseEvents.listObjects({ q: "" });
    const object = pickReferencedObject(objects);
    if (!object) {
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
