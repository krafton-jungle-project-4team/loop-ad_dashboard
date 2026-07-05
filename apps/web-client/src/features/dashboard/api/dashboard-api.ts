import {
  createApiSuccessResponseSchema,
  DashboardAdExperimentSchema,
  DashboardArchivePromotionScopedSegmentDefinitionResultSchema,
  DashboardApproveContentCandidateRequestSchema,
  DashboardAttachSegmentRequestSchema,
  DashboardCampaignDetailSchema,
  DashboardCampaignSegmentSchema,
  DashboardCampaignSummarySchema,
  DashboardConfirmSegmentSuggestionsRequestSchema,
  DashboardConfirmSegmentSuggestionsResultSchema,
  DashboardCreateCampaignRequestSchema,
  DashboardCreateFunnelRequestSchema,
  DashboardCreateProjectRequestSchema,
  DashboardCreatePromotionSegmentDefinitionRequestSchema,
  DashboardCreatePromotionRequestSchema,
  DashboardDecideSegmentSuggestionRequestSchema,
  DashboardDeleteCampaignResultSchema,
  DashboardDeleteFunnelResultSchema,
  DashboardDeleteProjectResultSchema,
  DashboardDeletePromotionResultSchema,
  DashboardDeletePromotionSegmentResultSchema,
  DashboardEventCatalogSchema,
  DashboardFunnelListSchema,
  DashboardFunnelMetricsSchema,
  DashboardFunnelSchema,
  DashboardMainSchema,
  DashboardNextLoopAnalysisSchema,
  DashboardProjectListSchema,
  DashboardProjectSchema,
  DashboardPromotionDetailSchema,
  DashboardPromotionScopedSegmentDefinitionListSchema,
  DashboardPromotionScopedSegmentDefinitionSchema,
  DashboardPromotionSegmentSuggestionListSchema,
  DashboardPromotionSegmentSuggestionSchema,
  DashboardPromotionSummarySchema,
  DashboardRejectContentCandidateRequestSchema,
  DashboardRejectContentCandidateResultSchema,
  DashboardSavedSegmentSchema,
  DashboardSaveSegmentRequestSchema,
  DashboardSegmentDetailSchema,
  DashboardSegmentQueryPreviewRequestSchema,
  DashboardSegmentQueryPreviewSchema,
  DashboardStartPromotionAnalysisRequestSchema,
  DashboardStartPromotionAnalysisResultSchema,
  DashboardStartPromotionGenerationRequestSchema,
  DashboardStartPromotionGenerationResultSchema,
  DashboardStartNextLoopRequestSchema,
  DashboardUpdateCampaignRequestSchema,
  DashboardUpdatePromotionRequestSchema,
  DashboardUpdatePromotionSegmentRequestSchema
} from "@loopad/shared";
import type {
  DashboardAdExperiment,
  DashboardArchivePromotionScopedSegmentDefinitionResult,
  DashboardApproveContentCandidateRequest,
  DashboardAttachSegmentRequest,
  DashboardCampaignDetail,
  DashboardCampaignSegment,
  DashboardCampaignSummary,
  DashboardConfirmSegmentSuggestionsRequest,
  DashboardConfirmSegmentSuggestionsResult,
  DashboardCreateCampaignRequest,
  DashboardCreateFunnelRequest,
  DashboardCreateProjectRequest,
  DashboardCreatePromotionSegmentDefinitionRequest,
  DashboardCreatePromotionRequest,
  DashboardDecideSegmentSuggestionRequest,
  DashboardDeleteCampaignResult,
  DashboardDeleteFunnelResult,
  DashboardDeleteProjectResult,
  DashboardDeletePromotionResult,
  DashboardDeletePromotionSegmentResult,
  DashboardEventCatalog,
  DashboardFunnel,
  DashboardFunnelMetrics,
  DashboardProject,
  DashboardProjectList,
  DashboardPromotionDetail,
  DashboardPromotionScopedSegmentDefinition,
  DashboardPromotionScopedSegmentDefinitionList,
  DashboardPromotionSegmentSuggestion,
  DashboardPromotionSegmentSuggestionList,
  DashboardPromotionSummary,
  DashboardNextLoopAnalysis,
  DashboardRejectContentCandidateRequest,
  DashboardRejectContentCandidateResult,
  DashboardSavedSegment,
  DashboardSaveSegmentRequest,
  DashboardSegmentDetail,
  DashboardSegmentQueryPreview,
  DashboardSegmentQueryPreviewRequest,
  DashboardStartPromotionAnalysisRequest,
  DashboardStartPromotionAnalysisResult,
  DashboardStartPromotionGenerationRequest,
  DashboardStartPromotionGenerationResult,
  DashboardStartNextLoopRequest,
  DashboardUpdateCampaignRequest,
  DashboardUpdatePromotionRequest,
  DashboardUpdatePromotionSegmentRequest
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
      return {
        tab,
        data: await request("/dashboard/v1/main", DashboardMainSchema, query, signal)
      };
    case "funnels":
      return {
        tab,
        data: await request("/dashboard/v1/funnels", DashboardFunnelListSchema, query, signal)
      };
    case "campaigns":
    case "campaign-flow-map":
    case "campaign-promotions":
    case "experiments":
    case "campaign-metrics":
      return {
        tab,
        data: await request("/dashboard/v1/main", DashboardMainSchema, query, signal)
      };
    case "dataExplorer":
      throw new Error("데이터 탐색기는 별도 API 리소스 흐름을 사용합니다.");
  }
}

