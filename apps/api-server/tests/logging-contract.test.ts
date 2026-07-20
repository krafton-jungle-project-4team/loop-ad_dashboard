import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";
import { captureJsonLogs } from "./log-capture.js";

const EVENT_NAME_PATTERN = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;
const SECRET_FIELD_PATTERN =
  /^(?:apiKey|authorization|cookie|password|redirectToken|refreshToken|sdkKey|sessionToken|writeKey)$/i;
const SOURCE_ROOT = fileURLToPath(new URL("../src", import.meta.url));

test("application logs follow the event and error field contract", () => {
  const violations: string[] = [];

  for (const path of sourceFiles(SOURCE_ROOT)) {
    const source = ts.createSourceFile(
      path,
      readFileSync(path, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS
    );
    visit(source, source, path, violations);
  }

  assert.deepEqual(violations, []);
});

test("logger recursively redacts secret fields", async () => {
  setRequiredEnv();
  const { log } = await import("../src/infra/logger/index.js");
  const secret = "must-not-appear";

  const { logs } = await captureJsonLogs(async () => {
    log.info("secret_redaction_test", {
      authorization: secret,
      nested: {
        openai_api_key: secret,
        items: [{ redirectToken: secret }, { write_key: secret }]
      },
      safeValue: "visible"
    });
  });

  const record = logs.find((entry) => entry.event === "secret_redaction_test");
  assert.ok(record);
  assert.equal(JSON.stringify(record).includes(secret), false);
  assert.equal(record.safeValue, "visible");
});

function visit(node: ts.Node, source: ts.SourceFile, path: string, violations: string[]) {
  if (ts.isCallExpression(node) && isLogCall(node)) {
    const event = node.arguments[0];
    if (!event || !ts.isStringLiteral(event) || !EVENT_NAME_PATTERN.test(event.text)) {
      violations.push(`${location(source, node)}: log event must be lowercase snake_case`);
    }
    const payload = node.arguments[1];
    if (payload && ts.isObjectLiteralExpression(payload)) {
      for (const property of payload.properties) {
        if (ts.isPropertyAssignment(property)) {
          const fieldName = property.name.getText(source).replace(/^['"]|['"]$/g, "");
          if (fieldName === "error") {
            violations.push(`${location(source, property)}: exceptions must use the err field`);
          }
          if (SECRET_FIELD_PATTERN.test(fieldName)) {
            violations.push(`${location(source, property)}: secret fields must not be logged`);
          }
        }
      }
    }
  }

  if (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    node.expression.expression.getText(source) === "console" &&
    !path.endsWith("/infra/logger/logger-context.ts")
  ) {
    violations.push(`${location(source, node)}: direct console logging is not allowed`);
  }

  ts.forEachChild(node, (child) => visit(child, source, path, violations));
}

function isLogCall(node: ts.CallExpression) {
  return (
    ts.isPropertyAccessExpression(node.expression) &&
    node.expression.expression.getText() === "log" &&
    ["debug", "error", "info", "warn"].includes(node.expression.name.text)
  );
}

function location(source: ts.SourceFile, node: ts.Node) {
  const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
  return `${source.fileName}:${line + 1}`;
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.isFile() && path.endsWith(".ts") ? [path] : [];
  });
}

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
