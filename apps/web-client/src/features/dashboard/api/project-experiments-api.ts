import {
  DashboardProjectExperimentListSchema,
  type DashboardProjectExperimentList
} from "@loopad/shared";
import { apiRequest } from "../../../shared/api/http-client.js";
import { projectSearchParams } from "./dashboard-request.js";

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
