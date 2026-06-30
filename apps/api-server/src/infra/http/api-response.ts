import { randomUUID } from "node:crypto";
import type { ApiError, ApiFailure, ApiSuccess } from "@loopad/shared";

export const REQUEST_ID_HEADER = "x-request-id";

export type RequestWithRequestId = {
  requestId?: string;
  header?: (name: string) => string | undefined;
  headers?: Record<string, string | string[] | undefined>;
};

export type ResponseWithRequestIdHeader = {
  setHeader: (name: string, value: string) => unknown;
};

export function ensureRequestId(request: RequestWithRequestId) {
  const requestId =
    request.requestId || getRequestHeader(request, REQUEST_ID_HEADER) || randomUUID();

  request.requestId = requestId;
  return requestId;
}

export function setRequestIdHeader(response: ResponseWithRequestIdHeader, requestId: string) {
  response.setHeader(REQUEST_ID_HEADER, requestId);
}

export function createApiSuccess<TData>(requestId: string, data: TData): ApiSuccess<TData> {
  return { requestId, data };
}

export function createApiFailure(requestId: string, error: ApiError): ApiFailure {
  return {
    requestId,
    error
  };
}

function getRequestHeader(request: RequestWithRequestId, name: string) {
  const headerValue = request.header?.(name);

  if (isNonEmptyString(headerValue)) {
    return headerValue;
  }

  const rawHeader = request.headers?.[name.toLowerCase()];

  if (Array.isArray(rawHeader)) {
    return rawHeader.find(isNonEmptyString);
  }

  return isNonEmptyString(rawHeader) ? rawHeader : undefined;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
