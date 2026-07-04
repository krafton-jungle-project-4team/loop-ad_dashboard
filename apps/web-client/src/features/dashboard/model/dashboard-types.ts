import type { DashboardFunnelList, DashboardMain } from "@loopad/shared";

export const dashboardTabValues = ["main", "funnels", "dataExplorer"] as const;

export type DashboardTab = (typeof dashboardTabValues)[number];

export type DashboardDateRange = "today" | "last-7-days" | "last-30-days" | "campaign";

export type DashboardSort =
  | "conversion-asc"
  | "conversion-desc"
  | "engagement-desc"
  | "dropoff-desc";

export type DashboardUserScope = "all" | "active" | "new" | "returning" | "at-risk";

export type DashboardConversionEvent =
  | "purchase-complete"
  | "sign-up"
  | "add-to-cart"
  | "contact";

export type DashboardPageResource =
  | { tab: "main"; data: DashboardMain }
  | { tab: "funnels"; data: DashboardFunnelList };

export type DashboardQuery = {
  projectId: string;
  dateRange: DashboardDateRange;
  excludeInternalTraffic: boolean;
  excludeBotTraffic: boolean;
  userScope: DashboardUserScope;
  conversionEvent: DashboardConversionEvent;
  selectedCustomerId: string;
  sort: DashboardSort;
  filter: string;
};
