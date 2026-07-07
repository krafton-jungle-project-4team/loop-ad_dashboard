import assert from "node:assert/strict";
import { test } from "node:test";

process.env.LOOPAD_ENV ??= "test";
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

const { createNestLogger } = await import("../src/infra/logger/index.js");
const ANSI_ESCAPE_PREFIX = String.fromCharCode(27) + "[";

test("nest logger writes startup logs as structured JSON", () => {
  const logger = createNestLogger();
  const lines = captureConsoleLog(() => {
    logger.log("DatabaseModule dependencies initialized", "InstanceLoader");
  });

  const entry = parseLogLine(lines[0]);

  assert.equal((lines[0] ?? "").includes(ANSI_ESCAPE_PREFIX), false);
  assert.equal(entry.level, "info");
  assert.equal(entry.event, "nest_log");
  assert.equal(entry.message, "DatabaseModule dependencies initialized");
  assert.equal(entry.nestContext, "InstanceLoader");
  assert.equal(entry.service, "dashboard-api");
  assert.equal(entry.environment, "test");
});

test("nest logger preserves error trace and context", () => {
  const logger = createNestLogger();
  const lines = captureConsoleError(() => {
    logger.error("Startup failed", "stack line", "ExceptionHandler");
  });

  const entry = parseLogLine(lines[0]);

  assert.equal((lines[0] ?? "").includes(ANSI_ESCAPE_PREFIX), false);
  assert.equal(entry.level, "error");
  assert.equal(entry.event, "nest_error");
  assert.equal(entry.message, "Startup failed");
  assert.equal(entry.trace, "stack line");
  assert.equal(entry.nestContext, "ExceptionHandler");
});

function captureConsoleLog(callback: () => void): string[] {
  const original = console.log;
  const lines: string[] = [];

  console.log = (...values: unknown[]) => {
    lines.push(values.map(String).join(" "));
  };

  try {
    callback();
  } finally {
    console.log = original;
  }

  return lines;
}

function captureConsoleError(callback: () => void): string[] {
  const original = console.error;
  const lines: string[] = [];

  console.error = (...values: unknown[]) => {
    lines.push(values.map(String).join(" "));
  };

  try {
    callback();
  } finally {
    console.error = original;
  }

  return lines;
}

function parseLogLine(line: string | undefined): Record<string, unknown> {
  assert.equal(typeof line, "string");
  return JSON.parse(line) as Record<string, unknown>;
}
