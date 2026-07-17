import assert from "node:assert/strict";
import { test } from "node:test";

test("segment assistant routes numeric audience questions to a data query", async () => {
  setRequiredEnv();
  const { fallbackSegmentAssistantPlan } =
    await import("../src/features/dashboard/provider/dashboard-segment-assistant-agent.js");

  const plan = fallbackSegmentAssistantPlan(
    "최근 제주 숙소를 검색했지만 예약을 하지 않은 고객은 얼마나 있어?"
  );

  assert.equal(plan.action, "audience_query");
  assert.equal(plan.lookback_days, 30);
  assert.equal(plan.segment_name, null);
  assert.deepEqual(
    plan.conditions.map((condition) => ({
      destination: condition.destination,
      eventName: condition.event_name,
      maximumCount: condition.maximum_count,
      minimumCount: condition.minimum_count
    })),
    [
      {
        destination: "제주",
        eventName: "hotel_search",
        maximumCount: null,
        minimumCount: 1
      },
      {
        destination: "제주",
        eventName: "booking_complete",
        maximumCount: 0,
        minimumCount: 0
      }
    ]
  );
});

test("segment assistant turns a bare repeated-behavior condition into a free segment preview", async () => {
  setRequiredEnv();
  const { fallbackSegmentAssistantPlan } =
    await import("../src/features/dashboard/provider/dashboard-segment-assistant-agent.js");

  const plan = fallbackSegmentAssistantPlan(
    "최근 제주 숙소를 반복 검색했지만 예약을 하지 않은 고객"
  );

  assert.equal(plan.action, "segment_preview");
  assert.ok(plan.segment_name?.includes("제주"));
  assert.equal(plan.conditions[0]?.event_name, "hotel_search");
  assert.equal(plan.conditions[0]?.minimum_count, 2);
  assert.equal(plan.conditions[1]?.event_name, "booking_complete");
  assert.equal(plan.conditions[1]?.maximum_count, 0);
});

test("segment assistant asks for clarification when no supported condition can be inferred", async () => {
  setRequiredEnv();
  const { fallbackSegmentAssistantPlan } =
    await import("../src/features/dashboard/provider/dashboard-segment-assistant-agent.js");

  const plan = fallbackSegmentAssistantPlan("좋은 고객을 찾아줘");

  assert.equal(plan.action, "clarification");
  assert.equal(plan.conditions.length, 0);
  assert.ok(plan.clarification_message);
});

test("segment assistant fallback preserves prior conditions for a follow-up", async () => {
  setRequiredEnv();
  const { fallbackSegmentAssistantPlan } =
    await import("../src/features/dashboard/provider/dashboard-segment-assistant-agent.js");

  const plan = fallbackSegmentAssistantPlan("그중 예약 완료 고객은 빼줘", [
    { role: "user", content: "최근 제주 숙소를 반복 검색한 고객은 몇 명이야?" },
    { role: "assistant", content: "조건에 맞는 고객은 100명입니다." }
  ]);

  assert.equal(plan.action, "audience_query");
  assert.equal(plan.conditions[0]?.event_name, "hotel_search");
  assert.equal(plan.conditions[0]?.minimum_count, 2);
  assert.equal(plan.conditions[0]?.destination, "제주");
  assert.equal(plan.conditions[1]?.event_name, "booking_complete");
  assert.equal(plan.conditions[1]?.maximum_count, 0);
});

test("structured segment conditions compile to whitelisted read-only ClickHouse predicates", async () => {
  const { planStructuredSegmentQuery } =
    await import("../src/features/dashboard/repository/dashboard-segment-query-repository.js");
  const query = planStructuredSegmentQuery(
    "demo_project",
    {
      action: "segment_preview",
      segment_name: "최근 제주 미예약 고객",
      lookback_days: 30,
      conditions: [
        {
          label: "제주 숙소 반복 검색",
          event_name: "hotel_search",
          minimum_count: 2,
          maximum_count: null,
          destination: "제주' OR 1 = 1",
          checkin_months: [7, 8],
          property_filters: [{ key: "free_cancellation", operator: "equals", value: "true" }]
        },
        {
          label: "예약 완료 없음",
          event_name: "booking_complete",
          minimum_count: 0,
          maximum_count: 0,
          destination: "제주",
          checkin_months: [],
          property_filters: []
        }
      ],
      clarification_message: null
    },
    {
      from: "2026-06-01T00:00:00.000Z",
      to: "2026-07-01T00:00:00.000Z"
    }
  );

  assert.match(query.generatedSql, /event_name = 'hotel_search'/);
  assert.match(query.generatedSql, /condition_1_count >= 2/);
  assert.match(query.generatedSql, /condition_2_count <= 0/);
  assert.match(query.generatedSql, /IN \(7, 8\)/);
  assert.match(query.generatedSql, /toUInt8OrZero/);
  assert.match(query.generatedSql, /제주'' OR 1 = 1/);
  assert.doesNotMatch(query.generatedSql, /\b(INSERT|UPDATE|DELETE|ALTER|DROP|TRUNCATE)\b/i);
  assert.doesNotMatch(query.generatedSql, /LIMIT 500/);
  assert.match(query.previewSql, /LIMIT 500$/);
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