export async function fetchDashboardProjects(signal?: AbortSignal): Promise<DashboardProjectList> {
  const url = new URL(
    `${dashboardConfig.apiBaseUrl}/dashboard/v1/projects`,
    window.location.origin
  );

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal
  });
  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`);
  }

  return createApiSuccessResponseSchema(DashboardProjectListSchema).parse(await response.json())
    .data;
}

export async function createDashboardProject(
  requestBody: DashboardCreateProjectRequest
): Promise<DashboardProject> {
  const parsedBody = DashboardCreateProjectRequestSchema.parse(requestBody);
  const url = new URL(
    `${dashboardConfig.apiBaseUrl}/dashboard/v1/projects`,
    window.location.origin
  );

  const response = await fetch(url, {
    body: JSON.stringify(parsedBody),
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    method: "POST"
  });
  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`);
  }

  return createApiSuccessResponseSchema(DashboardProjectSchema).parse(await response.json()).data;
}

export async function deleteDashboardProject(
  projectId: string
): Promise<DashboardDeleteProjectResult> {
  const url = new URL(
    `${dashboardConfig.apiBaseUrl}/dashboard/v1/projects/${encodeURIComponent(projectId)}`,
    window.location.origin
  );

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    method: "DELETE"
  });
  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`);
  }

  return createApiSuccessResponseSchema(DashboardDeleteProjectResultSchema).parse(
    await response.json()
  ).data;
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

export async function attachDashboardSegmentToPromotion(
  query: DashboardQuery,
  promotionId: string,
  requestBody: DashboardAttachSegmentRequest
): Promise<DashboardCampaignSegment> {
  const parsedBody = DashboardAttachSegmentRequestSchema.parse(requestBody);
  const url = new URL(
    `${dashboardConfig.apiBaseUrl}/dashboard/v1/promotions/${encodeURIComponent(promotionId)}/segments`,
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

  return createApiSuccessResponseSchema(DashboardCampaignSegmentSchema).parse(await response.json())
    .data;
}

export async function updateDashboardPromotionSegment(
  query: DashboardQuery,
  promotionId: string,
  segmentId: string,
  requestBody: DashboardUpdatePromotionSegmentRequest
): Promise<DashboardCampaignSegment> {
  const parsedBody = DashboardUpdatePromotionSegmentRequestSchema.parse(requestBody);
  const url = new URL(
    `${dashboardConfig.apiBaseUrl}/dashboard/v1/promotions/${encodeURIComponent(promotionId)}/segments/${encodeURIComponent(segmentId)}`,
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

  return createApiSuccessResponseSchema(DashboardCampaignSegmentSchema).parse(await response.json())
    .data;
}

export async function deleteDashboardPromotionSegment(
  query: DashboardQuery,
  promotionId: string,
  segmentId: string
): Promise<DashboardDeletePromotionSegmentResult> {
  const url = new URL(
    `${dashboardConfig.apiBaseUrl}/dashboard/v1/promotions/${encodeURIComponent(promotionId)}/segments/${encodeURIComponent(segmentId)}`,
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

  return createApiSuccessResponseSchema(DashboardDeletePromotionSegmentResultSchema).parse(
    await response.json()
  ).data;
}

export async function fetchDashboardPromotionSegmentSuggestions(
  query: DashboardQuery,
  promotionId: string,
  signal: AbortSignal,
  analysisId?: string | null
): Promise<DashboardPromotionSegmentSuggestionList> {
  const url = new URL(
    `${dashboardConfig.apiBaseUrl}/dashboard/v1/promotions/${encodeURIComponent(promotionId)}/segment-suggestions`,
    window.location.origin
  );
  url.searchParams.set("project_id", query.projectId);
  if (analysisId) {
    url.searchParams.set("analysis_id", analysisId);
  }

  const response = await fetch(url, { headers: { Accept: "application/json" }, signal });
  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`);
  }

  return createApiSuccessResponseSchema(DashboardPromotionSegmentSuggestionListSchema).parse(
    await response.json()
  ).data;
}

