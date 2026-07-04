import type { DashboardFunnelList, DashboardMain } from "@loopad/shared";

export const dashboardTabValues = [
  "main",
  "main-campaign-list",
  "funnels",
  "campaigns",
  "campaign-promotions",
  "campaign-segments",
  "campaign-experiment-metrics",
  "campaign-promotion-metrics",
  "campaign-metrics",
  "dataExplorer"
] as const;

export type DashboardTab = (typeof dashboardTabValues)[number];

export type DashboardDateRange = "today" | "last-7-days" | "last-30-days" | "campaign";

export type DashboardSort =
  | "conversion-asc"
  | "conversion-desc"
  | "engagement-desc"
  | "dropoff-desc";

export type DashboardUserScope = "all" | "active" | "new" | "returning" | "at-risk";

export type DashboardConversionEvent =
  | "booking_complete"
  | "booking_start"
  | "hotel_detail_view"
  | "promotion_click";

export type DashboardPageResource =
  | { tab: "main"; data: DashboardMain }
  | { tab: "main-campaign-list"; data: DashboardMain }
  | { tab: "funnels"; data: DashboardFunnelList }
  | { tab: "campaign-promotions"; data: DashboardMain }
  | { tab: "campaign-segments"; data: DashboardMain }
  | { tab: "campaign-experiment-metrics"; data: DashboardMain }
  | { tab: "campaign-promotion-metrics"; data: DashboardMain }
  | { tab: "campaign-metrics"; data: DashboardMain }
  | { tab: "campaigns"; data: DashboardMain };

export type DashboardQuery = {
  projectId: string;
  dateRange: DashboardDateRange;
  excludeInternalTraffic: boolean;
  excludeBotTraffic: boolean;
  userScope: DashboardUserScope;
  conversionEvent: DashboardConversionEvent;
  selectedCustomerId: string;
  selectedCampaignId: string;
  selectedPromotionId: string;
  selectedSegmentId: string;
  sort: DashboardSort;
  filter: string;
};
