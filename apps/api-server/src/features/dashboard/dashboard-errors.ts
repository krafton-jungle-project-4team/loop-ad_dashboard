import { HttpStatus } from "@nestjs/common";
import { createDomainError } from "../../app-errors.js";

export const DASHBOARD_ERRORS = {
  PROJECT_ID_REQUIRED: {
    statusCode: HttpStatus.BAD_REQUEST,
    code: "DASHBOARD_PROJECT_ID_REQUIRED",
    message: "projectId query param is required."
  }
} as const;

export function createDashboardError(
  error: (typeof DASHBOARD_ERRORS)[keyof typeof DASHBOARD_ERRORS]
) {
  return createDomainError(error);
}

export const dashboardErrors = {
  projectIdRequired: () => createDashboardError(DASHBOARD_ERRORS.PROJECT_ID_REQUIRED)
} as const;
