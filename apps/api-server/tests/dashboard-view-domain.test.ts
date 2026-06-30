import assert from "node:assert/strict";
import { test } from "node:test";
import { DashboardViewDomain } from "../src/features/dashboard/domain/index.js";
import type { DashboardEventView } from "../src/features/dashboard/repository/read-models.js";

test("counts overall funnel session starts by distinct session id", () => {
  const analysis = DashboardViewDomain.analyzeEventViews([
    event({ event_name: "page_view", session_id: "session-a" }),
    event({ event_name: "page_view", session_id: "session-a" }),
    event({ event_name: "session_start", session_id: "session-a" }),
    event({ event_name: "product_view", session_id: "session-a" }),
    event({ event_name: "product_view", session_id: "session-a" }),
    event({ event_name: "page_view", session_id: "session-b" }),
    event({ event_name: "product_view", session_id: "session-b" }),
    event({ event_name: "add_to_cart", session_id: "session-a" }),
    event({ event_name: "checkout_start", session_id: "session-a" }),
    event({ event_name: "purchase", session_id: "session-a", revenue: 120_000 })
  ]);

  assert.deepEqual(analysis.funnel, {
    session_start_count: 2,
    product_view_count: 3,
    add_to_cart_count: 1,
    checkout_start_count: 1,
    purchase_count: 1
  });
});

test("counts device funnel session starts by distinct session id per device", () => {
  const analysis = DashboardViewDomain.analyzeEventViews([
    event({ event_name: "page_view", session_id: "session-a", device: "desktop" }),
    event({ event_name: "page_view", session_id: "session-a", device: "desktop" }),
    event({ event_name: "product_view", session_id: "session-b", device: "desktop" }),
    event({ event_name: "purchase", session_id: "session-b", device: "desktop" }),
    event({ event_name: "page_view", session_id: "session-a", device: "mobile" }),
    event({ event_name: "product_view", session_id: "session-c", device: "mobile" }),
    event({ event_name: "add_to_cart", session_id: "session-c", device: "mobile" })
  ]);

  const desktop = analysis.deviceFunnels.find((row) => row.device === "desktop");
  const mobile = analysis.deviceFunnels.find((row) => row.device === "mobile");

  assert.equal(desktop?.session_start_count, 2);
  assert.equal(desktop?.product_view_count, 1);
  assert.equal(desktop?.purchase_count, 1);
  assert.equal(mobile?.session_start_count, 2);
  assert.equal(mobile?.product_view_count, 1);
  assert.equal(mobile?.add_to_cart_count, 1);
});

test("counts customer group session starts by distinct session id within the group", () => {
  const analysis = DashboardViewDomain.analyzeEventViews([
    event({ event_name: "page_view", session_id: "session-a", segment_key: "vip" }),
    event({ event_name: "page_view", session_id: "session-a", segment_key: "vip" }),
    event({ event_name: "product_view", session_id: "session-b", segment_key: "vip" }),
    event({ event_name: "product_view", session_id: "session-b", segment_key: "vip" }),
    event({ event_name: "add_to_cart", session_id: "session-c", segment_key: "vip" }),
    event({ event_name: "purchase", session_id: "session-b", segment_key: "vip" }),
    event({ event_name: "product_view", session_id: "session-d", segment_key: "new" })
  ]);

  const vip = analysis.customerGroupsHigh.find((row) => row.customer_group_id === "vip");

  assert.equal(vip?.session_start_count, 3);
  assert.equal(vip?.product_view_count, 2);
  assert.equal(vip?.add_to_cart_count, 1);
  assert.equal(vip?.purchase_count, 1);
});

function event(overrides: Partial<DashboardEventView> = {}): DashboardEventView {
  return {
    event_name: "page_view",
    session_id: "session-default",
    event_time: "2026-07-01 00:00:00",
    channel: "organic",
    age_group: "20s",
    gender: "unknown",
    category: "general",
    region: "KR",
    device: "desktop",
    segment_key: "segment-a",
    revenue: 0,
    ...overrides
  };
}
