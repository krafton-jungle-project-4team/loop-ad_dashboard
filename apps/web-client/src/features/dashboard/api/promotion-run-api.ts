import {
  DashboardApproveContentCandidateRequestSchema,
  DashboardApproveContentCandidateResultSchema,
  DashboardBuildPromotionRunAssignmentsResultSchema,
  DashboardCreateNextLoopRequestSchema,
  DashboardCreateNextLoopResultSchema,
  DashboardCreatePromotionRunRequestSchema,
  DashboardCreatePromotionRunResultSchema,
  DashboardEvaluatePromotionRunResultSchema,
  DashboardNextLoopAnalysisSchema,
  DashboardRejectContentCandidateRequestSchema,
  DashboardRejectContentCandidateResultSchema,
  DashboardStartAdExperimentResultSchema,
  DashboardStartNextLoopRequestSchema,
  PromotionRunDispatchResponseSchema,
  type DashboardApproveContentCandidateRequest,
  type DashboardApproveContentCandidateResult,
  type DashboardBuildPromotionRunAssignmentsResult,
  type DashboardCreateNextLoopRequest,
  type DashboardCreateNextLoopResult,
  type DashboardCreatePromotionRunRequest,
  type DashboardCreatePromotionRunResult,
  type DashboardEvaluatePromotionRunResult,
  type DashboardNextLoopAnalysis,
  type DashboardRejectContentCandidateRequest,
  type DashboardRejectContentCandidateResult,
  type DashboardStartAdExperimentResult,
  type DashboardStartNextLoopRequest,
  type PromotionRunDispatchResponse
} from "@loopad/shared";
import { apiRequest } from "../../../shared/api/http-client.js";
import type { DashboardQuery } from "../model/dashboard-types.js";
import { projectSearchParams, readDashboardApiErrorMessage } from "./dashboard-request.js";

export function startDashboardNextLoopAnalysis(
  query: DashboardQuery,
  promotionId: string,
  requestBody: DashboardStartNextLoopRequest
): Promise<DashboardNextLoopAnalysis> {
  return apiRequest(`${promotionPath(promotionId)}/next-loop`, DashboardNextLoopAnalysisSchema, {
    body: DashboardStartNextLoopRequestSchema.parse(requestBody),
    method: "POST",
    searchParams: projectSearchParams(query.projectId)
  });
}

export function approveDashboardContentCandidate(
  query: DashboardQuery,
  promotionId: string,
  segmentId: string,
  contentId: string,
  requestBody: DashboardApproveContentCandidateRequest
): Promise<DashboardApproveContentCandidateResult> {
  return apiRequest(
    contentCandidatePath(promotionId, segmentId, contentId, "approve"),
    DashboardApproveContentCandidateResultSchema,
    {
      body: DashboardApproveContentCandidateRequestSchema.parse(requestBody),
      errorMessage: readDashboardApiErrorMessage,
      method: "POST",
      searchParams: projectSearchParams(query.projectId)
    }
  );
}

export function rejectDashboardContentCandidate(
  query: DashboardQuery,
  promotionId: string,
  segmentId: string,
  contentId: string,
  requestBody: DashboardRejectContentCandidateRequest
): Promise<DashboardRejectContentCandidateResult> {
  return apiRequest(
    contentCandidatePath(promotionId, segmentId, contentId, "reject"),
    DashboardRejectContentCandidateResultSchema,
    {
      body: DashboardRejectContentCandidateRequestSchema.parse(requestBody),
      method: "POST",
      searchParams: projectSearchParams(query.projectId)
    }
  );
}

export function createDashboardPromotionRun(
  query: DashboardQuery,
  promotionId: string,
  requestBody: DashboardCreatePromotionRunRequest = { loop_count: 1 }
): Promise<DashboardCreatePromotionRunResult> {
  return apiRequest(`${promotionPath(promotionId)}/runs`, DashboardCreatePromotionRunResultSchema, {
    body: DashboardCreatePromotionRunRequestSchema.parse(requestBody),
    errorMessage: readDashboardApiErrorMessage,
    method: "POST",
    searchParams: projectSearchParams(query.projectId)
  });
}

export function buildDashboardPromotionRunAssignments(
  query: DashboardQuery,
  promotionRunId: string
): Promise<DashboardBuildPromotionRunAssignmentsResult> {
  return apiRequest(
    `${promotionRunPath(promotionRunId)}/segment-assignments/build`,
    DashboardBuildPromotionRunAssignmentsResultSchema,
    {
      errorMessage: readDashboardApiErrorMessage,
      method: "POST",
      searchParams: projectSearchParams(query.projectId)
    }
  );
}

export function evaluateDashboardPromotionRun(
  query: DashboardQuery,
  promotionRunId: string
): Promise<DashboardEvaluatePromotionRunResult> {
  return apiRequest(
    `${promotionRunPath(promotionRunId)}/evaluate`,
    DashboardEvaluatePromotionRunResultSchema,
    {
      errorMessage: readDashboardApiErrorMessage,
      method: "POST",
      searchParams: projectSearchParams(query.projectId)
    }
  );
}

export function createDashboardNextLoop(
  query: DashboardQuery,
  promotionRunId: string,
  requestBody: DashboardCreateNextLoopRequest
): Promise<DashboardCreateNextLoopResult> {
  return apiRequest(
    `${promotionRunPath(promotionRunId)}/next-loop`,
    DashboardCreateNextLoopResultSchema,
    {
      body: DashboardCreateNextLoopRequestSchema.parse(requestBody),
      errorMessage: readDashboardApiErrorMessage,
      method: "POST",
      searchParams: projectSearchParams(query.projectId)
    }
  );
}

export function dispatchDashboardPromotionRun(
  promotionRunId: string
): Promise<PromotionRunDispatchResponse> {
  return apiRequest(
    `/ad/promotion-runs/${encodeURIComponent(promotionRunId)}/dispatch`,
    PromotionRunDispatchResponseSchema,
    {
      errorMessage: readDashboardApiErrorMessage,
      method: "POST"
    }
  );
}

export function startDashboardAdExperiment(
  query: DashboardQuery,
  promotionId: string,
  adExperimentId: string
): Promise<DashboardStartAdExperimentResult> {
  return apiRequest(
    `${promotionPath(promotionId)}/ad-experiments/${encodeURIComponent(adExperimentId)}/start`,
    DashboardStartAdExperimentResultSchema,
    {
      body: {},
      errorMessage: readDashboardApiErrorMessage,
      method: "POST",
      searchParams: projectSearchParams(query.projectId)
    }
  );
}

function contentCandidatePath(
  promotionId: string,
  segmentId: string,
  contentId: string,
  action: "approve" | "reject"
) {
  return `${promotionPath(promotionId)}/segments/${encodeURIComponent(segmentId)}/content-candidates/${encodeURIComponent(contentId)}/${action}`;
}

function promotionPath(promotionId: string) {
  return `/dashboard/v1/promotions/${encodeURIComponent(promotionId)}`;
}

function promotionRunPath(promotionRunId: string) {
  return `/dashboard/v1/promotion-runs/${encodeURIComponent(promotionRunId)}`;
}
