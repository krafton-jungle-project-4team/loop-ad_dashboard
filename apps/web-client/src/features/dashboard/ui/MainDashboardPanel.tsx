import { Badge, Card, Group, Progress, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import type { DashboardKpiCard, DashboardMain } from "@loopad/shared";
import { formatInteger, formatMoney, formatPercent } from "../model/dashboard-format.js";
import { DashboardMetric } from "./DashboardMetric.js";
import { EmptyState } from "./EmptyState.js";
import { Section } from "./Section.js";

export function MainDashboardPanel({ data }: { data: DashboardMain }) {
  return (
    <Stack gap="xl">
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
        {data.kpis.map((kpi) => (
          <DashboardMetric
            key={kpi.key}
            description={kpi.description ?? undefined}
            label={kpi.label}
            value={formatKpiValue(kpi)}
          />
        ))}
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
        <SeriesCard
          badge="LIVE"
          points={data.behavior_event_series}
          title="피크타임 행동 이벤트와 실시간 구매"
        />
        <SeriesCard points={data.purchase_series} title="실시간 구매 건수" />
      </SimpleGrid>

      <Title c="appleInk.9" order={2} size={34}>
        세그먼트 현황
      </Title>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
        {data.segment_status.map((group) => (
          <Section key={group.key} title={group.title}>
            <Stack gap="md">
              {group.items.length > 0 ? (
                group.items.map((item) => (
                  <Stack key={item.label} gap={6}>
                    <Group justify="space-between">
                      <Text fw={600} size="sm">
                        {item.label}
                      </Text>
                      <Text c="appleInk.7" fw={600} size="sm">
                        {formatInteger(item.value)}
                      </Text>
                    </Group>
                    <Progress color="actionBlue.6" radius="xl" value={item.share * 100} />
                  </Stack>
                ))
              ) : (
                <EmptyState message="표시할 세그먼트가 없습니다." />
              )}
            </Stack>
          </Section>
        ))}
      </SimpleGrid>
    </Stack>
  );
}

function SeriesCard({
  title,
  points,
  badge
}: {
  title: string;
  points: DashboardMain["behavior_event_series"];
  badge?: string;
}) {
  const maxValue = Math.max(...points.map((point) => point.value), 1);

  return (
    <Card bg="white" p="xl" radius="lg" withBorder>
      <Group justify="space-between" mb="xl">
        <Title c="appleInk.9" order={3} size="h4">
          {title}
        </Title>
        {badge ? (
          <Badge color="actionBlue.6" radius="xl" variant="light">
            {badge}
          </Badge>
        ) : null}
      </Group>
      {points.length > 0 ? (
        <Group align="end" gap="xs" h={220} wrap="nowrap">
          {points.map((point) => (
            <Stack key={point.label} align="center" gap="xs" justify="end" style={{ flex: 1 }}>
              <Card
                bg="actionBlue.6"
                h={`${Math.max((point.value / maxValue) * 180, 4)}px`}
                p={0}
                radius="sm"
                w="100%"
              />
              <Text c="appleInk.5" size="xs">
                {point.label}
              </Text>
            </Stack>
          ))}
        </Group>
      ) : (
        <EmptyState message="차트 데이터가 없습니다." />
      )}
    </Card>
  );
}

function formatKpiValue(kpi: DashboardKpiCard): string {
  switch (kpi.value_type) {
    case "count":
      return formatInteger(kpi.value);
    case "money":
      return formatMoney(kpi.value);
    case "rate":
      return formatPercent(kpi.value);
    case "text":
      return String(kpi.value);
  }
}
