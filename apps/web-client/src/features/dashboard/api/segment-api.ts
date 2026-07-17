import {
  DashboardArchivePromotionScopedSegmentDefinitionResultSchema,
  DashboardAttachSegmentRequestSchema,
  DashboardCampaignSegmentSchema,
  DashboardConfirmSegmentSuggestionsRequestSchema,
  DashboardConfirmSegmentSuggestionsResultSchema,
  DashboardCreatePromotionSegmentDefinitionRequestSchema,
  DashboardDecideSegmentSuggestionRequestSchema,
  DashboardDeletePromotionSegmentResultSchema,
  DashboardPromotionScopedSegmentDefinitionListSchema,
  DashboardPromotionScopedSegmentDefinitionSchema,
  DashboardPromotionSegmentSuggestionListSchema,
  DashboardPromotionSegmentSuggestionSchema,
  DashboardSavedSegmentSchema,
  DashboardSaveSegmentRequestSchema,
  DashboardSegmentAssistantRequestSchema,
  DashboardSegmentAssistantResponseSchema,
  DashboardSegmentDetailSchema,
  DashboardSegmentQueryPreviewRequestSchema,
  DashboardSegmentQueryPreviewSchema,
  type DashboardArchivePromotionScopedSegmentDefinitionResult,
  type DashboardAttachSegmentRequest,
  type DashboardCampaignSegment,
  type DashboardConfirmSegmentSuggestionsRequest,
  type DashboardConfirmSegmentSuggestionsResult,
  type DashboardCreatePromotionSegmentDefinitionRequest,
  type DashboardDecideSegmentSuggestionRequest,
  type DashboardDeletePromotionSegmentResult,
  type DashboardPromotionScopedSegmentDefinition,
  type DashboardPromotionScopedSegmentDefinitionList,
  type DashboardPromotionSegmentSuggestion,
  type DashboardPromotionSegmentSuggestionList,
  type DashboardSavedSegment,
  type DashboardSaveSegmentRequest,
  type DashboardSegmentAssistantRequest,
  type DashboardSegmentAssistantResponse,
  type DashboardSegmentDetail,
  type DashboardSegmentQueryPreview,
  type DashboardSegmentQueryPreviewRequest
} from "@loopad/shared";
import { apiRequest } from "../../../shared/api/http-client.js";
import type { DashboardQuery } from "../model/dashboard-types.js";
import { fetchDashboardResource } from "./dashboard-resource-api.js";
import { projectSearchParams } from "./dashboard-request.js";

const PROMOTIONS_PATH = "/dashboard/v1/promotions";

export function fetchDashboardSegmentDetail(
  query: DashboardQuery,
  promotionId: string,
  segmentId: string,
  signal: AbortSignal
): Promise<DashboardSegmentDetail> {
  return fetchDashboardResource(
    `${promotionPath(promotionId)}/segments/${encodeURIComponent(segmentId)}`,
    DashboardSegmentDetailSchema,
    query,
    signal
  );
}

export function attachDashboardSegmentToPromotion(
  query: DashboardQuery,
  promotionId: string,
  requestBody: DashboardAttachSegmentRequest
): Promise<DashboardCampaignSegment> {
  return apiRequest(`${promotionPath(promotionId)}/segments`, DashboardCampaignSegmentSchema, {
    body: DashboardAttachSegmentRequestSchema.parse(requestBody),
    method: "POST",
    searchParams: projectSearchParams(query.projectId)
  });
}

export function deleteDashboardPromotionSegment(
  query: DashboardQuery,
  promotionId: string,
  segmentId: string
): Promise<DashboardDeletePromotionSegmentResult> {
  return apiRequest(
    `${promotionPath(promotionId)}/segments/${encodeURIComponent(segmentId)}`,
    DashboardDeletePromotionSegmentResultSchema,
    {
      method: "DELETE",
      searchParams: projectSearchParams(query.projectId)
    }
  );
}

export function fetchDashboardPromotionSegmentSuggestions(
  query: DashboardQuery,
  promotionId: string,
  signal: AbortSignal,
  analysisId?: string | null
): Promise<DashboardPromotionSegmentSuggestionList> {
  const searchParams = projectSearchParams(query.projectId);
  if (analysisId) {
    searchParams.set("analysis_id", analysisId);
  }

  return apiRequest(
    `${promotionPath(promotionId)}/segment-suggestions`,
    DashboardPromotionSegmentSuggestionListSchema,
    { method: "GET", searchParams, signal }
  );
}

