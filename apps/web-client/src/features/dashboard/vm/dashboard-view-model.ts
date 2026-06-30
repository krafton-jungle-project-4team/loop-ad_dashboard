import type {
  DashboardAiAnalysis,
  DashboardAiGeneration,
  DashboardAiRecommendation,
  DashboardCustomerDetail,
  DashboardCustomerSegment,
  DashboardKpiCard,
  DashboardMetricValue
} from "@loopad/shared";
import { formatInteger, formatMoney, formatPercent } from "../model/dashboard-format.js";
import type { DashboardPageResource, DashboardQuery, DashboardSort } from "../model/dashboard-types.js";

export type KpiCardViewModel = {
  description?: string;
  id: string;
  label: string;
  tone: "amber" | "emerald" | "rose" | "sky" | "slate" | "violet";
  value: string;
};

export type ChartPointViewModel = {
  displayValue: string;
  label: string;
  value: number;
};

export type SegmentItemViewModel = {
  displayValue: string;
  id: string;
  label: string;
  share: number;
};

export type SegmentGroupViewModel = {
  id: string;
  items: SegmentItemViewModel[];
  title: string;
};

export type MainOverviewViewModel = {
  behaviorSeries: ChartPointViewModel[];
  isEmpty: boolean;
  kpis: KpiCardViewModel[];
  purchaseSeries: ChartPointViewModel[];
  segmentGroups: SegmentGroupViewModel[];
  tab: "main";
};

export type FunnelStepViewModel = {
  countLabel: string;
  dropOffLabel: string;
  id: string;
  label: string;
  rateLabel: string;
  stage: number;
  width: number;
};

export type DeviceConversionRowViewModel = {
  addToCart: string;
  cartToPurchaseRate: string;
  checkoutStart: string;
  device: string;
  productView: string;
  purchase: string;
  purchaseValue: number;
  sessionStart: string;
  viewToCartRate: string;
  viewToPurchaseRate: string;
};

export type CustomerBehaviorRowViewModel = {
  conversionRate: string;
  conversionRateValue: number;
  expectedRevenue: string;
  expectedRevenueValue: number;
  id: string;
  majorDropOffRate: string;
  majorDropOffRateValue: number;
  name: string;
  observedSignal: string;
};

export type PurchaseConversionViewModel = {
  customerRows: CustomerBehaviorRowViewModel[];
  deviceRows: DeviceConversionRowViewModel[];
  funnelSteps: FunnelStepViewModel[];
  isEmpty: boolean;
  tab: "purchaseConversion";
};

export type CustomerRowViewModel = {
  ageGroup: string;
  category: string;
  channel: string;
  conversionRate: string;
  conversionRateValue: number;
  device: string;
  expectedRevenue: string;
  expectedRevenueValue: number;
  gender: string;
  id: string;
  isSelected: boolean;
  majorDropOffStage: string;
  name: string;
  region: string;
};

export type CustomerDetailViewModel = {
  attributes: string[];
  caseAnalysis: string[];
  metrics: KpiCardViewModel[];
  name: string;
  purchaseHistory: SegmentItemViewModel[];
  rationale: string[];
  stageFlow: Array<{ id: string; label: string; rate: number; rateLabel: string }>;
};

export type RecommendationActionViewModel = {
  description: string;
  id: string;
  probabilityLabel: string | null;
  probabilityValue: number | null;
  rationale: string;
  status: string;
  title: string;
  type: string;
};

export type InsightViewModel = {
  actions: RecommendationActionViewModel[];
  customers: CustomerRowViewModel[];
  isEmpty: boolean;
  mode: "analysis" | "recommendation";
  rationale: string[];
  selectedCustomer: CustomerDetailViewModel | null;
  tab: "aiAnalysis" | "aiRecommendation";
};

export type GeneratedContentViewModel = {
  actionDescription: string;
  contentStatus: string;
  contentType: string;
  createdAt: string | null;
  id: string;
  message: string | null;
  title: string;
};

export type GenerationViewModel = {
  cards: GeneratedContentViewModel[];
  isEmpty: boolean;
  selectedCustomer: CustomerRowViewModel | null;
  tab: "aiGeneration";
};

export type DashboardViewModel =
  | MainOverviewViewModel
  | PurchaseConversionViewModel
  | InsightViewModel
  | GenerationViewModel;

