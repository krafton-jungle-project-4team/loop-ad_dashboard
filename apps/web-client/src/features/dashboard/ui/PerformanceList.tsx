import { Group, Progress, Stack, Text } from "@mantine/core";
import type { NamedPerformance } from "@loopad/shared";

export function PerformanceList({ items }: { items: NamedPerformance[] }) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <Stack gap="md">
      {items.map((item) => (
        <Stack gap={6} key={item.name}>
          <Group justify="space-between">
            <Text fw={600}>{item.name}</Text>
            <Text fw={700}>{item.displayValue}</Text>
          </Group>
          <Progress color="actionBlue.6" radius="xs" value={(item.value / max) * 100} />
        </Stack>
      ))}
    </Stack>
  );
}
