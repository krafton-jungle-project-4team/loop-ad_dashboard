import {
  createApiSuccessResponseSchema,
  DashboardAiAnalysisSchema,
  DashboardAiGenerationSchema,
  DashboardAiRecommendationSchema,
  DashboardMainSchema,
  DashboardPurchaseConversionSchema
} from "@loopad/shared";
import { z } from "zod";
import { dashboardConfig } from "../model/dashboard-config.js";
import type {
  DashboardPageResource,
  DashboardQuery,
  DashboardTab
} from "../model/dashboard-types.js";

export async function fetchDashboardPageResource(
  tab: DashboardTab,
  query: DashboardQuery,
  signal: AbortSignal
): Promise<DashboardPageResource> {
  switch (tab) {
    case "main":
      return {
        tab,
        data: await request("/dashboard/main", DashboardMainSchema, query, signal)
      };
    case "purchaseConversion":
      return {
        tab,
        data: await request(
          "/dashboard/purchase-conversion",
          DashboardPurchaseConversionSchema,
          query,
          signal
        )
      };
    case "aiAnalysis":
      return {
        tab,
        data: await request("/dashboard/ai-analysis", DashboardAiAnalysisSchema, query, signal)
      };
    case "aiRecommendation":
      return {
        tab,
        data: await request(
          "/dashboard/ai-recommendation",
          DashboardAiRecommendationSchema,
          query,
          signal
        )
      };
    case "aiGeneration":
      return {
        tab,
        data: await request("/dashboard/ai-generation", DashboardAiGenerationSchema, query, signal)
      };
  }
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
