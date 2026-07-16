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
  },
  CONTENT_CANDIDATE_NOT_EDITABLE: {
    statusCode: HttpStatus.CONFLICT,
    code: "DASHBOARD_CONTENT_CANDIDATE_NOT_EDITABLE",
    message: "Only a draft HTML content candidate can be edited."
  },
  CONTENT_CANDIDATE_HTML_UNAVAILABLE: {
    statusCode: HttpStatus.BAD_GATEWAY,
    code: "DASHBOARD_CONTENT_CANDIDATE_HTML_UNAVAILABLE",
    message: "The content candidate HTML is unavailable."
  },
  CONTENT_CANDIDATE_COPY_NOT_FOUND: {
    statusCode: HttpStatus.CONFLICT,
    code: "DASHBOARD_CONTENT_CANDIDATE_COPY_NOT_FOUND",
    message: "The generated HTML does not contain the selected copy."
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
    createDomainError(
      {
        statusCode: decisionRequestFailedStatusCode(cause),
        code: DASHBOARD_ERRORS.DECISION_REQUEST_FAILED.code,
        message: decisionRequestFailedMessage(cause)
      },
      { cause }
    ),
  contentCandidateApprovalLocked: () =>
    createDashboardError(DASHBOARD_ERRORS.CONTENT_CANDIDATE_APPROVAL_LOCKED),
  contentCandidateNotEditable: () =>
    createDashboardError(DASHBOARD_ERRORS.CONTENT_CANDIDATE_NOT_EDITABLE),
  contentCandidateHtmlUnavailable: (cause?: unknown) =>
    createDashboardError(DASHBOARD_ERRORS.CONTENT_CANDIDATE_HTML_UNAVAILABLE, { cause }),
  contentCandidateCopyNotFound: () =>
    createDashboardError(DASHBOARD_ERRORS.CONTENT_CANDIDATE_COPY_NOT_FOUND),
  segmentPreviewNotSaveable: () =>
    createDashboardError(DASHBOARD_ERRORS.SEGMENT_PREVIEW_NOT_SAVEABLE)
} as const;

function decisionRequestFailedMessage(cause: unknown) {
  const detail =
    cause && typeof cause === "object" && "detail" in cause
      ? (cause as { detail?: unknown }).detail
      : undefined;

  if (typeof detail === "string" && detail.length > 0) {
    return `${DASHBOARD_ERRORS.DECISION_REQUEST_FAILED.message} ${detail}`;
  }

  return DASHBOARD_ERRORS.DECISION_REQUEST_FAILED.message;
}

function decisionRequestFailedStatusCode(cause: unknown) {
  const status =
    cause && typeof cause === "object" && "status" in cause
      ? (cause as { status?: unknown }).status
      : undefined;

  if (typeof status === "number" && status >= 400 && status < 600) {
    return status;
  }

  return DASHBOARD_ERRORS.DECISION_REQUEST_FAILED.statusCode;
}
