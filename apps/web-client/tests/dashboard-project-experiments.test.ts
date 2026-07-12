import assert from "node:assert/strict";
import { test } from "node:test";
import { dashboardProjectExperimentsQueryKey } from "../src/features/dashboard/model/dashboard-query-keys.js";

test("project experiments query key is scoped by project", () => {
  assert.deepEqual(dashboardProjectExperimentsQueryKey("project_1"), [
    "dashboard",
    "project-experiments",
    "project_1"
  ]);
});
