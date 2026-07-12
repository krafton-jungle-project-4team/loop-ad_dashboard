import type { DashboardFunnelList, DashboardMain } from "@loopad/shared";

export const dashboardTabValues = [
  "main",
  "funnels",
  "campaigns",
  "campaign-detail",
  "campaign-flow-map",
  "campaign-promotions",
  "promotions",
  "promotion-metrics",
  "segments",
  "experiments",
  "campaign-metrics",
  "sdk",
  "dataExplorer"
] as const;

export type DashboardTab = (typeof dashboardTabValues)[number];

export type DashboardDateRange = "today" | "last-14-days" | "last-30-days" | "campaign";

export type DashboardSort =
  | "conversion-asc"
  | "conversion-desc"
  | "engagement-desc"
  | "dropoff-desc";

export type DashboardUserScope = "all" | "active" | "new" | "returning" | "at-risk";

export const statisticsViewValues = ["overview", "user-paths"] as const;
export type StatisticsView = (typeof statisticsViewValues)[number];

export type DashboardConversionEvent =
  | "booking_complete"
  | "booking_start"
  | "hotel_detail_view"
  | "promotion_click";

export const campaignWorkspaceViewValues = [
  "manage",
  "overview",
  "performance",
  "experiments"
] as const;
export type CampaignWorkspaceView = (typeof campaignWorkspaceViewValues)[number];

export const promotionWorkspaceViewValues = ["manage", "overview", "performance"] as const;
export type PromotionWorkspaceView = (typeof promotionWorkspaceViewValues)[number];

export const segmentWorkspaceViewValues = [
  "manage",
  "overview",
  "recommendations",
  "creative",
  "experiments"
] as const;
export type SegmentWorkspaceView = (typeof segmentWorkspaceViewValues)[number];

export type DashboardPageResource =
  | { tab: "main"; data: DashboardMain }
  | { tab: "funnels"; data: DashboardFunnelList }
  | { tab: "campaign-flow-map"; data: DashboardMain }
  | { tab: "campaign-detail"; data: DashboardMain }
  | { tab: "campaign-promotions"; data: DashboardMain }
  | { tab: "promotions"; data: DashboardMain }
  | { tab: "promotion-metrics"; data: DashboardMain }
  | { tab: "segments"; data: DashboardMain }
  | { tab: "experiments"; data: DashboardMain }
  | { tab: "campaign-metrics"; data: DashboardMain }
  | { tab: "campaigns"; data: DashboardMain };

export type DashboardQuery = {
  projectId: string;
  createCampaign: boolean;
  createPromotion: boolean;
  dateRange: DashboardDateRange;
  excludeInternalTraffic: boolean;
  excludeBotTraffic: boolean;
  userScope: DashboardUserScope;
  conversionEvent: DashboardConversionEvent;
  selectedCustomerId: string;
  selectedCampaignId: string;
  selectedPromotionId: string;
  selectedSegmentId: string;
  selectedAdExperimentId: string;
  selectedWorkflowNodeId: string;
  experimentPromotionFilter: string;
  experimentStatusFilter: string;
  experimentPage: number;
  experimentPageSize: number;
  campaignView: CampaignWorkspaceView;
  promotionView: PromotionWorkspaceView;
  segmentView: SegmentWorkspaceView;
  statisticsView: StatisticsView;
  sort: DashboardSort;
  filter: string;
};
