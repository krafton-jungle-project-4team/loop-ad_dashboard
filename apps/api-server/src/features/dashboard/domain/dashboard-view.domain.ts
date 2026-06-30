import { createHash } from "node:crypto";
import type {
  DashboardAiAnalysis,
  DashboardAiGeneration,
  DashboardAiRecommendation,
  DashboardCustomerDetail,
  DashboardCustomerSegment,
  DashboardDeviceConversionRow,
  DashboardFunnelStep,
  DashboardGenerationItem,
  DashboardMain,
  DashboardMetricValue,
  DashboardPurchaseConversion,
  DashboardRecommendationAction,
  DashboardSegmentGroup,
  DashboardStageFlow
} from "@loopad/shared";
import type { RecommendationContextRow } from "../repository/dashboard-recommendation-reader.js";
import type {
  ChartPointView,
  CustomerGroupEventView,
  DashboardEventView,
  DeviceFunnelView,
  FunnelCountsView,
  MainMetricCountsView,
  SegmentStatusView
} from "../repository/read-models.js";

const RECENT_WINDOW_MS = 15 * 60 * 1000;
const DASHBOARD_BEHAVIOR_EVENT_NAMES = new Set([
  "page_view",
  "product_view",
  "add_to_cart",
  "checkout_start",
  "ad_impression",
  "ad_click"
]);

export type DashboardMainSnapshot = {
  counts: MainMetricCountsView;
  behaviorEventSeries: ChartPointView[];
  purchaseSeries: ChartPointView[];
  marketingChannels: SegmentStatusView[];
  regions: SegmentStatusView[];
  ageGender: SegmentStatusView[];
  devicePurchases: SegmentStatusView[];
};

export type DashboardEventAnalysisView = DashboardMainSnapshot & {
  funnel: FunnelCountsView;
  deviceFunnels: DeviceFunnelView[];
  customerGroupsHigh: CustomerGroupEventView[];
  customerGroupsLow: CustomerGroupEventView[];
};

