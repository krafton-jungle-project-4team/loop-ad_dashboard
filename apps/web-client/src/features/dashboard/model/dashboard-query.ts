import { parseAsBoolean, parseAsString, parseAsStringLiteral, throttle, useQueryStates } from "nuqs";
import type {
  DashboardConversionEvent,
  DashboardDateRange,
  DashboardQuery,
  DashboardSort,
  DashboardUserScope
} from "./dashboard-types.js";

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

export const dashboardUserScopeOptions = [
  { label: "전체", value: "all" },
  { label: "활성", value: "active" },
  { label: "신규", value: "new" },
  { label: "재방문", value: "returning" },
  { label: "이탈 위험", value: "at-risk" }
] as const satisfies ReadonlyArray<{ label: string; value: DashboardUserScope }>;

export const dashboardConversionEventOptions = [
  { label: "구매 완료", value: "purchase-complete" },
  { label: "회원가입", value: "sign-up" },
  { label: "장바구니", value: "add-to-cart" },
  { label: "문의", value: "contact" }
] as const satisfies ReadonlyArray<{ label: string; value: DashboardConversionEvent }>;

export const defaultDashboardQuery: DashboardQuery = {
  conversionEvent: "purchase-complete",
  dateRange: "last-7-days",
  excludeBotTraffic: true,
  excludeInternalTraffic: true,
  filter: "",
  projectId: "food-black-friday-2026",
  selectedCustomerId: "cg-low-mobile",
  sort: "conversion-asc",
  userScope: "all"
};

export const dashboardQueryParsers = {
  conversionEvent: parseAsStringLiteral(dashboardConversionEventOptions.map((item) => item.value)).withDefault(
    defaultDashboardQuery.conversionEvent
  ),
  dateRange: parseAsStringLiteral(dashboardDateRangeOptions.map((item) => item.value)).withDefault(
    defaultDashboardQuery.dateRange
  ),
  excludeBotTraffic: parseAsBoolean.withDefault(defaultDashboardQuery.excludeBotTraffic),
  excludeInternalTraffic: parseAsBoolean.withDefault(defaultDashboardQuery.excludeInternalTraffic),
  filter: parseAsString.withDefault(defaultDashboardQuery.filter),
  projectId: parseAsString.withDefault(defaultDashboardQuery.projectId),
  selectedCustomerId: parseAsString.withDefault(defaultDashboardQuery.selectedCustomerId),
  sort: parseAsStringLiteral(dashboardSortOptions.map((item) => item.value)).withDefault(
    defaultDashboardQuery.sort
  ),
  userScope: parseAsStringLiteral(dashboardUserScopeOptions.map((item) => item.value)).withDefault(
    defaultDashboardQuery.userScope
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
