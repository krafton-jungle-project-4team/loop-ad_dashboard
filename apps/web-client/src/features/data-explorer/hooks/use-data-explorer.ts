import type { DataExplorerObjectRef } from "@loopad/shared";
import { queryOptions, useMutation } from "@tanstack/react-query";
import {
  fetchDataExplorerObjectDetail,
  fetchDataExplorerObjects,
  runDataExplorerQuery
} from "../api/data-explorer-api.js";

export function dataExplorerObjectsQueryOptions(input: { q: string }) {
  return queryOptions({
    queryFn: ({ signal }) =>
      fetchDataExplorerObjects({
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

export function useDataExplorerMutations() {
  return {
    runQuery: useMutation({ mutationFn: runDataExplorerQuery })
  };
}
