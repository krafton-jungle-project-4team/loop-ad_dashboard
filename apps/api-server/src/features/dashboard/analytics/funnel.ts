import type { CustomerSegment, FunnelStep, NamedPerformance } from "@loopad/shared";
import type { EventRecord, SegmentStats } from "../model/events.js";
import { fmt, ratio, round } from "../../../shared/format.js";
import { categoryLabel, genderLabel, segmentName } from "../lib/labels.js";

const funnelSteps = [
  ["impression", "광고 노출"],
  ["click", "광고 클릭"]
] as const;

export function buildFunnel(events: EventRecord[]): FunnelStep[] {
  let previous = 0;
  return funnelSteps.map(([key, label], index) => {
    const count = new Set(
      events.filter((event) => event.event_name === key).map((event) => event.session_id)
    ).size;
    const conversionRate = index === 0 ? 100 : ratio(count, previous);
    previous = count;
    return {
      key,
      label,
      userCount: count,
      displayUserCount: fmt(count),
      conversionRate,
      dropOffRate: index === 0 ? 0 : round(100 - conversionRate)
    };
  });
}

export function segments(events: EventRecord[]): SegmentStats[] {
  const map = new Map<string, EventRecord[]>();
  for (const event of events) {
    const key = [
      event.channel,
      event.age_group,
      event.gender,
      event.category,
      event.properties.region ?? "미확인",
      event.device
    ].join("|");
    map.set(key, [...(map.get(key) ?? []), event]);
  }
  return [...map.entries()].map(([id, group]) => {
    const first = group[0]!;
    return {
      id,
      channel: first.channel,
      ageGroup: first.age_group,
      gender: first.gender,
      category: first.category,
      region: first.properties.region ?? "미확인",
      device: first.device,
      events: group
    };
  });
}

export function customerSegment(segment: SegmentStats): CustomerSegment {
  return {
    id: segment.id,
    name: segmentName(segment),
    channel: segment.channel,
    ageGroup: segment.ageGroup,
    gender: segment.gender,
    category: categoryLabel(segment.category),
    region: segment.region,
    device: segment.device,
    conversionRate: `${segmentRate(segment)}%`,
    majorDropOffStep: majorDropOff(segment.events)
  };
}

export function rank(
  events: EventRecord[],
  key: "channel" | "region" | "ageGender" | "device" | "category"
): NamedPerformance[] {
  const counts = new Map<string, number>();
  for (const event of events.filter((item) => item.event_name === "click")) {
    const name =
      key === "region"
        ? (event.properties.region ?? "미확인")
        : key === "ageGender"
          ? `${event.age_group} ${genderLabel(event.gender)}`
          : key === "category"
            ? categoryLabel(event.category)
            : event[key];
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value, displayValue: fmt(value) }));
}

export function comparison(events: EventRecord[], key: "device" | "channel") {
  return [...new Set(events.map((event) => event[key]))].map((segment) => ({
    segment,
    steps: buildFunnel(events.filter((event) => event[key] === segment))
  }));
}

export function segmentRate(segment: SegmentStats) {
  return ratio(
    new Set(
      segment.events
        .filter((event) => event.event_name === "click")
        .map((event) => event.session_id)
    ).size,
    new Set(segment.events.map((event) => event.session_id)).size
  );
}

export function purchaseRate(events: EventRecord[]) {
  return ratio(
    new Set(events.filter((event) => event.event_name === "click").map((event) => event.session_id))
      .size,
    new Set(
      events.filter((event) => event.event_name === "impression").map((event) => event.session_id)
    ).size
  );
}

export function majorDropOff(events: EventRecord[]) {
  return (
    buildFunnel(events)
      .slice(1)
      .sort((a, b) => b.dropOffRate - a.dropOffRate)[0]?.label ?? "페이지 방문"
  );
}
