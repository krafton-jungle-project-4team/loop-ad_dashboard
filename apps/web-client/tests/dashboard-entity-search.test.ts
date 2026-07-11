import assert from "node:assert/strict";
import { test } from "node:test";
import { DashboardEntitySearchQuerySchema } from "@loopad/shared";
import { dashboardEntitySearchQueryKey } from "../src/features/dashboard/model/dashboard-query-keys.js";

test("entity search query key normalizes case and surrounding whitespace", () => {
  assert.deepEqual(dashboardEntitySearchQueryKey("project_a", "  Summer ", "campaign"), [
    "dashboard",
    "entity-search",
    "project_a",
    "campaign",
    "summer"
  ]);
});

test("entity search query schema applies the all filter and rejects empty searches", () => {
  assert.deepEqual(
    DashboardEntitySearchQuerySchema.parse({ project_id: "project_a", q: "  여름 " }),
    { entity_type: "all", project_id: "project_a", q: "여름" }
  );
  assert.equal(
    DashboardEntitySearchQuerySchema.safeParse({ project_id: "project_a", q: "  " }).success,
    false
  );
});
