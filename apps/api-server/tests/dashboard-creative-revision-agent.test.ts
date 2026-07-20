import assert from "node:assert/strict";
import { test } from "node:test";
import { captureJsonLogs } from "./log-capture.js";

test("creative revision agent requests a bounded exact-text patch with low reasoning", async () => {
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
            name: "submit_creative_revision_patch",
            arguments: JSON.stringify({
              strategy: "patch",
              replacements: [
                {
                  before: "color:#111",
                  after: "color:#7c3aed"
                }
              ],
              headline: "기존 제목",
              body: "기존 본문",
              cta: "예약",
              change_summary: "제목 색상을 브랜드 보라색으로 변경했습니다."
            })
          }
        ]
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };

  try {
    const { logs, result } = await captureJsonLogs(() =>
      new DashboardCreativeRevisionAgent().planPatch({
        body: "기존 본문",
        channel: "onsite_banner",
        cta: "예약",
        feedback: "제목을 보라색으로 바꿔줘",
        headline: "기존 제목",
        html: '<article><h1 style="color:#111">기존 제목</h1><p>기존 본문</p><a href="{{redirect_url}}">예약</a></article>'
      })
    );

    assert.equal(result.strategy, "patch");
    assert.equal(result.replacements[0]?.before, "color:#111");
    assert.equal(requestBody?.model, "gpt-5.5");
    assert.equal(requestBody?.max_output_tokens, 8_000);
    assert.deepEqual(requestBody?.reasoning, { effort: "low" });
    assert.deepEqual(requestBody?.tool_choice, {
      type: "function",
      name: "submit_creative_revision_patch"
    });
    const tools = requestBody?.tools as Array<{ strict?: boolean }>;
    assert.equal(tools[0]?.strict, true);
    const input = requestBody?.input as Array<{ content: string }>;
    const context = JSON.parse(input[0]?.content ?? "{}") as {
      feedback?: string;
      required_placeholders?: string[];
    };
    assert.equal(context.feedback, "제목을 보라색으로 바꿔줘");
    assert.deepEqual(context.required_placeholders, ["{{redirect_url}}"]);
    assert.ok(logs.some((entry) => entry.event === "creative_revision_patch_completed"));
    assert.equal(
      logs.some((entry) => "apiKey" in entry || "authorization" in entry),
      false
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("full creative revision fallback preserves the complete HTML contract", async () => {
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
    assert.equal(requestBody?.max_output_tokens, 32_000);
    assert.equal("reasoning" in (requestBody ?? {}), false);
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

test("creative revision agent rejects an empty patch plan", async () => {
  setRequiredEnv();
  const { DashboardCreativeRevisionAgent } =
    await import("../src/features/dashboard/provider/dashboard-creative-revision-agent.js");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        output: [
          {
            type: "function_call",
            name: "submit_creative_revision_patch",
            arguments: JSON.stringify({
              strategy: "patch",
              replacements: [],
              headline: "기존 제목",
              body: "기존 본문",
              cta: "예약",
              change_summary: "변경했습니다."
            })
          }
        ]
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  try {
    await assert.rejects(
      () =>
        new DashboardCreativeRevisionAgent().planPatch({
          body: "기존 본문",
          channel: "email",
          cta: "예약",
          feedback: "색상을 바꿔줘",
          headline: "기존 제목",
          html: "<h1>기존 제목</h1><p>기존 본문</p><a>예약</a>"
        }),
      /patch strategy requires/
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
