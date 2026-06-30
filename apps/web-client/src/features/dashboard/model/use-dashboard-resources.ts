import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchDashboardPageResource } from "../api/dashboard-api.js";
import { createDashboardViewModel } from "../vm/dashboard-view-model.js";
import type { DashboardQuery, DashboardTab } from "./dashboard-types.js";

export function useDashboardResources(tab: DashboardTab, query: DashboardQuery) {
  const enabled = query.projectId.length > 0;
  const queryKey = useMemo(() => ["dashboard", tab, query] as const, [query, tab]);

  return useQuery({
    enabled,
    queryFn: ({ signal }) => fetchDashboardPageResource(tab, query, signal),
    queryKey,
    select: (resource) => createDashboardViewModel(resource, query)
  });
}