export function fetchDashboardPromotionScopedSegmentDefinitions(
  query: DashboardQuery,
  promotionId: string,
  signal: AbortSignal
): Promise<DashboardPromotionScopedSegmentDefinitionList> {
  return apiRequest(
    `${promotionPath(promotionId)}/segment-definitions`,
    DashboardPromotionScopedSegmentDefinitionListSchema,
    {
      method: "GET",
      searchParams: projectSearchParams(query.projectId),
      signal
    }
  );
}

export function createDashboardPromotionScopedSegmentDefinition(
  query: DashboardQuery,
  promotionId: string,
  requestBody: DashboardCreatePromotionSegmentDefinitionRequest
): Promise<DashboardPromotionScopedSegmentDefinition> {
  return apiRequest(
    `${promotionPath(promotionId)}/segment-definitions`,
    DashboardPromotionScopedSegmentDefinitionSchema,
    {
      body: DashboardCreatePromotionSegmentDefinitionRequestSchema.parse(requestBody),
      method: "POST",
      searchParams: projectSearchParams(query.projectId)
    }
  );
}

export function assistDashboardPromotionSegment(
  query: DashboardQuery,
  promotionId: string,
  requestBody: DashboardSegmentAssistantRequest
): Promise<DashboardSegmentAssistantResponse> {
  return apiRequest(
    `${promotionPath(promotionId)}/segment-assistant`,
    DashboardSegmentAssistantResponseSchema,
    {
      body: DashboardSegmentAssistantRequestSchema.parse(requestBody),
      method: "POST",
      searchParams: projectSearchParams(query.projectId)
    }
  );
}

export function archiveDashboardPromotionScopedSegmentDefinition(
  query: DashboardQuery,
  promotionId: string,
  segmentId: string
): Promise<DashboardArchivePromotionScopedSegmentDefinitionResult> {
  return apiRequest(
    `${promotionPath(promotionId)}/segment-definitions/${encodeURIComponent(segmentId)}`,
    DashboardArchivePromotionScopedSegmentDefinitionResultSchema,
    {
      method: "DELETE",
      searchParams: projectSearchParams(query.projectId)
    }
  );
}

export function decideDashboardPromotionSegmentSuggestion(
  query: DashboardQuery,
  promotionId: string,
  suggestionId: string,
  requestBody: DashboardDecideSegmentSuggestionRequest
): Promise<DashboardPromotionSegmentSuggestion> {
  return apiRequest(
    `${promotionPath(promotionId)}/segment-suggestions/${encodeURIComponent(suggestionId)}`,
    DashboardPromotionSegmentSuggestionSchema,
    {
      body: DashboardDecideSegmentSuggestionRequestSchema.parse(requestBody),
      method: "PATCH",
      searchParams: projectSearchParams(query.projectId)
    }
  );
}

export function confirmDashboardPromotionSegmentSuggestions(
  query: DashboardQuery,
  promotionId: string,
  requestBody: DashboardConfirmSegmentSuggestionsRequest
): Promise<DashboardConfirmSegmentSuggestionsResult> {
  return apiRequest(
    `${promotionPath(promotionId)}/segment-suggestions/confirm`,
    DashboardConfirmSegmentSuggestionsResultSchema,
    {
      body: DashboardConfirmSegmentSuggestionsRequestSchema.parse(requestBody),
      method: "POST",
      searchParams: projectSearchParams(query.projectId)
    }
  );
}

export function createDashboardSegmentQueryPreview(
  query: DashboardQuery,
  requestBody: DashboardSegmentQueryPreviewRequest
): Promise<DashboardSegmentQueryPreview> {
  return apiRequest("/dashboard/v1/segments/query-preview", DashboardSegmentQueryPreviewSchema, {
    body: DashboardSegmentQueryPreviewRequestSchema.parse(requestBody),
    method: "POST",
    searchParams: projectSearchParams(query.projectId)
  });
}

export function saveDashboardSegment(
  query: DashboardQuery,
  requestBody: DashboardSaveSegmentRequest
): Promise<DashboardSavedSegment> {
  return apiRequest("/dashboard/v1/segments", DashboardSavedSegmentSchema, {
    body: DashboardSaveSegmentRequestSchema.parse(requestBody),
    method: "POST",
    searchParams: projectSearchParams(query.projectId)
  });
}

function promotionPath(promotionId: string) {
  return `${PROMOTIONS_PATH}/${encodeURIComponent(promotionId)}`;
}
