import {
  Catch,
  HttpException,
  HttpStatus,
  type ArgumentsHost,
  type ExceptionFilter
} from "@nestjs/common";
import type { ApiError } from "@loopad/shared";
import { ZodError } from "zod";
import { AppError } from "../../app-errors.js";
import { assignLoggerContext, logWithContext } from "../logger/index.js";
import {
  createApiFailure,
  ensureRequestId,
  setRequestIdHeader,
  type RequestWithRequestId,
  type ResponseWithRequestIdHeader
} from "./api-response.js";

type HttpRequest = RequestWithRequestId & {
  method?: string;
  originalUrl?: string;
  url?: string;
};

type JsonResponse = ResponseWithRequestIdHeader & {
  status(code: number): {
    json(body: unknown): void;
  };
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const request = http.getRequest<HttpRequest>();
    const response = http.getResponse<JsonResponse>();
    const requestId = ensureRequestId(request);
    const statusCode = getStatusCode(error);
    const body = getErrorBody(error, statusCode);

    assignLoggerContext({ statusCode, errorCode: body.code });
    logErrorResponse(request, requestId, statusCode, body, error);

    setRequestIdHeader(response, requestId);
    response.status(statusCode).json(createApiFailure(requestId, body));
  }
}

function getStatusCode(error: unknown) {
  if (error instanceof AppError) {
    return error.statusCode;
  }

  if (error instanceof ZodError) {
    return HttpStatus.BAD_REQUEST;
  }

  if (error instanceof HttpException) {
    return error.getStatus();
  }

  return HttpStatus.INTERNAL_SERVER_ERROR;
}

function getErrorBody(error: unknown, statusCode: number): ApiError {
  if (error instanceof AppError) {
    return {
      statusCode,
      code: error.code,
      message: error.message
    };
  }

  if (error instanceof ZodError) {
    return {
      statusCode,
      code: "VALIDATION_FAILED",
      message: error.issues.map((issue) => issue.message).join(", ")
    };
  }

  if (error instanceof HttpException) {
    return {
      statusCode,
      code: getHttpErrorCode(error),
      message: getHttpErrorMessage(error, statusCode)
    };
  }

  return {
    statusCode,
    code: "INTERNAL_SERVER_ERROR",
    message: "Unexpected server error."
  };
}

function logErrorResponse(
  request: HttpRequest,
  requestId: string,
  statusCode: number,
  body: ApiError,
  error: unknown
) {
  const fields: Record<string, number | string | undefined> = {
    requestId,
    statusCode,
    code: body.code,
    method: request.method,
    path: request.originalUrl ?? request.url,
    errorMessage: getLogMessage(body.message, error)
  };

  if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
    fields.stack = getErrorStack(error);
    logWithContext("error", "Returning error response", fields);
    return;
  }

  logWithContext("warn", "Returning error response", fields);
}

function getHttpErrorCode(error: HttpException) {
  const response = error.getResponse();

  if (isRecord(response) && typeof response.code === "string" && response.code.length > 0) {
    return response.code;
  }

  return httpStatusErrorCodes[error.getStatus()] ?? "HTTP_ERROR";
}

function getHttpErrorMessage(error: HttpException, statusCode: number): string {
  const response = error.getResponse();

  if (typeof response === "string") {
    return response;
  }

  if (isRecord(response) && "message" in response) {
    const message = response.message;

    if (Array.isArray(message) && message.every((item) => typeof item === "string")) {
      return message.join(", ");
    }

    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }

  return error.message || httpStatusErrorMessages[statusCode] || "HTTP error.";
}

function getLogMessage(message: string, error: unknown) {
  if (error instanceof Error && error.cause instanceof Error) {
    return `${message}: ${error.cause.message}`;
  }

  return message;
}

function getErrorStack(error: unknown) {
  return error instanceof Error ? error.stack : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

const httpStatusErrorCodes: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: "BAD_REQUEST",
  [HttpStatus.UNAUTHORIZED]: "UNAUTHENTICATED",
  [HttpStatus.FORBIDDEN]: "FORBIDDEN",
  [HttpStatus.NOT_FOUND]: "NOT_FOUND",
  [HttpStatus.CONFLICT]: "CONFLICT"
};

const httpStatusErrorMessages: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: "Bad request.",
  [HttpStatus.UNAUTHORIZED]: "Authentication is required.",
  [HttpStatus.FORBIDDEN]: "Forbidden.",
  [HttpStatus.NOT_FOUND]: "Not found.",
  [HttpStatus.CONFLICT]: "Conflict."
};
