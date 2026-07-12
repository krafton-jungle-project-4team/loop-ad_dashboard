import {
  DashboardEntitySearchQuerySchema,
  DashboardEntitySearchResponseSchema,
  type DashboardEntitySearchResponse,
  type DashboardEntitySearchType
} from "@loopad/shared";
import { apiRequest } from "../../../shared/api/http-client.js";

const ENTITY_SEARCH_PATH = "/dashboard/v1/entity-search";

export function fetchDashboardEntitySearch(
  projectId: string,
  query: string,
  entityType: DashboardEntitySearchType = "all",
  signal?: AbortSignal
): Promise<DashboardEntitySearchResponse> {
  const request = DashboardEntitySearchQuerySchema.parse({
    entity_type: entityType,
    project_id: projectId,
    q: query
  });

  return apiRequest(ENTITY_SEARCH_PATH, DashboardEntitySearchResponseSchema, {
    method: "GET",
    searchParams: request,
    signal
  });
}
