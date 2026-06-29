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
import type { DashboardQuery, DashboardResources } from "../model/dashboard-types.js";

export async function fetchDashboardResources(
  query: DashboardQuery,
  signal: AbortSignal
): Promise<DashboardResources> {
  const [eventsSummary, funnel, recommendations, experiment, experimentPerformance] =
    await Promise.all([
      request("/dashboard/events/summary", DashboardEventsSummarySchema, query, signal),
      request("/dashboard/funnel", DashboardFunnelSchema, query, signal),
      request("/dashboard/recommendations", DashboardRecommendationsSchema, query, signal),
      request(
        `/dashboard/experiments/${query.experimentId}`,
        DashboardExperimentSchema,
        query,
        signal
      ),
      request(
        `/dashboard/experiments/${query.experimentId}/performance`,
        DashboardExperimentPerformanceSchema,
        query,
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

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  query: DashboardQuery,
  signal: AbortSignal
): Promise<T> {
  const url = new URL(`${dashboardConfig.apiBaseUrl}${path}`, window.location.origin);
  url.searchParams.set("projectId", query.projectId);

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal
  });
  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`);
  }

  return createApiSuccessResponseSchema(schema).parse(await response.json()).data;
}
