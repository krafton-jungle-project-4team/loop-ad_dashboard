import { Group, RingProgress } from "@mantine/core";
import type { NamedPerformance } from "@loopad/shared";
import { PerformanceList } from "./PerformanceList.js";

export function DeviceRing({ items }: { items: NamedPerformance[] }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <Group justify="space-between">
      <RingProgress
        sections={items.map((item, index) => ({
          value: total > 0 ? (item.value / total) * 100 : 0,
          color: index === 0 ? "actionBlue.6" : "appleInk.4"
        }))}
        size={180}
        thickness={30}
      />
      <PerformanceList items={items} />
    </Group>
  );
}
