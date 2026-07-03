import type { DataExplorerObjectRef, DataExplorerSourceId } from "@loopad/shared";
import { queryOptions, useMutation, useQuery } from "@tanstack/react-query";
import {
  createDataExplorerAiQueryPlan,
  fetchDataExplorerObjectDdl,
  fetchDataExplorerObjectDetail,
  fetchDataExplorerObjects,
  fetchDataExplorerQueryRuns,
  fetchDataExplorerSources,
  runDataExplorerAiChat,
  runDataExplorerAiQuery,
  runDataExplorerQuery,
  validateDataExplorerQuery
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

export function dataExplorerQueryRunsQueryOptions(input: {
  projectId: string;
  sourceId?: DataExplorerSourceId;
}) {
  return queryOptions({
    queryFn: ({ signal }) =>
      fetchDataExplorerQueryRuns({
        projectId: input.projectId,
        sourceId: input.sourceId,
        signal
      }),
    queryKey: ["data-explorer", "query-runs", input] as const
  });
}

export function useDataExplorerMutations() {
  return {
    chat: useMutation({ mutationFn: runDataExplorerAiChat }),
    createPlan: useMutation({ mutationFn: createDataExplorerAiQueryPlan }),
    runAiQuery: useMutation({ mutationFn: runDataExplorerAiQuery }),
    runQuery: useMutation({ mutationFn: runDataExplorerQuery }),
    validateQuery: useMutation({ mutationFn: validateDataExplorerQuery })
  };
}

export function useDataExplorerSources() {
  return useQuery(dataExplorerSourcesQueryOptions());
}
