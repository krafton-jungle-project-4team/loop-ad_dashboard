import { Box, Group, Progress, SimpleGrid, Stack, Text } from "@mantine/core";
import type { FunnelStep } from "@loopad/shared";

export function Funnel({ steps }: { steps: FunnelStep[] }) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }}>
      {steps.map((step, index) => (
        <Box
          bg="appleInk.0"
          bdrs="lg"
          key={step.key}
          p="lg"
          style={{ border: "1px solid var(--mantine-color-gray-3)" }}
        >
          <Stack gap="sm">
            <Group justify="space-between">
              <Text c="dimmed" size="xs">
                단계 {index + 1}
              </Text>
              <Text c="actionBlue.6" fw={700}>
                {step.conversionRate}%
              </Text>
            </Group>
            <Text fw={700}>{step.label}</Text>
            <Text c="dimmed">{step.displayUserCount}</Text>
            <Progress color="actionBlue.6" radius="xs" value={step.conversionRate} />
            <Text c="dimmed" size="xs">
              이탈률 {step.dropOffRate}%
            </Text>
          </Stack>
        </Box>
      ))}
    </SimpleGrid>
  );
}

export function CompactFlow({ steps }: { steps: FunnelStep[] }) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 5 }}>
      {steps.map((step) => (
        <Box key={step.key}>
          <Text c="dimmed" size="xs">
            {step.label}
          </Text>
          <Text fw={700}>{step.conversionRate}%</Text>
          <Progress color="actionBlue.6" radius="xs" value={step.conversionRate} />
        </Box>
      ))}
    </SimpleGrid>
  );
}
