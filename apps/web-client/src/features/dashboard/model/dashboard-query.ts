import { parseAsString, parseAsStringLiteral, throttle, useQueryStates } from "nuqs";
import type { DashboardDateRange, DashboardQuery, DashboardSort } from "./dashboard-types.js";

export const dashboardDateRangeOptions = [
  { label: "오늘", value: "today" },
  { label: "최근 7일", value: "last-7-days" },
  { label: "최근 30일", value: "last-30-days" },
  { label: "전체 기간", value: "campaign" }
] as const satisfies ReadonlyArray<{ label: string; value: DashboardDateRange }>;

export const dashboardSortOptions = [
  { label: "전환율 낮은순", value: "conversion-asc" },
  { label: "전환율 높은순", value: "conversion-desc" },
  { label: "참여도 높은순", value: "engagement-desc" },
  { label: "이탈 위험 높은순", value: "dropoff-desc" }
] as const satisfies ReadonlyArray<{ label: string; value: DashboardSort }>;

export const defaultDashboardQuery: DashboardQuery = {
  dateRange: "last-7-days",
  filter: "",
  projectId: "food-black-friday-2026",
  selectedCustomerId: "cg-low-mobile",
  sort: "conversion-asc"
};

export const dashboardQueryParsers = {
  dateRange: parseAsStringLiteral(dashboardDateRangeOptions.map((item) => item.value)).withDefault(
    defaultDashboardQuery.dateRange
  ),
  filter: parseAsString.withDefault(defaultDashboardQuery.filter),
  projectId: parseAsString.withDefault(defaultDashboardQuery.projectId),
  selectedCustomerId: parseAsString.withDefault(defaultDashboardQuery.selectedCustomerId),
  sort: parseAsStringLiteral(dashboardSortOptions.map((item) => item.value)).withDefault(
    defaultDashboardQuery.sort
  )
};

export function useDashboardQueryState() {
  return useQueryStates(dashboardQueryParsers, {
    history: "push",
    limitUrlUpdates: throttle(120),
    scroll: false,
    shallow: true
  });
}

export function normalizeDashboardQuery(query: DashboardQuery): DashboardQuery {
  return {
    ...query,
    filter: query.filter.trim(),
    projectId: query.projectId.trim(),
    selectedCustomerId: query.selectedCustomerId.trim()
  };
}
