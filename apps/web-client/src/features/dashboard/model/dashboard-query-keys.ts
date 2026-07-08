import type { DashboardFunnelMetricsScope } from "@loopad/shared";
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

export function dashboardEventCatalogQueryKey(projectId: string) {
  return ["dashboard", "event-catalog", projectId] as const;
}

export function dashboardCampaignDetailQueryKey(projectId: string, campaignId: string) {
  return ["dashboard", "campaign-detail", projectId, campaignId] as const;
}

export function dashboardPromotionDetailQueryKey(projectId: string, promotionId: string) {
  return ["dashboard", "promotion-detail", projectId, promotionId] as const;
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
  scope?: DashboardFunnelMetricsScope | null
) {
  return ["dashboard", "funnel-metrics", projectId, funnelId, scope ?? null] as const;
}

export function dashboardFunnelDetailQueryKey(projectId: string, funnelId: string) {
  return ["dashboard", "funnel-detail", projectId, funnelId] as const;
}

export function dashboardFunnelPreviewQueryKey(projectId: string, eventNames: string[]) {
  return ["dashboard", "funnel-preview", projectId, eventNames] as const;
}
