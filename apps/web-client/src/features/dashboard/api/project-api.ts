import {
  DashboardCreateProjectRequestSchema,
  DashboardDeleteProjectResultSchema,
  DashboardProjectListSchema,
  DashboardProjectSchema,
  type DashboardCreateProjectRequest,
  type DashboardDeleteProjectResult,
  type DashboardProject,
  type DashboardProjectList
} from "@loopad/shared";
import { apiRequest } from "../../../shared/api/http-client.js";

const PROJECTS_PATH = "/dashboard/v1/projects";

export function fetchDashboardProjects(signal?: AbortSignal): Promise<DashboardProjectList> {
  return apiRequest(PROJECTS_PATH, DashboardProjectListSchema, { method: "GET", signal });
}

export function createDashboardProject(
  requestBody: DashboardCreateProjectRequest
): Promise<DashboardProject> {
  return apiRequest(PROJECTS_PATH, DashboardProjectSchema, {
    body: DashboardCreateProjectRequestSchema.parse(requestBody),
    method: "POST"
  });
}

export function deleteDashboardProject(projectId: string): Promise<DashboardDeleteProjectResult> {
  return apiRequest(
    `${PROJECTS_PATH}/${encodeURIComponent(projectId)}`,
    DashboardDeleteProjectResultSchema,
    { method: "DELETE" }
  );
}
