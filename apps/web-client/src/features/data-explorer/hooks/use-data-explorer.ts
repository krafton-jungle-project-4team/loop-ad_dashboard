import type { DataExplorerObjectRef, DataExplorerSourceId } from "@loopad/shared";
import { queryOptions, useQuery } from "@tanstack/react-query";
import {
  fetchDataExplorerObjectDdl,
  fetchDataExplorerObjectDetail,
  fetchDataExplorerObjects,
  fetchDataExplorerSources
} from "../api/data-explorer-api.js";

export function dataExplorerSourcesQueryOptions() {
  return queryOptions({
    queryFn: ({ signal }) => fetchDataExplorerSources(signal),
    queryKey: ["data-explorer", "sources"] as const
  });
}

export function dataExplorerObjectsQueryOptions(input: {
  projectId: string;
  sourceId: DataExplorerSourceId;
  q: string;
}) {
  return queryOptions({
    queryFn: ({ signal }) =>
      fetchDataExplorerObjects({
        projectId: input.projectId,
        sourceId: input.sourceId,
        q: input.q,
        signal
      }),
    queryKey: ["data-explorer", "objects", input] as const
  });
}

export function dataExplorerObjectDetailQueryOptions(ref: DataExplorerObjectRef | null) {
  return queryOptions({
    enabled: !!ref,
    queryFn: ({ signal }) => {
      if (!ref) {
        throw new Error("Data Explorer object ref is required.");
      }
      return fetchDataExplorerObjectDetail({ ref, signal });
    },
    queryKey: ["data-explorer", "object-detail", ref] as const
  });
}

export function dataExplorerObjectDdlQueryOptions(ref: DataExplorerObjectRef | null) {
  return queryOptions({
    enabled: !!ref,
    queryFn: ({ signal }) => {
      if (!ref) {
        throw new Error("Data Explorer object ref is required.");
      }
      return fetchDataExplorerObjectDdl({ ref, signal });
    },
    queryKey: ["data-explorer", "object-ddl", ref] as const
  });
}

export function useDataExplorerSources() {
  return useQuery(dataExplorerSourcesQueryOptions());
}
