import type { EventRecord } from "../model/events.js";
import { fmt, money } from "../../../shared/format.js";

export function series(events: EventRecord[]) {
  const max = Math.max(...events.map((event) => Date.parse(event.timestamp)), Date.now());
  return Array.from({ length: 15 }, (_, index) => {
    const time = max - (14 - index) * 60_000;
    const label = new Date(time).toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit"
    });
    const value = events.filter(
      (event) => Math.abs(Date.parse(event.timestamp) - time) < 30_000
    ).length;
    return { label, value, displayValue: fmt(value) };
  });
}

export function projection(value: number) {
  return ["Day 1", "Day 2", "Day 3", "Day 4"].map((label, index) => ({
    label,
    value: Math.round((value * (index + 1)) / 4),
    displayValue: money(Math.round((value * (index + 1)) / 4))
  }));
}

export function recentEvents(events: EventRecord[]) {
  const max = Math.max(...events.map((event) => Date.parse(event.timestamp)), Date.now());
  return events.filter((event) => Date.parse(event.timestamp) >= max - 15 * 60_000);
}

export function signals(events: EventRecord[]) {
  return [
    ...new Set(
      events
        .flatMap((event) => [
          event.inventory_status === "out_of_stock" ? "품절" : undefined,
          event.properties.signal
        ])
        .filter((signal): signal is string => Boolean(signal))
    )
  ];
}

export function pipeline(events: EventRecord[]) {
  return Math.max(
    events.filter((event) => event.event_name === "impression").length -
      events.filter((event) => event.event_name === "click").length,
    0
  );
}

export function sum(events: EventRecord[]) {
  return events.reduce((total, event) => total + event.price, 0);
}
