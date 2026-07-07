import { Injectable } from "@nestjs/common";
import {
  type DataExplorerAiChatCurrentResult,
  type DataExplorerAiQueryPlanResponse,
  type DataExplorerObjectDetail,
  type DataExplorerQueryRunResponse
} from "@loopad/shared";
import { z } from "zod";
import { env } from "../../../infra/env/env.js";
import { log } from "../../../infra/logger/index.js";
import { dataExplorerErrors } from "../errors.js";

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

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const OPENAI_REQUEST_TIMEOUT_MS = 20_000;
const OPENAI_QUERY_PLAN_MODEL = "gpt-5.5";
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
            durationMs: Date.now() - startedAt,
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
      log.info("ai_chat_agent_completed", { durationMs: Date.now() - startedAt, result });
      return result;
    } catch (error) {
      log.warn("ai_chat_agent_failed", {
        durationMs: Date.now() - startedAt,
        err: error,
        state
      });
      throw dataExplorerErrors.aiChatFailed({ cause: toError(error) });
    }
  }
}

async function requestOpenAiResponse(input: { input: unknown[]; toolChoice: "auto" | "required" }) {
  const startedAt = Date.now();
  const provider = "openai";
  const endpoint = OPENAI_RESPONSES_URL;
  log.info("provider_request_prepared", {
    endpoint,
    inputCount: input.input.length,
    model: OPENAI_QUERY_PLAN_MODEL,
    provider,
    toolChoice: input.toolChoice
  });

  let response: Response;
  try {
    response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.openai.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: OPENAI_QUERY_PLAN_MODEL,
        instructions: buildChatAgentInstructions(),
        input: input.input,
        tools: OPENAI_CHAT_AGENT_TOOLS,
        tool_choice: input.toolChoice,
        parallel_tool_calls: false
      }),
      signal: AbortSignal.timeout(OPENAI_REQUEST_TIMEOUT_MS)
    });
  } catch (error) {
    log.warn("provider_request_failed", {
      durationMs: Date.now() - startedAt,
      endpoint,
      err: error,
      provider
    });
    throw error;
  }

  if (!response.ok) {
    log.warn("provider_request_failed", {
      durationMs: Date.now() - startedAt,
      endpoint,
      provider,
      statusCode: response.status
    });
    throw new Error(`OpenAI Responses request failed with ${response.status}.`);
  }

  return response
    .json()
    .then((body: unknown) => {
      log.info("provider_request_completed", {
        durationMs: Date.now() - startedAt,
        endpoint,
        provider,
        statusCode: response.status
      });
      return body;
    })
    .catch((error: unknown) => {
      log.warn("provider_response_invalid", {
        durationMs: Date.now() - startedAt,
        endpoint,
        err: error,
        provider,
        statusCode: response.status
      });
      throw toError(error);
    });
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

function buildChatAgentInstructions() {
  return [
    "You are the LoopAd Data Explorer agent.",
    "You must choose from exactly these server tools: write_query, run_query, analyze_result.",
    "Use write_query when the user asks to draft, edit, or show SQL without execution.",
    "Use run_query when the user asks to fetch data, execute a query, calculate a metric, filter, group, or compare data.",
    "Use analyze_result only when current_result exists and the user asks to summarize, explain, compare, or find insights in the current result.",
    "For run_query, provide a complete read-only ClickHouse SQL query in the tool arguments.",
    "For analyze_result, pass the user's analysis request as-is. The server will return the current result for analysis.",
    "After receiving a tool result, answer the user directly in Korean unless another tool is clearly necessary.",
    "SQL must use only the provided table and columns.",
    "Always filter by project_id when the object has a project_id column.",
    "Use SELECT or WITH only. Never use INSERT, UPDATE, DELETE, ALTER, DROP, TRUNCATE, CREATE, or external table functions.",
    "Return at most 500 rows.",
    "Answer in Korean after tool execution."
  ].join("\n");
}

function buildChatAgentPayload(input: {
  currentResult?: DataExplorerAiChatCurrentResult;
  detail: DataExplorerObjectDetail;
  message: string;
  projectId: string;
}) {
  return {
    project_id: input.projectId,
    user_message: input.message,
    object: {
      object_name: input.detail.object.object_name,
      object_type: input.detail.object.object_type,
      columns: input.detail.columns.map((column) => ({
        column_name: column.column_name,
        data_type: column.data_type,
        nullable: column.nullable
      })),
      primary_key: input.detail.primary_key,
      partition_key: input.detail.partition_key,
      order_by: input.detail.order_by
    },
    current_result: input.currentResult
      ? {
          query_run_id: input.currentResult.query_run_id,
          row_count: input.currentResult.row_count,
          truncated: input.currentResult.truncated,
          columns: input.currentResult.columns,
          rows: input.currentResult.rows.slice(0, 50)
        }
      : null
  };
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

const OPENAI_CHAT_AGENT_TOOLS = [
  {
    type: "function",
    name: "write_query",
    description: "쿼리 작성: 자연어 요청을 read-only ClickHouse SQL로 작성한다.",
    parameters: {
      type: "object",
      properties: {
        sql_text: {
          type: "string",
          description: "완성된 read-only ClickHouse SQL. LIMIT 500 이하를 포함한다."
        }
      },
      required: ["sql_text"],
      additionalProperties: false
    },
    strict: true
  },
  {
    type: "function",
    name: "run_query",
    description: "쿼리 실행: 작성된 read-only ClickHouse SQL을 실행한다.",
    parameters: {
      type: "object",
      properties: {
        sql_text: {
          type: "string",
          description: "실행할 read-only ClickHouse SQL. LIMIT 500 이하를 포함한다."
        }
      },
      required: ["sql_text"],
      additionalProperties: false
    },
    strict: true
  },
  {
    type: "function",
    name: "analyze_result",
    description: "결과 분석: 현재 쿼리 결과를 분석하기 위해 서버에 결과 컨텍스트를 요청한다.",
    parameters: {
      type: "object",
      properties: {
        question: {
          type: "string",
          description: "사용자의 결과 분석 요청."
        }
      },
      required: ["question"],
      additionalProperties: false
    },
    strict: true
  }
] as const;
