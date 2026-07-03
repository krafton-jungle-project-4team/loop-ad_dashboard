import {
  createApiSuccessResponseSchema,
  DataExplorerAiChatResponseSchema,
  DataExplorerAiQueryPlanResponseSchema,
  DataExplorerObjectDdlSchema,
  DataExplorerObjectDetailSchema,
  DataExplorerObjectsResponseSchema,
  DataExplorerQueryRunResponseSchema,
  DataExplorerQueryRunsResponseSchema,
  DataExplorerQueryValidateResponseSchema,
  DataExplorerSourcesResponseSchema,
  type DataExplorerAiQueryPlanRequest,
  type DataExplorerAiChatRequest,
  type DataExplorerObjectRef,
  type DataExplorerObjectType,
  type DataExplorerQueryRunRequest,
  type DataExplorerQueryValidateRequest,
  type DataExplorerSourceId
} from "@loopad/shared";
import { z } from "zod";
import { dashboardConfig } from "../../dashboard/model/dashboard-config.js";

const DATA_EXPLORER_BASE_PATH = "/dashboard/v1/data-explorer";

export function fetchDataExplorerSources(signal: AbortSignal) {
  return request(`${DATA_EXPLORER_BASE_PATH}/sources`, DataExplorerSourcesResponseSchema, {
    method: "GET",
    signal
  });
}

export function fetchDataExplorerObjects(input: {
  projectId: string;
  sourceId: DataExplorerSourceId;
  databaseName?: string;
  schemaName?: string;
  objectType?: DataExplorerObjectType;
  q?: string;
  signal: AbortSignal;
}) {
  const searchParams = new URLSearchParams({
    project_id: input.projectId
  });
  setOptionalSearchParam(searchParams, "database", input.databaseName);
  setOptionalSearchParam(searchParams, "schema", input.schemaName);
  setOptionalSearchParam(searchParams, "type", input.objectType);
  setOptionalSearchParam(searchParams, "q", input.q);

  return request(
    `${DATA_EXPLORER_BASE_PATH}/sources/${input.sourceId}/objects?${searchParams.toString()}`,
    DataExplorerObjectsResponseSchema,
    { method: "GET", signal: input.signal }
  );
}

export function fetchDataExplorerObjectDetail(input: {
  ref: DataExplorerObjectRef;
  signal: AbortSignal;
}) {
  const searchParams = objectRefSearchParams(input.ref);
  return request(
    `${DATA_EXPLORER_BASE_PATH}/sources/${input.ref.source_id}/objects/detail?${searchParams.toString()}`,
    DataExplorerObjectDetailSchema,
    { method: "GET", signal: input.signal }
  );
}

export function fetchDataExplorerObjectDdl(input: {
  ref: DataExplorerObjectRef;
  signal: AbortSignal;
}) {
  const searchParams = objectRefSearchParams(input.ref);
  return request(
    `${DATA_EXPLORER_BASE_PATH}/sources/${input.ref.source_id}/objects/ddl?${searchParams.toString()}`,
    DataExplorerObjectDdlSchema,
    { method: "GET", signal: input.signal }
  );
}

export function validateDataExplorerQuery(body: DataExplorerQueryValidateRequest) {
  return request(
    `${DATA_EXPLORER_BASE_PATH}/queries/validate`,
    DataExplorerQueryValidateResponseSchema,
    {
      body,
      method: "POST"
    }
  );
}

export function runDataExplorerQuery(body: DataExplorerQueryRunRequest) {
  return request(`${DATA_EXPLORER_BASE_PATH}/queries/run`, DataExplorerQueryRunResponseSchema, {
    body,
    method: "POST"
  });
}

export function createDataExplorerAiQueryPlan(body: DataExplorerAiQueryPlanRequest) {
  return request(
    `${DATA_EXPLORER_BASE_PATH}/ai/query-plan`,
    DataExplorerAiQueryPlanResponseSchema,
    {
      body,
      method: "POST"
    }
  );
}

export function runDataExplorerAiQuery(body: DataExplorerQueryRunRequest) {
  return request(`${DATA_EXPLORER_BASE_PATH}/ai/query-run`, DataExplorerQueryRunResponseSchema, {
    body,
    method: "POST"
  });
}

export function runDataExplorerAiChat(body: DataExplorerAiChatRequest) {
  return request(`${DATA_EXPLORER_BASE_PATH}/ai/chat`, DataExplorerAiChatResponseSchema, {
    body,
    method: "POST"
  });
}

export function fetchDataExplorerQueryRuns(input: {
  projectId: string;
  sourceId?: DataExplorerSourceId;
  signal: AbortSignal;
}) {
  const searchParams = new URLSearchParams({ project_id: input.projectId });
  setOptionalSearchParam(searchParams, "source_id", input.sourceId);

  return request(
    `${DATA_EXPLORER_BASE_PATH}/queries/runs?${searchParams.toString()}`,
    DataExplorerQueryRunsResponseSchema,
    { method: "GET", signal: input.signal }
  );
}

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  init: { body?: unknown; method: "GET" | "POST"; signal?: AbortSignal }
): Promise<T> {
  const url = new URL(`${dashboardConfig.apiBaseUrl}${path}`, window.location.origin);
  const response = await fetch(url, {
    body: init.body ? JSON.stringify(init.body) : undefined,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {})
    },
    method: init.method,
    signal: init.signal
  });

  if (!response.ok) {
    throw new Error(`Data Explorer API 요청 실패: ${response.status}`);
  }

  return createApiSuccessResponseSchema(schema).parse(await response.json()).data;
}

function objectRefSearchParams(ref: DataExplorerObjectRef) {
  const searchParams = new URLSearchParams({
    object_type: ref.object_type,
    object_name: ref.object_name
  });
  setOptionalSearchParam(searchParams, "database", ref.database_name ?? undefined);
  setOptionalSearchParam(searchParams, "schema", ref.schema_name ?? undefined);
  setOptionalSearchParam(searchParams, "column_name", ref.column_name ?? undefined);
  return searchParams;
}

function setOptionalSearchParam(searchParams: URLSearchParams, key: string, value?: string | null) {
  if (value) {
    searchParams.set(key, value);
  }
}
