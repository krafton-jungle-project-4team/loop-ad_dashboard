import assert from "node:assert/strict";
import { test } from "node:test";
import {
  SDK_TRACKING_PLAN_SCHEMA_VERSION,
  TrackingPlanPropertiesSchemaSchema
} from "@loopad/shared";
import type { Pool } from "pg";
import type { TrackingPlanRepository } from "../src/features/tracking-plan/tracking-plan.repository.js";

setRequiredEnv();

test("accepts recursive typed Tracking Plan properties", () => {
  const parsed = TrackingPlanPropertiesSchemaSchema.parse({
    type: "object",
    properties: {
      amount: { type: "number" },
      item: {
        type: "object",
        properties: {
          sku: { type: "string" },
          quantity: { type: "integer" }
        },
        required: ["sku", "quantity"]
      },
      flags: {
        type: "array",
        items: { type: "boolean" }
      },
      metadata: {
        type: "object",
        properties: { page: { type: "string" } }
      }
    },
    required: ["amount", "item"]
  });

  assert.equal(parsed.properties?.item?.type, "object");
  assert.equal(parsed.properties?.flags?.items?.type, "boolean");
});

test("rejects reserved, unsafe, duplicate, oversized, and over-depth schemas", () => {
  const invalidSchemas = [
    {
      type: "object",
      properties: { page: { type: "string" } },
      required: []
    },
    {
      type: "object",
      properties: {
        item: {
          type: "object",
          properties: { constructor: { type: "string" } },
          required: []
        }
      },
      required: []
    },
    {
      type: "object",
      properties: { value: { type: "string" } },
      required: ["value", "value"]
    },
    {
      type: "object",
      properties: { " value ": { type: "string" } }
    },
    {
      type: "object",
      properties: {},
      required: ["constructor"]
    },
    tooDeepSchema(),
    tooLargeSchema()
  ];

  for (const schema of invalidSchemas) {
    assert.equal(TrackingPlanPropertiesSchemaSchema.safeParse(schema).success, false);
  }

  assert.doesNotThrow(() => {
    const result = TrackingPlanPropertiesSchemaSchema.safeParse(tooDeepSchema(2000));
    assert.equal(result.success, false);
  });
});

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
  assert.equal(database.publishedSnapshots.length, 1);
  assert.equal(database.publishedSnapshots[0]?.schemaVersion, SDK_TRACKING_PLAN_SCHEMA_VERSION);
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
        schemaVersion: SDK_TRACKING_PLAN_SCHEMA_VERSION,
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

test("tracking plan creation forwards the requested allowed Origins", async () => {
  const { TrackingPlanService } =
    await import("../src/features/tracking-plan/tracking-plan.service.js");
  let received: [string, string, string[] | undefined] | null = null;
  const repository = {
    create: async (projectId: string, name: string, allowedOrigins?: string[]) => {
      received = [projectId, name, allowedOrigins];
      return {};
    }
  } as unknown as TrackingPlanRepository;
  const service = new TrackingPlanService(repository);

  await service.create("demo-shoppingmall", {
    name: "Default Tracking Plan",
    allowedOrigins: ["https://demo-shoppingmall.dev.loop-ad.org"]
  });

  assert.deepEqual(received, [
    "demo-shoppingmall",
    "Default Tracking Plan",
    ["https://demo-shoppingmall.dev.loop-ad.org"]
  ]);
});

function fakePublishDatabase(failSettingsUpdate = false) {
  const queries: string[] = [];
  const publishedSnapshots: Array<{ schemaVersion?: unknown }> = [];
  let revision = 0;
  const client = {
    async query(sql: string, parameters?: unknown[]) {
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
      if (normalized.includes("INSERT INTO tracking_plan_revisions")) {
        publishedSnapshots.push(JSON.parse(String(parameters?.[2])));
        return { rows: [] };
      }
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
    publishedSnapshots,
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

function tooDeepSchema(depth = 9) {
  let schema: Record<string, unknown> = { type: "string" };
  for (let index = 0; index < depth; index += 1) {
    schema = {
      type: "object",
      properties: { child: schema },
      required: ["child"]
    };
  }
  return schema;
}

function tooLargeSchema() {
  return {
    type: "object",
    properties: Object.fromEntries(
      Array.from({ length: 100 }, (_, index) => [`property_${index}`, { type: "string" }])
    ),
    required: []
  };
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
