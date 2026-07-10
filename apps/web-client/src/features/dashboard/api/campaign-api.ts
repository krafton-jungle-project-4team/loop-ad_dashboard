import {
  DashboardCampaignDetailSchema,
  DashboardCampaignSummarySchema,
  DashboardCreateCampaignRequestSchema,
  DashboardDeleteCampaignResultSchema,
  DashboardUpdateCampaignRequestSchema,
  type DashboardCampaignDetail,
  type DashboardCampaignSummary,
  type DashboardCreateCampaignRequest,
  type DashboardDeleteCampaignResult,
  type DashboardUpdateCampaignRequest
} from "@loopad/shared";
import { apiRequest } from "../../../shared/api/http-client.js";
import type { DashboardQuery } from "../model/dashboard-types.js";
import { fetchDashboardResource } from "./dashboard-resource-api.js";
import { projectSearchParams } from "./dashboard-request.js";

const CAMPAIGNS_PATH = "/dashboard/v1/campaigns";

export function fetchDashboardCampaignDetail(
  query: DashboardQuery,
  campaignId: string,
  signal: AbortSignal
): Promise<DashboardCampaignDetail> {
  return fetchDashboardResource(
    `${CAMPAIGNS_PATH}/${encodeURIComponent(campaignId)}`,
    DashboardCampaignDetailSchema,
    query,
    signal
  );
}

export function createDashboardCampaign(
  query: DashboardQuery,
  requestBody: DashboardCreateCampaignRequest
): Promise<DashboardCampaignSummary> {
  return apiRequest(CAMPAIGNS_PATH, DashboardCampaignSummarySchema, {
    body: DashboardCreateCampaignRequestSchema.parse(requestBody),
    method: "POST",
    searchParams: projectSearchParams(query.projectId)
  });
}

export function updateDashboardCampaign(
  query: DashboardQuery,
  campaignId: string,
  requestBody: DashboardUpdateCampaignRequest
): Promise<DashboardCampaignSummary> {
  return apiRequest(
    `${CAMPAIGNS_PATH}/${encodeURIComponent(campaignId)}`,
    DashboardCampaignSummarySchema,
    {
      body: DashboardUpdateCampaignRequestSchema.parse(requestBody),
      method: "PATCH",
      searchParams: projectSearchParams(query.projectId)
    }
  );
}

export function deleteDashboardCampaign(
  query: DashboardQuery,
  campaignId: string
): Promise<DashboardDeleteCampaignResult> {
  return apiRequest(
    `${CAMPAIGNS_PATH}/${encodeURIComponent(campaignId)}`,
    DashboardDeleteCampaignResultSchema,
    {
      method: "DELETE",
      searchParams: projectSearchParams(query.projectId)
    }
  );
}
