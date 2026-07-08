import { apiFailureResponseSchema, createApiSuccessResponseSchema } from "@loopad/shared";
import { z } from "zod";
import { dashboardConfig } from "../../features/dashboard/model/dashboard-config.js";

type HttpMethod = "GET" | "POST";
type ApiErrorMessageFormatter = (code: string, message: string) => string;

export function apiGet<T>(path: string, schema: z.ZodType<T>, signal?: AbortSignal): Promise<T> {
  return request(path, schema, { method: "GET", signal });
}

export function apiPost<T>(path: string, schema: z.ZodType<T>, body: unknown): Promise<T> {
  return request(path, schema, { body, method: "POST" });
}

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  init: { body?: unknown; method: HttpMethod; signal?: AbortSignal }
): Promise<T> {
  return apiJson(path, schema, {
    body: init.body ? JSON.stringify(init.body) : undefined,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {})
    },
    method: init.method,
    signal: init.signal
  });
}

export function apiUrl(path: string) {
  return new URL(`${dashboardConfig.apiBaseUrl}${path}`, window.location.origin);
}

export async function apiFetch(pathOrUrl: string | URL | Request, init?: RequestInit) {
  const input =
    typeof pathOrUrl === "string"
      ? isAbsoluteUrl(pathOrUrl)
        ? new URL(pathOrUrl)
        : apiUrl(pathOrUrl)
      : pathOrUrl;

  try {
    return await fetch(input, {
      ...init,
      credentials: "include"
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }

    throw new Error("API 서버에 연결할 수 없습니다. API 서버가 실행 중인지 확인해주세요.");
  }
}

function isAbsoluteUrl(value: string) {
  return /^https?:\/\//.test(value);
}

export async function apiJson<T>(
  pathOrUrl: string | URL | Request,
  schema: z.ZodType<T>,
  init?: RequestInit,
  options?: { formatErrorMessage?: ApiErrorMessageFormatter }
): Promise<T> {
  const response = await apiFetch(pathOrUrl, init);

  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response, options?.formatErrorMessage));
  }

  return createApiSuccessResponseSchema(schema).parse(await response.json()).data;
}

export async function readApiErrorMessage(
  response: Response,
  formatErrorMessage?: ApiErrorMessageFormatter
) {
  const fallbackMessage = `API 요청 실패: ${response.status}`;

  try {
    const parsed = apiFailureResponseSchema.safeParse(await response.clone().json());

    if (!parsed.success) {
      return fallbackMessage;
    }

    return formatErrorMessage
      ? formatErrorMessage(parsed.data.error.code, parsed.data.error.message)
      : parsed.data.error.message;
  } catch {
    return fallbackMessage;
  }
}
