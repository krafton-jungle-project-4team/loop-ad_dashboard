import {
  DashboardEvaluateAdExperimentResultSchema,
  DashboardProjectExperimentListSchema,
  type DashboardEvaluateAdExperimentResult,
  type DashboardProjectExperimentList
} from "@loopad/shared";
import { apiRequest } from "../../../shared/api/http-client.js";
import { projectSearchParams, readDashboardApiErrorMessage } from "./dashboard-request.js";

const PROJECT_EXPERIMENTS_PATH = "/dashboard/v1/experiments";

export function fetchDashboardProjectExperiments(
  projectId: string,
  signal?: AbortSignal
): Promise<DashboardProjectExperimentList> {
  return apiRequest(PROJECT_EXPERIMENTS_PATH, DashboardProjectExperimentListSchema, {
    method: "GET",
    searchParams: projectSearchParams(projectId),
    signal
  });
}

export function evaluateDashboardAdExperiment(
  projectId: string,
  promotionId: string,
  segmentId: string,
  adExperimentId: string
): Promise<DashboardEvaluateAdExperimentResult> {
  return apiRequest(
    `/dashboard/v1/promotions/${encodeURIComponent(promotionId)}/segments/${encodeURIComponent(segmentId)}/ad-experiments/${encodeURIComponent(adExperimentId)}/evaluate`,
    DashboardEvaluateAdExperimentResultSchema,
    {
      errorMessage: readDashboardApiErrorMessage,
      method: "POST",
      searchParams: projectSearchParams(projectId)
    }
  );
}
