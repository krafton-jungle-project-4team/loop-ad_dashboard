import type {
  DashboardEventsSummary,
  DashboardExperiment,
  DashboardExperimentPerformance,
  DashboardFunnel,
  DashboardRecommendations
} from "@loopad/shared";

export type DashboardTab = "events" | "funnel" | "recommendations" | "experiment";

export type DashboardResources = {
  eventsSummary: DashboardEventsSummary;
  funnel: DashboardFunnel;
  recommendations: DashboardRecommendations;
  experiment: DashboardExperiment;
  experimentPerformance: DashboardExperimentPerformance;
};

export type DashboardResourceState =
  | { status: "loading"; data?: undefined; error?: undefined }
  | { status: "success"; data: DashboardResources; error?: undefined }
  | { status: "error"; data?: undefined; error: Error };
