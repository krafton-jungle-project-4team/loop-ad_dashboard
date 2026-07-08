import {
  apiFailureResponseSchema,
  createApiSuccessResponseSchema,
  DashboardArchivePromotionScopedSegmentDefinitionResultSchema,
  DashboardApproveContentCandidateRequestSchema,
  DashboardApproveContentCandidateResultSchema,
  DashboardAttachSegmentRequestSchema,
  DashboardBuildPromotionRunAssignmentsResultSchema,
  DashboardCampaignDetailSchema,
  DashboardCampaignSegmentSchema,
  DashboardCampaignSummarySchema,
  DashboardConfirmSegmentSuggestionsRequestSchema,
  DashboardConfirmSegmentSuggestionsResultSchema,
  DashboardCreateCampaignRequestSchema,
  DashboardCreateFunnelRequestSchema,
  DashboardCreateNextLoopRequestSchema,
  DashboardCreateNextLoopResultSchema,
  DashboardCreateProjectRequestSchema,
  DashboardCreatePromotionSegmentDefinitionRequestSchema,
  DashboardCreatePromotionRunRequestSchema,
  DashboardCreatePromotionRunResultSchema,
  DashboardCreatePromotionRequestSchema,
  DashboardDecideSegmentSuggestionRequestSchema,
  DashboardDeleteCampaignResultSchema,
  DashboardDeleteFunnelResultSchema,
  DashboardDeleteProjectResultSchema,
  DashboardDeletePromotionResultSchema,
  DashboardDeletePromotionSegmentResultSchema,
  DashboardEventCatalogSchema,
  DashboardEvaluatePromotionRunResultSchema,
  DashboardFunnelListSchema,
  DashboardFunnelMetricsSchema,
  DashboardFunnelPreviewRequestSchema,
  DashboardFunnelPreviewSchema,
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
  DashboardStartAdExperimentResultSchema,
  DashboardStartPromotionGenerationRequestSchema,
  DashboardStartPromotionGenerationResultSchema,
  DashboardStartNextLoopRequestSchema,
  DashboardUpdateCampaignRequestSchema,
  DashboardUpdateFunnelRequestSchema,
  DashboardUpdatePromotionRequestSchema,
  DashboardUpdatePromotionSegmentRequestSchema,
  PromotionRunDispatchResponseSchema
} from "@loopad/shared";
import type {
  DashboardArchivePromotionScopedSegmentDefinitionResult,
  DashboardApproveContentCandidateRequest,
  DashboardApproveContentCandidateResult,
  DashboardAttachSegmentRequest,
  DashboardBuildPromotionRunAssignmentsResult,
  DashboardCampaignDetail,
  DashboardCampaignSegment,
  DashboardCampaignSummary,
  DashboardConfirmSegmentSuggestionsRequest,
  DashboardConfirmSegmentSuggestionsResult,
  DashboardCreateCampaignRequest,
  DashboardCreateFunnelRequest,
  DashboardCreateNextLoopRequest,
  DashboardCreateNextLoopResult,
  DashboardCreateProjectRequest,
  DashboardCreatePromotionSegmentDefinitionRequest,
  DashboardCreatePromotionRunRequest,
  DashboardCreatePromotionRunResult,
  DashboardCreatePromotionRequest,
  DashboardDecideSegmentSuggestionRequest,
  DashboardDeleteCampaignResult,
  DashboardDeleteFunnelResult,
  DashboardDeleteProjectResult,
  DashboardDeletePromotionResult,
  DashboardDeletePromotionSegmentResult,
  DashboardEventCatalog,
  DashboardEvaluatePromotionRunResult,
  DashboardFunnel,
  DashboardFunnelMetrics,
  DashboardFunnelPreview,
  DashboardFunnelPreviewRequest,
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
  DashboardStartAdExperimentResult,
  DashboardStartPromotionGenerationRequest,
  DashboardStartPromotionGenerationResult,
  DashboardStartNextLoopRequest,
  DashboardUpdateCampaignRequest,
  DashboardUpdateFunnelRequest,
  DashboardUpdatePromotionRequest,
  DashboardUpdatePromotionSegmentRequest,
  PromotionRunDispatchResponse
} from "@loopad/shared";
import { z } from "zod";
import { apiFetch } from "../../../shared/api/http-client.js";
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
    case "sdk":
      throw new Error("SDK 연동 가이드는 정적 페이지입니다.");
  }
}

