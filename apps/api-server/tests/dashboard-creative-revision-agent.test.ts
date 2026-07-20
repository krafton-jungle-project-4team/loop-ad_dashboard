import assert from "node:assert/strict";
import { test } from "node:test";
import { captureJsonLogs } from "./log-capture.js";

test("creative revision agent sends bounded context and parses the required tool result", async () => {
  setRequiredEnv();
  const { DashboardCreativeRevisionAgent } =
    await import("../src/features/dashboard/provider/dashboard-creative-revision-agent.js");
  const originalFetch = globalThis.fetch;
  let requestBody: Record<string, unknown> | null = null;
  globalThis.fetch = async (_input, init) => {
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(
      JSON.stringify({
        output: [
          {
            type: "function_call",
            name: "submit_creative_revision",
            arguments: JSON.stringify({
              html: '<h1>새 제목</h1><p>새 본문</p><a href="{{redirect_url}}">예약</a>',
              headline: "새 제목",
              body: "새 본문",
              cta: "예약",
              change_summary: "혜택이 먼저 보이도록 정보 위계를 정리했습니다."
            })
          }
        ]
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };

  try {
    const { logs, result } = await captureJsonLogs(() =>
      new DashboardCreativeRevisionAgent().revise({
        body: "기존 본문",
        channel: "onsite_banner",
        cta: "예약",
        feedback: "혜택을 더 강조해줘",
        headline: "기존 제목",
        html: '<h1>기존 제목</h1><p>기존 본문</p><a href="{{redirect_url}}">예약</a>'
      })
    );

    assert.equal(result.headline, "새 제목");
    assert.match(result.change_summary, /정보 위계/);
    assert.equal(requestBody?.model, "gpt-5.5");
    assert.deepEqual(requestBody?.tool_choice, {
      type: "function",
      name: "submit_creative_revision"
    });
    const input = requestBody?.input as Array<{ content: string }>;
    const context = JSON.parse(input[0]?.content ?? "{}") as {
      feedback?: string;
      required_placeholders?: string[];
    };
    assert.equal(context.feedback, "혜택을 더 강조해줘");
    assert.deepEqual(context.required_placeholders, ["{{redirect_url}}"]);
    assert.ok(logs.some((entry) => entry.event === "provider_request_prepared"));
    assert.ok(logs.some((entry) => entry.event === "provider_request_completed"));
    assert.equal(
      logs.some((entry) => "apiKey" in entry || "authorization" in entry),
      false
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

function setRequiredEnv() {
  process.env.LOOPAD_ENV ??= "test";
  process.env.LOOPAD_SERVICE_ID ??= "dashboard-api";
  process.env.PORT ??= "8080";
  process.env.LOOPAD_AURORA_HOST ??= "localhost";
  process.env.LOOPAD_AURORA_PORT ??= "5432";
  process.env.LOOPAD_AURORA_DATABASE ??= "loopad";
  process.env.LOOPAD_AURORA_USERNAME ??= "loopad";
  process.env.LOOPAD_AURORA_PASSWORD ??= "loopad";
  process.env.LOOPAD_CLICKHOUSE_URL ??= "http://localhost:8123";
  process.env.LOOPAD_CLICKHOUSE_DATABASE ??= "loopad";
  process.env.LOOPAD_CLICKHOUSE_USERNAME ??= "default";
  process.env.LOOPAD_CLICKHOUSE_PASSWORD ??= "loopad";
  process.env.LOOPAD_DECISION_API_BASE_URL ??= "http://localhost:8000";
  process.env.LOOPAD_INTERNAL_API_KEY ??= "test-key";
  process.env.LOOPAD_OPENAI_API_KEY ??= "test-openai-key";
  process.env.LOOPAD_DEMO_DISPATCH_RECIPIENTS ??= "[]";
}
