import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { DashboardUpdateProjectRequestSchema } from "@loopad/shared";
import { TransactionHost } from "@nestjs-cls/transactional";
import { AppError } from "../src/app-errors.js";
import { updateDashboardProject } from "../src/features/dashboard/database/__generated__/dashboard.queries.js";
import { DashboardCampaignReader } from "../src/features/dashboard/repository/dashboard-campaign-reader.js";

const dashboardSql = readFileSync(
  new URL("../src/features/dashboard/database/dashboard.sql", import.meta.url),
  "utf8"
);

test("project update request accepts only one trimmed name", () => {
  assert.deepEqual(
    DashboardUpdateProjectRequestSchema.parse({ project_name: "  새 프로젝트 이름  " }),
    { project_name: "새 프로젝트 이름" }
  );

  for (const body of [
    { project_name: "" },
    { project_name: "   " },
    { project_name: "a".repeat(256) },
    { project_name: "새 이름", domain: "changed.example.com" },
    { project_name: "새 이름", project_id: "changed-project" },
    { project_name: "새 이름", status: "archived" },
    { project_name: "새 이름", write_key: "changed-write-key" }
  ]) {
    assert.equal(DashboardUpdateProjectRequestSchema.safeParse(body).success, false);
  }
});

test("project update SQL changes only the name and timestamp", () => {
  const querySql = namedQuery(dashboardSql, "UpdateDashboardProject", "ArchiveDashboardProject");
  const setClause = querySql.slice(querySql.indexOf("SET"), querySql.indexOf("WHERE"));

  assert.match(setClause, /project_name = :projectName/);
  assert.match(setClause, /updated_at = now\(\)/);
  assert.doesNotMatch(setClause, /\bproject_id\s*=/);
  assert.doesNotMatch(setClause, /\bdomain\s*=/);
  assert.doesNotMatch(setClause, /\bwrite_key\s*=/);
  assert.doesNotMatch(setClause, /\bstatus\s*=/);
  assert.match(querySql, /WHERE project_id = :projectId/);
  assert.match(querySql, /AND status <> 'archived'/);
});

test("generated project update query binds the name and immutable id", async () => {
  const calls: Array<{ bindings: unknown[]; query: string }> = [];

  await updateDashboardProject.run(
    { projectId: "project-1", projectName: "새 프로젝트 이름" },
    {
      query: async (query, bindings) => {
        calls.push({ bindings, query });
        return { rowCount: 0, rows: [] };
      }
    }
  );

  assert.equal(calls.length, 1);
  assert.match(calls[0]?.query ?? "", /project_name = \$1/);
  assert.match(calls[0]?.query ?? "", /WHERE project_id = \$2/);
  assert.deepEqual(calls[0]?.bindings, ["새 프로젝트 이름", "project-1"]);
});

test("project repository updates by id and preserves returned immutable fields", async () => {
  const calls: Array<{ params: Record<string, unknown>; query: unknown }> = [];
  const reader = new DashboardCampaignReader({
    query: (query: unknown, params: Record<string, unknown>) => {
      calls.push({ params, query });
      return {
        singleOrNull: async () => ({
          createdAt: new Date("2026-07-01T00:00:00.000Z"),
          domain: "demo.example.com",
          projectId: "project-1",
          projectName: "새 프로젝트 이름",
          status: "active",
          updatedAt: new Date("2026-07-25T00:00:00.000Z"),
          writeKey: "wk_original"
        })
      };
    }
  } as never);

  const result = await reader.updateProject("project-1", {
    project_name: "새 프로젝트 이름"
  });

  assert.deepEqual(calls, [
    {
      params: { projectId: "project-1", projectName: "새 프로젝트 이름" },
      query: updateDashboardProject
    }
  ]);
  assert.deepEqual(result, {
    created_at: "2026-07-01T00:00:00.000Z",
    domain: "demo.example.com",
    project_id: "project-1",
    project_name: "새 프로젝트 이름",
    status: "active",
    updated_at: "2026-07-25T00:00:00.000Z",
    write_key: "wk_original"
  });
});

test("project repository returns an explicit 404 for missing or archived projects", async () => {
  const reader = new DashboardCampaignReader({
    query: () => ({
      singleOrNull: async () => null
    })
  } as never);

  await assert.rejects(
    () => reader.updateProject("project-missing", { project_name: "새 이름" }),
    (error) =>
      error instanceof AppError &&
      error.statusCode === 404 &&
      error.code === "DASHBOARD_PROJECT_NOT_FOUND"
  );
});

test("project update controller validates and delegates the trimmed name", async () => {
  setRequiredEnv();
  const { DashboardController } =
    await import("../src/features/dashboard/controller/dashboard.controller.js");
  const writes: unknown[] = [];
  const controller = new DashboardController({
    updateProject: async (projectId: string, request: { project_name: string }) => {
      writes.push({ projectId, request });
      return {
        created_at: "2026-07-01T00:00:00.000Z",
        domain: "demo.example.com",
        project_id: projectId,
        project_name: request.project_name,
        status: "active",
        updated_at: "2026-07-25T00:00:00.000Z",
        write_key: "wk_original"
      };
    }
  } as never);

  const result = await controller.updateProject("project-1", {
    project_name: "  새 프로젝트 이름  "
  });

  assert.deepEqual(writes, [
    {
      projectId: "project-1",
      request: { project_name: "새 프로젝트 이름" }
    }
  ]);
  assert.equal(result.project_id, "project-1");
  assert.equal(result.write_key, "wk_original");

  await assert.rejects(
    () =>
      controller.updateProject("project-1", {
        project_name: "다른 이름",
        domain: "changed.example.com"
      }),
    /Unrecognized key/
  );
});

test("project update service delegates without changing the project id", async () => {
  setRequiredEnv();
  installTransactionHost();
  const { DashboardQueryService } =
    await import("../src/features/dashboard/service/dashboard-query.service.js");
  const writes: unknown[] = [];
  const service = new DashboardQueryService(
    {
      updateProject: async (projectId: string, request: { project_name: string }) => {
        writes.push({ projectId, request });
        return {
          created_at: "2026-07-01T00:00:00.000Z",
          domain: "demo.example.com",
          project_id: projectId,
          project_name: request.project_name,
          status: "active",
          updated_at: "2026-07-25T00:00:00.000Z",
          write_key: "wk_original"
        };
      }
    } as never,
    {} as never,
    {} as never,
    {} as never
  );

  const result = await service.updateProject("project-1", {
    project_name: "새 프로젝트 이름"
  });

  assert.deepEqual(writes, [
    {
      projectId: "project-1",
      request: { project_name: "새 프로젝트 이름" }
    }
  ]);
  assert.equal(result.project_id, "project-1");
  assert.equal(result.domain, "demo.example.com");
  assert.equal(result.write_key, "wk_original");
});

function namedQuery(source: string, name: string, nextName: string): string {
  const start = source.indexOf(`/* @name ${name} */`);
  const end = source.indexOf(`/* @name ${nextName} */`, start);

  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  return source.slice(start, end);
}

function installTransactionHost() {
  new TransactionHost({
    connectionName: undefined,
    defaultTxOptions: {},
    enableTransactionProxy: false,
    extraProviderTokens: [],
    getFallbackInstance: () => ({}),
    wrapWithTransaction: async (_options: unknown, callback: () => Promise<unknown>) => callback()
  } as never);
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
    {
      userId: "user-1",
      email: "demo-recipient-1@loop-ad.org",
      phoneNumber: "+821012345001"
    }
  ]);
}
