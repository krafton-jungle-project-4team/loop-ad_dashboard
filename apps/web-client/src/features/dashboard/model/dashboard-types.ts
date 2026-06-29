import type {
  DashboardEventsSummary,
  DashboardExperiment,
  DashboardExperimentPerformance,
  DashboardFunnel,
  DashboardRecommendations
} from "@loopad/shared";

export type DashboardTab =
  | "dashboard"
  | "funnelSegments"
  | "recommendationResults"
  | "contentResults"
  | "experimentPerformance";

export type DashboardExperimentPerformancePage = {
  experiment: DashboardExperiment;
  performance: DashboardExperimentPerformance;
};

export type DashboardPageResource =
  | { tab: "dashboard"; data: DashboardEventsSummary }
  | { tab: "funnelSegments"; data: DashboardFunnel }
  | { tab: "recommendationResults"; data: DashboardRecommendations }
  | { tab: "contentResults"; data: DashboardRecommendations }
  | { tab: "experimentPerformance"; data: DashboardExperimentPerformancePage };

export type DashboardQuery = {
  projectId: string;
  experimentId: string;
  recommendationResultId?: string;
};

export type DashboardResourceState =
  | { status: "idle"; data?: undefined; error?: undefined }
  | { status: "loading"; data?: undefined; error?: undefined }
  | { status: "success"; data: DashboardPageResource; error?: undefined }
  | { status: "error"; data?: undefined; error: Error };

export type DashboardActionState =
  | { status: "idle"; error?: undefined }
  | { status: "running"; error?: undefined }
  | { status: "success"; error?: undefined }
  | { status: "error"; error: Error };
