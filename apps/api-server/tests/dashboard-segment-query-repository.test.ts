import assert from "node:assert/strict";
import test from "node:test";
import { serializeJsonDatabaseParameter } from "../src/features/dashboard/repository/dashboard-json-parameter.js";

test("PostgreSQL JSONB 입력은 배열도 JSON 문자열로 직렬화한다", () => {
  assert.equal(
    serializeJsonDatabaseParameter(["user_id", "event_count"]),
    '["user_id","event_count"]'
  );
  assert.equal(
    serializeJsonDatabaseParameter([{ user_id: "user_1", event_count: 3 }]),
    '[{"user_id":"user_1","event_count":3}]'
  );
});

test("구조화 세그먼트 계획은 중첩 JSON 형태를 유지한다", () => {
  assert.equal(
    serializeJsonDatabaseParameter({
      assistant_plan: {
        action: "audience_query",
        conditions: [{ field: "destination_name", operator: "contains", value: "제주" }]
      }
    }),
    '{"assistant_plan":{"action":"audience_query","conditions":[{"field":"destination_name","operator":"contains","value":"제주"}]}}'
  );
});

test("운영 기준 미달 고객군은 실제 조건별 제외 인원으로 병목과 조정안을 계산한다", async () => {
  setRequiredEnv();
  const { DashboardSegmentQueryRepository } =
    await import("../src/features/dashboard/repository/dashboard-segment-query-repository.js");
  const countResults = [180, 55, 120, 86];
  const queries: string[] = [];
  const repository = new DashboardSegmentQueryRepository(
    {} as never,
    {
      query: async ({ query }: { query: string }) => {
        queries.push(query);
        const sampleSize = countResults.shift();
        assert.notEqual(sampleSize, undefined);
        return {
          json: async () => [{ sample_size: sampleSize }]
        };
      }
    } as never
  );

  const diagnostics = await repository.diagnoseAssistantPlan(
    "demo_project",
    {
      action: "segment_preview",
      segment_name: "예약 직전 이탈 고객",
      lookback_days: 30,
      conditions: [
        {
          label: "예약 시작 3회 이상",
          event_name: "booking_start",
          minimum_count: 3,
          maximum_count: null,
          destination: null,
          checkin_months: [],
          property_filters: []
        },
        {
          label: "예약 완료 없음",
          event_name: "booking_complete",
          minimum_count: 0,
          maximum_count: 0,
          destination: null,
          checkin_months: [],
          property_filters: []
        }
      ],
      clarification_message: null
    },
    42
  );

  assert.equal(queries.length, 4);
  assert.deepEqual(diagnostics.conditionDiagnostics, [
    {
      condition_label: "예약 시작 3회 이상",
      sample_size_without_condition: 180,
      recovered_user_count: 138,
      is_bottleneck: true
    },
    {
      condition_label: "예약 완료 없음",
      sample_size_without_condition: 55,
      recovered_user_count: 13,
      is_bottleneck: false
    }
  ]);
  assert.deepEqual(
    diagnostics.suggestedAdjustments.map((adjustment) => ({
      kind: adjustment.kind,
      sampleSize: adjustment.estimated_sample_size
    })),
    [
      { kind: "remove_condition", sampleSize: 180 },
      { kind: "relax_condition", sampleSize: 120 },
      { kind: "expand_window", sampleSize: 86 }
    ]
  );
});

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
  process.env.LOOPAD_DEMO_DISPATCH_RECIPIENTS ??= "[]";
}
