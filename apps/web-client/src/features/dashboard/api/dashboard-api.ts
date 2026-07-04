import {
  createApiSuccessResponseSchema,
  DashboardCampaignDetailSchema,
  DashboardCampaignSummarySchema,
  DashboardCreateCampaignRequestSchema,
  DashboardCreateFunnelRequestSchema,
  DashboardCreatePromotionRequestSchema,
  DashboardDeleteCampaignResultSchema,
  DashboardDeleteFunnelResultSchema,
  DashboardDeletePromotionResultSchema,
  DashboardEventCatalogSchema,
  DashboardFunnelListSchema,
  DashboardFunnelMetricsSchema,
  DashboardFunnelSchema,
  DashboardMainSchema,
  DashboardPromotionDetailSchema,
  DashboardPromotionSummarySchema,
  DashboardSavedSegmentListSchema,
  DashboardSavedSegmentSchema,
  DashboardSaveSegmentRequestSchema,
  DashboardSegmentDetailSchema,
  DashboardSegmentQueryPreviewRequestSchema,
  DashboardSegmentQueryPreviewSchema,
  DashboardUpdateCampaignRequestSchema,
  DashboardUpdatePromotionRequestSchema
} from "@loopad/shared";
import type {
  DashboardCampaignDetail,
  DashboardCampaignSummary,
  DashboardCreateCampaignRequest,
  DashboardCreateFunnelRequest,
  DashboardCreatePromotionRequest,
  DashboardDeleteCampaignResult,
  DashboardDeleteFunnelResult,
  DashboardDeletePromotionResult,
  DashboardEventCatalog,
  DashboardFunnel,
  DashboardFunnelMetrics,
  DashboardPromotionDetail,
  DashboardPromotionSummary,
  DashboardSavedSegmentList,
  DashboardSavedSegment,
  DashboardSaveSegmentRequest,
  DashboardSegmentDetail,
  DashboardSegmentQueryPreview,
  DashboardSegmentQueryPreviewRequest,
  DashboardUpdateCampaignRequest,
  DashboardUpdatePromotionRequest
} from "@loopad/shared";
import { z } from "zod";
import { dashboardConfig } from "../model/dashboard-config.js";
import type {
  DashboardPageResource,
  DashboardQuery,
  DashboardTab
} from "../model/dashboard-types.js";

export async function fetchDashboardPageResource(
  tab: DashboardTab,
  query: DashboardQuery,
  signal: AbortSignal
): Promise<DashboardPageResource> {
  switch (tab) {
    case "main":
    case "main-campaign-list":
      return {
        tab,
        data: await request("/dashboard/v1/main", DashboardMainSchema, query, signal)
      };
    case "funnels":
    case "funnel-builder":
      return {
        tab,
        data: await request("/dashboard/v1/funnels", DashboardFunnelListSchema, query, signal)
      };
    case "campaigns":
    case "campaign-promotions":
    case "campaign-segments":
    case "campaign-experiment-metrics":
    case "campaign-promotion-metrics":
    case "campaign-metrics":
      return {
        tab,
        data: await request("/dashboard/v1/main", DashboardMainSchema, query, signal)
      };
    case "dataExplorer":
      throw new Error("Data Explorer uses its own API resource flow.");
  }
}

export async function createDashboardFunnel(
  query: DashboardQuery,
  requestBody: DashboardCreateFunnelRequest
): Promise<DashboardFunnel> {
  const parsedBody = DashboardCreateFunnelRequestSchema.parse(requestBody);
  const url = new URL(
    `${dashboardConfig.apiBaseUrl}/dashboard/v1/funnels`,
    window.location.origin
  );
  url.searchParams.set("project_id", query.projectId);

  const response = await fetch(url, {
    body: JSON.stringify(parsedBody),
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    method: "POST"
  });
  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`);
  }

  return createApiSuccessResponseSchema(DashboardFunnelSchema).parse(await response.json()).data;
}

export async function fetchDashboardCampaignDetail(
  query: DashboardQuery,
  campaignId: string,
  signal: AbortSignal
): Promise<DashboardCampaignDetail> {
  return request(
    `/dashboard/v1/campaigns/${encodeURIComponent(campaignId)}`,
    DashboardCampaignDetailSchema,
    query,
    signal
  );
}

export async function createDashboardCampaign(
  query: DashboardQuery,
  requestBody: DashboardCreateCampaignRequest
): Promise<DashboardCampaignSummary> {
  const parsedBody = DashboardCreateCampaignRequestSchema.parse(requestBody);
  const url = new URL(
    `${dashboardConfig.apiBaseUrl}/dashboard/v1/campaigns`,
    window.location.origin
  );
  url.searchParams.set("project_id", query.projectId);

  const response = await fetch(url, {
    body: JSON.stringify(parsedBody),
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    method: "POST"
  });
  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`);
  }

  return createApiSuccessResponseSchema(DashboardCampaignSummarySchema).parse(
    await response.json()
  ).data;
}

