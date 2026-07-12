import assert from "node:assert/strict";
import { test } from "node:test";
import type { Transaction } from "@nestjs-cls/transactional";
import type { PgTypedTransactionalAdapter } from "../src/infra/database/pgtyped-transactional.adapter.js";
import type { DashboardQueryService } from "../src/features/dashboard/service/dashboard-query.service.js";
import type { DashboardEntitySearchService } from "../src/features/dashboard/service/dashboard-entity-search.service.js";

test("entity search reader maps hierarchy ids and forwards the project filter", async () => {
  setRequiredEnv();
  const { DashboardEntitySearchReader } =
    await import("../src/features/dashboard/repository/dashboard-entity-search-reader.js");
  const queries: unknown[] = [];
  const db = {
    query: (_query: unknown, params: unknown) => {
      queries.push(params);
      return {
        multiple: async () => [
          {
            campaignId: "camp_summer",
            displayName: "재방문 고객",
            entityId: "seg_returning",
            entityType: "segment",
            promotionId: "promo_email",
            segmentId: "seg_returning",
            status: "approved",
            updatedAt: new Date("2026-07-11T00:00:00.000Z")
          }
        ]
      };
    }
  } as unknown as Transaction<PgTypedTransactionalAdapter>;
  const reader = new DashboardEntitySearchReader(db);

  const response = await reader.search("project_a", "재방문", "segment");

  assert.deepEqual(queries, [{ entityType: "segment", projectId: "project_a", query: "재방문" }]);
  assert.deepEqual(response.results[0], {
    campaign_id: "camp_summer",
    display_name: "재방문 고객",
    entity_id: "seg_returning",
    entity_type: "segment",
    promotion_id: "promo_email",
    segment_id: "seg_returning",
    status: "approved",
    updated_at: "2026-07-11T00:00:00.000Z"
  });
});

test("entity search controller trims the query and defaults the type to all", async () => {
  setRequiredEnv();
  const { DashboardController } =
    await import("../src/features/dashboard/controller/dashboard.controller.js");
  const searches: unknown[] = [];
  const entitySearch = {
    search: async (projectId: string, query: string, entityType: string) => {
      searches.push({ entityType, projectId, query });
      return { results: [] };
    }
  } as unknown as DashboardEntitySearchService;
  const controller = new DashboardController({} as DashboardQueryService, entitySearch);

  const response = await controller.searchEntities("project_a", "  여름  ", undefined);

  assert.deepEqual(searches, [{ entityType: "all", projectId: "project_a", query: "여름" }]);
  assert.deepEqual(response, { results: [] });
});

test("entity search controller rejects blank queries and unsupported filters", async () => {
  setRequiredEnv();
  const { DashboardController } =
    await import("../src/features/dashboard/controller/dashboard.controller.js");
  const controller = new DashboardController(
    {} as DashboardQueryService,
    { search: async () => ({ results: [] }) } as unknown as DashboardEntitySearchService
  );

  await assert.rejects(() => controller.searchEntities("project_a", "   ", "all"));
  await assert.rejects(() => controller.searchEntities("project_a", "여름", "experiment"));
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
