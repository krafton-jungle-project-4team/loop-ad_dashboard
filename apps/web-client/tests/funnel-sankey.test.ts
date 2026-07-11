import assert from "node:assert/strict";
import test from "node:test";
import type { DashboardFunnelMetricStep } from "@loopad/shared";
import { buildFunnelSankeyData } from "../src/features/dashboard/ui/pages/funnel/funnelSankey.js";

test("funnel sankey separates users who continue from users who drop off", () => {
  const steps = [
    { event_count: 100, step_name: "방문", step_order: 1 },
    { event_count: 60, step_name: "검색", step_order: 2 },
    { event_count: 30, step_name: "구매", step_order: 3 }
  ] as DashboardFunnelMetricStep[];

  const result = buildFunnelSankeyData(steps);

  assert.deepEqual(result.nodes, [
    { count: 100, kind: "step", name: "방문" },
    { count: 60, kind: "step", name: "검색" },
    { count: 30, kind: "step", name: "구매" },
    { count: 30, kind: "completion", name: "여정 완료" },
    { count: 40, kind: "dropoff", name: "방문 이탈" },
    { count: 30, kind: "dropoff", name: "검색 이탈" }
  ]);
  assert.deepEqual(result.links, [
    { source: 0, target: 1, value: 60 },
    { source: 0, target: 4, value: 40 },
    { source: 1, target: 2, value: 30 },
    { source: 1, target: 5, value: 30 },
    { source: 2, target: 3, value: 30 }
  ]);
});

test("funnel sankey keeps a single-step journey visible", () => {
  const steps = [
    { event_count: 25, step_name: "방문", step_order: 1 }
  ] as DashboardFunnelMetricStep[];

  assert.deepEqual(buildFunnelSankeyData(steps).links, [{ source: 0, target: 1, value: 25 }]);
});

test("funnel sankey preserves zero-count stages in their selected order", () => {
  const steps = [
    { event_count: 1, step_name: "예약 시작", step_order: 1 },
    { event_count: 1, step_name: "예약 완료", step_order: 2 },
    { event_count: 0, step_name: "프로모션 클릭", step_order: 3 },
    { event_count: 0, step_name: "캠페인 랜딩", step_order: 4 }
  ] as DashboardFunnelMetricStep[];

  const result = buildFunnelSankeyData(steps);

  assert.deepEqual(result.nodes, [
    { count: 1, kind: "step", name: "예약 시작" },
    { count: 1, kind: "step", name: "예약 완료" },
    { count: 0, kind: "step", name: "프로모션 클릭" },
    { count: 0, kind: "step", name: "캠페인 랜딩" },
    { count: 0, kind: "completion", name: "여정 완료" },
    { count: 1, kind: "dropoff", name: "예약 완료 이탈" }
  ]);
  assert.deepEqual(result.links, [
    { source: 0, target: 1, value: 1 },
    { source: 1, target: 2, value: 0 },
    { source: 1, target: 5, value: 1 },
    { source: 2, target: 3, value: 0 },
    { source: 3, target: 4, value: 0 }
  ]);
});
