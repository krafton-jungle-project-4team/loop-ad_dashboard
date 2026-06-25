import { readEvents } from "./event-repository.js";
import {
  buildFunnel,
  comparison,
  customerSegment,
  majorDropOff,
  purchaseRate,
  rank,
  segmentRate,
  segments
} from "./funnel.js";
import { pipeline, projection, recentEvents, series, signals, sum } from "./metrics.js";
import { fmt, money, ratio, round } from "../utils/format.js";
import { categoryLabel, genderLabel, segmentName } from "../utils/labels.js";

export async function overview(project: string) {
  const events = await readEvents(project);
  const funnel = buildFunnel(events);
  const purchases = events.filter((event) => event.event_name === "purchase");
  const recent = recentEvents(events);
  const revenue = sum(purchases);
  const expected = revenue + pipeline(events);
  return {
    metrics: {
      purchaseConversionRate: {
        label: "전체 구매 전환율",
        value: `${purchaseRate(events)}%`,
        description: "페이지 방문 대비 구매 완료"
      },
      checkoutDropOffRate: {
        label: "결제 직전 이탈률",
        value: `${funnel[3]?.dropOffRate ?? 0}%`,
        description: "결제 시작 이후 구매 미완료"
      },
      realtimePurchases: {
        label: "실시간 구매 건수",
        value: fmt(purchases.length),
        description: "ClickHouse 구매 이벤트 기준"
      },
      forecastRevenue: {
        label: "예상 매출",
        value: money(expected),
        description: "구매 완료와 결제 파이프라인 합산"
      },
      recentEventCount: {
        label: "최근 15분 행동 이벤트 수",
        value: fmt(recent.length),
        description: "최근 수집 이벤트"
      },
      recentPurchaseCount: {
        label: "최근 15분 구매 수",
        value: fmt(recent.filter((event) => event.event_name === "purchase").length),
        description: "최근 구매 완료"
      }
    },
    recentBehaviorEvents: series(recent),
    recentPurchases: series(recent.filter((event) => event.event_name === "purchase")),
    forecast: {
      title: `예상 매출은 현재 매출 대비 ${ratio(expected, Math.max(revenue, 1))}% 페이스입니다.`,
      plannedRevenue: projection(expected),
      actualRevenue: projection(revenue)
    },
    segmentPerformance: {
      channels: rank(events, "channel"),
      regions: rank(events, "region"),
      ageGender: rank(events, "ageGender"),
      devices: rank(events, "device"),
      categories: rank(events, "category")
    }
  };
}

export async function conversion(project: string) {
  const events = await readEvents(project);
  return {
    funnel: buildFunnel(events),
    deviceComparison: comparison(events, "device"),
    channelComparison: comparison(events, "channel"),
    customerBehaviors: segments(events).map((segment) => ({
      segment: segmentName(segment),
      conversionRate: `${segmentRate(segment)}%`,
      dropOffRate: `${round(100 - segmentRate(segment))}%`,
      forecastRevenue: money(
        sum(segment.events.filter((event) => event.event_name === "purchase")) +
          pipeline(segment.events)
      ),
      observedSignals: signals(segment.events)
    }))
  };
}

export async function insights(project: string) {
  const events = await readEvents(project);
  const sorted = segments(events).sort((a, b) => segmentRate(b) - segmentRate(a));
  const selected = sorted[0];
  return {
    topSegments: sorted.slice(0, 5).map(customerSegment),
    bottomSegments: sorted.slice(-5).reverse().map(customerSegment),
    selectedInsight: selected
      ? {
          segment: customerSegment(selected),
          actualConversionRate: `${segmentRate(selected)}%`,
          expectedConversionRate: `${purchaseRate(events)}%`,
          conversionGap: `${round(segmentRate(selected) - purchaseRate(events))}%p`,
          forecastRevenue: money(
            sum(selected.events.filter((event) => event.event_name === "purchase")) +
              pipeline(selected.events)
          ),
          purchaseHistory: rank(selected.events, "category"),
          observedSignals: signals(selected.events),
          summary: `${segmentName(selected)}은 ${majorDropOff(selected.events)} 단계에서 개선 여지가 큽니다. 관찰 신호를 기준으로 메시지와 재고 안내를 조정하는 것이 좋습니다.`,
          purchaseFlow: buildFunnel(selected.events)
        }
      : undefined
  };
}

export async function recommendations(project: string) {
  const events = await readEvents(project);
  return {
    actions: segments(events)
      .slice(0, 6)
      .map((segment, index) => ({
        id: `recommendation-${index + 1}`,
        segment: customerSegment(segment),
        action: signals(segment.events).some((signal) => signal.includes("품절"))
          ? "재입고 알림과 대체 상품 쿠폰을 함께 발송"
          : "구매 직전 이탈 고객에게 개인화 쿠폰 메시지 발송",
        rationale: `${segmentName(segment)}에서 ${majorDropOff(segment.events)} 이탈과 ${signals(segment.events).join(", ")} 신호가 관찰되었습니다.`,
        expectedConversionLift: `${Math.max(1, Math.round((100 - segmentRate(segment)) / 10))}%p`,
        forecastRevenue: money(
          sum(segment.events.filter((event) => event.event_name === "purchase")) +
            pipeline(segment.events)
        ),
        priority: index < 2 ? "high" : index < 4 ? "medium" : "low",
        channels: [segment.channel],
        purchaseFlow: buildFunnel(segment.events)
      }))
  };
}

export async function creatives(project: string) {
  const events = await readEvents(project);
  return {
    creatives: segments(events)
      .slice(0, 3)
      .map((segment, index) => ({
        id: `creative-${index + 1}`,
        segment: customerSegment(segment),
        copy: {
          headline: `${categoryLabel(segment.category)} 혜택을 이어가세요`,
          body: `${segment.ageGroup} ${genderLabel(segment.gender)} 고객에게 반응이 좋았던 ${categoryLabel(segment.category)} 캠페인 혜택을 다시 제안합니다.`,
          cta: `${categoryLabel(segment.category)} 추천 보기`
        },
        imageAsset: {
          label: `${segment.channel} 소재에 들어갈 ${categoryLabel(segment.category)} 상품 이미지 영역`
        },
        videoAsset: {
          label: `${segment.ageGroup} ${genderLabel(segment.gender)} 고객에게 노출할 6초 영상 소재 영역`
        },
        channels: [segment.channel],
        approvalStatus: "pending",
        abTestStatus: index === 0 ? "running" : "not_started"
      }))
  };
}
