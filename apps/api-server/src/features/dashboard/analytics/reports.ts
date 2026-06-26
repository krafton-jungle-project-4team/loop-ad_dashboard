import { buildFunnel, comparison, purchaseRate, rank, segmentRate, segments } from "./funnel.js";
import { pipeline, projection, recentEvents, series, signals, sum } from "./metrics.js";
import { fmt, money, ratio, round } from "../../../shared/format.js";
import { segmentName } from "../lib/labels.js";
import type { EventRecord } from "../model/events.js";

export function overview(events: EventRecord[]) {
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

export function conversion(events: EventRecord[]) {
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
