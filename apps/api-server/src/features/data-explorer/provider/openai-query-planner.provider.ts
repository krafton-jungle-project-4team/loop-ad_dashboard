import { Injectable } from "@nestjs/common";
import {
  type DataExplorerAiChatCurrentResult,
  type DataExplorerAiQueryPlanResponse,
  type DataExplorerObjectDetail,
  type DataExplorerQueryRunResponse
} from "@loopad/shared";
import { z } from "zod";
import { durationMs, log } from "../../../infra/logger/index.js";
import { dataExplorerErrors } from "../errors.js";
import { buildChatAgentPayload } from "./openai-query-planner-payload.js";
import { OPENAI_QUERY_PLAN_MODEL, requestOpenAiResponse } from "./openai-responses-client.js";

type DataExplorerAgentAction = "query_plan" | "query_run" | "result_analysis";

type DataExplorerAgentResult = {
  action: DataExplorerAgentAction;
  assistantMessage: string;
  queryPlan: DataExplorerAiQueryPlanResponse | null;
  queryResult: DataExplorerQueryRunResponse | null;
};

type DataExplorerManualActions = {
  runQuery: (input: { sqlText: string }) => Promise<{
    queryPlan: DataExplorerAiQueryPlanResponse;
    queryResult: DataExplorerQueryRunResponse;
  }>;
  writeQuery: (input: { sqlText: string }) => Promise<DataExplorerAiQueryPlanResponse>;
};

type AgentState = {
  action: DataExplorerAgentAction | null;
  assistantMessage: string | null;
  queryPlan: DataExplorerAiQueryPlanResponse | null;
  queryResult: DataExplorerQueryRunResponse | null;
};

const MAX_AGENT_TOOL_STEPS = 4;

const WriteQueryToolArgsSchema = z.object({
  sql_text: z.string().trim().min(1)
});

const RunQueryToolArgsSchema = z.object({
  sql_text: z.string().trim().min(1)
});

const AnalyzeResultToolArgsSchema = z.object({
  question: z.string().trim().min(1)
});

const OpenAiFunctionCallSchema = z
  .object({
    type: z.literal("function_call"),
    call_id: z.string().min(1),
    name: z.string().min(1),
    arguments: z.string()
  })
  .passthrough();

type OpenAiFunctionCall = z.infer<typeof OpenAiFunctionCallSchema>;

const OpenAiOutputTextSchema = z
  .object({
    type: z.literal("output_text"),
    text: z.string()
  })
  .passthrough();

const OpenAiMessageSchema = z
  .object({
    type: z.literal("message"),
    content: z.array(z.unknown())
  })
  .passthrough();

const OpenAiResponsesResponseSchema = z.object({
  output_text: z.string().optional(),
  output: z.array(z.unknown())
});

/**
 * Data Explorer의 AI 대화를 OpenAI tool calling 루프로 실행한다.
 *
 * 모델은 도구를 선택하고, 실제 SQL 검증과 ClickHouse 실행은 앱 서버가 처리한다.
 */
@Injectable()
export class OpenAiDataExplorerQueryPlannerProvider {
  async runChatAgent(input: {
    currentResult?: DataExplorerAiChatCurrentResult;
    detail: DataExplorerObjectDetail;
    manualActions: DataExplorerManualActions;
    message: string;
    projectId: string;
  }): Promise<DataExplorerAgentResult> {
    const startedAt = Date.now();
    log.assignContext({
      model: OPENAI_QUERY_PLAN_MODEL,
      objectId: input.detail.object.object_name,
      projectId: input.projectId,
      provider: "openai"
    });
    log.info("ai_chat_agent_started", { input });
    const responseInput: unknown[] = [
      {
        role: "user",
        content: JSON.stringify(buildChatAgentPayload(input))
      }
    ];
    const state: AgentState = {
      action: null,
      assistantMessage: null,
      queryPlan: null,
      queryResult: null
    };

    try {
      for (let step = 0; step < MAX_AGENT_TOOL_STEPS; step += 1) {
        log.info("ai_chat_agent_step_started", { inputCount: responseInput.length, step });
        const payload = await requestOpenAiResponse({
          input: responseInput,
          toolChoice: step === 0 ? "required" : "auto"
        });
        const response = OpenAiResponsesResponseSchema.parse(payload);
        const functionCalls = response.output
          .map((item) => OpenAiFunctionCallSchema.safeParse(item))
          .filter((item) => item.success)
          .map((item) => item.data);

        responseInput.push(...response.output);
        log.info("ai_chat_agent_step_completed", {
          functionCallCount: functionCalls.length,
          outputCount: response.output.length,
          step
        });

        if (!functionCalls.length) {
          const result = toAgentResult(state, readOpenAiTextContent(payload));
          log.info("ai_chat_agent_completed", {
            durationMs: durationMs(startedAt),
            result
          });
          return result;
        }

        for (const call of functionCalls) {
          log.info("ai_chat_tool_call_started", { call });
          const toolOutput = await runAgentTool({
            call,
            currentResult: input.currentResult,
            manualActions: input.manualActions,
            state
          });
          log.info("ai_chat_tool_call_completed", { call, toolOutput });

          responseInput.push({
            type: "function_call_output",
            call_id: call.call_id,
            output: JSON.stringify(toolOutput)
          });
        }
      }

      const result = toAgentResult(state, state.assistantMessage ?? "");
      log.info("ai_chat_agent_completed", { durationMs: durationMs(startedAt), result });
      return result;
    } catch (error) {
      log.warn("ai_chat_agent_failed", {
        durationMs: durationMs(startedAt),
        err: error,
        state
      });
      throw dataExplorerErrors.aiChatFailed({ cause: toError(error) });
    }
  }
}

