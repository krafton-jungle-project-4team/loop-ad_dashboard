import { buildFunnel, comparison, purchaseRate, rank, segmentRate, segments } from "./funnel.js";
import { pipeline, projection, recentEvents, series, signals, sum } from "./metrics.js";
import { fmt, money, ratio, round } from "../../../shared/format.js";
import { segmentName } from "../lib/labels.js";
import type { EventRecord } from "../model/events.js";

export function overview(events: EventRecord[]) {
  const funnel = buildFunnel(events);
  const clicks = events.filter((event) => event.event_name === "click");
  const recent = recentEvents(events);
  const clickCount = clicks.length;
  const expected = clickCount + pipeline(events);
  return {
    metrics: {
      purchaseConversionRate: {
        label: "전체 광고 클릭률",
        value: `${purchaseRate(events)}%`,
        description: "광고 노출 대비 클릭"
      },
      checkoutDropOffRate: {
        label: "노출 후 미클릭률",
        value: `${funnel[1]?.dropOffRate ?? 0}%`,
        description: "노출 이후 클릭 미발생"
      },
      realtimePurchases: {
        label: "실시간 클릭 수",
        value: fmt(clickCount),
        description: "ClickHouse click 이벤트 기준"
      },
      forecastRevenue: {
        label: "관측 이벤트 수",
        value: fmt(expected),
        description: "클릭과 미클릭 노출 합산"
      },
      recentEventCount: {
        label: "최근 15분 행동 이벤트 수",
        value: fmt(recent.length),
        description: "최근 수집 이벤트"
      },
      recentPurchaseCount: {
        label: "최근 15분 클릭 수",
        value: fmt(recent.filter((event) => event.event_name === "click").length),
        description: "최근 광고 클릭"
      }
    },
    recentBehaviorEvents: series(recent),
    recentPurchases: series(recent.filter((event) => event.event_name === "click")),
    forecast: {
      title: `관측 이벤트는 현재 클릭 대비 ${ratio(expected, Math.max(clickCount, 1))}% 수준입니다.`,
      plannedRevenue: projection(expected),
      actualRevenue: projection(clickCount)
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
        sum(segment.events.filter((event) => event.event_name === "click")) +
          pipeline(segment.events)
      ),
      observedSignals: signals(segment.events)
    }))
  };
}
