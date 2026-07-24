import { createApiSuccessResponseSchema } from "@loopad/shared";
import { z } from "zod";
import { dashboardConfig } from "../../features/dashboard/model/dashboard-config.js";

type HttpMethod = "DELETE" | "GET" | "PATCH" | "POST" | "PUT";

type ApiSearchParamValue = boolean | number | string | null | undefined;

export type ApiRequestOptions = {
  body?: unknown;
  errorMessage?: (response: Response) => Promise<string> | string;
  headers?: HeadersInit;
  method: HttpMethod;
  searchParams?: Record<string, ApiSearchParamValue> | URLSearchParams;
  signal?: AbortSignal;
};

export function apiGet<T>(path: string, schema: z.ZodType<T>, signal?: AbortSignal): Promise<T> {
  return apiRequest(path, schema, { method: "GET", signal });
}

export function apiPost<T>(path: string, schema: z.ZodType<T>, body: unknown): Promise<T> {
  return apiRequest(path, schema, { body, method: "POST" });
}

export function apiPatch<T>(path: string, schema: z.ZodType<T>, body: unknown): Promise<T> {
  return apiRequest(path, schema, { body, method: "PATCH" });
}

export function apiDelete<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  return apiRequest(path, schema, { method: "DELETE" });
}

export async function apiRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  options: ApiRequestOptions
): Promise<T> {
  const url = new URL(`${dashboardConfig.apiBaseUrl}${path}`, window.location.origin);
  appendSearchParams(url, options.searchParams);
  const hasBody = options.body !== undefined;
  const headers = new Headers(options.headers);
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  if (hasBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(url, {
    body: hasBody ? JSON.stringify(options.body) : undefined,
    headers,
    method: options.method,
    signal: options.signal
  });

  if (!response.ok) {
    const message = options.errorMessage
      ? await options.errorMessage(response)
      : `요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요. (${response.status})`;
    throw new Error(message);
  }

  return createApiSuccessResponseSchema(schema).parse(await response.json()).data;
}

function appendSearchParams(url: URL, searchParams: ApiRequestOptions["searchParams"]) {
  if (!searchParams) {
    return;
  }

  if (searchParams instanceof URLSearchParams) {
    for (const [key, value] of searchParams) {
      url.searchParams.set(key, value);
    }
    return;
  }

  for (const [key, value] of Object.entries(searchParams)) {
    if (value !== null && value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }
}
