import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import type { DataExplorerService } from "../src/features/data-explorer/service/data-explorer.service.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("OpenAI query planner preserves Responses API payload and tool output contracts", async () => {
  setRequiredEnv();
  const { OpenAiDataExplorerQueryPlannerProvider } =
    await import("../src/features/data-explorer/provider/openai-query-planner.provider.js");
  const payloads: Record<string, unknown>[] = [];
  const responses = [
    {
      output: [
        {
          type: "function_call",
          call_id: "call-1",
          name: "write_query",
          arguments: JSON.stringify({ sql_text: "SELECT project_id FROM events LIMIT 10" })
        }
      ]
    },
    {
      output: [],
      output_text: "SQL을 작성했습니다."
    }
  ];
  globalThis.fetch = async (_input, init) => {
    payloads.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
    return Response.json(responses.shift());
  };

  const result = await new OpenAiDataExplorerQueryPlannerProvider().runChatAgent({
    detail: dataExplorerObjectDetail(),
    manualActions: {
      runQuery: async () => {
        throw new Error("runQuery should not be called");
      },
      writeQuery: async ({ sqlText }) => ({
        query_plan_id: "plan-1",
        generated_sql: sqlText,
        validation: {
          status: "valid",
          errors: [],
          normalized_sql: sqlText
        }
      })
    },
    message: "프로젝트별 이벤트 SQL을 작성해줘",
    projectId: "project-1"
  });

  assert.deepEqual(result, {
    action: "query_plan",
    assistantMessage: "SQL을 작성했습니다.",
    queryPlan: {
      query_plan_id: "plan-1",
      generated_sql: "SELECT project_id FROM events LIMIT 10",
      validation: {
        status: "valid",
        errors: [],
        normalized_sql: "SELECT project_id FROM events LIMIT 10"
      }
    },
    queryResult: null
  });
  assert.equal(payloads[0]?.model, "gpt-5.5");
  assert.equal(payloads[0]?.tool_choice, "required");
  assert.equal(payloads[0]?.parallel_tool_calls, false);
  assert.deepEqual(
    (payloads[0]?.tools as Array<{ name: string }>).map((tool) => tool.name),
    ["write_query", "run_query", "analyze_result"]
  );
  assert.deepEqual(payloads[0]?.input, [
    {
      role: "user",
      content: JSON.stringify({
        project_id: "project-1",
        user_message: "프로젝트별 이벤트 SQL을 작성해줘",
        object: {
          object_name: "events",
          object_type: "table",
          columns: [
            {
              column_name: "project_id",
              data_type: "String",
              nullable: false
            }
          ],
          primary_key: ["project_id"],
          partition_key: null,
          order_by: ["project_id"]
        },
        current_result: null
      })
    }
  ]);
  assert.equal(payloads[1]?.tool_choice, "auto");
  assert.deepEqual((payloads[1]?.input as unknown[]).at(-1), {
    type: "function_call_output",
    call_id: "call-1",
    output: JSON.stringify({
      tool: "write_query",
      query_plan: {
        query_plan_id: "plan-1",
        generated_sql: "SELECT project_id FROM events LIMIT 10",
        validation: {
          status: "valid",
          errors: []
        }
      }
    })
  });
});

test("ChatKit preserves create-thread stream event contracts", async () => {
  setRequiredEnv();
  const { DataExplorerChatKitService } =
    await import("../src/features/data-explorer/service/data-explorer-chatkit.service.js");
  const calls: unknown[] = [];
  const dataExplorer = {
    runAiChat: async (request: unknown) => {
      calls.push(request);
      return {
        action: "query_plan",
        assistant_message: "SQL을 작성했습니다.",
        query_plan: {
          query_plan_id: "plan-1",
          generated_sql: "SELECT 1",
          validation: {
            status: "valid",
            errors: [],
            normalized_sql: "SELECT 1"
          }
        },
        query_result: null
      };
    }
  } as unknown as DataExplorerService;
  const service = new DataExplorerChatKitService(dataExplorer);

  const result = await service.process({
    type: "threads.create",
    params: {
      input: {
        content: [{ type: "input_text", text: "SQL 작성" }],
        attachments: [],
        inference_options: {}
      }
    },
    metadata: {
      project_id: "project-1"
    }
  });

  assert.equal(result.kind, "stream");
  if (result.kind !== "stream") {
    return;
  }

  const events = [];
  for await (const event of result.events) {
    events.push(event);
  }

  assert.deepEqual(calls, [
    {
      current_result: undefined,
      message: "SQL 작성",
      project_id: "project-1"
    }
  ]);
  assert.deepEqual(
    events.map((event) => event.type),
    ["thread.created", "thread.item.done", "stream_options", "thread.item.done", "client_effect"]
  );
  assert.equal(events[0]?.type, "thread.created");
  if (events[0]?.type === "thread.created") {
    assert.equal(events[0].thread.status.type, "active");
    assert.equal(events[0].thread.title, null);
    assert.deepEqual(events[0].thread.items, {
      after: null,
      data: [],
      has_more: false
    });
  }
  assert.deepEqual(events[2], {
    stream_options: { allow_cancel: false },
    type: "stream_options"
  });
  assert.deepEqual(events[4], {
    data: {
      action: "query_plan",
      query_plan: {
        query_plan_id: "plan-1",
        generated_sql: "SELECT 1",
        validation: {
          status: "valid",
          errors: [],
          normalized_sql: "SELECT 1"
        }
      },
      query_result: null
    },
    name: "data_explorer_query_plan",
    type: "client_effect"
  });
});

function dataExplorerObjectDetail() {
  return {
    object: {
      object_type: "table" as const,
      object_name: "events",
      engine: "MergeTree",
      column_count: 1,
      row_count_estimate: 100
    },
    columns: [
      {
        column_name: "project_id",
        data_type: "String",
        nullable: false,
        default_value: null,
        ordinal_position: 1,
        comment: null
      }
    ],
    partition_key: null,
    order_by: ["project_id"],
    primary_key: ["project_id"]
  };
}

function setRequiredEnv() {
  process.env.LOOPAD_ENV ??= "local";
  process.env.LOOPAD_SERVICE_ID ??= "dashboard-api";
  process.env.PORT ??= "8080";
  process.env.LOOPAD_AURORA_HOST ??= "localhost";
  process.env.LOOPAD_AURORA_PORT ??= "15432";
  process.env.LOOPAD_AURORA_DATABASE ??= "loopad";
  process.env.LOOPAD_AURORA_USERNAME ??= "loopad";
  process.env.LOOPAD_AURORA_PASSWORD ??= "loopad";
  process.env.LOOPAD_CLICKHOUSE_URL ??= "http://localhost:18123";
  process.env.LOOPAD_CLICKHOUSE_DATABASE ??= "loopad";
  process.env.LOOPAD_CLICKHOUSE_USERNAME ??= "loopad_app";
  process.env.LOOPAD_CLICKHOUSE_PASSWORD ??= "loopad_local_password";
  process.env.LOOPAD_DECISION_API_BASE_URL ??= "http://localhost:8081";
  process.env.LOOPAD_INTERNAL_API_KEY ??= "test-internal-key";
  process.env.LOOPAD_OPENAI_API_KEY ??= "test-openai-api-key";
  process.env.LOOPAD_DEMO_DISPATCH_RECIPIENTS ??= JSON.stringify([
    {
      userId: "user-1",
      email: "demo-recipient-1@loop-ad.org",
      phoneNumber: "+821012345001"
    }
  ]);
}
