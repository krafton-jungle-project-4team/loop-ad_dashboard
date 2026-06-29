import {
  createApiSuccessResponseSchema,
  DashboardActionResultSchema,
  DashboardEventsSummarySchema,
  DashboardExperimentPerformanceSchema,
  DashboardExperimentSchema,
  DashboardFunnelSchema,
  DashboardRecommendationsSchema
} from "@loopad/shared";
import type { DashboardActionResult } from "@loopad/shared";
import { z } from "zod";
import { dashboardConfig } from "../model/dashboard-config.js";
import type {
  DashboardPageResource,
  DashboardQuery,
  DashboardTab
} from "../model/dashboard-types.js";

const DashboardExperimentPerformancePageSchema = z.object({
  experiment: DashboardExperimentSchema,
  performance: DashboardExperimentPerformanceSchema
});

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
      return post(
        "/dashboard/recommendations/generate",
        DashboardActionResultSchema,
        buildDashboardActionBody(tab, query)
      );
    case "contentResults":
      return post(
        "/dashboard/contents/generate",
        DashboardActionResultSchema,
        buildDashboardActionBody(tab, query)
      );
    case "experimentPerformance":
      return post(
        `/dashboard/experiments/${query.experimentId}/evaluate`,
        DashboardActionResultSchema,
        buildDashboardActionBody(tab, query)
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
  if (query.recommendationResultId) {
    url.searchParams.set("recommendationResultId", query.recommendationResultId);
  }

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal
  });
  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`);
  }

  return createApiSuccessResponseSchema(schema).parse(await response.json()).data;
}

type DashboardActionBody = {
  project_id: string;
  experiment_id?: string;
  recommendation_result_id?: string;
  analysis_window?: DashboardAnalysisWindow;
  baseline_window?: DashboardAnalysisWindow;
  candidate_dimensions?: string[];
  filters?: {
    device?: "mobile";
  };
  reward_metric?: "purchase";
  attribution_window_hours?: number;
  minimum_impressions?: number;
  target_metric?: "view_to_cart_rate";
  top_n?: number;
};

type DashboardAnalysisWindow = {
  start: string;
  end: string;
};

const recommendationAnalysisRequest = {
  analysis_window: {
    end: "2021-01-10T23:59:59+09:00",
    start: "2021-01-04T00:00:00+09:00"
  },
  baseline_window: {
    end: "2021-01-04T00:00:00+09:00",
    start: "2021-01-01T00:00:00+09:00"
  },
  candidate_dimensions: ["device", "category", "inventory_status", "channel"],
  filters: {
    device: "mobile"
  },
  target_metric: "view_to_cart_rate",
  top_n: 3
} satisfies Omit<DashboardActionBody, "project_id" | "experiment_id">;

function buildDashboardActionBody(tab: DashboardTab, query: DashboardQuery): DashboardActionBody {
  switch (tab) {
    case "contentResults":
      if (!query.recommendationResultId) {
        throw new Error("콘텐츠 생성에는 recommendationResultId가 필요합니다.");
      }
      return {
        project_id: query.projectId,
        recommendation_result_id: query.recommendationResultId
      };
    case "experimentPerformance":
      return {
        attribution_window_hours: 24,
        experiment_id: query.experimentId,
        minimum_impressions: 30,
        project_id: query.projectId,
        reward_metric: "purchase"
      };
    case "recommendationResults":
      return {
        experiment_id: query.experimentId,
        project_id: query.projectId,
        ...recommendationAnalysisRequest
      };
    case "dashboard":
    case "funnelSegments":
      throw new Error("이 탭에는 실행 액션이 없습니다.");
  }
}

async function post<T>(path: string, schema: z.ZodType<T>, body: DashboardActionBody): Promise<T> {
  const url = new URL(`${dashboardConfig.apiBaseUrl}${path}`, window.location.origin);
  const response = await fetch(url, {
    body: JSON.stringify(body),
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
