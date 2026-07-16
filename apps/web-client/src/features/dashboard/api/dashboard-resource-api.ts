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
    case "campaign-promotions":
    case "promotions":
    case "promotion-metrics":
    case "segments":
    case "experiments":
    case "campaign-metrics":
      return {
        tab,
        data: await fetchResource("/dashboard/v1/main", DashboardMainSchema, query, signal)
      };
    case "dataExplorer":
      throw new Error("데이터 탐색기를 여는 방법이 올바르지 않아요. 다시 접속해 주세요.");
    case "sdk":
      throw new Error("이벤트 관리 페이지는 자체 API를 사용합니다.");
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
