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
  SEGMENT_SUGGESTION_SELECTION_INVALID: {
    statusCode: HttpStatus.CONFLICT,
    code: "DASHBOARD_SEGMENT_SUGGESTION_SELECTION_INVALID",
    message: "Selected segment suggestions do not match the current analysis."
  },
  SEGMENT_ASSISTANT_SOURCE_INVALID: {
    statusCode: HttpStatus.CONFLICT,
    code: "DASHBOARD_SEGMENT_ASSISTANT_SOURCE_INVALID",
    message: "참고 중인 AI 추천 고객군이 현재 추천 결과와 일치하지 않습니다."
  },
  DECISION_REQUEST_FAILED: {
    statusCode: HttpStatus.BAD_GATEWAY,
    code: "DASHBOARD_DECISION_REQUEST_FAILED",
    message: "Decision API request failed."
  },
  AD_EXPERIMENT_NOT_FOUND: {
    statusCode: HttpStatus.NOT_FOUND,
    code: "DASHBOARD_AD_EXPERIMENT_NOT_FOUND",
    message: "선택한 고객군의 광고 실험을 찾을 수 없습니다."
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
  },
  CONTENT_CANDIDATE_HTML_REVISION_FAILED: {
    statusCode: HttpStatus.BAD_GATEWAY,
    code: "DASHBOARD_CONTENT_CANDIDATE_HTML_REVISION_FAILED",
    message: "The AI creative revision request failed."
  },
  CONTENT_CANDIDATE_HTML_REVISION_INVALID: {
    statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    code: "DASHBOARD_CONTENT_CANDIDATE_HTML_REVISION_INVALID",
    message: "The AI creative revision did not pass the HTML safety contract."
  },
  PROMOTION_CAMPAIGN_SCHEDULE_INVALID: {
    statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    code: "DASHBOARD_PROMOTION_CAMPAIGN_SCHEDULE_INVALID",
    message: "프로모션 실행 기간은 캠페인 기간 안에서 설정해야 합니다."
  },
  CAMPAIGN_PROMOTION_SCHEDULE_CONFLICT: {
    statusCode: HttpStatus.CONFLICT,
    code: "DASHBOARD_CAMPAIGN_PROMOTION_SCHEDULE_CONFLICT",
    message: "캠페인 기간 밖에 예약된 프로모션이 있어 기간을 변경할 수 없습니다."
  },
  CAMPAIGN_EXECUTION_WINDOW_CLOSED: {
    statusCode: HttpStatus.CONFLICT,
    code: "DASHBOARD_CAMPAIGN_EXECUTION_WINDOW_CLOSED",
    message: "종료된 캠페인에는 프로모션을 생성하거나 수정할 수 없습니다."
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
        code: decisionRequestFailedCode(cause),
        message: decisionRequestFailedMessage(cause)
      },
      { cause }
    ),
  adExperimentNotFound: () => createDashboardError(DASHBOARD_ERRORS.AD_EXPERIMENT_NOT_FOUND),
  contentCandidateApprovalLocked: () =>
    createDashboardError(DASHBOARD_ERRORS.CONTENT_CANDIDATE_APPROVAL_LOCKED),
  contentCandidateNotEditable: () =>
    createDashboardError(DASHBOARD_ERRORS.CONTENT_CANDIDATE_NOT_EDITABLE),
  contentCandidateHtmlUnavailable: (cause?: unknown) =>
    createDashboardError(DASHBOARD_ERRORS.CONTENT_CANDIDATE_HTML_UNAVAILABLE, { cause }),
  contentCandidateCopyNotFound: () =>
    createDashboardError(DASHBOARD_ERRORS.CONTENT_CANDIDATE_COPY_NOT_FOUND),
  contentCandidateHtmlRevisionFailed: (cause?: unknown) =>
    createDashboardError(DASHBOARD_ERRORS.CONTENT_CANDIDATE_HTML_REVISION_FAILED, { cause }),
  contentCandidateHtmlRevisionInvalid: (cause?: unknown) =>
    createDashboardError(DASHBOARD_ERRORS.CONTENT_CANDIDATE_HTML_REVISION_INVALID, { cause }),
  segmentPreviewNotSaveable: () =>
    createDashboardError(DASHBOARD_ERRORS.SEGMENT_PREVIEW_NOT_SAVEABLE),
  segmentSuggestionSelectionInvalid: () =>
    createDashboardError(DASHBOARD_ERRORS.SEGMENT_SUGGESTION_SELECTION_INVALID),
  segmentAssistantSourceInvalid: () =>
    createDashboardError(DASHBOARD_ERRORS.SEGMENT_ASSISTANT_SOURCE_INVALID),
  promotionCampaignScheduleInvalid: () =>
    createDashboardError(DASHBOARD_ERRORS.PROMOTION_CAMPAIGN_SCHEDULE_INVALID),
  campaignPromotionScheduleConflict: () =>
    createDashboardError(DASHBOARD_ERRORS.CAMPAIGN_PROMOTION_SCHEDULE_CONFLICT),
  campaignExecutionWindowClosed: () =>
    createDashboardError(DASHBOARD_ERRORS.CAMPAIGN_EXECUTION_WINDOW_CLOSED)
} as const;

function decisionRequestFailedMessage(cause: unknown) {
  const detail = decisionRequestFailedDetail(cause);

  if (typeof detail === "string" && detail.length > 0) {
    return `${DASHBOARD_ERRORS.DECISION_REQUEST_FAILED.message} ${detail}`;
  }

  if (detail && typeof detail === "object") {
    const reason = "reason" in detail ? detail.reason : undefined;
    const segmentId = "segment_id" in detail ? detail.segment_id : undefined;
    if (typeof reason === "string" && reason.length > 0) {
      return typeof segmentId === "string" && segmentId.length > 0
        ? `${reason} (${segmentId})`
        : reason;
    }
  }

  return DASHBOARD_ERRORS.DECISION_REQUEST_FAILED.message;
}

function decisionRequestFailedCode(cause: unknown) {
  const detail = decisionRequestFailedDetail(cause);
  const code = detail && typeof detail === "object" && "code" in detail ? detail.code : undefined;

  return typeof code === "string" && code.length > 0
    ? code
    : DASHBOARD_ERRORS.DECISION_REQUEST_FAILED.code;
}

function decisionRequestFailedDetail(cause: unknown) {
  return cause && typeof cause === "object" && "detail" in cause
    ? (cause as { detail?: unknown }).detail
    : undefined;
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