async function runAgentTool(input: {
  call: OpenAiFunctionCall;
  currentResult?: DataExplorerAiChatCurrentResult;
  manualActions: DataExplorerManualActions;
  state: AgentState;
}) {
  switch (input.call.name) {
    case "write_query": {
      const args = parseToolArguments(WriteQueryToolArgsSchema, input.call.arguments);
      log.info("ai_chat_tool_arguments_parsed", { args, tool: input.call.name });
      const queryPlan = await input.manualActions.writeQuery({ sqlText: args.sql_text });
      input.state.action = "query_plan";
      input.state.queryPlan = queryPlan;
      input.state.queryResult = null;

      return {
        tool: "write_query",
        query_plan: toQueryPlanToolOutput(queryPlan)
      };
    }
    case "run_query": {
      const args = parseToolArguments(RunQueryToolArgsSchema, input.call.arguments);
      log.info("ai_chat_tool_arguments_parsed", { args, tool: input.call.name });
      const { queryPlan, queryResult } = await input.manualActions.runQuery({
        sqlText: args.sql_text
      });
      input.state.action = "query_run";
      input.state.queryPlan = queryPlan;
      input.state.queryResult = queryResult;

      return {
        tool: "run_query",
        query_plan: toQueryPlanToolOutput(queryPlan),
        query_result: toQueryResultToolOutput(queryResult)
      };
    }
    case "analyze_result": {
      if (!input.currentResult) {
        log.warn("ai_chat_current_result_missing", { call: input.call });
        throw new Error("분석할 현재 쿼리 결과가 없습니다.");
      }

      const args = parseToolArguments(AnalyzeResultToolArgsSchema, input.call.arguments);
      log.info("ai_chat_tool_arguments_parsed", { args, tool: input.call.name });
      input.state.action = "result_analysis";
      input.state.assistantMessage = null;
      input.state.queryPlan = null;
      input.state.queryResult = null;

      return {
        tool: "analyze_result",
        question: args.question,
        current_result: toCurrentResultToolOutput(input.currentResult)
      };
    }
    default:
      log.warn("ai_chat_tool_unsupported", { call: input.call });
      throw new Error(`지원하지 않는 Data Explorer tool입니다: ${input.call.name}`);
  }
}

function parseToolArguments<T extends z.ZodType>(schema: T, rawArguments: string): z.infer<T> {
  try {
    return schema.parse(JSON.parse(rawArguments || "{}"));
  } catch (error) {
    log.warn("ai_chat_tool_arguments_invalid", { err: error, rawArguments });
    throw dataExplorerErrors.aiChatFailed({ cause: toError(error) });
  }
}

function toAgentResult(state: AgentState, finalText: string): DataExplorerAgentResult {
  if (!state.action) {
    log.warn("ai_chat_tool_not_selected", { state });
    throw new Error("AI가 Data Explorer 도구를 선택하지 않았습니다.");
  }

  const assistantMessage = finalText.trim() || fallbackAssistantMessage(state);

  return {
    action: state.action,
    assistantMessage,
    queryPlan: state.queryPlan,
    queryResult: state.queryResult
  };
}

function fallbackAssistantMessage(state: AgentState) {
  switch (state.action) {
    case "query_plan":
      return "SQL을 작성했습니다. 편집기에서 확인하세요.";
    case "query_run":
      return `${state.queryResult?.row_count ?? 0}개 행을 조회했습니다. 아래 탭에서 테이블과 시각화를 확인하세요.`;
    case "result_analysis":
      return state.assistantMessage ?? "결과 분석을 완료했습니다.";
    default:
      return "요청을 처리했습니다.";
  }
}

function readOpenAiTextContent(payload: unknown) {
  const parsed = OpenAiResponsesResponseSchema.safeParse(payload);
  const outputText =
    parsed.success && parsed.data.output_text
      ? parsed.data.output_text
      : parsed.success
        ? parsed.data.output
            .map((item) => OpenAiMessageSchema.safeParse(item))
            .filter((item) => item.success)
            .flatMap((item) => item.data.content)
            .map((content) => {
              const parsedContent = OpenAiOutputTextSchema.safeParse(content);
              return parsedContent.success ? parsedContent.data.text : null;
            })
            .find((text): text is string => !!text)
        : null;

  if (!outputText) {
    return "";
  }

  return outputText;
}

function toQueryPlanToolOutput(queryPlan: DataExplorerAiQueryPlanResponse) {
  return {
    query_plan_id: queryPlan.query_plan_id,
    generated_sql: queryPlan.generated_sql,
    validation: {
      status: queryPlan.validation.status,
      errors: queryPlan.validation.errors
    }
  };
}

function toQueryResultToolOutput(queryResult: DataExplorerQueryRunResponse) {
  return {
    query_run_id: queryResult.query_run_id,
    row_count: queryResult.row_count,
    truncated: queryResult.truncated,
    columns: queryResult.columns,
    rows: queryResult.rows.slice(0, 20),
    suggested_visualizations: queryResult.suggested_visualizations
  };
}

function toCurrentResultToolOutput(currentResult: DataExplorerAiChatCurrentResult) {
  return {
    query_run_id: currentResult.query_run_id,
    row_count: currentResult.row_count,
    truncated: currentResult.truncated,
    columns: currentResult.columns,
    rows: currentResult.rows.slice(0, 50)
  };
}

function toError(error: unknown) {
  return error instanceof Error ? error : new Error(String(error));
}