export function createDashboardViewModel(
  resource: DashboardPageResource,
  query: DashboardQuery
): DashboardViewModel {
  switch (resource.tab) {
    case "main":
      return {
        behaviorSeries: resource.data.behavior_event_series.map(toChartPoint),
        isEmpty:
          resource.data.kpis.length === 0 &&
          resource.data.behavior_event_series.length === 0 &&
          resource.data.purchase_series.length === 0 &&
          resource.data.segment_status.length === 0,
        kpis: resource.data.kpis.map(toKpiCard),
        purchaseSeries: resource.data.purchase_series.map(toChartPoint),
        segmentGroups: resource.data.segment_status.map((group) => ({
          id: group.key,
          items: group.items.map((item) => ({
            displayValue: formatInteger(item.value),
            id: `${group.key}-${item.label}`,
            label: item.label,
            share: item.share
          })),
          title: group.title
        })),
        tab: "main"
      };
    case "purchaseConversion":
      return {
        customerRows: sortCustomerBehaviorRows(
          resource.data.customer_behavior_rows
            .filter((row) =>
              matchesFilter([row.customer_group_name, row.observed_signal], query.filter)
            )
            .map((row) => ({
              conversionRate: formatPercent(row.conversion_rate),
              conversionRateValue: row.conversion_rate,
              expectedRevenue: formatMoney(row.expected_revenue),
              expectedRevenueValue: row.expected_revenue,
              id: row.customer_group_id,
              majorDropOffRate: formatPercent(row.major_drop_off_rate),
              majorDropOffRateValue: row.major_drop_off_rate,
              name: row.customer_group_name,
              observedSignal: row.observed_signal
            })),
          query.sort
        ),
        deviceRows: resource.data.device_rows
          .map((row) => ({
            addToCart: formatInteger(row.add_to_cart_count),
            cartToPurchaseRate: formatPercent(row.cart_to_purchase_rate),
            checkoutStart: formatInteger(row.checkout_start_count),
            device: row.device,
            productView: formatInteger(row.product_view_count),
            purchase: formatInteger(row.purchase_count),
            purchaseValue: row.purchase_count,
            sessionStart: formatInteger(row.session_start_count),
            viewToCartRate: formatPercent(row.view_to_cart_rate),
            viewToPurchaseRate: formatPercent(row.view_to_purchase_rate)
          })),
        funnelSteps: resource.data.funnel_steps.map((step, index) => ({
          countLabel: formatInteger(step.count),
          dropOffLabel: formatPercent(step.drop_off_rate),
          id: step.key,
          label: step.label,
          rateLabel: formatPercent(step.rate_from_previous),
          stage: index + 1,
          width: step.rate_from_previous * 100
        })),
        isEmpty:
          resource.data.customer_behavior_rows.length === 0 &&
          resource.data.device_rows.length === 0 &&
          resource.data.funnel_steps.length === 0,
        tab: "purchaseConversion"
      };
    case "aiAnalysis":
      return createInsightViewModel(resource.data, query, "analysis", "aiAnalysis");
    case "aiRecommendation":
      return createInsightViewModel(resource.data, query, "recommendation", "aiRecommendation");
    case "aiGeneration":
      return {
        cards: resource.data.generated_items
          .map((item) => ({
            actionDescription: item.action.description,
            contentStatus: item.content?.status ?? "queued",
            contentType: item.content?.content_type ?? item.action.action_type,
            createdAt: item.content?.created_at ?? null,
            id: item.content?.content_id ?? item.action.action_id,
            message: item.content?.message ?? null,
            title: item.content?.title ?? item.action.title
          })),
        isEmpty: resource.data.generated_items.length === 0,
        selectedCustomer: resource.data.selected_customer
          ? toCustomerRow(resource.data.selected_customer, query.selectedCustomerId)
          : null,
        tab: "aiGeneration"
      };
  }
}

function createInsightViewModel(
  data: DashboardAiAnalysis | DashboardAiRecommendation,
  query: DashboardQuery,
  mode: "analysis" | "recommendation",
  tab: "aiAnalysis" | "aiRecommendation"
): InsightViewModel {
  const customers = sortCustomerRows(
    data.customers
      .filter((customer) =>
        matchesFilter(
          [
            customer.customer_group_name,
            customer.channel,
            customer.age_group,
            customer.gender,
            customer.category,
            customer.region,
            customer.device,
            customer.major_drop_off_stage
          ],
          query.filter
        )
      )
      .map((customer) => toCustomerRow(customer, query.selectedCustomerId)),
    query.sort
  );

  return {
    actions:
      "recommended_actions" in data
        ? data.recommended_actions.map((action) => ({
            description: action.description,
            id: action.action_id,
            probabilityLabel:
              action.probability === null ? null : formatPercent(action.probability),
            probabilityValue: action.probability === null ? null : action.probability,
            rationale: action.rationale,
            status: action.status,
            title: action.title,
            type: action.action_type
          }))
        : [],
    customers,
    isEmpty: data.customers.length === 0,
    mode,
    rationale: "recommendation_rationale" in data ? data.recommendation_rationale : [],
    selectedCustomer: data.selected_customer ? toCustomerDetail(data.selected_customer) : null,
    tab
  };
}

function toChartPoint(point: { label: string; value: number }): ChartPointViewModel {
  return {
    displayValue: formatInteger(point.value),
    label: point.label,
    value: point.value
  };
}

