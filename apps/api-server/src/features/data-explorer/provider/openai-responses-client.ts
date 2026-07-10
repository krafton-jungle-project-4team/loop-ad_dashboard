import { env } from "../../../infra/env/env.js";
import { durationMs, log } from "../../../infra/logger/index.js";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const OPENAI_REQUEST_TIMEOUT_MS = 20_000;

export const OPENAI_QUERY_PLAN_MODEL = "gpt-5.5";

export async function requestOpenAiResponse(input: {
  input: unknown[];
  toolChoice: "auto" | "required";
}) {
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
      durationMs: durationMs(startedAt),
      endpoint,
      err: error,
      provider
    });
    throw error;
  }

  if (!response.ok) {
    log.warn("provider_request_failed", {
      durationMs: durationMs(startedAt),
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
        durationMs: durationMs(startedAt),
        endpoint,
        provider,
        statusCode: response.status
      });
      return body;
    })
    .catch((error: unknown) => {
      log.warn("provider_response_invalid", {
        durationMs: durationMs(startedAt),
        endpoint,
        err: error,
        provider,
        statusCode: response.status
      });
      throw toError(error);
    });
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
