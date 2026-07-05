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

export function dashboardCampaignDetailQueryKey(projectId: string, campaignId: string) {
  return ["dashboard", "campaign-detail", projectId, campaignId] as const;
}

export function dashboardPromotionDetailQueryKey(projectId: string, promotionId: string) {
  return ["dashboard", "promotion-detail", projectId, promotionId] as const;
}

export function dashboardPromotionSegmentSuggestionsQueryKey(
  projectId: string,
  promotionId: string
) {
  return ["dashboard", "promotion-segment-suggestions", projectId, promotionId] as const;
}

export function dashboardSegmentDetailQueryKey(
  projectId: string,
  promotionId: string,
  segmentId: string
) {
  return ["dashboard", "segment-detail", projectId, promotionId, segmentId] as const;
}

export function dashboardFunnelMetricsQueryKey(projectId: string, funnelId: string) {
  return ["dashboard", "funnel-metrics", projectId, funnelId] as const;
}
