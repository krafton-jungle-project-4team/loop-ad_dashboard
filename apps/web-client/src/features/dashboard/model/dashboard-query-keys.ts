import type { DashboardQuery, DashboardTab } from "./dashboard-types.js";

export function dashboardPageQueryKey(tab: DashboardTab, query: DashboardQuery) {
  return ["dashboard", tab, query] as const;
}

export function dashboardTabQueryKey(tab: DashboardTab) {
  return ["dashboard", tab] as const;
}

export function dashboardEventCatalogQueryKey(projectId: string) {
  return ["dashboard", "event-catalog", projectId] as const;
}
