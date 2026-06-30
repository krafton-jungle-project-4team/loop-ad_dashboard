import {
  createApiSuccessResponseSchema,
  DashboardAiAnalysisSchema,
  DashboardAiGenerationSchema,
  DashboardAiRecommendationSchema,
  DashboardMainSchema,
  DashboardPurchaseConversionSchema,
  type DashboardAiAnalysis,
  type DashboardAiGeneration,
  type DashboardAiRecommendation,
  type DashboardChartPoint,
  type DashboardCustomerDetail,
  type DashboardCustomerSegment,
  type DashboardFunnelStep,
  type DashboardKpiCard,
  type DashboardMain,
  type DashboardPurchaseConversion,
  type DashboardRecommendationAction,
  type DashboardSegmentGroup
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
  DashboardConversionEvent,
  DashboardPageResource,
  DashboardQuery,
  DashboardTab,
  DashboardUserScope
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
      return { data: isEmptyDemo ? emptyMain : createAdjustedMain(fixtureMain, query), tab };
    case "purchaseConversion":
      return {
        data: isEmptyDemo
          ? emptyPurchaseConversion
          : createAdjustedPurchaseConversion(fixturePurchaseConversion, query),
        tab
      };
    case "aiAnalysis":
      return {
        data: isEmptyDemo ? emptyAnalysis : createAdjustedAnalysis(fixtureAnalysis, query),
        tab
      };
    case "aiRecommendation":
      return {
        data: isEmptyDemo ? emptyRecommendation : createAdjustedRecommendation(fixtureRecommendation, query),
        tab
      };
    case "aiGeneration":
      return {
        data: isEmptyDemo ? emptyGeneration : createAdjustedGeneration(fixtureGeneration, query),
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

type UserScopeProfile = {
  conversionMultiplier: number;
  countMultiplier: number;
  dropOffDelta: number;
  revenueMultiplier: number;
};

type ConversionEventProfile = {
  actionIds: readonly string[];
  conversionMultiplier: number;
  countMultiplier: number;
  dropOffDelta: number;
  funnelLabels: readonly [string, string, string, string, string];
  funnelStageMultipliers: readonly [number, number, number, number, number];
  revenueMultiplier: number;
};

type CriteriaProfile = {
  conversionMultiplier: number;
  countMultiplier: number;
  dropOffDelta: number;
  eventLabel: string;
  eventProfile: ConversionEventProfile;
  revenueMultiplier: number;
  scopeLabel: string;
};

const userScopeLabels = {
  active: "활성",
  all: "전체",
  "at-risk": "이탈 위험",
  new: "신규",
  returning: "재방문"
} satisfies Record<DashboardUserScope, string>;

const conversionEventLabels = {
  "add-to-cart": "장바구니",
  contact: "문의",
  "purchase-complete": "구매 완료",
  "sign-up": "회원가입"
} satisfies Record<DashboardConversionEvent, string>;

const userScopeProfiles = {
  active: { conversionMultiplier: 1.18, countMultiplier: 0.72, dropOffDelta: -0.04, revenueMultiplier: 1.08 },
  all: { conversionMultiplier: 1, countMultiplier: 1, dropOffDelta: 0, revenueMultiplier: 1 },
  "at-risk": {
    conversionMultiplier: 0.58,
    countMultiplier: 0.31,
    dropOffDelta: 0.15,
    revenueMultiplier: 0.52
  },
  new: { conversionMultiplier: 0.74, countMultiplier: 0.42, dropOffDelta: 0.08, revenueMultiplier: 0.64 },
  returning: {
    conversionMultiplier: 1.32,
    countMultiplier: 0.47,
    dropOffDelta: -0.06,
    revenueMultiplier: 1.22
  }
} satisfies Record<DashboardUserScope, UserScopeProfile>;

const conversionEventProfiles = {
  "add-to-cart": {
    actionIds: ["act-cart-threshold", "act-retarget-bundle"],
    conversionMultiplier: 1.18,
    countMultiplier: 2.35,
    dropOffDelta: -0.08,
    funnelLabels: ["세션 시작", "상품 조회", "상세 비교", "옵션 선택", "장바구니"],
    funnelStageMultipliers: [1, 0.94, 0.72, 0.58, 0.52],
    revenueMultiplier: 0.36
  },
  contact: {
    actionIds: ["act-video-review", "act-mobile-coupon"],
    conversionMultiplier: 0.7,
    countMultiplier: 0.48,
    dropOffDelta: 0.04,
    funnelLabels: ["세션 시작", "랜딩 조회", "문의 폼", "정보 입력", "문의"],
    funnelStageMultipliers: [1, 0.62, 0.34, 0.22, 0.18],
    revenueMultiplier: 0.58
  },
  "purchase-complete": {
    actionIds: ["act-mobile-coupon", "act-cart-threshold", "act-retarget-bundle", "act-video-review"],
    conversionMultiplier: 1,
    countMultiplier: 1,
    dropOffDelta: 0,
    funnelLabels: ["세션 시작", "상품 조회", "장바구니", "결제 시작", "구매 완료"],
    funnelStageMultipliers: [1, 1, 1, 1, 1],
    revenueMultiplier: 1
  },
  "sign-up": {
    actionIds: ["act-mobile-coupon", "act-video-review"],
    conversionMultiplier: 0.82,
    countMultiplier: 1.56,
    dropOffDelta: -0.02,
    funnelLabels: ["세션 시작", "가입 페이지", "약관 확인", "인증 완료", "회원가입"],
    funnelStageMultipliers: [1, 0.86, 0.64, 0.5, 0.42],
    revenueMultiplier: 0.48
  }
} satisfies Record<DashboardConversionEvent, ConversionEventProfile>;

function createAdjustedMain(data: DashboardMain, query: DashboardQuery): DashboardMain {
  const profile = getCriteriaProfile(query);
  const scopedCustomers = getScopedCustomers(fixtureCustomers, query.userScope);

  return DashboardMainSchema.parse({
    ...data,
    behavior_event_series: scaleChartPoints(data.behavior_event_series, profile.countMultiplier),
    kpis: data.kpis.map((kpi) => adjustMainKpi(kpi, scopedCustomers, query, profile)),
    purchase_series: scaleChartPoints(
      data.purchase_series,
      profile.countMultiplier * profile.conversionMultiplier
    ),
    segment_status: adjustSegmentGroups(data.segment_status, scopedCustomers, profile.countMultiplier)
  });
}

function createAdjustedPurchaseConversion(
  data: DashboardPurchaseConversion,
  query: DashboardQuery
): DashboardPurchaseConversion {
  const profile = getCriteriaProfile(query);
  const scopedCustomerIds = new Set(
    getScopedCustomers(fixtureCustomers, query.userScope).map((customer) => customer.customer_group_id)
  );
  const scopedRows = data.customer_behavior_rows.filter((row) =>
    scopedCustomerIds.has(row.customer_group_id)
  );

  return DashboardPurchaseConversionSchema.parse({
    ...data,
    customer_behavior_rows: (scopedRows.length > 0 ? scopedRows : data.customer_behavior_rows).map(
      (row) => ({
        ...row,
        conversion_rate: scaleRate(row.conversion_rate, profile.conversionMultiplier),
        expected_revenue: scaleMoney(row.expected_revenue, profile.revenueMultiplier),
        major_drop_off_rate: clampRate(row.major_drop_off_rate + profile.dropOffDelta),
        observed_signal: `${profile.eventLabel} · ${row.observed_signal}`
      })
    ),
    device_rows: data.device_rows.map((row) => {
      const sessionStart = scaleCount(row.session_start_count, profile.countMultiplier);
      const productView = scaleCount(row.product_view_count, profile.countMultiplier * 0.96);
      const addToCart = scaleCount(
        row.add_to_cart_count,
        profile.countMultiplier * (query.conversionEvent === "add-to-cart" ? 1.4 : 1)
      );
      const checkoutStart = scaleCount(row.checkout_start_count, profile.countMultiplier * 0.92);
      const purchase = scaleCount(
        row.purchase_count,
        profile.countMultiplier * profile.conversionMultiplier
      );

      return {
        ...row,
        add_to_cart_count: addToCart,
        cart_to_purchase_rate: safeRatio(purchase, addToCart),
        checkout_start_count: checkoutStart,
        product_view_count: productView,
        purchase_count: purchase,
        session_start_count: sessionStart,
        view_to_cart_rate: safeRatio(addToCart, productView),
        view_to_purchase_rate: safeRatio(purchase, productView)
      };
    }),
    funnel_steps: adjustFunnelSteps(data.funnel_steps, profile)
  });
}

function createAdjustedAnalysis(data: DashboardAiAnalysis, query: DashboardQuery): DashboardAiAnalysis {
  const customers = getScopedCustomers(data.customers, query.userScope)
    .map((customer) => adjustCustomerSegment(customer, query))
    .sort((a, b) => a.conversion_rate - b.conversion_rate);

  return DashboardAiAnalysisSchema.parse({
    ...data,
    customers,
    selected_customer: selectAdjustedCustomerDetail(query.selectedCustomerId, customers, query)
  });
}

function createAdjustedRecommendation(
  data: DashboardAiRecommendation,
  query: DashboardQuery
): DashboardAiRecommendation {
  const profile = getCriteriaProfile(query);
  const customers = getScopedCustomers(data.customers, query.userScope)
    .map((customer) => adjustCustomerSegment(customer, query))
    .sort((a, b) => b.conversion_rate - a.conversion_rate);
  const actionIds = new Set(profile.eventProfile.actionIds);
  const recommendedActions = data.recommended_actions.filter((action) => actionIds.has(action.action_id));

  return DashboardAiRecommendationSchema.parse({
    ...data,
    customers,
    recommendation_rationale: [
      `${profile.scopeLabel} 사용자 범위와 ${profile.eventLabel} 이벤트 기준으로 추천 우선순위를 재계산했습니다.`,
      ...data.recommendation_rationale.slice(0, 2)
    ],
    recommended_actions: (recommendedActions.length > 0 ? recommendedActions : data.recommended_actions).map(
      (action) => adjustRecommendationAction(action, profile)
    ),
    selected_customer: selectAdjustedCustomerDetail(query.selectedCustomerId, customers, query)
  });
}

function createAdjustedGeneration(data: DashboardAiGeneration, query: DashboardQuery): DashboardAiGeneration {
  const profile = getCriteriaProfile(query);
  const actionIds = new Set(profile.eventProfile.actionIds);
  const scopedCustomers = getScopedCustomers(fixtureCustomers, query.userScope).map((customer) =>
    adjustCustomerSegment(customer, query)
  );
  const selectedCustomer =
    scopedCustomers.find((customer) => customer.customer_group_id === query.selectedCustomerId) ??
    scopedCustomers[0] ??
    null;
  const generatedItems = data.generated_items.filter((item) => actionIds.has(item.action.action_id));

  return DashboardAiGenerationSchema.parse({
    ...data,
    generated_items: (generatedItems.length > 0 ? generatedItems : data.generated_items).map((item) => ({
      ...item,
      action: adjustRecommendationAction(item.action, profile),
      content: item.content
        ? {
            ...item.content,
            message: item.content.message
              ? `${profile.scopeLabel} · ${profile.eventLabel}: ${item.content.message}`
              : item.content.message,
            title: `${profile.eventLabel} · ${item.content.title}`
          }
        : item.content
    })),
    selected_customer: selectedCustomer
  });
}

function adjustMainKpi(
  kpi: DashboardKpiCard,
  scopedCustomers: DashboardCustomerSegment[],
  query: DashboardQuery,
  profile: CriteriaProfile
): DashboardKpiCard {
  switch (kpi.key) {
    case "active_sessions":
      return {
        ...kpi,
        description: `${profile.scopeLabel} 범위 · ${formatTrafficPolicy(query)}`,
        value: scaleCount(kpi.value, profile.countMultiplier)
      };
    case "gross_revenue":
      return {
        ...kpi,
        description: `${profile.eventLabel} 이벤트 기준 가치`,
        label: query.conversionEvent === "purchase-complete" ? kpi.label : `${profile.eventLabel} 기여 가치`,
        value: scaleMoney(kpi.value, profile.revenueMultiplier)
      };
    case "conversion_rate":
      return {
        ...kpi,
        description: `${profile.scopeLabel} 사용자 · ${profile.eventLabel}`,
        label: `${profile.eventLabel} 전환율`,
        value: scaleRate(kpi.value, profile.conversionMultiplier)
      };
    case "ai_ready_segments":
      return {
        ...kpi,
        description: `${profile.scopeLabel} 범위에서 관측 가능한 세그먼트`,
        value: Math.max(scopedCustomers.length, scopedCustomers.length * 3)
      };
    default:
      return kpi;
  }
}

function adjustSegmentGroups(
  groups: DashboardSegmentGroup[],
  customers: DashboardCustomerSegment[],
  multiplier: number
): DashboardSegmentGroup[] {
  return groups.map((group) => {
    const labels = getSegmentLabels(group.key, customers);
    const matchedItems = labels
      ? group.items.filter((item) => labels.has(item.label))
      : group.items;
    const items = matchedItems.length > 0 ? matchedItems : group.items;

    return {
      ...group,
      items: rebalanceShares(
        items.map((item) => ({
          ...item,
          value: scaleCount(item.value, multiplier)
        }))
      )
    };
  });
}

function adjustFunnelSteps(steps: DashboardFunnelStep[], profile: CriteriaProfile): DashboardFunnelStep[] {
  const counts = steps.map((step, index) =>
    scaleCount(
      step.count,
      profile.countMultiplier *
        (profile.eventProfile.funnelStageMultipliers[index] ?? 1) *
        (index === steps.length - 1 ? profile.conversionMultiplier : 1)
    )
  );

  return steps.map((step, index) => {
    const count = counts[index] ?? 0;
    const nextCount = counts[index + 1] ?? 0;
    const previousCount = counts[index - 1] ?? count;

    return {
      ...step,
      count,
      drop_off_rate: index === steps.length - 1 ? 0 : clampRate(1 - safeRatio(nextCount, count)),
      label: profile.eventProfile.funnelLabels[index] ?? step.label,
      rate_from_previous: index === 0 ? 1 : safeRatio(count, previousCount)
    };
  });
}

function adjustCustomerSegment(
  customer: DashboardCustomerSegment,
  query: DashboardQuery
): DashboardCustomerSegment {
  const profile = getCriteriaProfile(query);

  return {
    ...customer,
    conversion_rate: scaleRate(customer.conversion_rate, profile.conversionMultiplier),
    expected_revenue: scaleMoney(customer.expected_revenue, profile.revenueMultiplier)
  };
}

function adjustCustomerDetail(
  detail: DashboardCustomerDetail,
  query: DashboardQuery
): DashboardCustomerDetail {
  const profile = getCriteriaProfile(query);

  return {
    ...detail,
    customer_group: adjustCustomerSegment(detail.customer_group, query),
    metrics: detail.metrics.map((metric) => {
      if (metric.value_type === "money") {
        return { ...metric, value: scaleMoney(metric.value, profile.revenueMultiplier) };
      }

      if (metric.value_type === "rate") {
        return { ...metric, value: scaleRate(metric.value, profile.conversionMultiplier) };
      }

      return { ...metric, value: roundTo(metric.value * profile.conversionMultiplier, 3) };
    }),
    purchase_history: rebalanceShares(
      detail.purchase_history.map((item) => ({
        ...item,
        value: scaleCount(item.value, profile.revenueMultiplier)
      }))
    ),
    stage_flow: detail.stage_flow.map((stage, index) => ({
      ...stage,
      label: index === detail.stage_flow.length - 1 ? profile.eventLabel : stage.label,
      rate: scaleRate(
        stage.rate,
        index === detail.stage_flow.length - 1 ? profile.conversionMultiplier : Math.sqrt(profile.countMultiplier)
      )
    }))
  };
}

function adjustRecommendationAction(
  action: DashboardRecommendationAction,
  profile: CriteriaProfile
): DashboardRecommendationAction {
  return {
    ...action,
    description: `${profile.scopeLabel} 사용자 기준 ${action.description}`,
    probability:
      action.probability === null
        ? null
        : scaleRate(action.probability, Math.min(1.25, profile.conversionMultiplier)),
    title: `${profile.eventLabel} · ${action.title}`
  };
}

function selectAdjustedCustomerDetail(
  selectedCustomerId: string,
  customers: DashboardCustomerSegment[],
  query: DashboardQuery
) {
  const selectedCustomer =
    customers.find((customer) => customer.customer_group_id === selectedCustomerId) ?? customers[0];

  if (!selectedCustomer) {
    return null;
  }

  const detail = fixtureCustomerDetails[selectedCustomer.customer_group_id];
  return detail ? adjustCustomerDetail(detail, query) : null;
}

function getCriteriaProfile(query: DashboardQuery): CriteriaProfile {
  const scopeProfile = userScopeProfiles[query.userScope];
  const eventProfile = conversionEventProfiles[query.conversionEvent];
  const trafficCountMultiplier =
    (query.excludeInternalTraffic ? 1 : 1.07) * (query.excludeBotTraffic ? 1 : 1.16);
  const trafficConversionMultiplier =
    (query.excludeInternalTraffic ? 1 : 1.02) * (query.excludeBotTraffic ? 1 : 0.9);
  const trafficRevenueMultiplier =
    (query.excludeInternalTraffic ? 1 : 1.02) * (query.excludeBotTraffic ? 1 : 0.96);
  const trafficDropOffDelta =
    (query.excludeInternalTraffic ? 0 : -0.01) + (query.excludeBotTraffic ? 0 : 0.04);

  return {
    conversionMultiplier:
      scopeProfile.conversionMultiplier *
      eventProfile.conversionMultiplier *
      trafficConversionMultiplier,
    countMultiplier: scopeProfile.countMultiplier * eventProfile.countMultiplier * trafficCountMultiplier,
    dropOffDelta: scopeProfile.dropOffDelta + eventProfile.dropOffDelta + trafficDropOffDelta,
    eventLabel: conversionEventLabels[query.conversionEvent],
    eventProfile,
    revenueMultiplier:
      scopeProfile.revenueMultiplier * eventProfile.revenueMultiplier * trafficRevenueMultiplier,
    scopeLabel: userScopeLabels[query.userScope]
  };
}

function getScopedCustomers<TCustomer extends DashboardCustomerSegment>(
  customers: TCustomer[],
  scope: DashboardUserScope
): TCustomer[] {
  const scopedCustomers = customers.filter((customer) => {
    switch (scope) {
      case "all":
        return true;
      case "active":
        return customer.conversion_rate >= 0.047;
      case "new":
        return customer.customer_group_name.includes("신규") || customer.channel === "Referral";
      case "returning":
        return (
          customer.customer_group_name.includes("재방문") ||
          customer.channel === "CRM" ||
          customer.channel === "Email" ||
          customer.customer_group_id === "cg-retarget-high"
        );
      case "at-risk":
        return (
          customer.customer_group_id === "cg-cart-leaver" ||
          customer.conversion_rate < 0.05 ||
          customer.major_drop_off_stage.includes("장바구니 -> 결제 시작")
        );
    }
  });

  return scopedCustomers.length > 0 ? scopedCustomers : customers;
}

function getSegmentLabels(groupKey: string, customers: DashboardCustomerSegment[]) {
  switch (groupKey) {
    case "age":
      return new Set(customers.map((customer) => customer.age_group));
    case "category":
      return new Set(customers.map((customer) => customer.category));
    case "channel":
      return new Set(customers.map((customer) => customer.channel));
    case "region":
      return new Set(customers.map((customer) => customer.region));
    default:
      return null;
  }
}

function scaleChartPoints(points: DashboardChartPoint[], multiplier: number): DashboardChartPoint[] {
  return points.map((point) => ({ ...point, value: scaleCount(point.value, multiplier) }));
}

function rebalanceShares<TItem extends { share: number; value: number }>(items: TItem[]): TItem[] {
  const total = items.reduce((sum, item) => sum + item.value, 0);

  if (total <= 0) {
    return items.map((item) => ({ ...item, share: 0 }));
  }

  return items.map((item) => ({ ...item, share: roundTo(item.value / total, 3) }));
}

function scaleCount(value: number, multiplier: number) {
  return Math.max(0, Math.round(value * multiplier));
}

function scaleMoney(value: number, multiplier: number) {
  return Math.max(0, Math.round((value * multiplier) / 10000) * 10000);
}

function scaleRate(value: number, multiplier: number) {
  return clampRate(value * multiplier);
}

function safeRatio(numerator: number, denominator: number) {
  return denominator <= 0 ? 0 : clampRate(numerator / denominator);
}

function clampRate(value: number) {
  return Math.max(0, Math.min(1, roundTo(value, 3)));
}

function roundTo(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function formatTrafficPolicy(query: DashboardQuery) {
  const internal = query.excludeInternalTraffic ? "내부 제외" : "내부 포함";
  const bot = query.excludeBotTraffic ? "봇 제외" : "봇 포함";
  return `${internal} · ${bot}`;
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