export const DashboardViewDomain = {
  analyzeEventViews(eventViews: DashboardEventView[]): DashboardEventAnalysisView {
    const events = eventViews.map(toAnalyzedEventView);
    const counts = countFunnel(events);
    const customerGroups = getCustomerGroupViews(events);

    return {
      counts: {
        ...counts,
        recent_purchase_count: events.filter(
          (event) => event.event_name === "purchase" && isRecentEvent(event)
        ).length,
        revenue: events.reduce(
          (total, event) => total + (event.event_name === "purchase" ? event.revenue : 0),
          0
        )
      },
      behaviorEventSeries: getMinuteSeries(events, (event) =>
        DASHBOARD_BEHAVIOR_EVENT_NAMES.has(event.event_name)
      ),
      purchaseSeries: getMinuteSeries(events, (event) => event.event_name === "purchase"),
      marketingChannels: getSegmentStatusViews(events, (event) => event.channel),
      regions: getSegmentStatusViews(events, (event) => event.region),
      ageGender: getSegmentStatusViews(events, (event) => `${event.age_group} ${event.gender}`),
      devicePurchases: getSegmentStatusViews(
        events.filter((event) => event.event_name === "purchase"),
        (event) => event.device
      ),
      funnel: counts,
      deviceFunnels: getDeviceFunnelViews(events),
      customerGroupsHigh: sortCustomerGroupViews(customerGroups, "high").slice(0, 20),
      customerGroupsLow: sortCustomerGroupViews(customerGroups, "low").slice(0, 20)
    };
  },
  toMain(snapshot: DashboardMainSnapshot): DashboardMain {
    return {
      kpis: [
        {
          key: "purchase_conversion_rate",
          label: "전체 구매 전환율",
          value: rate(snapshot.counts.purchase_count, snapshot.counts.product_view_count),
          value_type: "rate",
          description: "purchase / product_view"
        },
        {
          key: "checkout_abandonment_rate",
          label: "결제 직전 이탈률",
          value: 1 - rate(snapshot.counts.purchase_count, snapshot.counts.checkout_start_count),
          value_type: "rate",
          description: "1 - purchase / checkout_start"
        },
        {
          key: "recent_purchase_count",
          label: "실시간 구매 건수",
          value: snapshot.counts.recent_purchase_count,
          value_type: "count",
          description: "최근 15분"
        },
        {
          key: "expected_revenue",
          label: "예상 매출",
          value: snapshot.counts.revenue,
          value_type: "money",
          description: "purchase revenue 합계"
        }
      ],
      behavior_event_series: snapshot.behaviorEventSeries,
      purchase_series: snapshot.purchaseSeries,
      segment_status: [
        segmentGroup("marketing_channel", "마케팅 채널", snapshot.marketingChannels),
        segmentGroup("region", "지역", snapshot.regions),
        segmentGroup("age_gender", "연령·성별", snapshot.ageGender),
        segmentGroup("device_purchase", "기기별 구매", snapshot.devicePurchases)
      ]
    };
  },
  toPurchaseConversion(
    funnel: FunnelCountsView,
    deviceFunnels: DeviceFunnelView[],
    customerGroups: CustomerGroupEventView[]
  ): DashboardPurchaseConversion {
    return {
      funnel_steps: toFunnelSteps(funnel),
      device_rows: deviceFunnels.map(toDeviceConversionRow),
      customer_behavior_rows: customerGroups.slice(0, 8).map((group) => ({
        customer_group_id: group.customer_group_id,
        customer_group_name: group.customer_group_name,
        conversion_rate: rate(group.purchase_count, group.product_view_count),
        major_drop_off_rate: majorDropOff(group).rate,
        expected_revenue: group.revenue,
        observed_signal: majorDropOff(group).label
      }))
    };
  },
  toAiAnalysis(
    customerGroups: CustomerGroupEventView[],
    recommendationRows: RecommendationContextRow[],
    selectedCustomerId: string | undefined
  ): DashboardAiAnalysis {
    const selectedGroup = selectCustomerGroup(customerGroups, selectedCustomerId);

    return {
      sort: "low",
      customers: customerGroups.map(toCustomerSegment),
      selected_customer: selectedGroup ? toCustomerDetail(selectedGroup, recommendationRows) : null
    };
  },
  toAiRecommendation(
    customerGroups: CustomerGroupEventView[],
    recommendationRows: RecommendationContextRow[],
    selectedCustomerId: string | undefined
  ): DashboardAiRecommendation {
    const selectedGroup = selectCustomerGroup(customerGroups, selectedCustomerId);
    const selectedRows = rowsForSegment(recommendationRows, selectedGroup?.customer_group_id);

    return {
      sort: "high",
      customers: customerGroups.map(toCustomerSegment),
      selected_customer: selectedGroup ? toCustomerDetail(selectedGroup, recommendationRows) : null,
      recommended_actions: toRecommendationActions(selectedRows),
      recommendation_rationale: selectedRows
        .map((row) => row.action_rationale)
        .filter((rationale): rationale is string => Boolean(rationale))
    };
  },
  toAiGeneration(
    customerGroups: CustomerGroupEventView[],
    recommendationRows: RecommendationContextRow[],
    selectedCustomerId: string | undefined
  ): DashboardAiGeneration {
    const selectedGroup = selectCustomerGroup(customerGroups, selectedCustomerId);
    const selectedRows = rowsForSegment(recommendationRows, selectedGroup?.customer_group_id);

    return {
      customers: customerGroups.map(toCustomerSegment),
      selected_customer: selectedGroup ? toCustomerSegment(selectedGroup) : null,
      generated_items: toGenerationItems(selectedRows)
    };
  }
};

type AnalyzedDashboardEventView = DashboardEventView & {
  timestampMs: number;
};

function toAnalyzedEventView(event: DashboardEventView): AnalyzedDashboardEventView {
  return {
    ...event,
    timestampMs: parseEventTime(event.event_time)
  };
}

function countFunnel(events: AnalyzedDashboardEventView[]): FunnelCountsView {
  const counts = emptyFunnelCounts();

  for (const event of events) {
    incrementFunnelCounts(counts, event);
  }

  return counts;
}

function incrementFunnelCounts(
  counts: FunnelCountsView,
  event: Pick<DashboardEventView, "event_name">
) {
  switch (event.event_name) {
    case "session_start":
    case "page_view":
      counts.session_start_count += 1;
      return;
    case "product_view":
      counts.product_view_count += 1;
      return;
    case "add_to_cart":
      counts.add_to_cart_count += 1;
      return;
    case "checkout_start":
      counts.checkout_start_count += 1;
      return;
    case "purchase":
      counts.purchase_count += 1;
      return;
  }
}

