import {
  parseAsBoolean,
  parseAsString,
  parseAsStringLiteral,
  throttle,
  useQueryStates
} from "nuqs";
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

export const defaultDashboardProjectId = "demo-shop";

export type DashboardSearchQuery = Omit<DashboardQuery, "projectId">;

export const defaultDashboardSearchQuery: DashboardSearchQuery = {
  conversionEvent: "purchase-complete",
  dateRange: "last-7-days",
  excludeBotTraffic: true,
  excludeInternalTraffic: true,
  filter: "",
  selectedCampaignId: "",
  selectedCustomerId: "cg-low-mobile",
  selectedPromotionId: "",
  selectedSegmentId: "",
  sort: "conversion-asc",
  userScope: "all"
};

export const defaultDashboardQuery: DashboardQuery = {
  projectId: defaultDashboardProjectId,
  ...defaultDashboardSearchQuery
};

export const dashboardQueryParsers = {
  conversionEvent: parseAsStringLiteral(
    dashboardConversionEventOptions.map((item) => item.value)
  ).withDefault(defaultDashboardSearchQuery.conversionEvent),
  dateRange: parseAsStringLiteral(dashboardDateRangeOptions.map((item) => item.value)).withDefault(
    defaultDashboardSearchQuery.dateRange
  ),
  excludeBotTraffic: parseAsBoolean.withDefault(defaultDashboardSearchQuery.excludeBotTraffic),
  excludeInternalTraffic: parseAsBoolean.withDefault(
    defaultDashboardSearchQuery.excludeInternalTraffic
  ),
  filter: parseAsString.withDefault(defaultDashboardSearchQuery.filter),
  selectedCampaignId: parseAsString.withDefault(defaultDashboardSearchQuery.selectedCampaignId),
  selectedCustomerId: parseAsString.withDefault(defaultDashboardSearchQuery.selectedCustomerId),
  selectedPromotionId: parseAsString.withDefault(defaultDashboardSearchQuery.selectedPromotionId),
  selectedSegmentId: parseAsString.withDefault(defaultDashboardSearchQuery.selectedSegmentId),
  sort: parseAsStringLiteral(dashboardSortOptions.map((item) => item.value)).withDefault(
    defaultDashboardSearchQuery.sort
  ),
  userScope: parseAsStringLiteral(dashboardUserScopeOptions.map((item) => item.value)).withDefault(
    defaultDashboardSearchQuery.userScope
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

export function normalizeDashboardQuery(
  query: DashboardSearchQuery,
  projectId: string
): DashboardQuery {
  return {
    ...query,
    filter: query.filter.trim(),
    projectId: projectId.trim(),
    selectedCampaignId: query.selectedCampaignId.trim(),
    selectedCustomerId: query.selectedCustomerId.trim(),
    selectedPromotionId: query.selectedPromotionId.trim(),
    selectedSegmentId: query.selectedSegmentId.trim()
  };
}
