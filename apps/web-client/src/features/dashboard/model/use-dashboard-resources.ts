import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { fetchDashboardPageResource } from "../api/dashboard-api.js";
import type { DashboardQuery, DashboardTab } from "./dashboard-types.js";

export function dashboardPageQueryOptions(tab: DashboardTab, query: DashboardQuery) {
  return queryOptions({
    queryFn: ({ signal }) => fetchDashboardPageResource(tab, query, signal),
    queryKey: ["dashboard", tab, query] as const
  });
}

export function useSuspenseDashboardResources(tab: DashboardTab, query: DashboardQuery) {
  return useSuspenseQuery(dashboardPageQueryOptions(tab, query));
}
