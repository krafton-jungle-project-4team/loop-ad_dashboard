import type {
  DashboardAiAnalysis,
  DashboardAiGeneration,
  DashboardAiRecommendation,
  DashboardMain,
  DashboardPurchaseConversion
} from "@loopad/shared";

export const dashboardTabValues = [
  "main",
  "purchaseConversion",
  "aiAnalysis",
  "aiRecommendation",
  "aiGeneration"
] as const;

export type DashboardTab = (typeof dashboardTabValues)[number];

export type DashboardDateRange = "today" | "last-7-days" | "last-30-days" | "campaign";

export type DashboardSort =
  | "conversion-asc"
  | "conversion-desc"
  | "revenue-desc"
  | "dropoff-desc";

export type DashboardPageResource =
  | { tab: "main"; data: DashboardMain }
  | { tab: "purchaseConversion"; data: DashboardPurchaseConversion }
  | { tab: "aiAnalysis"; data: DashboardAiAnalysis }
  | { tab: "aiRecommendation"; data: DashboardAiRecommendation }
  | { tab: "aiGeneration"; data: DashboardAiGeneration };

export type DashboardQuery = {
  projectId: string;
  dateRange: DashboardDateRange;
  selectedCustomerId: string;
  sort: DashboardSort;
  filter: string;
};
