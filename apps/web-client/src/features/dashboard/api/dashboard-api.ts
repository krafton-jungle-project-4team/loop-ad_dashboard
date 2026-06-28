import {
  createApiSuccessResponseSchema,
  DashboardEventsSummarySchema,
  DashboardExperimentPerformanceSchema,
  DashboardExperimentSchema,
  DashboardFunnelSchema,
  DashboardRecommendationsSchema
} from "@loopad/shared";
import type { z } from "zod";
import { dashboardConfig } from "../model/dashboard-config.js";
import type { DashboardResources } from "../model/dashboard-types.js";

export async function fetchDashboardResources(signal: AbortSignal): Promise<DashboardResources> {
  const { experimentId } = dashboardConfig;
  const [eventsSummary, funnel, recommendations, experiment, experimentPerformance] =
    await Promise.all([
      request("/dashboard/events/summary", DashboardEventsSummarySchema, signal),
      request("/dashboard/funnel", DashboardFunnelSchema, signal),
      request("/dashboard/recommendations", DashboardRecommendationsSchema, signal),
      request(`/dashboard/experiments/${experimentId}`, DashboardExperimentSchema, signal),
      request(
        `/dashboard/experiments/${experimentId}/performance`,
        DashboardExperimentPerformanceSchema,
        signal
      )
    ]);

  return {
    eventsSummary,
    funnel,
    recommendations,
    experiment,
    experimentPerformance
  };
}

async function request<T>(path: string, schema: z.ZodType<T>, signal: AbortSignal): Promise<T> {
  const url = new URL(`${dashboardConfig.apiBaseUrl}${path}`, window.location.origin);
  url.searchParams.set("projectId", dashboardConfig.projectId);

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal
  });
  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`);
  }

  return createApiSuccessResponseSchema(schema).parse(await response.json()).data;
}
