import assert from "node:assert/strict";
import { test } from "node:test";
import type { Pool } from "pg";
import type { TrackingPlanRepository } from "../src/features/tracking-plan/tracking-plan.repository.js";

setRequiredEnv();

test("publish inserts the immutable revision and switches the active revision in one transaction", async () => {
  const { TrackingPlanRepository: Repository } =
    await import("../src/features/tracking-plan/tracking-plan.repository.js");
  const database = fakePublishDatabase();
  const repository = new Repository(database.pool);

  const plan = await repository.publish("demo-shoppingmall", "user-1");

  assert.equal(plan.currentRevision, 1);
  assert.equal(plan.publishedRevision, 1);
  const begin = database.queries.findIndex((query) => query === "BEGIN");
  const revisionInsert = database.queries.findIndex((query) =>
    query.includes("INSERT INTO tracking_plan_revisions")
  );
  const activeSwitch = database.queries.findIndex((query) =>
    query.includes("UPDATE project_sdk_settings")
  );
  const commit = database.queries.findIndex((query) => query === "COMMIT");
  assert.ok(begin >= 0 && begin < revisionInsert);
  assert.ok(revisionInsert < activeSwitch);
  assert.ok(activeSwitch < commit);
  assert.equal(database.queries.includes("ROLLBACK"), false);
});

test("publish rolls back when the active revision switch fails", async () => {
  const { TrackingPlanRepository: Repository } =
    await import("../src/features/tracking-plan/tracking-plan.repository.js");
  const database = fakePublishDatabase(true);
  const repository = new Repository(database.pool);

  await assert.rejects(() => repository.publish("demo-shoppingmall"), /settings update failed/);
  assert.equal(database.queries.at(-1), "ROLLBACK");
  assert.equal(database.queries.includes("COMMIT"), false);
});

test("public connection requires an exact allowed Origin", async () => {
  const { TrackingPlanService } =
    await import("../src/features/tracking-plan/tracking-plan.service.js");
  const repository = {
    getPublicConnection: async () => ({
      projectId: "demo-shoppingmall",
      writeKey: "sdk-key",
      allowedOrigins: ["https://demo-shoppingmall.dev.loop-ad.org"],
      schema: {
        schemaVersion: "hotel_rec_promo.v1",
        revision: 1,
        events: []
      }
    })
  } as unknown as TrackingPlanRepository;
  const service = new TrackingPlanService(repository);

  await assert.rejects(() => service.connection("sdk-key", undefined), hasStatus(403));
  await assert.rejects(
    () => service.connection("sdk-key", "https://attacker.example"),
    hasStatus(403)
  );
  const connection = await service.connection(
    "sdk-key",
    "https://demo-shoppingmall.dev.loop-ad.org"
  );
  assert.equal(connection.collectorUrl, "https://event.api.dev.loop-ad.org/events");
  assert.equal(connection.revision, 1);
});

function fakePublishDatabase(failSettingsUpdate = false) {
  const queries: string[] = [];
  let revision = 0;
  const client = {
    async query(sql: string) {
      const normalized = sql.replace(/\s+/g, " ").trim();
      queries.push(normalized);
      if (normalized === "BEGIN" || normalized === "COMMIT" || normalized === "ROLLBACK") {
        return { rows: [] };
      }
      if (normalized.includes("UPDATE project_sdk_settings")) {
        if (failSettingsUpdate) throw new Error("settings update failed");
        revision = 1;
        return { rows: [] };
      }
      if (normalized.includes("UPDATE tracking_plans SET current_revision")) {
        revision = 1;
        return { rows: [] };
      }
      if (normalized.includes("INSERT INTO tracking_plan_revisions")) return { rows: [] };
      if (normalized.startsWith("SELECT event_name")) {
        return {
          rows: [
            {
              event_name: "page_view",
              description: "page view",
              status: "system",
              properties_schema_json: { type: "object", properties: {}, required: [] }
            }
          ]
        };
      }
      if (normalized.startsWith("SELECT plan.tracking_plan_id")) {
        return {
          rows: [
            {
              tracking_plan_id: "tracking-plan-1",
              project_id: "demo-shoppingmall",
              name: "Default Tracking Plan",
              status: revision === 0 ? "draft" : "published",
              current_revision: revision,
              sdk_key: "sdk-key",
              allowed_origins_json: ["https://demo-shoppingmall.dev.loop-ad.org"],
              published_revision: revision === 0 ? null : revision
            }
          ]
        };
      }
      throw new Error(`unexpected query: ${normalized}`);
    },
    release() {}
  };
  return {
    queries,
    pool: { connect: async () => client } as unknown as Pool
  };
}

function hasStatus(status: number) {
  return (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "getStatus" in error &&
    typeof error.getStatus === "function" &&
    error.getStatus() === status;
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
    { userId: "user-1", email: "demo@loop-ad.org", phoneNumber: "+821012345001" }
  ]);
}