export async function fetchDashboardProjects(signal?: AbortSignal): Promise<DashboardProjectList> {
  const url = new URL(
    `${dashboardConfig.apiBaseUrl}/dashboard/v1/projects`,
    window.location.origin
  );

  const response = await apiFetch(url, {
    headers: { Accept: "application/json" },
    signal
  });

  return parseDashboardResponse(response, DashboardProjectListSchema);
}

export async function createDashboardProject(
  requestBody: DashboardCreateProjectRequest
): Promise<DashboardProject> {
  const parsedBody = DashboardCreateProjectRequestSchema.parse(requestBody);
  const url = new URL(
    `${dashboardConfig.apiBaseUrl}/dashboard/v1/projects`,
    window.location.origin
  );

  const response = await apiFetch(url, {
    body: JSON.stringify(parsedBody),
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    method: "POST"
  });

  return parseDashboardResponse(response, DashboardProjectSchema);
}

export async function deleteDashboardProject(
  projectId: string
): Promise<DashboardDeleteProjectResult> {
  const url = new URL(
    `${dashboardConfig.apiBaseUrl}/dashboard/v1/projects/${encodeURIComponent(projectId)}`,
    window.location.origin
  );

  const response = await apiFetch(url, {
    headers: { Accept: "application/json" },
    method: "DELETE"
  });

  return parseDashboardResponse(response, DashboardDeleteProjectResultSchema);
}

export async function createDashboardFunnel(
  query: DashboardQuery,
  requestBody: DashboardCreateFunnelRequest
): Promise<DashboardFunnel> {
  const parsedBody = DashboardCreateFunnelRequestSchema.parse(requestBody);
  const url = new URL(`${dashboardConfig.apiBaseUrl}/dashboard/v1/funnels`, window.location.origin);
  url.searchParams.set("project_id", query.projectId);

  const response = await apiFetch(url, {
    body: JSON.stringify(parsedBody),
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    method: "POST"
  });

  return parseDashboardResponse(response, DashboardFunnelSchema);
}

