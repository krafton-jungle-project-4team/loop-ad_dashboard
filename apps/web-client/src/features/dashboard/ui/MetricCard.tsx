import { Card, Stack, Text, Title } from "@mantine/core";
import type { MetricValue } from "@loopad/shared";

export function MetricCard({ metric }: { metric: MetricValue }) {
  return (
    <Card bg="white" p="xl" radius="lg" withBorder>
      <Stack gap={6}>
        <Text c="dimmed" fw={600} size="sm">
          {metric.label}
        </Text>
        <Title c="appleInk.9" order={3} size={42}>
          {metric.value}
        </Title>
        <Text c="dimmed" size="sm">
          {metric.delta ?? metric.description}
        </Text>
      </Stack>
    </Card>
  );
}
