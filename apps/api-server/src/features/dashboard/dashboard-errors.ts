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
  }
} as const;

export function createDashboardError(
  error: (typeof DASHBOARD_ERRORS)[keyof typeof DASHBOARD_ERRORS]
) {
  return createDomainError(error);
}

export const dashboardErrors = {
  projectIdRequired: () => createDashboardError(DASHBOARD_ERRORS.PROJECT_ID_REQUIRED),
  segmentPreviewNotSaveable: () =>
    createDashboardError(DASHBOARD_ERRORS.SEGMENT_PREVIEW_NOT_SAVEABLE)
} as const;