function getMinuteSeries(
  events: AnalyzedDashboardEventView[],
  shouldCount: (event: AnalyzedDashboardEventView) => boolean
): ChartPointView[] {
  const countsByMinute = new Map<number, ChartPointView>();

  for (const event of events) {
    if (!isRecentEvent(event) || !shouldCount(event)) {
      continue;
    }

    const minute = Math.floor(event.timestampMs / 60_000) * 60_000;
    const current = countsByMinute.get(minute) ?? {
      label: formatMinuteLabel(minute),
      value: 0
    };

    countsByMinute.set(minute, {
      ...current,
      value: current.value + 1
    });
  }

  return [...countsByMinute.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, point]) => point);
}

function getSegmentStatusViews(
  events: AnalyzedDashboardEventView[],
  getLabel: (event: AnalyzedDashboardEventView) => string
): SegmentStatusView[] {
  const countsByLabel = new Map<string, number>();

  for (const event of events) {
    const label = getLabel(event) || "미상";
    countsByLabel.set(label, (countsByLabel.get(label) ?? 0) + 1);
  }

  const total = [...countsByLabel.values()].reduce((sum, count) => sum + count, 0);

  return [...countsByLabel.entries()]
    .map(([label, value]) => ({
      label,
      value,
      share: total > 0 ? value / total : 0
    }))
    .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label))
    .slice(0, 4);
}

function getDeviceFunnelViews(events: AnalyzedDashboardEventView[]): DeviceFunnelView[] {
  const countsByDevice = new Map<string, FunnelCountsView>();

  for (const event of events) {
    const device = event.device || "미상";
    const counts = countsByDevice.get(device) ?? emptyFunnelCounts();

    incrementFunnelCounts(counts, event);
    countsByDevice.set(device, counts);
  }

  return [...countsByDevice.entries()]
    .map(([device, counts]) => ({ device, ...counts }))
    .sort(
      (left, right) =>
        right.purchase_count - left.purchase_count ||
        right.session_start_count - left.session_start_count ||
        left.device.localeCompare(right.device)
    );
}

function getCustomerGroupViews(events: AnalyzedDashboardEventView[]): CustomerGroupEventView[] {
  const groups = new Map<string, CustomerGroupEventView>();

  for (const event of events) {
    const customerGroupId = getCustomerGroupId(event);
    const group =
      groups.get(customerGroupId) ?? createCustomerGroupEventView(customerGroupId, event);

    incrementFunnelCounts(group, event);
    if (event.event_name === "purchase") {
      group.revenue += event.revenue;
    }

    groups.set(customerGroupId, group);
  }

  return [...groups.values()].filter((group) => group.product_view_count > 0);
}

function selectCustomerGroup(
  customerGroups: CustomerGroupEventView[],
  selectedCustomerId: string | undefined
): CustomerGroupEventView | undefined {
  const normalizedSelectedCustomerId = selectedCustomerId?.trim();

  if (normalizedSelectedCustomerId) {
    const selectedGroup = customerGroups.find(
      (group) => group.customer_group_id === normalizedSelectedCustomerId
    );
    if (selectedGroup) {
      return selectedGroup;
    }
  }

  return customerGroups[0];
}

function sortCustomerGroupViews(
  groups: CustomerGroupEventView[],
  sort: "high" | "low"
): CustomerGroupEventView[] {
  const direction = sort === "high" ? -1 : 1;

  return [...groups].sort((left, right) => {
    const conversionDiff =
      rate(left.purchase_count, left.product_view_count) -
      rate(right.purchase_count, right.product_view_count);

    if (conversionDiff !== 0) {
      return conversionDiff * direction;
    }

    return right.product_view_count - left.product_view_count;
  });
}

function createCustomerGroupEventView(
  customerGroupId: string,
  event: DashboardEventView
): CustomerGroupEventView {
  const base = {
    customer_group_id: customerGroupId,
    customer_group_name: [
      event.channel,
      event.age_group,
      event.gender,
      event.device,
      event.category
    ].join(" · "),
    channel: event.channel,
    age_group: event.age_group,
    gender: event.gender,
    category: event.category,
    region: event.region,
    device: event.device,
    revenue: 0
  };

  return {
    ...base,
    ...emptyFunnelCounts()
  };
}

function emptyFunnelCounts(): FunnelCountsView {
  return {
    session_start_count: 0,
    product_view_count: 0,
    add_to_cart_count: 0,
    checkout_start_count: 0,
    purchase_count: 0
  };
}

