import {
  ConversionReportSchema,
  CreativeReportSchema,
  DashboardOverviewSchema,
  InsightReportSchema,
  RecommendationReportSchema,
  createApiSuccessResponseSchema
} from "@loopad/shared";
import type { z } from "zod";
import { apiBaseUrl, projectId } from "../model/dashboard-config.js";
import type { DashboardResources } from "../model/dashboard-types.js";

export async function fetchDashboardResources(signal: AbortSignal): Promise<DashboardResources> {
  const [overview, conversion, insights, recommendations, creatives] = await Promise.all([
    request("/dashboard/overview", DashboardOverviewSchema, signal),
    request("/dashboard/conversion", ConversionReportSchema, signal),
    request("/dashboard/ai-insights", InsightReportSchema, signal),
    request("/dashboard/ai-recommendations", RecommendationReportSchema, signal),
    request("/creatives/generated", CreativeReportSchema, signal)
  ]);

  return { overview, conversion, insights, recommendations, creatives };
}

async function request<T>(path: string, schema: z.ZodType<T>, signal: AbortSignal): Promise<T> {
  const url = new URL(`${apiBaseUrl}${path}`, window.location.origin);
  url.searchParams.set("projectId", projectId);

  const response = await fetch(url, { headers: { Accept: "application/json" }, signal });
  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`);
  }

  return createApiSuccessResponseSchema(schema).parse(await response.json()).data;
}
