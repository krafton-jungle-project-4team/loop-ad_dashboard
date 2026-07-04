import { HttpStatus } from "@nestjs/common";
import { createDomainError } from "../../app-errors.js";

export const DATA_EXPLORER_ERRORS = {
  SQL_VALIDATION_FAILED: {
    statusCode: HttpStatus.BAD_REQUEST,
    code: "DATA_EXPLORER_SQL_VALIDATION_FAILED",
    message: "SQL could not be executed."
  },
  SCHEMA_INSPECTION_FAILED: {
    statusCode: HttpStatus.BAD_GATEWAY,
    code: "DATA_EXPLORER_SCHEMA_INSPECTION_FAILED",
    message: "Live schema inspection failed."
  },
  QUERY_EXECUTION_FAILED: {
    statusCode: HttpStatus.BAD_GATEWAY,
    code: "DATA_EXPLORER_QUERY_EXECUTION_FAILED",
    message: "Read-only query execution failed."
  },
  QUERY_PLAN_FAILED: {
    statusCode: HttpStatus.BAD_GATEWAY,
    code: "DATA_EXPLORER_QUERY_PLAN_FAILED",
    message: "Data query plan could not be created from live schema."
  },
  AI_CHAT_FAILED: {
    statusCode: HttpStatus.BAD_GATEWAY,
    code: "DATA_EXPLORER_AI_CHAT_FAILED",
    message: "Data Explorer AI request failed."
  }
} as const;

type DataExplorerErrorKey = keyof typeof DATA_EXPLORER_ERRORS;

function createDataExplorerError(key: DataExplorerErrorKey, options?: ErrorOptions) {
  return createDomainError(DATA_EXPLORER_ERRORS[key], options);
}

export const dataExplorerErrors = {
  sqlValidationFailed: () => createDataExplorerError("SQL_VALIDATION_FAILED"),
  schemaInspectionFailed: (options?: ErrorOptions) =>
    createDataExplorerError("SCHEMA_INSPECTION_FAILED", options),
  queryExecutionFailed: (options?: ErrorOptions) =>
    createDataExplorerError("QUERY_EXECUTION_FAILED", options),
  queryPlanFailed: (options?: ErrorOptions) =>
    createDataExplorerError("QUERY_PLAN_FAILED", options),
  aiChatFailed: (options?: ErrorOptions) => createDataExplorerError("AI_CHAT_FAILED", options)
} as const;