export async function updateDashboardFunnel(
  query: DashboardQuery,
  funnelId: string,
  requestBody: DashboardUpdateFunnelRequest
): Promise<DashboardFunnel> {
  const parsedBody = DashboardUpdateFunnelRequestSchema.parse(requestBody);
  const url = new URL(
    `${dashboardConfig.apiBaseUrl}/dashboard/v1/funnels/${encodeURIComponent(funnelId)}`,
    window.location.origin
  );
  url.searchParams.set("project_id", query.projectId);

  const response = await apiFetch(url, {
    body: JSON.stringify(parsedBody),
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    method: "PATCH"
  });

  return parseDashboardResponse(response, DashboardFunnelSchema);
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

  const response = await apiFetch(url, {
    body: JSON.stringify(parsedBody),
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    method: "POST"
  });

  return parseDashboardResponse(response, DashboardCampaignSummarySchema);
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

  const response = await apiFetch(url, {
    body: JSON.stringify(parsedBody),
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    method: "PATCH"
  });

  return parseDashboardResponse(response, DashboardCampaignSummarySchema);
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

  const response = await apiFetch(url, {
    headers: { Accept: "application/json" },
    method: "DELETE"
  });

  return parseDashboardResponse(response, DashboardDeleteCampaignResultSchema);
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

  const response = await apiFetch(url, {
    body: JSON.stringify(parsedBody),
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    method: "POST"
  });

  return parseDashboardResponse(response, DashboardPromotionSummarySchema);
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

  const response = await apiFetch(url, {
    body: JSON.stringify(parsedBody),
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    method: "PATCH"
  });

  return parseDashboardResponse(response, DashboardPromotionSummarySchema);
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

  const response = await apiFetch(url, {
    headers: { Accept: "application/json" },
    method: "DELETE"
  });

  return parseDashboardResponse(response, DashboardDeletePromotionResultSchema);
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

  const response = await apiFetch(url, {
    body: JSON.stringify(parsedBody),
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    method: "POST"
  });

  return parseDashboardResponse(response, DashboardCampaignSegmentSchema);
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

  const response = await apiFetch(url, {
    body: JSON.stringify(parsedBody),
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    method: "PATCH"
  });

  return parseDashboardResponse(response, DashboardCampaignSegmentSchema);
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

  const response = await apiFetch(url, {
    headers: { Accept: "application/json" },
    method: "DELETE"
  });

  return parseDashboardResponse(response, DashboardDeletePromotionSegmentResultSchema);
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

  const response = await apiFetch(url, { headers: { Accept: "application/json" }, signal });

  return parseDashboardResponse(response, DashboardPromotionSegmentSuggestionListSchema);
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

  const response = await apiFetch(url, {
    body: JSON.stringify(parsedBody),
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    method: "POST"
  });

  return parseDashboardResponse(response, DashboardStartPromotionAnalysisResultSchema);
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

  const response = await apiFetch(url, {
    body: JSON.stringify(parsedBody),
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    method: "POST"
  });

  return parseDashboardResponse(response, DashboardStartPromotionGenerationResultSchema);
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

  const response = await apiFetch(url, { headers: { Accept: "application/json" }, signal });

  return parseDashboardResponse(response, DashboardPromotionScopedSegmentDefinitionListSchema);
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

  const response = await apiFetch(url, {
    body: JSON.stringify(parsedBody),
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    method: "POST"
  });

  return parseDashboardResponse(response, DashboardPromotionScopedSegmentDefinitionSchema);
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

  const response = await apiFetch(url, {
    headers: { Accept: "application/json" },
    method: "DELETE"
  });

  return parseDashboardResponse(
    response,
    DashboardArchivePromotionScopedSegmentDefinitionResultSchema
  );
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

  const response = await apiFetch(url, {
    body: JSON.stringify(parsedBody),
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    method: "PATCH"
  });

  return parseDashboardResponse(response, DashboardPromotionSegmentSuggestionSchema);
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

  const response = await apiFetch(url, {
    body: JSON.stringify(parsedBody),
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    method: "POST"
  });

  return parseDashboardResponse(response, DashboardConfirmSegmentSuggestionsResultSchema);
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

  const response = await apiFetch(url, {
    body: JSON.stringify(parsedBody),
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    method: "POST"
  });

  return parseDashboardResponse(response, DashboardNextLoopAnalysisSchema);
}

export async function approveDashboardContentCandidate(
  query: DashboardQuery,
  promotionId: string,
  segmentId: string,
  contentId: string,
  requestBody: DashboardApproveContentCandidateRequest
): Promise<DashboardApproveContentCandidateResult> {
  const parsedBody = DashboardApproveContentCandidateRequestSchema.parse(requestBody);
  const url = new URL(
    `${dashboardConfig.apiBaseUrl}/dashboard/v1/promotions/${encodeURIComponent(promotionId)}/segments/${encodeURIComponent(segmentId)}/content-candidates/${encodeURIComponent(contentId)}/approve`,
    window.location.origin
  );
  url.searchParams.set("project_id", query.projectId);

  const response = await apiFetch(url, {
    body: JSON.stringify(parsedBody),
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    method: "POST"
  });

  return parseDashboardResponse(response, DashboardApproveContentCandidateResultSchema);
}

