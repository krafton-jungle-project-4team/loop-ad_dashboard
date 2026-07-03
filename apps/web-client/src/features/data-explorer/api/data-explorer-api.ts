import {
  DataExplorerAiChatResponseSchema,
  DataExplorerObjectDetailSchema,
  DataExplorerObjectsResponseSchema,
  DataExplorerQueryRunResponseSchema,
  type DataExplorerAiChatRequest,
  type DataExplorerObjectRef,
  type DataExplorerObjectType,
  type DataExplorerQueryRunRequest
} from "@loopad/shared";
import { apiGet, apiPost } from "../../../shared/api/http-client.js";

const DATA_EXPLORER_BASE_PATH = "/dashboard/data-explorer";

export function fetchDataExplorerObjects(input: {
  databaseName?: string;
  schemaName?: string;
  objectType?: DataExplorerObjectType;
  q?: string;
  signal: AbortSignal;
}) {
  const searchParams = new URLSearchParams();
  setOptionalSearchParam(searchParams, "database", input.databaseName);
  setOptionalSearchParam(searchParams, "schema", input.schemaName);
  setOptionalSearchParam(searchParams, "type", input.objectType);
  setOptionalSearchParam(searchParams, "q", input.q);

  return apiGet(
    `${DATA_EXPLORER_BASE_PATH}/objects?${searchParams.toString()}`,
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
    `${DATA_EXPLORER_BASE_PATH}/objects/detail?${searchParams.toString()}`,
    DataExplorerObjectDetailSchema,
    input.signal
  );
}

export function runDataExplorerQuery(body: DataExplorerQueryRunRequest) {
  return apiPost(
    `${DATA_EXPLORER_BASE_PATH}/queries/run`,
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
  return searchParams;
}

function setOptionalSearchParam(searchParams: URLSearchParams, key: string, value?: string | null) {
  if (value) {
    searchParams.set(key, value);
  }
}
