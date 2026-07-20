import assert from "node:assert/strict";
import test from "node:test";
import { captureJsonLogs } from "./log-capture.js";

test("request logging redacts credential-bearing path segments and query strings", async () => {
  setRequiredEnv();
  const { requestLoggingMiddleware } =
    await import("../src/infra/http/request-logging.middleware.js");
  const sdkKey = "sdk-secret-value";
  const redirectToken = "redirect-secret-value";

  const { logs } = await captureJsonLogs(async () => {
    finishRequest(
      requestLoggingMiddleware,
      `/api/public/v1/sdk/connections/${sdkKey}/schema?revision=2`
    );
    finishRequest(requestLoggingMiddleware, `/r/${redirectToken}?utm_source=email`);
  });

  const paths = logs
    .filter((entry) => entry.event === "http_request_completed")
    .map((entry) => entry.path);
  assert.deepEqual(paths, ["/api/public/v1/sdk/connections/:sdkKey/schema", "/r/:redirectId"]);
  assert.equal(JSON.stringify(logs).includes(sdkKey), false);
  assert.equal(JSON.stringify(logs).includes(redirectToken), false);
});

function finishRequest(
  middleware: typeof import("../src/infra/http/request-logging.middleware.js").requestLoggingMiddleware,
  originalUrl: string
) {
  let finish: (() => void) | undefined;
  middleware(
    {
      headers: {},
      method: "GET",
      originalUrl
    },
    {
      on(_event, listener) {
        finish = listener;
      },
      setHeader() {},
      statusCode: 200
    },
    () => undefined
  );
  assert.ok(finish);
  finish();
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