export async function createDashboardPromotionRun(
  query: DashboardQuery,
  promotionId: string,
  requestBody: DashboardCreatePromotionRunRequest = { loop_count: 1 }
): Promise<DashboardCreatePromotionRunResult> {
  const parsedBody = DashboardCreatePromotionRunRequestSchema.parse(requestBody);
  const url = new URL(
    `${dashboardConfig.apiBaseUrl}/dashboard/v1/promotions/${encodeURIComponent(promotionId)}/runs`,
    window.location.origin
  );
  url.searchParams.set("project_id", query.projectId);

  const response = await apiFetch(url, {
    body: JSON.stringify(parsedBody),
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    method: "POST"
  });

  return parseDashboardResponse(response, DashboardCreatePromotionRunResultSchema);
}

export async function buildDashboardPromotionRunAssignments(
  query: DashboardQuery,
  promotionRunId: string
): Promise<DashboardBuildPromotionRunAssignmentsResult> {
  const url = new URL(
    `${dashboardConfig.apiBaseUrl}/dashboard/v1/promotion-runs/${encodeURIComponent(promotionRunId)}/segment-assignments/build`,
    window.location.origin
  );
  url.searchParams.set("project_id", query.projectId);

  const response = await apiFetch(url, {
    headers: { Accept: "application/json" },
    method: "POST"
  });

  return parseDashboardResponse(response, DashboardBuildPromotionRunAssignmentsResultSchema);
}

export async function evaluateDashboardPromotionRun(
  query: DashboardQuery,
  promotionRunId: string
): Promise<DashboardEvaluatePromotionRunResult> {
  const url = new URL(
    `${dashboardConfig.apiBaseUrl}/dashboard/v1/promotion-runs/${encodeURIComponent(promotionRunId)}/evaluate`,
    window.location.origin
  );
  url.searchParams.set("project_id", query.projectId);

  const response = await apiFetch(url, {
    headers: { Accept: "application/json" },
    method: "POST"
  });

  return parseDashboardResponse(response, DashboardEvaluatePromotionRunResultSchema);
}

export async function createDashboardNextLoop(
  query: DashboardQuery,
  promotionRunId: string,
  requestBody: DashboardCreateNextLoopRequest
): Promise<DashboardCreateNextLoopResult> {
  const parsedBody = DashboardCreateNextLoopRequestSchema.parse(requestBody);
  const url = new URL(
    `${dashboardConfig.apiBaseUrl}/dashboard/v1/promotion-runs/${encodeURIComponent(promotionRunId)}/next-loop`,
    window.location.origin
  );
  url.searchParams.set("project_id", query.projectId);

  const response = await apiFetch(url, {
    body: JSON.stringify(parsedBody),
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    method: "POST"
  });

  return parseDashboardResponse(response, DashboardCreateNextLoopResultSchema);
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

  const response = await apiFetch(url, {
    body: JSON.stringify(parsedBody),
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    method: "POST"
  });

  return parseDashboardResponse(response, DashboardRejectContentCandidateResultSchema);
}

export async function dispatchDashboardPromotionRun(
  promotionRunId: string
): Promise<PromotionRunDispatchResponse> {
  const url = new URL(
    `${dashboardConfig.apiBaseUrl}/ad/promotion-runs/${encodeURIComponent(promotionRunId)}/dispatch`,
    window.location.origin
  );

  const response = await apiFetch(url, {
    headers: { Accept: "application/json" },
    method: "POST"
  });

  return parseDashboardResponse(response, PromotionRunDispatchResponseSchema);
}

