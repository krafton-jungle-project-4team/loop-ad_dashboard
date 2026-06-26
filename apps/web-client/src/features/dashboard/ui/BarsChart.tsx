import { Box, Group, Stack, Text } from "@mantine/core";
import type { TimeSeriesPoint } from "@loopad/shared";

export function BarsChart({
  events,
  purchases
}: {
  events: TimeSeriesPoint[];
  purchases: TimeSeriesPoint[];
}) {
  return (
    <Stack gap="xl">
      <BarTrack color="actionBlue.6" points={events} />
      <BarTrack color="appleInk.4" points={purchases} />
    </Stack>
  );
}

function BarTrack({ points, color }: { points: TimeSeriesPoint[]; color: string }) {
  const max = Math.max(...points.map((point) => point.value), 1);

  return (
    <Group align="end" gap={8} wrap="nowrap">
      {points.map((point) => (
        <Stack align="center" gap={8} key={point.label} style={{ flex: 1 }}>
          <Box
            bg={color}
            h={Math.max(8, (point.value / max) * 120)}
            style={{ borderRadius: 999 }}
            w="100%"
          />
          <Text c="dimmed" size="xs">
            {point.label}
          </Text>
        </Stack>
      ))}
    </Group>
  );
}
