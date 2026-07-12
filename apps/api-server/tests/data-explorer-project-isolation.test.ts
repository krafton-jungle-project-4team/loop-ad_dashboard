import assert from "node:assert/strict";
import test from "node:test";
import { SettingsMap, type ClickHouseClient } from "@clickhouse/client";
import { validateSqlInput } from "../src/features/data-explorer/domain/sql-safety.domain.js";

test("data explorer SQL validation allows one read query and ignores comments and literals", () => {
  for (const sqlText of [
    "SELECT * FROM raw_events",
    "WITH recent AS (SELECT * FROM raw_events) SELECT * FROM recent;",
    "SELECT 'SETTINGS; merge(1)' AS note /* SETTINGS additional_table_filters */"
  ]) {
    assert.equal(validateSqlInput({ sqlText }).status, "valid", sqlText);
  }
});

test("data explorer SQL validation rejects writes, setting overrides, multiple statements, and table functions", () => {
  const cases = [
    ["DELETE FROM raw_events", "SQL_STATEMENT_NOT_ALLOWED"],
    ["SELECT * FROM raw_events; SELECT * FROM raw_events", "SQL_MULTIPLE_STATEMENTS_NOT_ALLOWED"],
    ["SELECT * FROM raw_events SETTINGS additional_table_filters = {}", "SQL_SETTINGS_NOT_ALLOWED"],
    ["SELECT * FROM merge(currentDatabase(), 'raw_events')", "SQL_TABLE_FUNCTION_NOT_ALLOWED"],
    [
      "SELECT * FROM raw_events r, merge(currentDatabase(), 'raw_events') leaked",
      "SQL_TABLE_FUNCTION_NOT_ALLOWED"
    ],
    [
      "SELECT * FROM raw_events JOIN (SELECT * FROM remote('host', db.raw_events)) leaked USING event_id",
      "SQL_TABLE_FUNCTION_NOT_ALLOWED"
    ]
  ] as const;

  for (const [sqlText, expectedCode] of cases) {
    const validation = validateSqlInput({ sqlText });
    assert.equal(validation.status, "invalid", sqlText);
    assert.ok(
      validation.errors.some((issue) => issue.code === expectedCode),
      sqlText
    );
  }
});

test("clickhouse reader applies an out-of-band project filter to every project-scoped object", async () => {
  setRequiredEnv();
  const { ClickHouseEventsReader } =
    await import("../src/features/data-explorer/repository/clickhouse-events-reader.js");
  const requests: Array<{
    query: string;
    clickhouse_settings?: Record<string, unknown>;
  }> = [];
  const clickhouse = {
    query: async (request: { query: string; clickhouse_settings?: Record<string, unknown> }) => {
      requests.push(request);
      if (request.query.includes("FROM system.columns")) {
        return {
          json: async () => [
            { database_name: "loopad", object_name: "raw_events" },
            { database_name: "analytics", object_name: "project_events" }
          ]
        };
      }

      return {
        json: async () => ({
          meta: [{ name: "project_id", type: "String" }],
          data: [{ project_id: "demo_project" }]
        })
      };
    }
  } as unknown as ClickHouseClient;
  const reader = new ClickHouseEventsReader(clickhouse);

  await reader.executeReadOnlyQuery({
    projectId: "demo_project",
    rowLimit: 100,
    sqlText: "SELECT * FROM raw_events",
    timeoutMs: 10_000
  });

  const executionRequest = requests[1];
  const filters = executionRequest?.clickhouse_settings?.additional_table_filters;
  assert.ok(filters instanceof SettingsMap);
  assert.match(
    filters.toString(),
    /'loopad\.raw_events':'project_id = getSetting\(\\'log_comment\\'\)'/
  );
  assert.match(filters.toString(), /'raw_events':'project_id = getSetting\(\\'log_comment\\'\)'/);
  assert.match(filters.toString(), /'analytics\.project_events'/);
  assert.equal(executionRequest?.clickhouse_settings?.log_comment, "demo_project");
  assert.equal(executionRequest?.clickhouse_settings?.readonly, "1");
});

test("clickhouse object summaries identify whether project filtering applies", async () => {
  setRequiredEnv();
  const { ClickHouseEventsReader } =
    await import("../src/features/data-explorer/repository/clickhouse-events-reader.js");
  const clickhouse = {
    query: async () => ({
      json: async () => [
        {
          column_count: 8,
          engine: "MergeTree",
          object_name: "raw_events",
          object_type: "table",
          project_scoped: 1,
          row_count_estimate: 11
        },
        {
          column_count: 4,
          engine: "MergeTree",
          object_name: "expedia_hotel_events",
          object_type: "table",
          project_scoped: 0,
          row_count_estimate: 100
        }
      ]
    })
  } as unknown as ClickHouseClient;
  const reader = new ClickHouseEventsReader(clickhouse);

  const objects = await reader.listObjects({});

  assert.equal(objects[0]?.project_scoped, true);
  assert.equal(objects[1]?.project_scoped, false);
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
  process.env.LOOPAD_DEMO_DISPATCH_RECIPIENTS ??= JSON.stringify([
    {
      email: "demo-recipient-1@loop-ad.org",
      phoneNumber: "+821012345001",
      userId: "user-1"
    }
  ]);
}