export async function startDashboardPromotionAnalysis(
  query: DashboardQuery,
  promotionId: string,
  requestBody: DashboardStartPromotionAnalysisRequest
): Promise<DashboardStartPromotionAnalysisResult> {
  const parsedBody = DashboardStartPromotionAnalysisRequestSchema.parse(requestBody);
  const url = new URL(
    `${dashboardConfig.apiBaseUrl}/dashboard/v1/promotions/${encodeURIComponent(promotionId)}/segment-suggestions/analyze`,
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

  return createApiSuccessResponseSchema(DashboardStartPromotionAnalysisResultSchema).parse(
    await response.json()
  ).data;
}

export async function startDashboardPromotionGeneration(
  query: DashboardQuery,
  promotionId: string,
  requestBody: DashboardStartPromotionGenerationRequest
): Promise<DashboardStartPromotionGenerationResult> {
  const parsedBody = DashboardStartPromotionGenerationRequestSchema.parse(requestBody);
  const url = new URL(
    `${dashboardConfig.apiBaseUrl}/dashboard/v1/promotions/${encodeURIComponent(promotionId)}/generation`,
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

  return createApiSuccessResponseSchema(DashboardStartPromotionGenerationResultSchema).parse(
    await response.json()
  ).data;
}

export async function fetchDashboardPromotionScopedSegmentDefinitions(
  query: DashboardQuery,
  promotionId: string,
  signal: AbortSignal
): Promise<DashboardPromotionScopedSegmentDefinitionList> {
  const url = new URL(
    `${dashboardConfig.apiBaseUrl}/dashboard/v1/promotions/${encodeURIComponent(promotionId)}/segment-definitions`,
    window.location.origin
  );
  url.searchParams.set("project_id", query.projectId);

  const response = await fetch(url, { headers: { Accept: "application/json" }, signal });
  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`);
  }

  return createApiSuccessResponseSchema(DashboardPromotionScopedSegmentDefinitionListSchema).parse(
    await response.json()
  ).data;
}

export async function createDashboardPromotionScopedSegmentDefinition(
  query: DashboardQuery,
  promotionId: string,
  requestBody: DashboardCreatePromotionSegmentDefinitionRequest
): Promise<DashboardPromotionScopedSegmentDefinition> {
  const parsedBody = DashboardCreatePromotionSegmentDefinitionRequestSchema.parse(requestBody);
  const url = new URL(
    `${dashboardConfig.apiBaseUrl}/dashboard/v1/promotions/${encodeURIComponent(promotionId)}/segment-definitions`,
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

  return createApiSuccessResponseSchema(DashboardPromotionScopedSegmentDefinitionSchema).parse(
    await response.json()
  ).data;
}

export async function archiveDashboardPromotionScopedSegmentDefinition(
  query: DashboardQuery,
  promotionId: string,
  segmentId: string
): Promise<DashboardArchivePromotionScopedSegmentDefinitionResult> {
  const url = new URL(
    `${dashboardConfig.apiBaseUrl}/dashboard/v1/promotions/${encodeURIComponent(promotionId)}/segment-definitions/${encodeURIComponent(segmentId)}`,
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

  return createApiSuccessResponseSchema(
    DashboardArchivePromotionScopedSegmentDefinitionResultSchema
  ).parse(await response.json()).data;
}

export async function decideDashboardPromotionSegmentSuggestion(
  query: DashboardQuery,
  promotionId: string,
  suggestionId: string,
  requestBody: DashboardDecideSegmentSuggestionRequest
): Promise<DashboardPromotionSegmentSuggestion> {
  const parsedBody = DashboardDecideSegmentSuggestionRequestSchema.parse(requestBody);
  const url = new URL(
    `${dashboardConfig.apiBaseUrl}/dashboard/v1/promotions/${encodeURIComponent(promotionId)}/segment-suggestions/${encodeURIComponent(suggestionId)}`,
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

  return createApiSuccessResponseSchema(DashboardPromotionSegmentSuggestionSchema).parse(
    await response.json()
  ).data;
}

export async function confirmDashboardPromotionSegmentSuggestions(
  query: DashboardQuery,
  promotionId: string,
  requestBody: DashboardConfirmSegmentSuggestionsRequest
): Promise<DashboardConfirmSegmentSuggestionsResult> {
  const parsedBody = DashboardConfirmSegmentSuggestionsRequestSchema.parse(requestBody);
  const url = new URL(
    `${dashboardConfig.apiBaseUrl}/dashboard/v1/promotions/${encodeURIComponent(promotionId)}/segment-suggestions/confirm`,
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

  return createApiSuccessResponseSchema(DashboardConfirmSegmentSuggestionsResultSchema).parse(
    await response.json()
  ).data;
}

export async function startDashboardNextLoopAnalysis(
  query: DashboardQuery,
  promotionId: string,
  requestBody: DashboardStartNextLoopRequest
): Promise<DashboardNextLoopAnalysis> {
  const parsedBody = DashboardStartNextLoopRequestSchema.parse(requestBody);
  const url = new URL(
    `${dashboardConfig.apiBaseUrl}/dashboard/v1/promotions/${encodeURIComponent(promotionId)}/next-loop`,
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

  return createApiSuccessResponseSchema(DashboardNextLoopAnalysisSchema).parse(
    await response.json()
  ).data;
}

export async function approveDashboardContentCandidate(
  query: DashboardQuery,
  promotionId: string,
  segmentId: string,
  contentId: string,
  requestBody: DashboardApproveContentCandidateRequest
): Promise<DashboardAdExperiment> {
  const parsedBody = DashboardApproveContentCandidateRequestSchema.parse(requestBody);
  const url = new URL(
    `${dashboardConfig.apiBaseUrl}/dashboard/v1/promotions/${encodeURIComponent(promotionId)}/segments/${encodeURIComponent(segmentId)}/content-candidates/${encodeURIComponent(contentId)}/approve`,
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

  return createApiSuccessResponseSchema(DashboardAdExperimentSchema).parse(await response.json())
    .data;
}

export async function rejectDashboardContentCandidate(
  query: DashboardQuery,
  promotionId: string,
  segmentId: string,
  contentId: string,
  requestBody: DashboardRejectContentCandidateRequest
): Promise<DashboardRejectContentCandidateResult> {
  const parsedBody = DashboardRejectContentCandidateRequestSchema.parse(requestBody);
  const url = new URL(
    `${dashboardConfig.apiBaseUrl}/dashboard/v1/promotions/${encodeURIComponent(promotionId)}/segments/${encodeURIComponent(segmentId)}/content-candidates/${encodeURIComponent(contentId)}/reject`,
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

  return createApiSuccessResponseSchema(DashboardRejectContentCandidateResultSchema).parse(
    await response.json()
  ).data;
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
