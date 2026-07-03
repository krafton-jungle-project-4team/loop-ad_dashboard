import {
  createApiSuccessResponseSchema,
  DashboardCreateFunnelRequestSchema,
  DashboardEventCatalogSchema,
  DashboardFunnelListSchema,
  DashboardFunnelSchema,
  DashboardMainSchema
} from "@loopad/shared";
import type {
  DashboardCreateFunnelRequest,
  DashboardEventCatalog,
  DashboardFunnel
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
        data: await request("/api/dashboard/v1/main", DashboardMainSchema, query, signal)
      };
    case "funnels":
      return {
        tab,
        data: await request("/api/dashboard/v1/funnels", DashboardFunnelListSchema, query, signal)
      };
  }
}

export async function createDashboardFunnel(
  query: DashboardQuery,
  requestBody: DashboardCreateFunnelRequest
): Promise<DashboardFunnel> {
  const parsedBody = DashboardCreateFunnelRequestSchema.parse(requestBody);
  const url = new URL(
    `${dashboardConfig.apiBaseUrl}/api/dashboard/v1/funnels`,
    window.location.origin
  );
  url.searchParams.set("projectId", query.projectId);

  const response = await fetch(url, {
    body: JSON.stringify(parsedBody),
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    method: "POST"
  });
  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`);
  }

  return createApiSuccessResponseSchema(DashboardFunnelSchema).parse(await response.json()).data;
}

export async function fetchDashboardEventCatalog(
  query: DashboardQuery,
  signal: AbortSignal
): Promise<DashboardEventCatalog> {
  return request("/api/dashboard/v1/event-catalog", DashboardEventCatalogSchema, query, signal);
}

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  query: DashboardQuery,
  signal: AbortSignal
): Promise<T> {
  const url = new URL(`${dashboardConfig.apiBaseUrl}${path}`, window.location.origin);
  url.searchParams.set("projectId", query.projectId);
  url.searchParams.set("dateRange", query.dateRange);
  url.searchParams.set("excludeInternalTraffic", String(query.excludeInternalTraffic));
  url.searchParams.set("excludeBotTraffic", String(query.excludeBotTraffic));
  url.searchParams.set("userScope", query.userScope);
  url.searchParams.set("conversionEvent", query.conversionEvent);
  url.searchParams.set("selectedCustomerId", query.selectedCustomerId);
  url.searchParams.set("sort", query.sort);
  if (query.filter) {
    url.searchParams.set("filter", query.filter);
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