export async function startDashboardAdExperiment(
  query: DashboardQuery,
  promotionId: string,
  adExperimentId: string
): Promise<DashboardStartAdExperimentResult> {
  const url = new URL(
    `${dashboardConfig.apiBaseUrl}/dashboard/v1/promotions/${encodeURIComponent(promotionId)}/ad-experiments/${encodeURIComponent(adExperimentId)}/start`,
    window.location.origin
  );
  url.searchParams.set("project_id", query.projectId);

  const response = await apiFetch(url, {
    body: JSON.stringify({}),
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    method: "POST"
  });

  return parseDashboardResponse(response, DashboardStartAdExperimentResultSchema);
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

  const response = await apiFetch(url, {
    headers: { Accept: "application/json" },
    method: "DELETE"
  });

  return parseDashboardResponse(response, DashboardDeleteFunnelResultSchema);
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

  const response = await apiFetch(url, {
    body: JSON.stringify(parsedBody),
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    method: "POST"
  });

  return parseDashboardResponse(response, DashboardSegmentQueryPreviewSchema);
}

export async function saveDashboardSegment(
  query: DashboardQuery,
  requestBody: DashboardSaveSegmentRequest
): Promise<DashboardSavedSegment> {
  const parsedBody = DashboardSaveSegmentRequestSchema.parse(requestBody);
  const url = new URL(
    `${dashboardConfig.apiBaseUrl}/dashboard/v1/segments`,
    window.location.origin
  );
  url.searchParams.set("project_id", query.projectId);

  const response = await apiFetch(url, {
    body: JSON.stringify(parsedBody),
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    method: "POST"
  });

  return parseDashboardResponse(response, DashboardSavedSegmentSchema);
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

export async function fetchDashboardFunnel(
  query: DashboardQuery,
  funnelId: string,
  signal: AbortSignal
): Promise<DashboardFunnel> {
  return request(
    `/dashboard/v1/funnels/${encodeURIComponent(funnelId)}`,
    DashboardFunnelSchema,
    query,
    signal
  );
}

export async function previewDashboardFunnelMetrics(
  query: DashboardQuery,
  requestBody: DashboardFunnelPreviewRequest,
  signal: AbortSignal
): Promise<DashboardFunnelPreview> {
  const parsedBody = DashboardFunnelPreviewRequestSchema.parse(requestBody);
  const url = new URL(
    `${dashboardConfig.apiBaseUrl}/dashboard/v1/funnels/preview`,
    window.location.origin
  );
  url.searchParams.set("project_id", query.projectId);

  const response = await apiFetch(url, {
    body: JSON.stringify(parsedBody),
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    method: "POST",
    signal
  });

  return parseDashboardResponse(response, DashboardFunnelPreviewSchema);
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

  const response = await apiFetch(url, {
    headers: { Accept: "application/json" },
    signal
  });

  return parseDashboardResponse(response, schema);
}

async function parseDashboardResponse<T>(response: Response, schema: z.ZodType<T>) {
  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response));
  }

  return createApiSuccessResponseSchema(schema).parse(await response.json()).data;
}

async function readApiErrorMessage(response: Response) {
  const fallbackMessage = `API 요청 실패: ${response.status}`;

  try {
    const body: unknown = await response.clone().json();
    const parsed = apiFailureResponseSchema.safeParse(body);

    if (!parsed.success) {
      return fallbackMessage;
    }

    return toDashboardApiErrorMessage(parsed.data.error.code, parsed.data.error.message);
  } catch {
    return fallbackMessage;
  }
}

function toDashboardApiErrorMessage(code: string, message: string) {
  switch (code) {
    case "ACTIVE_ASSIGNMENT_NOT_FOUND":
      return "광고 실행 대상 배정이 아직 없습니다. 승인된 광고 실험에 대한 세그먼트 매칭/assignment 생성이 먼저 필요합니다.";
    case "PROMOTION_RUN_NOT_FOUND":
      return "광고 실행에 사용할 promotion_run을 찾지 못했습니다. 광고 후보 승인 후 다시 시도해주세요.";
    case "UNSUPPORTED_DISPATCH_CHANNEL":
      return "현재 광고 실행은 Email/SMS 채널만 지원합니다.";
    default:
      return message;
  }
}