export async function updateDashboardCampaign(
  query: DashboardQuery,
  campaignId: string,
  requestBody: DashboardUpdateCampaignRequest
): Promise<DashboardCampaignSummary> {
  const parsedBody = DashboardUpdateCampaignRequestSchema.parse(requestBody);
  const url = new URL(
    `${dashboardConfig.apiBaseUrl}/dashboard/v1/campaigns/${encodeURIComponent(campaignId)}`,
    window.location.origin
  );
  url.searchParams.set("project_id", query.projectId);

  const response = await fetch(url, {
    body: JSON.stringify(parsedBody),
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    method: "PATCH"
  });
  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`);
  }

  return createApiSuccessResponseSchema(DashboardCampaignSummarySchema).parse(
    await response.json()
  ).data;
}

export async function deleteDashboardCampaign(
  query: DashboardQuery,
  campaignId: string
): Promise<DashboardDeleteCampaignResult> {
  const url = new URL(
    `${dashboardConfig.apiBaseUrl}/dashboard/v1/campaigns/${encodeURIComponent(campaignId)}`,
    window.location.origin
  );
  url.searchParams.set("project_id", query.projectId);

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    method: "DELETE"
  });
  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`);
  }

  return createApiSuccessResponseSchema(DashboardDeleteCampaignResultSchema).parse(
    await response.json()
  ).data;
}

export async function fetchDashboardPromotionDetail(
  query: DashboardQuery,
  promotionId: string,
  signal: AbortSignal
): Promise<DashboardPromotionDetail> {
  return request(
    `/dashboard/v1/promotions/${encodeURIComponent(promotionId)}`,
    DashboardPromotionDetailSchema,
    query,
    signal
  );
}

export async function createDashboardPromotion(
  query: DashboardQuery,
  campaignId: string,
  requestBody: DashboardCreatePromotionRequest
): Promise<DashboardPromotionSummary> {
  const parsedBody = DashboardCreatePromotionRequestSchema.parse(requestBody);
  const url = new URL(
    `${dashboardConfig.apiBaseUrl}/dashboard/v1/campaigns/${encodeURIComponent(campaignId)}/promotions`,
    window.location.origin
  );
  url.searchParams.set("project_id", query.projectId);

  const response = await fetch(url, {
    body: JSON.stringify(parsedBody),
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    method: "POST"
  });
  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`);
  }

  return createApiSuccessResponseSchema(DashboardPromotionSummarySchema).parse(
    await response.json()
  ).data;
}

export async function updateDashboardPromotion(
  query: DashboardQuery,
  promotionId: string,
  requestBody: DashboardUpdatePromotionRequest
): Promise<DashboardPromotionSummary> {
  const parsedBody = DashboardUpdatePromotionRequestSchema.parse(requestBody);
  const url = new URL(
    `${dashboardConfig.apiBaseUrl}/dashboard/v1/promotions/${encodeURIComponent(promotionId)}`,
    window.location.origin
  );
  url.searchParams.set("project_id", query.projectId);

  const response = await fetch(url, {
    body: JSON.stringify(parsedBody),
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    method: "PATCH"
  });
  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`);
  }

  return createApiSuccessResponseSchema(DashboardPromotionSummarySchema).parse(
    await response.json()
  ).data;
}

