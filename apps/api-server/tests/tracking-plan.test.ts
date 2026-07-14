import assert from "node:assert/strict";
import { test } from "node:test";
import type { ClickHouseClient } from "@clickhouse/client";
import {
  SDK_TRACKING_PLAN_SCHEMA_VERSION,
  TrackingPlanPropertiesSchemaSchema,
  TrackingPlanSchema
} from "@loopad/shared";
import type { Pool } from "pg";
import type { TrackingPlanObservedEventReader } from "../src/features/tracking-plan/tracking-plan-observed-event-reader.js";
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

test("tracking plan events do not expose an event type or internal status", () => {
  const plan = TrackingPlanSchema.parse({
    trackingPlanId: "tracking-plan-1",
    projectId: "project-1",
    name: "Plan",
    status: "draft",
    currentRevision: 0,
    publishedRevision: null,
    sdkKey: "sdk-key",
    allowedOrigins: [],
    events: [
      {
        eventName: "page_view",
        description: "page view",
        status: "system",
        propertiesSchema: { type: "object", properties: {}, required: [] }
      }
    ]
  });

  assert.equal("status" in plan.events[0]!, false);
  assert.equal("type" in plan.events[0]!, false);
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

test("infers Tracking Plan schemas from recently collected event properties", async () => {
  const { inferTrackingPlanEvents } =
    await import("../src/features/tracking-plan/tracking-plan-observed-event-reader.js");
  const events = inferTrackingPlanEvents([
    {
      event_name: "page_view",
      properties_json: JSON.stringify({
        metadata: { count: 1, sku: "hotel-1" },
        optional_label: "home",
        page: { path: "/" },
        route_group: "home",
        sdk: { version: "1.0.0" },
        tags: ["landing"],
        value: 1
      })
    },
    {
      event_name: "page_view",
      properties_json: JSON.stringify({
        metadata: { count: 2, sku: "hotel-2" },
        route_group: "search",
        tags: ["search"],
        value: 2.5
      })
    },
    {
      event_name: "booking_complete",
      properties_json: JSON.stringify({ booking_id: "booking-1", revenue: 120000 })
    },
    {
      event_name: "unstable_event",
      properties_json: JSON.stringify({ value: "one" })
    },
    {
      event_name: "unstable_event",
      properties_json: JSON.stringify({ value: 2 })
    },
    { event_name: "invalid_event", properties_json: "not-json" }
  ]);

  assert.deepEqual(
    events.map((event) => event.eventName),
    ["page_view", "booking_complete", "unstable_event"]
  );
  const pageView = events[0];
  assert.ok(pageView);
  assert.equal(pageView.propertiesSchema.properties?.page, undefined);
  assert.equal(pageView.propertiesSchema.properties?.sdk, undefined);
  assert.equal(pageView.propertiesSchema.properties?.value?.type, "number");
  assert.equal(pageView.propertiesSchema.properties?.metadata?.type, "object");
  assert.equal(pageView.propertiesSchema.properties?.tags?.items?.type, "string");
  assert.deepEqual(pageView.propertiesSchema.required, [
    "metadata",
    "route_group",
    "tags",
    "value"
  ]);
  assert.equal(events[2]?.propertiesSchema.properties?.value, undefined);
  for (const event of events) {
    assert.doesNotThrow(() => TrackingPlanPropertiesSchemaSchema.parse(event.propertiesSchema));
  }
});

test("observed event reader scopes recent samples to the requested project", async () => {
  const { TrackingPlanObservedEventReader } =
    await import("../src/features/tracking-plan/tracking-plan-observed-event-reader.js");
  let request: { query?: string; query_params?: Record<string, unknown> } | undefined;
  const clickhouse = {
    query: async (value: { query?: string; query_params?: Record<string, unknown> }) => {
      request = value;
      return {
        json: async () => [
          { event_name: "page_view", properties_json: JSON.stringify({ route_group: "home" }) }
        ]
      };
    }
  } as unknown as ClickHouseClient;

  const events = await new TrackingPlanObservedEventReader(clickhouse).inferEvents("project-1");

  assert.equal(request?.query_params?.projectId, "project-1");
  assert.equal(request?.query_params?.lookbackDays, 30);
  assert.match(request?.query ?? "", /FROM raw_events/);
  assert.match(request?.query ?? "", /project_id = \{projectId:String\}/);
  assert.deepEqual(
    events.map((event) => event.eventName),
    ["page_view"]
  );
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
  assert.equal("status" in (database.publishedSnapshots[0]?.events[0] ?? {}), false);
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

test("developer page reads the immutable published event schema without an Origin header", async () => {
  const { TrackingPlanService } =
    await import("../src/features/tracking-plan/tracking-plan.service.js");
  const publishedSchema = {
    schemaVersion: SDK_TRACKING_PLAN_SCHEMA_VERSION,
    revision: 2,
    events: [
      {
        eventName: "booking_complete",
        description: "booking complete",
        propertiesSchema: { type: "object" as const, properties: {}, required: [] }
      }
    ]
  };
  const repository = {
    getPublishedSchema: async (projectId: string) => {
      assert.equal(projectId, "demo-shoppingmall");
      return publishedSchema;
    }
  } as unknown as TrackingPlanRepository;
  const service = new TrackingPlanService(repository);

  assert.deepEqual(await service.publishedSchema("demo-shoppingmall"), publishedSchema);
});

test("developer page reports an absent published event schema", async () => {
  const { TrackingPlanService } =
    await import("../src/features/tracking-plan/tracking-plan.service.js");
  const repository = {
    getPublishedSchema: async () => null
  } as unknown as TrackingPlanRepository;
  const service = new TrackingPlanService(repository);

  await assert.rejects(() => service.publishedSchema("demo-shoppingmall"), hasStatus(404));
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

test("observed event creation seeds the demo Origin and inferred event contracts", async () => {
  const { TrackingPlanService } =
    await import("../src/features/tracking-plan/tracking-plan.service.js");
  const inferredEvents = [
    {
      eventName: "booking_complete",
      description: "observed booking",
      propertiesSchema: {
        type: "object" as const,
        properties: { booking_id: { type: "string" as const } },
        required: ["booking_id"]
      }
    }
  ];
  let received: unknown[] | null = null;
  const repository = {
    create: async (...args: unknown[]) => {
      received = args;
      return {};
    }
  } as unknown as TrackingPlanRepository;
  const reader = {
    inferEvents: async () => inferredEvents
  } as unknown as TrackingPlanObservedEventReader;
  const service = new TrackingPlanService(repository, reader);

  await service.createFromObservedEvents("demo-shoppingmall");

  assert.deepEqual(received, [
    "demo-shoppingmall",
    "Demo Site Tracking Plan",
    ["https://demo-shoppingmall.dev.loop-ad.org"],
    inferredEvents
  ]);
});

test("observed event creation stops before creating an empty plan", async () => {
  const { TrackingPlanService } =
    await import("../src/features/tracking-plan/tracking-plan.service.js");
  const repository = {
    create: async () => {
      throw new Error("repository should not be called");
    }
  } as unknown as TrackingPlanRepository;
  const reader = {
    inferEvents: async () => []
  } as unknown as TrackingPlanObservedEventReader;
  const service = new TrackingPlanService(repository, reader);

  await assert.rejects(
    () => service.createFromObservedEvents("demo-shoppingmall"),
    /최근 30일 동안 수집된 이벤트가 없습니다/
  );
});

function fakePublishDatabase(failSettingsUpdate = false) {
  const queries: string[] = [];
  const publishedSnapshots: Array<{
    schemaVersion?: unknown;
    events: Array<Record<string, unknown>>;
  }> = [];
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
