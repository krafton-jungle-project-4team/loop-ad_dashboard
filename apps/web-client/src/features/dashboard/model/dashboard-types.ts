import type {
  DashboardAiAnalysis,
  DashboardAiGeneration,
  DashboardAiRecommendation,
  DashboardMain,
  DashboardPurchaseConversion
} from "@loopad/shared";

export type DashboardTab =
  | "main"
  | "purchaseConversion"
  | "aiAnalysis"
  | "aiRecommendation"
  | "aiGeneration";

export type DashboardPageResource =
  | { tab: "main"; data: DashboardMain }
  | { tab: "purchaseConversion"; data: DashboardPurchaseConversion }
  | { tab: "aiAnalysis"; data: DashboardAiAnalysis }
  | { tab: "aiRecommendation"; data: DashboardAiRecommendation }
  | { tab: "aiGeneration"; data: DashboardAiGeneration };

export type DashboardQuery = {
  projectId: string;
};

export type DashboardResourceState =
  | { status: "idle"; data?: undefined; error?: undefined }
  | { status: "loading"; data?: undefined; error?: undefined }
  | { status: "success"; data: DashboardPageResource; error?: undefined }
  | { status: "error"; data?: undefined; error: Error };
