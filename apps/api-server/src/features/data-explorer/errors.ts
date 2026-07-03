import { HttpStatus } from "@nestjs/common";
import { createDomainError } from "../../app-errors.js";

export const DATA_EXPLORER_ERRORS = {
  SOURCE_NOT_FOUND: {
    statusCode: HttpStatus.NOT_FOUND,
    code: "DATA_EXPLORER_SOURCE_NOT_FOUND",
    message: "Data Explorer source was not found."
  },
  PROJECT_ID_REQUIRED: {
    statusCode: HttpStatus.BAD_REQUEST,
    code: "DATA_EXPLORER_PROJECT_ID_REQUIRED",
    message: "project_id is required."
  },
  OBJECT_REF_REQUIRED: {
    statusCode: HttpStatus.BAD_REQUEST,
    code: "DATA_EXPLORER_OBJECT_REF_REQUIRED",
    message: "object_type and object_name are required."
  },
  SCHEMA_INSPECTION_FAILED: {
    statusCode: HttpStatus.BAD_GATEWAY,
    code: "DATA_EXPLORER_SCHEMA_INSPECTION_FAILED",
    message: "Live schema inspection failed."
  }
} as const;

type DataExplorerErrorKey = keyof typeof DATA_EXPLORER_ERRORS;

function createDataExplorerError(key: DataExplorerErrorKey, options?: ErrorOptions) {
  return createDomainError(DATA_EXPLORER_ERRORS[key], options);
}

export const dataExplorerErrors = {
  sourceNotFound: (options?: ErrorOptions) => createDataExplorerError("SOURCE_NOT_FOUND", options),
  projectIdRequired: () => createDataExplorerError("PROJECT_ID_REQUIRED"),
  objectRefRequired: () => createDataExplorerError("OBJECT_REF_REQUIRED"),
  schemaInspectionFailed: (options?: ErrorOptions) =>
    createDataExplorerError("SCHEMA_INSPECTION_FAILED", options)
} as const;
