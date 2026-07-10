import {
  DashboardCreateFunnelRequestSchema,
  DashboardDeleteFunnelResultSchema,
  DashboardEventCatalogSchema,
  DashboardFunnelListSchema,
  DashboardFunnelMetricsSchema,
  DashboardFunnelPreviewRequestSchema,
  DashboardFunnelPreviewSchema,
  DashboardFunnelSchema,
  DashboardUpdateFunnelRequestSchema,
  type DashboardCreateFunnelRequest,
  type DashboardDeleteFunnelResult,
  type DashboardEventCatalog,
  type DashboardFunnel,
  type DashboardFunnelList,
  type DashboardFunnelMetrics,
  type DashboardFunnelMetricsScope,
  type DashboardFunnelPreview,
  type DashboardFunnelPreviewRequest,
  type DashboardUpdateFunnelRequest
} from "@loopad/shared";
import { apiRequest } from "../../../shared/api/http-client.js";
import type { DashboardQuery } from "../model/dashboard-types.js";
import { fetchDashboardResource } from "./dashboard-resource-api.js";
import { projectSearchParams } from "./dashboard-request.js";

const FUNNELS_PATH = "/dashboard/v1/funnels";

export function createDashboardFunnel(
  query: DashboardQuery,
  requestBody: DashboardCreateFunnelRequest
): Promise<DashboardFunnel> {
  return apiRequest(FUNNELS_PATH, DashboardFunnelSchema, {
    body: DashboardCreateFunnelRequestSchema.parse(requestBody),
    method: "POST",
    searchParams: projectSearchParams(query.projectId)
  });
}

export function updateDashboardFunnel(
  query: DashboardQuery,
  funnelId: string,
  requestBody: DashboardUpdateFunnelRequest
): Promise<DashboardFunnel> {
  return apiRequest(`${FUNNELS_PATH}/${encodeURIComponent(funnelId)}`, DashboardFunnelSchema, {
    body: DashboardUpdateFunnelRequestSchema.parse(requestBody),
    method: "PATCH",
    searchParams: projectSearchParams(query.projectId)
  });
}

export function deleteDashboardFunnel(
  query: DashboardQuery,
  funnelId: string
): Promise<DashboardDeleteFunnelResult> {
  return apiRequest(
    `${FUNNELS_PATH}/${encodeURIComponent(funnelId)}`,
    DashboardDeleteFunnelResultSchema,
    {
      method: "DELETE",
      searchParams: projectSearchParams(query.projectId)
    }
  );
}

export function fetchDashboardEventCatalog(
  query: DashboardQuery,
  signal: AbortSignal
): Promise<DashboardEventCatalog> {
  return fetchDashboardResource(
    "/dashboard/v1/event-catalog",
    DashboardEventCatalogSchema,
    query,
    signal
  );
}

export function fetchDashboardFunnelList(
  query: DashboardQuery,
  signal: AbortSignal
): Promise<DashboardFunnelList> {
  return fetchDashboardResource(FUNNELS_PATH, DashboardFunnelListSchema, query, signal);
}

export function fetchDashboardFunnelMetrics(
  query: DashboardQuery,
  funnelId: string,
  signal: AbortSignal,
  scope?: DashboardFunnelMetricsScope
): Promise<DashboardFunnelMetrics> {
  return fetchDashboardResource(
    `${FUNNELS_PATH}/${encodeURIComponent(funnelId)}/metrics`,
    DashboardFunnelMetricsSchema,
    query,
    signal,
    funnelMetricsScopeSearchParams(scope)
  );
}

export function fetchDashboardFunnel(
  query: DashboardQuery,
  funnelId: string,
  signal: AbortSignal
): Promise<DashboardFunnel> {
  return fetchDashboardResource(
    `${FUNNELS_PATH}/${encodeURIComponent(funnelId)}`,
    DashboardFunnelSchema,
    query,
    signal
  );
}

export function previewDashboardFunnelMetrics(
  query: DashboardQuery,
  requestBody: DashboardFunnelPreviewRequest,
  signal: AbortSignal
): Promise<DashboardFunnelPreview> {
  return apiRequest(`${FUNNELS_PATH}/preview`, DashboardFunnelPreviewSchema, {
    body: DashboardFunnelPreviewRequestSchema.parse(requestBody),
    method: "POST",
    searchParams: projectSearchParams(query.projectId),
    signal
  });
}

function funnelMetricsScopeSearchParams(
  scope: DashboardFunnelMetricsScope | undefined
): Record<string, string | undefined> | undefined {
  if (!scope) {
    return undefined;
  }

  switch (scope.scope_type) {
    case "campaign":
      return { scope_type: scope.scope_type, campaign_id: scope.campaign_id };
    case "promotion":
      return { scope_type: scope.scope_type, promotion_id: scope.promotion_id };
    case "segment":
      return {
        scope_type: scope.scope_type,
        promotion_id: scope.promotion_id,
        segment_id: scope.segment_id
      };
  }
}
