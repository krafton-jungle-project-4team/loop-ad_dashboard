import {
  DashboardApproveContentCandidateRequestSchema,
  DashboardApproveContentCandidateResultSchema,
  DashboardBuildPromotionRunAssignmentsResultSchema,
  DashboardContentCandidateHtmlSourceSchema,
  DashboardCreateNextLoopRequestSchema,
  DashboardCreateNextLoopResultSchema,
  DashboardCreatePromotionRunRequestSchema,
  DashboardCreatePromotionRunResultSchema,
  DashboardNextLoopAnalysisSchema,
  DashboardPreviewContentCandidateHtmlRequestSchema,
  DashboardPreviewContentCandidateHtmlResultSchema,
  DashboardRejectContentCandidateRequestSchema,
  DashboardRejectContentCandidateResultSchema,
  DashboardReviseContentCandidateHtmlRequestSchema,
  DashboardReviseContentCandidateHtmlResultSchema,
  DashboardSaveContentCandidateHtmlRequestSchema,
  DashboardSaveContentCandidateHtmlResultSchema,
  DashboardStartAdExperimentResultSchema,
  DashboardStartNextLoopRequestSchema,
  DashboardUnapproveContentCandidateRequestSchema,
  DashboardUnapproveContentCandidateResultSchema,
  DashboardUpdateContentCandidateCopyRequestSchema,
  DashboardUpdateContentCandidateCopyResultSchema,
  PromotionRunDispatchResponseSchema,
  type DashboardApproveContentCandidateRequest,
  type DashboardApproveContentCandidateResult,
  type DashboardBuildPromotionRunAssignmentsResult,
  type DashboardContentCandidateHtmlSource,
  type DashboardCreateNextLoopRequest,
  type DashboardCreateNextLoopResult,
  type DashboardCreatePromotionRunRequest,
  type DashboardCreatePromotionRunResult,
  type DashboardNextLoopAnalysis,
  type DashboardPreviewContentCandidateHtmlRequest,
  type DashboardPreviewContentCandidateHtmlResult,
  type DashboardRejectContentCandidateRequest,
  type DashboardRejectContentCandidateResult,
  type DashboardReviseContentCandidateHtmlRequest,
  type DashboardReviseContentCandidateHtmlResult,
  type DashboardSaveContentCandidateHtmlRequest,
  type DashboardSaveContentCandidateHtmlResult,
  type DashboardStartAdExperimentResult,
  type DashboardStartNextLoopRequest,
  type DashboardUnapproveContentCandidateRequest,
  type DashboardUnapproveContentCandidateResult,
  type DashboardUpdateContentCandidateCopyRequest,
  type DashboardUpdateContentCandidateCopyResult,
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

export function unapproveDashboardContentCandidate(
  query: DashboardQuery,
  promotionId: string,
  segmentId: string,
  contentId: string,
  requestBody: DashboardUnapproveContentCandidateRequest
): Promise<DashboardUnapproveContentCandidateResult> {
  return apiRequest(
    contentCandidatePath(promotionId, segmentId, contentId, "unapprove"),
    DashboardUnapproveContentCandidateResultSchema,
    {
      body: DashboardUnapproveContentCandidateRequestSchema.parse(requestBody),
      errorMessage: readDashboardApiErrorMessage,
      method: "POST",
      searchParams: projectSearchParams(query.projectId)
    }
  );
}

export function updateDashboardContentCandidateCopy(
  query: DashboardQuery,
  promotionId: string,
  segmentId: string,
  contentId: string,
  requestBody: DashboardUpdateContentCandidateCopyRequest
): Promise<DashboardUpdateContentCandidateCopyResult> {
  return apiRequest(
    contentCandidatePath(promotionId, segmentId, contentId, "copy"),
    DashboardUpdateContentCandidateCopyResultSchema,
    {
      body: DashboardUpdateContentCandidateCopyRequestSchema.parse(requestBody),
      errorMessage: readDashboardApiErrorMessage,
      method: "PATCH",
      searchParams: projectSearchParams(query.projectId)
    }
  );
}

export function reviseDashboardContentCandidateHtml(
  query: DashboardQuery,
  promotionId: string,
  segmentId: string,
  contentId: string,
  requestBody: DashboardReviseContentCandidateHtmlRequest
): Promise<DashboardReviseContentCandidateHtmlResult> {
  return apiRequest(
    contentCandidatePath(promotionId, segmentId, contentId, "html/revisions"),
    DashboardReviseContentCandidateHtmlResultSchema,
    {
      body: DashboardReviseContentCandidateHtmlRequestSchema.parse(requestBody),
      errorMessage: readDashboardApiErrorMessage,
      method: "POST",
      searchParams: projectSearchParams(query.projectId)
    }
  );
}

export function fetchDashboardContentCandidateHtmlSource(
  query: DashboardQuery,
  promotionId: string,
  segmentId: string,
  contentId: string,
  signal?: AbortSignal
): Promise<DashboardContentCandidateHtmlSource> {
  return apiRequest(
    contentCandidatePath(promotionId, segmentId, contentId, "html/source"),
    DashboardContentCandidateHtmlSourceSchema,
    {
      errorMessage: readDashboardApiErrorMessage,
      method: "GET",
      searchParams: projectSearchParams(query.projectId),
      signal
    }
  );
}

export function previewDashboardContentCandidateHtml(
  query: DashboardQuery,
  promotionId: string,
  segmentId: string,
  contentId: string,
  requestBody: DashboardPreviewContentCandidateHtmlRequest,
  signal?: AbortSignal
): Promise<DashboardPreviewContentCandidateHtmlResult> {
  return apiRequest(
    contentCandidatePath(promotionId, segmentId, contentId, "html/preview"),
    DashboardPreviewContentCandidateHtmlResultSchema,
    {
      body: DashboardPreviewContentCandidateHtmlRequestSchema.parse(requestBody),
      errorMessage: readDashboardApiErrorMessage,
      method: "POST",
      searchParams: projectSearchParams(query.projectId),
      signal
    }
  );
}

export function saveDashboardContentCandidateHtml(
  query: DashboardQuery,
  promotionId: string,
  segmentId: string,
  contentId: string,
  requestBody: DashboardSaveContentCandidateHtmlRequest
): Promise<DashboardSaveContentCandidateHtmlResult> {
  return apiRequest(
    contentCandidatePath(promotionId, segmentId, contentId, "html/source"),
    DashboardSaveContentCandidateHtmlResultSchema,
    {
      body: DashboardSaveContentCandidateHtmlRequestSchema.parse(requestBody),
      errorMessage: readDashboardApiErrorMessage,
      method: "PUT",
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
  requestBody: DashboardCreatePromotionRunRequest
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
  action:
    | "approve"
    | "copy"
    | "html/preview"
    | "html/revisions"
    | "html/source"
    | "reject"
    | "unapprove"
) {
  return `${promotionPath(promotionId)}/segments/${encodeURIComponent(segmentId)}/content-candidates/${encodeURIComponent(contentId)}/${action}`;
}

function promotionPath(promotionId: string) {
  return `/dashboard/v1/promotions/${encodeURIComponent(promotionId)}`;
}

function promotionRunPath(promotionRunId: string) {
  return `/dashboard/v1/promotion-runs/${encodeURIComponent(promotionRunId)}`;
}