export async function deleteDashboardPromotion(
  query: DashboardQuery,
  promotionId: string
): Promise<DashboardDeletePromotionResult> {
  const url = new URL(
    `${dashboardConfig.apiBaseUrl}/dashboard/v1/promotions/${encodeURIComponent(promotionId)}`,
    window.location.origin
  );
  url.searchParams.set("project_id", query.projectId);

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    method: "DELETE"
  });
  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`);
  }

  return createApiSuccessResponseSchema(DashboardDeletePromotionResultSchema).parse(
    await response.json()
  ).data;
}

export async function fetchDashboardSegmentDetail(
  query: DashboardQuery,
  promotionId: string,
  segmentId: string,
  signal: AbortSignal
): Promise<DashboardSegmentDetail> {
  return request(
    `/dashboard/v1/promotions/${encodeURIComponent(promotionId)}/segments/${encodeURIComponent(segmentId)}`,
    DashboardSegmentDetailSchema,
    query,
    signal
  );
}

export async function deleteDashboardFunnel(
  query: DashboardQuery,
  funnelId: string
): Promise<DashboardDeleteFunnelResult> {
  const url = new URL(
    `${dashboardConfig.apiBaseUrl}/dashboard/v1/funnels/${encodeURIComponent(funnelId)}`,
    window.location.origin
  );
  url.searchParams.set("project_id", query.projectId);

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    method: "DELETE"
  });
  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`);
  }

  return createApiSuccessResponseSchema(DashboardDeleteFunnelResultSchema).parse(
    await response.json()
  ).data;
}

export async function createDashboardSegmentQueryPreview(
  query: DashboardQuery,
  requestBody: DashboardSegmentQueryPreviewRequest
): Promise<DashboardSegmentQueryPreview> {
  const parsedBody = DashboardSegmentQueryPreviewRequestSchema.parse(requestBody);
  const url = new URL(
    `${dashboardConfig.apiBaseUrl}/dashboard/v1/segments/query-preview`,
    window.location.origin
  );
  url.searchParams.set("project_id", query.projectId);

  const response = await fetch(url, {
    body: JSON.stringify(parsedBody),
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    method: "POST"
  });
  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`);
  }

  return createApiSuccessResponseSchema(DashboardSegmentQueryPreviewSchema).parse(
    await response.json()
  ).data;
}

export async function saveDashboardSegment(
  query: DashboardQuery,
  requestBody: DashboardSaveSegmentRequest
): Promise<DashboardSavedSegment> {
  const parsedBody = DashboardSaveSegmentRequestSchema.parse(requestBody);
  const url = new URL(`${dashboardConfig.apiBaseUrl}/dashboard/v1/segments`, window.location.origin);
  url.searchParams.set("project_id", query.projectId);

  const response = await fetch(url, {
    body: JSON.stringify(parsedBody),
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    method: "POST"
  });
  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`);
  }

  return createApiSuccessResponseSchema(DashboardSavedSegmentSchema).parse(await response.json())
    .data;
}

export async function fetchDashboardSavedSegments(
  query: DashboardQuery,
  signal: AbortSignal
): Promise<DashboardSavedSegmentList> {
  return request("/dashboard/v1/segments", DashboardSavedSegmentListSchema, query, signal);
}

export async function fetchDashboardEventCatalog(
  query: DashboardQuery,
  signal: AbortSignal
): Promise<DashboardEventCatalog> {
  return request("/dashboard/v1/event-catalog", DashboardEventCatalogSchema, query, signal);
}

export async function fetchDashboardFunnelMetrics(
  query: DashboardQuery,
  funnelId: string,
  signal: AbortSignal
): Promise<DashboardFunnelMetrics> {
  return request(
    `/dashboard/v1/funnels/${encodeURIComponent(funnelId)}/metrics`,
    DashboardFunnelMetricsSchema,
    query,
    signal
  );
}

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  query: DashboardQuery,
  signal: AbortSignal
): Promise<T> {
  const url = new URL(`${dashboardConfig.apiBaseUrl}${path}`, window.location.origin);
  url.searchParams.set("project_id", query.projectId);
  url.searchParams.set("dateRange", query.dateRange);
  url.searchParams.set("excludeInternalTraffic", String(query.excludeInternalTraffic));
  url.searchParams.set("excludeBotTraffic", String(query.excludeBotTraffic));
  url.searchParams.set("userScope", query.userScope);
  url.searchParams.set("conversionEvent", query.conversionEvent);
  url.searchParams.set("selectedCustomerId", query.selectedCustomerId);
  url.searchParams.set("selectedCampaignId", query.selectedCampaignId);
  url.searchParams.set("selectedPromotionId", query.selectedPromotionId);
  url.searchParams.set("selectedSegmentId", query.selectedSegmentId);
  url.searchParams.set("sort", query.sort);
  if (query.filter) {
    url.searchParams.set("filter", query.filter);
  }

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal
  });
  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`);
  }

  return createApiSuccessResponseSchema(schema).parse(await response.json()).data;
}
