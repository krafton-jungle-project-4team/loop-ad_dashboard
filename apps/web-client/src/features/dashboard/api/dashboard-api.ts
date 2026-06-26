import {
  AiJobAcceptedSchema,
  AiJobResultSchema,
  ConversionReportSchema,
  DashboardOverviewSchema,
  createApiSuccessResponseSchema
} from "@loopad/shared";
import type { AiJobKind } from "@loopad/shared";
import type { z } from "zod";
import { apiBaseUrl, projectId } from "../model/dashboard-config.js";
import type { DashboardResources } from "../model/dashboard-types.js";

export async function fetchDashboardResources(signal: AbortSignal): Promise<DashboardResources> {
  const [overview, conversion] = await Promise.all([
    request("/dashboard/overview", DashboardOverviewSchema, signal),
    request("/dashboard/conversion", ConversionReportSchema, signal)
  ]);

  return { overview, conversion };
}

export async function createDashboardAiJob(kind: AiJobKind, signal: AbortSignal) {
  return request(
    "/dashboard/ai-jobs",
    AiJobAcceptedSchema,
    signal,
    {
      method: "POST",
      body: JSON.stringify({ kind, projectId })
    },
    false
  );
}

export async function fetchDashboardAiResult(resultId: string, signal: AbortSignal) {
  return request(`/dashboard/ai-results/${resultId}`, AiJobResultSchema, signal, undefined, false);
}

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  signal: AbortSignal,
  init?: RequestInit,
  includeProjectId = true
): Promise<T> {
  const url = new URL(`${apiBaseUrl}${path}`, window.location.origin);
  if (includeProjectId) {
    url.searchParams.set("projectId", projectId);
  }

  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers
    },
    signal
  });
  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`);
  }

  return createApiSuccessResponseSchema(schema).parse(await response.json()).data;
}
