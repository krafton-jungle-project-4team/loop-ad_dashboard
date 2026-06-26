import type {
  ConversionReport,
  CreativeReport,
  DashboardOverview,
  InsightReport,
  RecommendationReport
} from "@loopad/shared";

export type DashboardTab = "overview" | "conversion" | "insights" | "recommendations" | "creatives";

export type DashboardResources = {
  overview: DashboardOverview;
  conversion: ConversionReport;
  insights: InsightReport;
  recommendations: RecommendationReport;
  creatives: CreativeReport;
};

export type DashboardResourceState =
  | { status: "loading"; data?: undefined; error?: undefined }
  | { status: "success"; data: DashboardResources; error?: undefined }
  | { status: "error"; data?: undefined; error: Error };
