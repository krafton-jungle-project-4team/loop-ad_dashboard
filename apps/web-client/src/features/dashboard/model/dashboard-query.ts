import {
  parseAsBoolean,
  parseAsInteger,
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
import {
  campaignWorkspaceViewValues,
  promotionWorkspaceViewValues,
  segmentWorkspaceViewValues,
  statisticsViewValues
} from "./dashboard-types.js";

export const dashboardDateRangeOptions = [
  { label: "오늘", value: "today" },
  { label: "최근 14일", value: "last-14-days" },
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
  { label: "예약 완료", value: "booking_complete" },
  { label: "예약 시작", value: "booking_start" },
  { label: "숙소 상세 조회", value: "hotel_detail_view" },
  { label: "프로모션 클릭", value: "promotion_click" }
] as const satisfies ReadonlyArray<{ label: string; value: DashboardConversionEvent }>;

export const defaultDashboardProjectId = "demo_project";

export type DashboardSearchQuery = Omit<DashboardQuery, "projectId">;

export const defaultDashboardSearchQuery: DashboardSearchQuery = {
  conversionEvent: "booking_complete",
  createCampaign: false,
  createPromotion: false,
  dateRange: "last-14-days",
  excludeBotTraffic: true,
  excludeInternalTraffic: true,
  experimentPage: 1,
  experimentPageSize: 10,
  campaignView: "manage",
  promotionView: "manage",
  segmentView: "manage",
  statisticsView: "overview",
  experimentPromotionFilter: "all",
  experimentStatusFilter: "all",
  filter: "",
  selectedCampaignId: "",
  selectedAdExperimentId: "",
  selectedCustomerId: "cg-low-mobile",
  selectedPromotionId: "",
  selectedSegmentId: "",
  selectedWorkflowNodeId: "",
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
  createCampaign: parseAsBoolean.withDefault(defaultDashboardSearchQuery.createCampaign),
  createPromotion: parseAsBoolean.withDefault(defaultDashboardSearchQuery.createPromotion),
  dateRange: parseAsStringLiteral(dashboardDateRangeOptions.map((item) => item.value)).withDefault(
    defaultDashboardSearchQuery.dateRange
  ),
  excludeBotTraffic: parseAsBoolean.withDefault(defaultDashboardSearchQuery.excludeBotTraffic),
  excludeInternalTraffic: parseAsBoolean.withDefault(
    defaultDashboardSearchQuery.excludeInternalTraffic
  ),
  experimentPage: parseAsInteger.withDefault(defaultDashboardSearchQuery.experimentPage),
  experimentPageSize: parseAsInteger.withDefault(defaultDashboardSearchQuery.experimentPageSize),
  campaignView: parseAsStringLiteral(campaignWorkspaceViewValues).withDefault(
    defaultDashboardSearchQuery.campaignView
  ),
  promotionView: parseAsStringLiteral(promotionWorkspaceViewValues).withDefault(
    defaultDashboardSearchQuery.promotionView
  ),
  segmentView: parseAsStringLiteral(segmentWorkspaceViewValues).withDefault(
    defaultDashboardSearchQuery.segmentView
  ),
  statisticsView: parseAsStringLiteral(statisticsViewValues).withDefault(
    defaultDashboardSearchQuery.statisticsView
  ),
  experimentPromotionFilter: parseAsString.withDefault(
    defaultDashboardSearchQuery.experimentPromotionFilter
  ),
  experimentStatusFilter: parseAsString.withDefault(
    defaultDashboardSearchQuery.experimentStatusFilter
  ),
  filter: parseAsString.withDefault(defaultDashboardSearchQuery.filter),
  selectedCampaignId: parseAsString.withDefault(defaultDashboardSearchQuery.selectedCampaignId),
  selectedAdExperimentId: parseAsString.withDefault(
    defaultDashboardSearchQuery.selectedAdExperimentId
  ),
  selectedCustomerId: parseAsString.withDefault(defaultDashboardSearchQuery.selectedCustomerId),
  selectedPromotionId: parseAsString.withDefault(defaultDashboardSearchQuery.selectedPromotionId),
  selectedSegmentId: parseAsString.withDefault(defaultDashboardSearchQuery.selectedSegmentId),
  selectedWorkflowNodeId: parseAsString.withDefault(
    defaultDashboardSearchQuery.selectedWorkflowNodeId
  ),
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
    experimentPage: Math.max(1, Math.trunc(query.experimentPage)),
    experimentPageSize: Math.max(1, Math.trunc(query.experimentPageSize)),
    experimentPromotionFilter: query.experimentPromotionFilter.trim(),
    experimentStatusFilter: query.experimentStatusFilter.trim(),
    projectId: projectId.trim(),
    campaignView: normalizeCampaignWorkspaceView(query.campaignView),
    promotionView: normalizePromotionWorkspaceView(query.promotionView),
    segmentView: normalizeSegmentWorkspaceView(query.segmentView),
    selectedCampaignId: query.selectedCampaignId.trim(),
    selectedAdExperimentId: query.selectedAdExperimentId.trim(),
    selectedCustomerId: query.selectedCustomerId.trim(),
    selectedPromotionId: query.selectedPromotionId.trim(),
    selectedSegmentId: query.selectedSegmentId.trim(),
    selectedWorkflowNodeId: query.selectedWorkflowNodeId.trim()
  };
}

export function normalizeCampaignWorkspaceView(
  view: DashboardQuery["campaignView"]
): DashboardQuery["campaignView"] {
  return view === "overview" || view === "experiments" ? "manage" : view;
}

export function normalizePromotionWorkspaceView(
  view: DashboardQuery["promotionView"]
): DashboardQuery["promotionView"] {
  return view === "performance" ? "overview" : view;
}

export function normalizeSegmentWorkspaceView(
  view: DashboardQuery["segmentView"]
): DashboardQuery["segmentView"] {
  return view === "creative" || view === "overview" ? "experiments" : view;
}
