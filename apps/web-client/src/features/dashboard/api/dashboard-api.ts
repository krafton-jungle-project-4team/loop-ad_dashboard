import {
  createApiSuccessResponseSchema,
  DashboardEventsSummarySchema,
  DashboardExperimentPerformanceSchema,
  DashboardExperimentSchema,
  DashboardFunnelSchema,
  DashboardRecommendationsSchema
} from "@loopad/shared";
import { z } from "zod";
import { dashboardConfig } from "../model/dashboard-config.js";
import type {
  DashboardActionResult,
  DashboardPageResource,
  DashboardQuery,
  DashboardTab
} from "../model/dashboard-types.js";

const DashboardExperimentPerformancePageSchema = z.object({
  experiment: DashboardExperimentSchema,
  performance: DashboardExperimentPerformanceSchema
});

const DashboardActionResultSchema = z
  .object({
    status: z.string()
  })
  .passthrough();

export async function fetchDashboardPageResource(
  tab: DashboardTab,
  query: DashboardQuery,
  signal: AbortSignal
): Promise<DashboardPageResource> {
  switch (tab) {
    case "dashboard":
      return {
        tab,
        data: await request("/dashboard/overview", DashboardEventsSummarySchema, query, signal)
      };
    case "funnelSegments":
      return {
        tab,
        data: await request("/dashboard/funnel-segments", DashboardFunnelSchema, query, signal)
      };
    case "recommendationResults":
      return {
        tab,
        data: await request(
          "/dashboard/recommendation-results",
          DashboardRecommendationsSchema,
          query,
          signal
        )
      };
    case "contentResults":
      return {
        tab,
        data: await request(
          "/dashboard/content-results",
          DashboardRecommendationsSchema,
          query,
          signal
        )
      };
    case "experimentPerformance":
      return {
        tab,
        data: await request(
          "/dashboard/experiment-performance",
          DashboardExperimentPerformancePageSchema,
          query,
          signal
        )
      };
  }
}

export async function runDashboardAction(
  tab: DashboardTab,
  query: DashboardQuery
): Promise<DashboardActionResult> {
  switch (tab) {
    case "recommendationResults":
      return post("/dashboard/recommendations/generate", DashboardActionResultSchema, query);
    case "contentResults":
      return post("/dashboard/contents/generate", DashboardActionResultSchema, query);
    case "experimentPerformance":
      return post(
        `/dashboard/experiments/${query.experimentId}/evaluate`,
        DashboardActionResultSchema,
        query
      );
    case "dashboard":
    case "funnelSegments":
      throw new Error("이 탭에는 실행 액션이 없습니다.");
  }
}

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  query: DashboardQuery,
  signal: AbortSignal
): Promise<T> {
  const url = new URL(`${dashboardConfig.apiBaseUrl}${path}`, window.location.origin);
  url.searchParams.set("experimentId", query.experimentId);
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

async function post<T>(path: string, schema: z.ZodType<T>, query: DashboardQuery): Promise<T> {
  const url = new URL(`${dashboardConfig.apiBaseUrl}${path}`, window.location.origin);
  const response = await fetch(url, {
    body: JSON.stringify({
      experiment_id: query.experimentId,
      project_id: query.projectId
    }),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    method: "POST"
  });
  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`);
  }

  return createApiSuccessResponseSchema(schema).parse(await response.json()).data;
}
