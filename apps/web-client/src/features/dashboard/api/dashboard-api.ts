import {
  createApiSuccessResponseSchema,
  DashboardAiAnalysisSchema,
  DashboardAiGenerationSchema,
  DashboardAiRecommendationSchema,
  DashboardMainSchema,
  DashboardPurchaseConversionSchema
} from "@loopad/shared";
import { z } from "zod";
import {
  emptyAnalysis,
  emptyGeneration,
  emptyMain,
  emptyPurchaseConversion,
  emptyRecommendation,
  fixtureAnalysis,
  fixtureCustomerDetails,
  fixtureCustomers,
  fixtureGeneration,
  fixtureMain,
  fixturePurchaseConversion,
  fixtureRecommendation
} from "../data/dashboard-fixtures.js";
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
  if (dashboardConfig.dataSource === "fixture") {
    return fetchFixtureDashboardPageResource(tab, query, signal);
  }

  return fetchHttpDashboardPageResource(tab, query, signal);
}

async function fetchHttpDashboardPageResource(
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

async function fetchFixtureDashboardPageResource(
  tab: DashboardTab,
  query: DashboardQuery,
  signal: AbortSignal
): Promise<DashboardPageResource> {
  await waitForFixture(signal);

  if (query.projectId.toLowerCase() === "error-demo") {
    throw new Error("fixture error-demo project triggered a recoverable dashboard error");
  }

  const isEmptyDemo = query.projectId.toLowerCase() === "empty-demo";

  switch (tab) {
    case "main":
      return { data: isEmptyDemo ? emptyMain : fixtureMain, tab };
    case "purchaseConversion":
      return {
        data: isEmptyDemo ? emptyPurchaseConversion : fixturePurchaseConversion,
        tab
      };
    case "aiAnalysis":
      return {
        data: isEmptyDemo ? emptyAnalysis : selectAnalysisCustomer(query.selectedCustomerId),
        tab
      };
    case "aiRecommendation":
      return {
        data: isEmptyDemo ? emptyRecommendation : selectRecommendationCustomer(query.selectedCustomerId),
        tab
      };
    case "aiGeneration":
      return {
        data: isEmptyDemo ? emptyGeneration : selectGenerationCustomer(query.selectedCustomerId),
        tab
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
  url.searchParams.set("dateRange", query.dateRange);
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

function selectAnalysisCustomer(selectedCustomerId: string) {
  return DashboardAiAnalysisSchema.parse({
    ...fixtureAnalysis,
    selected_customer:
      fixtureCustomerDetails[selectedCustomerId] ??
      fixtureCustomerDetails[fixtureAnalysis.customers[0]?.customer_group_id ?? ""]
  });
}

function selectRecommendationCustomer(selectedCustomerId: string) {
  return DashboardAiRecommendationSchema.parse({
    ...fixtureRecommendation,
    selected_customer:
      fixtureCustomerDetails[selectedCustomerId] ??
      fixtureCustomerDetails[fixtureRecommendation.customers[0]?.customer_group_id ?? ""]
  });
}

function selectGenerationCustomer(selectedCustomerId: string) {
  const selectedCustomer =
    fixtureCustomers.find((customer) => customer.customer_group_id === selectedCustomerId) ??
    fixtureGeneration.selected_customer;

  return DashboardAiGenerationSchema.parse({
    ...fixtureGeneration,
    selected_customer: selectedCustomer
  });
}

function waitForFixture(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }

    const timer = window.setTimeout(resolve, dashboardConfig.fixtureLatencyMs);
    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true }
    );
  });
}
