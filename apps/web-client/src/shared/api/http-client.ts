import { createApiSuccessResponseSchema } from "@loopad/shared";
import { z } from "zod";
import { dashboardConfig } from "../../features/dashboard/model/dashboard-config.js";

type HttpMethod = "GET" | "POST";

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
  const url = new URL(`${dashboardConfig.apiBaseUrl}${path}`, window.location.origin);
  const response = await fetch(url, {
    body: init.body ? JSON.stringify(init.body) : undefined,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {})
    },
    method: init.method,
    signal: init.signal
  });

  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`);
  }

  return createApiSuccessResponseSchema(schema).parse(await response.json()).data;
}
