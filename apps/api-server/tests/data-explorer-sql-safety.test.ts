import assert from "node:assert/strict";
import { test } from "node:test";
import { applyQueryLimit } from "../src/features/data-explorer/sql/query-limiter.js";
import { validateReadOnlySql } from "../src/features/data-explorer/sql/sql-safety-validator.js";

test("allows simple SELECT statements", () => {
  const validation = validateReadOnlySql({
    sourceId: "postgres_contract",
    sqlText: "SELECT 1",
    rowLimit: 500,
    timeoutMs: 10_000
  });

  assert.equal(validation.status, "valid");
  assert.deepEqual(validation.errors, []);
});

test("allows WITH statements that produce SELECT results", () => {
  const validation = validateReadOnlySql({
    sourceId: "postgres_contract",
    sqlText: "WITH x AS (SELECT 1 AS n) SELECT n FROM x",
    rowLimit: 500,
    timeoutMs: 10_000
  });

  assert.equal(validation.status, "valid");
});

test("rejects write and DDL keywords", () => {
  for (const sqlText of [
    "INSERT INTO events VALUES (1)",
    "UPDATE projects SET name = 'x'",
    "DELETE FROM projects",
    "ALTER TABLE projects ADD COLUMN x text",
    "DROP TABLE projects",
    "TRUNCATE TABLE projects",
    "CREATE TABLE x (id int)"
  ]) {
    const validation = validateReadOnlySql({
      sourceId: "postgres_contract",
      sqlText,
      rowLimit: 500,
      timeoutMs: 10_000
    });

    assert.equal(validation.status, "invalid", sqlText);
  }
});

test("rejects multi-statement SQL while allowing a trailing semicolon", () => {
  const trailingSemicolon = validateReadOnlySql({
    sourceId: "postgres_contract",
    sqlText: "SELECT 1;",
    rowLimit: 500,
    timeoutMs: 10_000
  });
  const multiStatement = validateReadOnlySql({
    sourceId: "postgres_contract",
    sqlText: "SELECT 1; SELECT 2",
    rowLimit: 500,
    timeoutMs: 10_000
  });

  assert.equal(trailingSemicolon.status, "valid");
  assert.equal(trailingSemicolon.normalized_sql, "SELECT 1");
  assert.equal(multiStatement.status, "invalid");
  assert.equal(
    multiStatement.errors.some((error) => error.code === "SQL_MULTI_STATEMENT"),
    true
  );
});

test("rejects ClickHouse external table functions", () => {
  for (const sqlText of [
    "SELECT * FROM url('https://example.test/file.csv')",
    "SELECT * FROM file('events.csv')",
    "SELECT * FROM s3('https://bucket/key')",
    "SELECT * FROM remote('cluster', db, table)"
  ]) {
    const validation = validateReadOnlySql({
      sourceId: "clickhouse_events",
      sqlText,
      rowLimit: 500,
      timeoutMs: 10_000
    });

    assert.equal(validation.status, "invalid", sqlText);
  }
});

test("requires project_id for known project-scoped tables", () => {
  const missingProjectId = validateReadOnlySql({
    sourceId: "clickhouse_events",
    sqlText: "SELECT count() FROM events",
    rowLimit: 500,
    timeoutMs: 10_000
  });
  const scoped = validateReadOnlySql({
    sourceId: "clickhouse_events",
    sqlText: "SELECT count() FROM events WHERE project_id = {project_id:String}",
    rowLimit: 500,
    timeoutMs: 10_000
  });

  assert.equal(missingProjectId.status, "invalid");
  assert.equal(scoped.status, "valid");
});

test("applies a hard row limit when SQL omits or exceeds LIMIT", () => {
  assert.equal(applyQueryLimit("SELECT 1", 500), "SELECT 1\nLIMIT 500");
  assert.equal(applyQueryLimit("SELECT 1 LIMIT 5000", 500), "SELECT 1 LIMIT 500");
  assert.equal(applyQueryLimit("SELECT 1 LIMIT 20", 500), "SELECT 1 LIMIT 20");
});
