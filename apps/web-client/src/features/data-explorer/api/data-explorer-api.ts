import {
  DashboardEventCatalogSchema,
  DataExplorerObjectDetailSchema,
  DataExplorerObjectsResponseSchema,
  DataExplorerQueryRunResponseSchema,
  type DashboardEventCatalog,
  type DataExplorerObjectRef,
  type DataExplorerQueryRunRequest
} from "@loopad/shared";
import { apiGet, apiPost } from "../../../shared/api/http-client.js";

const DATA_EXPLORER_BASE_PATH = "/dashboard/data-explorer";

export function fetchDataExplorerObjects(input: { q?: string; signal: AbortSignal }) {
  const searchParams = new URLSearchParams();
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

export function fetchDataExplorerEventCatalog(input: {
  projectId: string;
  signal: AbortSignal;
}): Promise<DashboardEventCatalog> {
  const searchParams = new URLSearchParams({
    project_id: input.projectId
  });

  return apiGet(
    `/dashboard/v1/event-catalog?${searchParams.toString()}`,
    DashboardEventCatalogSchema,
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

function objectRefSearchParams(ref: DataExplorerObjectRef) {
  const searchParams = new URLSearchParams({
    object_type: ref.object_type,
    object_name: ref.object_name
  });
  return searchParams;
}

function setOptionalSearchParam(searchParams: URLSearchParams, key: string, value?: string | null) {
  if (value) {
    searchParams.set(key, value);
  }
}