function getCustomerGroupId(event: DashboardEventView) {
  if (event.segment_hash) {
    return event.segment_hash;
  }

  return createHash("md5")
    .update(
      [
        event.channel,
        event.age_group,
        event.gender,
        event.category,
        event.device,
        event.region
      ].join("|")
    )
    .digest("hex");
}

function isRecentEvent(event: AnalyzedDashboardEventView) {
  return event.timestampMs >= Date.now() - RECENT_WINDOW_MS;
}

function formatMinuteLabel(timestampMs: number) {
  const date = new Date(timestampMs);
  return `${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}`;
}

function parseEventTime(value: string) {
  const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const timestamp = Date.parse(normalized);

  return Number.isFinite(timestamp) ? timestamp : 0;
}

function pad2(value: number) {
  return value.toString().padStart(2, "0");
}

function segmentGroup(
  key: string,
  title: string,
  items: DashboardSegmentGroup["items"]
): DashboardSegmentGroup {
  return { key, title, items };
}

function toFunnelSteps(counts: FunnelCountsView): DashboardFunnelStep[] {
  const rawSteps = [
    { key: "session_start", label: "세션 시작", count: counts.session_start_count },
    { key: "product_view", label: "제품 보기", count: counts.product_view_count },
    { key: "add_to_cart", label: "장바구니에 추가", count: counts.add_to_cart_count },
    { key: "checkout_start", label: "결제 시작", count: counts.checkout_start_count },
    { key: "purchase", label: "구매", count: counts.purchase_count }
  ];

  return rawSteps.map((step, index) => {
    const previous = index === 0 ? step.count : (rawSteps[index - 1]?.count ?? 0);
    const rateFromPrevious = index === 0 ? 1 : rate(step.count, previous);

    return {
      ...step,
      count: Math.trunc(step.count),
      rate_from_previous: rateFromPrevious,
      drop_off_rate: index === 0 ? 0 : 1 - rateFromPrevious
    };
  });
}

function toDeviceConversionRow(row: DeviceFunnelView): DashboardDeviceConversionRow {
  return {
    ...row,
    view_to_cart_rate: rate(row.add_to_cart_count, row.product_view_count),
    cart_to_purchase_rate: rate(row.purchase_count, row.add_to_cart_count),
    view_to_purchase_rate: rate(row.purchase_count, row.product_view_count)
  };
}

function toCustomerSegment(row: CustomerGroupEventView): DashboardCustomerSegment {
  return {
    customer_group_id: row.customer_group_id,
    customer_group_name: row.customer_group_name,
    channel: row.channel,
    age_group: row.age_group,
    gender: row.gender,
    category: row.category,
    region: row.region,
    device: row.device,
    conversion_rate: rate(row.purchase_count, row.product_view_count),
    major_drop_off_stage: majorDropOff(row).label,
    expected_revenue: row.revenue
  };
}

function toCustomerDetail(
  row: CustomerGroupEventView,
  recommendationRows: RecommendationContextRow[]
): DashboardCustomerDetail {
  const matchingRows = rowsForSegment(recommendationRows, row.customer_group_id);
  const rootCauses = matchingRows.flatMap((item) => jsonTextList(item.root_causes_json));
  const anomalyReasons = matchingRows.flatMap((item) => jsonTextList(item.anomaly_json));
  const expectedRate = expectedConversionRate(matchingRows, row);
  const actualRate = rate(row.purchase_count, row.product_view_count);

  return {
    customer_group: toCustomerSegment(row),
    metrics: [
      metric("실제 전환율", actualRate, "rate"),
      metric("예상 전환율", expectedRate, "rate"),
      metric("전환 차이", actualRate - expectedRate, "delta"),
      metric("예상 매출", row.revenue, "money")
    ],
    case_analysis:
      rootCauses.length > 0 ? rootCauses : [`주요 이탈 단계: ${majorDropOff(row).label}`],
    purchase_history: [
      {
        label: row.category,
        value: row.purchase_count,
        share: rate(row.purchase_count, row.product_view_count)
      },
      {
        label: row.channel,
        value: row.product_view_count,
        share: rate(row.product_view_count, row.session_start_count)
      }
    ],
    rationale:
      anomalyReasons.length > 0
        ? anomalyReasons
        : matchingRows
            .map((item) => item.summary_message)
            .filter((message): message is string => Boolean(message)),
    stage_flow: toStageFlow(row)
  };
}