function toKpiCard(kpi: DashboardKpiCard, index: number): KpiCardViewModel {
  const tones: KpiCardViewModel["tone"][] = ["sky", "emerald", "amber", "violet"];

  return {
    description: kpi.description ?? undefined,
    id: kpi.key,
    label: kpi.label,
    tone: tones[index % tones.length] ?? "slate",
    value: formatKpiValue(kpi)
  };
}

function toMetricCard(metric: DashboardMetricValue, index: number): KpiCardViewModel {
  const value =
    metric.value_type === "money"
      ? formatMoney(metric.value)
      : metric.value_type === "rate"
        ? formatPercent(metric.value)
        : `${metric.value >= 0 ? "+" : ""}${formatPercent(metric.value)}`;

  return {
    id: metric.label,
    label: metric.label,
    tone: metric.value_type === "delta" && metric.value < 0 ? "emerald" : toKpiCardTone(index),
    value
  };
}

function toKpiCardTone(index: number): KpiCardViewModel["tone"] {
  const tones: KpiCardViewModel["tone"][] = ["sky", "emerald", "amber", "violet"];
  return tones[index % tones.length] ?? "slate";
}

function toCustomerRow(
  customer: DashboardCustomerSegment,
  selectedCustomerId: string
): CustomerRowViewModel {
  return {
    ageGroup: customer.age_group,
    category: customer.category,
    channel: customer.channel,
    conversionRate: formatPercent(customer.conversion_rate),
    conversionRateValue: customer.conversion_rate,
    device: customer.device,
    expectedRevenue: formatMoney(customer.expected_revenue),
    expectedRevenueValue: customer.expected_revenue,
    gender: customer.gender,
    id: customer.customer_group_id,
    isSelected: customer.customer_group_id === selectedCustomerId,
    majorDropOffStage: customer.major_drop_off_stage,
    name: customer.customer_group_name,
    region: customer.region
  };
}

function toCustomerDetail(detail: DashboardCustomerDetail): CustomerDetailViewModel {
  return {
    attributes: [
      detail.customer_group.channel,
      detail.customer_group.age_group,
      detail.customer_group.gender,
      detail.customer_group.category,
      detail.customer_group.region,
      detail.customer_group.device
    ],
    caseAnalysis: detail.case_analysis,
    metrics: detail.metrics.map(toMetricCard),
    name: detail.customer_group.customer_group_name,
    purchaseHistory: detail.purchase_history.map((item) => ({
      displayValue: formatInteger(item.value),
      id: item.label,
      label: item.label,
      share: item.share
    })),
    rationale: detail.rationale,
    stageFlow: detail.stage_flow.map((stage) => ({
      id: stage.key,
      label: stage.label,
      rate: stage.rate,
      rateLabel: formatPercent(stage.rate)
    }))
  };
}

function formatKpiValue(kpi: DashboardKpiCard): string {
  switch (kpi.value_type) {
    case "count":
      return formatInteger(kpi.value);
    case "money":
      return formatMoney(kpi.value);
    case "rate":
      return formatPercent(kpi.value);
    case "text":
      return String(kpi.value);
  }
}

function sortCustomerRows(rows: CustomerRowViewModel[], sort: DashboardSort) {
  return [...rows].sort((a, b) => {
    switch (sort) {
      case "conversion-asc":
        return a.conversionRateValue - b.conversionRateValue;
      case "conversion-desc":
        return b.conversionRateValue - a.conversionRateValue;
      case "dropoff-desc":
        return getDropOffStageRisk(b.majorDropOffStage) - getDropOffStageRisk(a.majorDropOffStage);
      case "revenue-desc":
        return b.expectedRevenueValue - a.expectedRevenueValue;
    }
  });
}

function sortCustomerBehaviorRows(rows: CustomerBehaviorRowViewModel[], sort: DashboardSort) {
  return [...rows].sort((a, b) => {
    switch (sort) {
      case "conversion-asc":
        return a.conversionRateValue - b.conversionRateValue;
      case "conversion-desc":
        return b.conversionRateValue - a.conversionRateValue;
      case "dropoff-desc":
        return b.majorDropOffRateValue - a.majorDropOffRateValue;
      case "revenue-desc":
        return b.expectedRevenueValue - a.expectedRevenueValue;
    }
  });
}

function matchesFilter(values: string[], filter: string) {
  if (!filter) {
    return true;
  }

  const normalizedFilter = filter.toLowerCase();
  return values.some((value) => value.toLowerCase().includes(normalizedFilter));
}

function getDropOffStageRisk(stage: string) {
  if (stage.includes("결제 시작 -> 구매")) {
    return 4;
  }

  if (stage.includes("장바구니 -> 결제 시작")) {
    return 3;
  }

  if (stage.includes("상품 조회 -> 장바구니")) {
    return 2;
  }

  if (stage.includes("세션 시작 -> 상품 조회")) {
    return 1;
  }

  return 0;
}
