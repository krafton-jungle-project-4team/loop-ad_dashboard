import type { DashboardFunnelMetricStep } from "@loopad/shared";

export type FunnelSankeyNode = {
  count: number;
  kind: "completion" | "dropoff" | "step";
  name: string;
};

export type FunnelSankeyData = {
  links: Array<{
    source: number;
    target: number;
    value: number;
  }>;
  nodes: FunnelSankeyNode[];
};

export function buildFunnelSankeyData(steps: DashboardFunnelMetricStep[]): FunnelSankeyData {
  const nodes: FunnelSankeyNode[] = steps.map((step) => ({
    count: step.event_count,
    kind: "step",
    name: step.step_name
  }));
  const links: FunnelSankeyData["links"] = [];

  if (steps.length === 0) {
    return { links, nodes };
  }

  const lastStep = steps.at(-1)!;
  const completionIndex =
    nodes.push({
      count: lastStep.event_count,
      kind: "completion",
      name: "여정 완료"
    }) - 1;

  steps.slice(0, -1).forEach((step, index) => {
    const nextStep = steps[index + 1]!;
    const continuedCount = Math.min(step.event_count, nextStep.event_count);
    const dropoffCount = Math.max(step.event_count - continuedCount, 0);

    links.push({ source: index, target: index + 1, value: continuedCount });

    if (dropoffCount > 0) {
      const dropoffIndex =
        nodes.push({
          count: dropoffCount,
          kind: "dropoff",
          name: `${step.step_name} 이탈`
        }) - 1;
      links.push({ source: index, target: dropoffIndex, value: dropoffCount });
    }
  });

  links.push({
    source: steps.length - 1,
    target: completionIndex,
    value: lastStep.event_count
  });

  return { links, nodes };
}
