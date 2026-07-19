import type { DashboardEntitySearchType, DashboardFunnelMetricsScope } from "@loopad/shared";
import type { DashboardQuery, DashboardTab } from "./dashboard-types.js";

export function dashboardPageQueryKey(tab: DashboardTab, query: DashboardQuery) {
  return ["dashboard", tab, query] as const;
}

export function dashboardTabQueryKey(tab: DashboardTab) {
  return ["dashboard", tab] as const;
}

export function dashboardProjectsQueryKey() {
  return ["dashboard", "projects"] as const;
}

export function dashboardProjectExperimentsQueryKey(projectId: string) {
  return ["dashboard", "project-experiments", projectId] as const;
}

export function dashboardEventCatalogQueryKey(projectId: string) {
  return ["dashboard", "event-catalog", projectId] as const;
}

export function dashboardEntitySearchQueryKey(
  projectId: string,
  query: string,
  entityType: DashboardEntitySearchType = "all"
) {
  return ["dashboard", "entity-search", projectId, entityType, query.trim().toLowerCase()] as const;
}

export function dashboardCampaignDetailQueryKey(projectId: string, campaignId: string) {
  return ["dashboard", "campaign", projectId, campaignId] as const;
}

export function dashboardPromotionDetailQueryKey(projectId: string, promotionId: string) {
  return ["dashboard", "promotion-detail", projectId, promotionId] as const;
}

export function dashboardPromotionOffersQueryKey(projectId: string) {
  return ["dashboard", "promotion-offers", projectId] as const;
}

export function dashboardPromotionAnalysisProgressQueryKey(projectId: string, promotionId: string) {
  return ["dashboard", "promotion-analysis-progress", projectId, promotionId] as const;
}

export function dashboardPromotionSegmentSuggestionsQueryKey(
  projectId: string,
  promotionId: string,
  analysisId?: string | null
) {
  return [
    "dashboard",
    "promotion-segment-suggestions",
    projectId,
    promotionId,
    analysisId ?? "latest"
  ] as const;
}

export function dashboardPromotionScopedSegmentDefinitionsQueryKey(
  projectId: string,
  promotionId: string
) {
  return ["dashboard", "promotion-scoped-segment-definitions", projectId, promotionId] as const;
}

export function dashboardSegmentDetailQueryKey(
  projectId: string,
  promotionId: string,
  segmentId: string
) {
  return ["dashboard", "segment-detail", projectId, promotionId, segmentId] as const;
}

export function dashboardFunnelListQueryKey(projectId: string) {
  return ["dashboard", "funnel-list", projectId] as const;
}

export function dashboardFunnelMetricsQueryKey(
  projectId: string,
  funnelId: string,
  dateRange: DashboardQuery["dateRange"],
  scope?: DashboardFunnelMetricsScope | null
) {
  return ["dashboard", "funnel-metrics", projectId, funnelId, dateRange, scope ?? null] as const;
}

export function dashboardFunnelDetailQueryKey(projectId: string, funnelId: string) {
  return ["dashboard", "funnel-detail", projectId, funnelId] as const;
}

export function dashboardFunnelPreviewQueryKey(
  projectId: string,
  eventNames: string[],
  dateRange: DashboardQuery["dateRange"]
) {
  return ["dashboard", "funnel-preview", projectId, eventNames, dateRange] as const;
}
