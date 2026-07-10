import { DashboardFunnelListSchema, DashboardMainSchema } from "@loopad/shared";
import { apiRequest } from "../../../shared/api/http-client.js";
import type {
  DashboardPageResource,
  DashboardQuery,
  DashboardTab
} from "../model/dashboard-types.js";
import { dashboardQuerySearchParams } from "./dashboard-request.js";

export async function fetchDashboardPageResource(
  tab: DashboardTab,
  query: DashboardQuery,
  signal: AbortSignal
): Promise<DashboardPageResource> {
  switch (tab) {
    case "main":
      return {
        tab,
        data: await fetchResource("/dashboard/v1/main", DashboardMainSchema, query, signal)
      };
    case "funnels":
      return {
        tab,
        data: await fetchResource("/dashboard/v1/funnels", DashboardFunnelListSchema, query, signal)
      };
    case "campaigns":
    case "campaign-detail":
    case "campaign-flow-map":
    case "campaign-promotions":
    case "promotion-metrics":
    case "segments":
    case "experiments":
    case "campaign-metrics":
      return {
        tab,
        data: await fetchResource("/dashboard/v1/main", DashboardMainSchema, query, signal)
      };
    case "dataExplorer":
      throw new Error("데이터 탐색기는 별도 API 리소스 흐름을 사용합니다.");
    case "sdk":
      throw new Error("SDK 연동 가이드는 정적 페이지입니다.");
  }
}

export function fetchDashboardResource<T>(
  path: string,
  schema: Parameters<typeof apiRequest<T>>[1],
  query: DashboardQuery,
  signal: AbortSignal,
  extraSearchParams?: Record<string, string | undefined>
) {
  return fetchResource(path, schema, query, signal, extraSearchParams);
}

function fetchResource<T>(
  path: string,
  schema: Parameters<typeof apiRequest<T>>[1],
  query: DashboardQuery,
  signal: AbortSignal,
  extraSearchParams?: Record<string, string | undefined>
) {
  return apiRequest(path, schema, {
    method: "GET",
    searchParams: dashboardQuerySearchParams(query, extraSearchParams),
    signal
  });
}