function toStageFlow(row: FunnelCountsView): DashboardStageFlow[] {
  return [
    { key: "session_start", label: "방문", rate: 1 },
    {
      key: "product_view",
      label: "상품 조회",
      rate: rate(row.product_view_count, row.session_start_count)
    },
    {
      key: "add_to_cart",
      label: "장바구니 추가",
      rate: rate(row.add_to_cart_count, row.session_start_count)
    },
    {
      key: "checkout_start",
      label: "결제 정보 입력",
      rate: rate(row.checkout_start_count, row.session_start_count)
    },
    { key: "purchase", label: "구매 완료", rate: rate(row.purchase_count, row.session_start_count) }
  ];
}

function toRecommendationActions(
  rows: RecommendationContextRow[]
): DashboardRecommendationAction[] {
  return rows
    .filter((row) => row.action_id && row.action_type)
    .map((row) => ({
      action_id: row.action_id ?? "",
      action_type: row.action_type ?? "",
      title: row.action_title ?? row.action_id ?? "",
      description: row.action_description ?? "",
      rationale: row.action_rationale ?? "",
      probability: row.sampled_value === null ? null : clampRate(Number(row.sampled_value)),
      status: row.action_status ?? "unknown"
    }));
}

function toGenerationItems(rows: RecommendationContextRow[]): DashboardGenerationItem[] {
  return toRecommendationActions(rows).map((action) => {
    const row = rows.find((item) => item.action_id === action.action_id);

    return {
      action,
      content:
        row?.creative_id && row.creative_created_at
          ? {
              content_id: row.creative_id,
              content_type: contentType(row.creative_type),
              title: row.creative_title ?? action.title,
              message: row.creative_message,
              content_url: row.image_url ?? row.landing_url,
              status: row.creative_status ?? "unknown",
              created_at: row.creative_created_at.toISOString()
            }
          : null
    };
  });
}

function rowsForSegment(
  rows: RecommendationContextRow[],
  customerGroupId: string | undefined
): RecommendationContextRow[] {
  if (!customerGroupId) {
    return rows.slice(0, 8);
  }

  const matchedRows = rows.filter((row) => row.segment_hash === customerGroupId);
  return matchedRows.length > 0 ? matchedRows : rows.slice(0, 8);
}

function expectedConversionRate(
  rows: RecommendationContextRow[],
  current: CustomerGroupEventView
): number {
  const fromPolicy = rows
    .map((row) => numberFromJson(row.anomaly_json, "expected_conversion_rate"))
    .find((value) => value !== null);

  return fromPolicy ?? rate(current.purchase_count, current.product_view_count);
}

function majorDropOff(row: FunnelCountsView): { label: string; rate: number } {
  const candidates = [
    { label: "제품 보기", rate: 1 - rate(row.product_view_count, row.session_start_count) },
    { label: "장바구니 추가", rate: 1 - rate(row.add_to_cart_count, row.product_view_count) },
    { label: "결제 시작", rate: 1 - rate(row.checkout_start_count, row.add_to_cart_count) },
    { label: "구매", rate: 1 - rate(row.purchase_count, row.checkout_start_count) }
  ];

  return candidates.sort((a, b) => b.rate - a.rate)[0] ?? { label: "구매", rate: 0 };
}

function metric(
  label: string,
  value: number,
  valueType: DashboardMetricValue["value_type"]
): DashboardMetricValue {
  return { label, value, value_type: valueType };
}

function contentType(value: string | null): "copy" | "image" | "video" | "landing" {
  if (value === "image" || value === "video" || value === "landing") {
    return value;
  }

  return "copy";
}

function jsonTextList(value: Record<string, unknown>): string[] {
  return Object.values(value)
    .flatMap((item) => (Array.isArray(item) ? item : [item]))
    .filter((item): item is string => typeof item === "string" && item.length > 0);
}

function numberFromJson(value: Record<string, unknown>, key: string): number | null {
  const rawValue = value[key];
  return typeof rawValue === "number" ? rawValue : null;
}

function rate(numerator: number, denominator: number) {
  return denominator > 0 ? clampRate(numerator / denominator) : 0;
}

function clampRate(value: number) {
  return Math.min(Math.max(value, 0), 1);
}
