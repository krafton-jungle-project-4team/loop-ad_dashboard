import { Inject, Injectable } from "@nestjs/common";
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
import { DashboardEventQuery, DashboardRecommendationReader } from "../repository/index.js";
import type {
  CustomerGroupEventRow,
  DeviceFunnelCounts,
  FunnelCounts
} from "../repository/read-models.js";
import type { RecommendationContextRow } from "../repository/dashboard-recommendation-reader.js";

@Injectable()
export class DashboardQueryService {
  constructor(
    @Inject(DashboardEventQuery)
    private readonly eventQuery: DashboardEventQuery,
    @Inject(DashboardRecommendationReader)
    private readonly recommendationReader: DashboardRecommendationReader
  ) {}

  async main(projectId: string): Promise<DashboardMain> {
    const [
      counts,
      behaviorEventSeries,
      purchaseSeries,
      marketingChannels,
      regions,
      ageGender,
      devicePurchases
    ] = await Promise.all([
      this.eventQuery.readMainMetricCounts(projectId),
      this.eventQuery.readBehaviorEventSeries(projectId),
      this.eventQuery.readPurchaseSeries(projectId),
      this.eventQuery.readSegmentStatus(projectId, "channel"),
      this.eventQuery.readSegmentStatus(projectId, "region"),
      this.eventQuery.readSegmentStatus(projectId, "age_gender"),
      this.eventQuery.readSegmentStatus(projectId, "device")
    ]);

    return {
      kpis: [
        {
          key: "purchase_conversion_rate",
          label: "전체 구매 전환율",
          value: rate(counts.purchase_count, counts.product_view_count),
          value_type: "rate",
          description: "purchase / product_view"
        },
        {
          key: "checkout_abandonment_rate",
          label: "결제 직전 이탈률",
          value: 1 - rate(counts.purchase_count, counts.checkout_start_count),
          value_type: "rate",
          description: "1 - purchase / checkout_start"
        },
        {
          key: "recent_purchase_count",
          label: "실시간 구매 건수",
          value: counts.recent_purchase_count,
          value_type: "count",
          description: "최근 15분"
        },
        {
          key: "expected_revenue",
          label: "예상 매출",
          value: counts.revenue,
          value_type: "money",
          description: "purchase revenue 합계"
        }
      ],
      behavior_event_series: behaviorEventSeries,
      purchase_series: purchaseSeries,
      segment_status: [
        segmentGroup("marketing_channel", "마케팅 채널", marketingChannels),
        segmentGroup("region", "지역", regions),
        segmentGroup("age_gender", "연령·성별", ageGender),
        segmentGroup("device_purchase", "기기별 구매", devicePurchases)
      ]
    };
  }

  async purchaseConversion(projectId: string): Promise<DashboardPurchaseConversion> {
    const [funnel, deviceFunnels, customerGroups] = await Promise.all([
      this.eventQuery.readFunnel(projectId),
      this.eventQuery.readDeviceFunnels(projectId),
      this.eventQuery.readCustomerGroups(projectId, "high")
    ]);

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
  }

  async aiAnalysis(projectId: string): Promise<DashboardAiAnalysis> {
    const [customerGroups, recommendationRows] = await Promise.all([
      this.eventQuery.readCustomerGroups(projectId, "low"),
      this.recommendationReader.readRecommendationContexts(projectId)
    ]);
    const customers = customerGroups.map(toCustomerSegment);

    return {
      sort: "low",
      customers,
      selected_customer: customerGroups[0]
        ? toCustomerDetail(customerGroups[0], recommendationRows)
        : null
    };
  }

  async aiRecommendation(projectId: string): Promise<DashboardAiRecommendation> {
    const [customerGroups, recommendationRows] = await Promise.all([
      this.eventQuery.readCustomerGroups(projectId, "high"),
      this.recommendationReader.readRecommendationContexts(projectId)
    ]);
    const selectedGroup = customerGroups[0];
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
  }

  async aiGeneration(projectId: string): Promise<DashboardAiGeneration> {
    const [customerGroups, recommendationRows] = await Promise.all([
      this.eventQuery.readCustomerGroups(projectId, "high"),
      this.recommendationReader.readRecommendationContexts(projectId)
    ]);
    const selectedGroup = customerGroups[0];
    const selectedRows = rowsForSegment(recommendationRows, selectedGroup?.customer_group_id);

    return {
      selected_customer: selectedGroup ? toCustomerSegment(selectedGroup) : null,
      generated_items: toGenerationItems(selectedRows)
    };
  }
}

function segmentGroup(
  key: string,
  title: string,
  items: DashboardSegmentGroup["items"]
): DashboardSegmentGroup {
  return { key, title, items };
}

function toFunnelSteps(counts: FunnelCounts): DashboardFunnelStep[] {
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

function toDeviceConversionRow(row: DeviceFunnelCounts): DashboardDeviceConversionRow {
  return {
    ...row,
    view_to_cart_rate: rate(row.add_to_cart_count, row.product_view_count),
    cart_to_purchase_rate: rate(row.purchase_count, row.add_to_cart_count),
    view_to_purchase_rate: rate(row.purchase_count, row.product_view_count)
  };
}

function toCustomerSegment(row: CustomerGroupEventRow): DashboardCustomerSegment {
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
  row: CustomerGroupEventRow,
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

function toStageFlow(row: FunnelCounts): DashboardStageFlow[] {
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
  current: CustomerGroupEventRow
): number {
  const fromPolicy = rows
    .map((row) => numberFromJson(row.anomaly_json, "expected_conversion_rate"))
    .find((value) => value !== null);

  return fromPolicy ?? rate(current.purchase_count, current.product_view_count);
}

function majorDropOff(row: FunnelCounts): { label: string; rate: number } {
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
