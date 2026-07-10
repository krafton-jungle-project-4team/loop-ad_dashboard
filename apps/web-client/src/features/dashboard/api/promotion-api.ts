import {
  DashboardCreatePromotionRequestSchema,
  DashboardDeletePromotionResultSchema,
  DashboardPromotionDetailSchema,
  DashboardPromotionSummarySchema,
  DashboardStartPromotionAnalysisRequestSchema,
  DashboardStartPromotionAnalysisResultSchema,
  DashboardStartPromotionGenerationRequestSchema,
  DashboardStartPromotionGenerationResultSchema,
  DashboardUpdatePromotionRequestSchema,
  type DashboardCreatePromotionRequest,
  type DashboardDeletePromotionResult,
  type DashboardPromotionDetail,
  type DashboardPromotionSummary,
  type DashboardStartPromotionAnalysisRequest,
  type DashboardStartPromotionAnalysisResult,
  type DashboardStartPromotionGenerationRequest,
  type DashboardStartPromotionGenerationResult,
  type DashboardUpdatePromotionRequest
} from "@loopad/shared";
import { apiRequest } from "../../../shared/api/http-client.js";
import type { DashboardQuery } from "../model/dashboard-types.js";
import { fetchDashboardResource } from "./dashboard-resource-api.js";
import { projectSearchParams, readDashboardApiErrorMessage } from "./dashboard-request.js";

const PROMOTIONS_PATH = "/dashboard/v1/promotions";

export function fetchDashboardPromotionDetail(
  query: DashboardQuery,
  promotionId: string,
  signal: AbortSignal
): Promise<DashboardPromotionDetail> {
  return fetchDashboardResource(
    `${PROMOTIONS_PATH}/${encodeURIComponent(promotionId)}`,
    DashboardPromotionDetailSchema,
    query,
    signal
  );
}

export function createDashboardPromotion(
  query: DashboardQuery,
  campaignId: string,
  requestBody: DashboardCreatePromotionRequest
): Promise<DashboardPromotionSummary> {
  return apiRequest(
    `/dashboard/v1/campaigns/${encodeURIComponent(campaignId)}/promotions`,
    DashboardPromotionSummarySchema,
    {
      body: DashboardCreatePromotionRequestSchema.parse(requestBody),
      method: "POST",
      searchParams: projectSearchParams(query.projectId)
    }
  );
}

export function updateDashboardPromotion(
  query: DashboardQuery,
  promotionId: string,
  requestBody: DashboardUpdatePromotionRequest
): Promise<DashboardPromotionSummary> {
  return apiRequest(
    `${PROMOTIONS_PATH}/${encodeURIComponent(promotionId)}`,
    DashboardPromotionSummarySchema,
    {
      body: DashboardUpdatePromotionRequestSchema.parse(requestBody),
      method: "PATCH",
      searchParams: projectSearchParams(query.projectId)
    }
  );
}

export function deleteDashboardPromotion(
  query: DashboardQuery,
  promotionId: string
): Promise<DashboardDeletePromotionResult> {
  return apiRequest(
    `${PROMOTIONS_PATH}/${encodeURIComponent(promotionId)}`,
    DashboardDeletePromotionResultSchema,
    {
      method: "DELETE",
      searchParams: projectSearchParams(query.projectId)
    }
  );
}

export function startDashboardPromotionAnalysis(
  query: DashboardQuery,
  promotionId: string,
  requestBody: DashboardStartPromotionAnalysisRequest
): Promise<DashboardStartPromotionAnalysisResult> {
  return apiRequest(
    `${PROMOTIONS_PATH}/${encodeURIComponent(promotionId)}/segment-suggestions/analyze`,
    DashboardStartPromotionAnalysisResultSchema,
    {
      body: DashboardStartPromotionAnalysisRequestSchema.parse(requestBody),
      errorMessage: readDashboardApiErrorMessage,
      method: "POST",
      searchParams: projectSearchParams(query.projectId)
    }
  );
}

export function startDashboardPromotionGeneration(
  query: DashboardQuery,
  promotionId: string,
  requestBody: DashboardStartPromotionGenerationRequest
): Promise<DashboardStartPromotionGenerationResult> {
  return apiRequest(
    `${PROMOTIONS_PATH}/${encodeURIComponent(promotionId)}/generation`,
    DashboardStartPromotionGenerationResultSchema,
    {
      body: DashboardStartPromotionGenerationRequestSchema.parse(requestBody),
      errorMessage: readDashboardApiErrorMessage,
      method: "POST",
      searchParams: projectSearchParams(query.projectId)
    }
  );
}
