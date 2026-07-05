import { HttpStatus } from "@nestjs/common";
import { createDomainError } from "../../app-errors.js";

export const DASHBOARD_ERRORS = {
  PROJECT_ID_REQUIRED: {
    statusCode: HttpStatus.BAD_REQUEST,
    code: "DASHBOARD_PROJECT_ID_REQUIRED",
    message: "project_id query param is required."
  },
  SEGMENT_PREVIEW_NOT_SAVEABLE: {
    statusCode: HttpStatus.CONFLICT,
    code: "DASHBOARD_SEGMENT_PREVIEW_NOT_SAVEABLE",
    message: "segment query preview is not valid or already saved."
  },
  DECISION_REQUEST_FAILED: {
    statusCode: HttpStatus.BAD_GATEWAY,
    code: "DASHBOARD_DECISION_REQUEST_FAILED",
    message: "Decision API request failed."
  },
  CONTENT_CANDIDATE_APPROVAL_LOCKED: {
    statusCode: HttpStatus.CONFLICT,
    code: "DASHBOARD_CONTENT_CANDIDATE_APPROVAL_LOCKED",
    message: "A content candidate is already approved for this segment."
  }
} as const;

export function createDashboardError(
  error: (typeof DASHBOARD_ERRORS)[keyof typeof DASHBOARD_ERRORS],
  options?: ErrorOptions
) {
  return createDomainError(error, options);
}

export const dashboardErrors = {
  projectIdRequired: () => createDashboardError(DASHBOARD_ERRORS.PROJECT_ID_REQUIRED),
  decisionRequestFailed: (cause?: unknown) =>
    createDashboardError(DASHBOARD_ERRORS.DECISION_REQUEST_FAILED, { cause }),
  contentCandidateApprovalLocked: () =>
    createDashboardError(DASHBOARD_ERRORS.CONTENT_CANDIDATE_APPROVAL_LOCKED),
  segmentPreviewNotSaveable: () =>
    createDashboardError(DASHBOARD_ERRORS.SEGMENT_PREVIEW_NOT_SAVEABLE)
} as const;
