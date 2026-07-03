import {
  DataExplorerAiChatResponseSchema,
  DataExplorerAiQueryPlanResponseSchema,
  DataExplorerObjectDdlSchema,
  DataExplorerObjectDetailSchema,
  DataExplorerObjectsResponseSchema,
  DataExplorerQueryRunResponseSchema,
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
import { apiGet, apiPost } from "../../../shared/api/http-client.js";

const DATA_EXPLORER_BASE_PATH = "/dashboard/v1/data-explorer";

export function fetchDataExplorerSources(signal: AbortSignal) {
  return apiGet(`${DATA_EXPLORER_BASE_PATH}/sources`, DataExplorerSourcesResponseSchema, signal);
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

  return apiGet(
    `${DATA_EXPLORER_BASE_PATH}/sources/${input.sourceId}/objects?${searchParams.toString()}`,
    DataExplorerObjectsResponseSchema,
    input.signal
  );
}

export function fetchDataExplorerObjectDetail(input: {
  ref: DataExplorerObjectRef;
  signal: AbortSignal;
}) {
  const searchParams = objectRefSearchParams(input.ref);
  return apiGet(
    `${DATA_EXPLORER_BASE_PATH}/sources/${input.ref.source_id}/objects/detail?${searchParams.toString()}`,
    DataExplorerObjectDetailSchema,
    input.signal
  );
}

export function fetchDataExplorerObjectDdl(input: {
  ref: DataExplorerObjectRef;
  signal: AbortSignal;
}) {
  const searchParams = objectRefSearchParams(input.ref);
  return apiGet(
    `${DATA_EXPLORER_BASE_PATH}/sources/${input.ref.source_id}/objects/ddl?${searchParams.toString()}`,
    DataExplorerObjectDdlSchema,
    input.signal
  );
}

export function validateDataExplorerQuery(body: DataExplorerQueryValidateRequest) {
  return apiPost(
    `${DATA_EXPLORER_BASE_PATH}/queries/validate`,
    DataExplorerQueryValidateResponseSchema,
    body
  );
}

export function runDataExplorerQuery(body: DataExplorerQueryRunRequest) {
  return apiPost(
    `${DATA_EXPLORER_BASE_PATH}/queries/run`,
    DataExplorerQueryRunResponseSchema,
    body
  );
}

export function createDataExplorerAiQueryPlan(body: DataExplorerAiQueryPlanRequest) {
  return apiPost(
    `${DATA_EXPLORER_BASE_PATH}/ai/query-plan`,
    DataExplorerAiQueryPlanResponseSchema,
    body
  );
}

export function runDataExplorerAiQuery(body: DataExplorerQueryRunRequest) {
  return apiPost(
    `${DATA_EXPLORER_BASE_PATH}/ai/query-run`,
    DataExplorerQueryRunResponseSchema,
    body
  );
}

export function runDataExplorerAiChat(body: DataExplorerAiChatRequest) {
  return apiPost(`${DATA_EXPLORER_BASE_PATH}/ai/chat`, DataExplorerAiChatResponseSchema, body);
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
