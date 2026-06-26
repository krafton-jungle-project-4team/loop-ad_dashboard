import { Card, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import type { DashboardOverview } from "@loopad/shared";
import { BarsChart } from "./BarsChart.js";
import { DeviceRing } from "./DeviceRing.js";
import { MetricCard } from "./MetricCard.js";
import { PerformanceList } from "./PerformanceList.js";
import { Section } from "./Section.js";

export function OverviewPanel({ overview }: { overview: DashboardOverview }) {
  return (
    <Stack gap="xl">
      <SimpleGrid cols={{ base: 1, sm: 2, xl: 4 }} spacing="lg">
        <MetricCard metric={overview.metrics.purchaseConversionRate} />
        <MetricCard metric={overview.metrics.checkoutDropOffRate} />
        <MetricCard metric={overview.metrics.realtimePurchases} />
        <MetricCard metric={overview.metrics.forecastRevenue} />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, xl: 3 }} spacing="lg">
        <Section title="피크타임 행동 이벤트와 실시간 구매">
          <BarsChart events={overview.recentBehaviorEvents} purchases={overview.recentPurchases} />
        </Section>
        <Card bg="appleInk.8" c="white" p="xl">
          <Stack gap="xl">
            <Text c="actionBlue.2" fw={700}>
              Forecast
            </Text>
            <Title c="white" order={2} size={36}>
              {overview.forecast.title}
            </Title>
            <BarsChart
              events={overview.forecast.plannedRevenue}
              purchases={overview.forecast.actualRevenue}
            />
          </Stack>
        </Card>
      </SimpleGrid>

      <Title c="appleInk.9" order={2} size={34}>
        세그먼트 현황
      </Title>
      <SimpleGrid cols={{ base: 1, md: 2, xl: 4 }} spacing="lg">
        <Section title="마케팅 채널">
          <PerformanceList items={overview.segmentPerformance.channels} />
        </Section>
        <Section title="지역별 성과">
          <PerformanceList items={overview.segmentPerformance.regions} />
        </Section>
        <Section title="연령/성별 성과">
          <PerformanceList items={overview.segmentPerformance.ageGender} />
        </Section>
        <Section title="기기별 구매 비중">
          <DeviceRing items={overview.segmentPerformance.devices} />
        </Section>
      </SimpleGrid>
      <Section title="카테고리별 구매 현황">
        <PerformanceList items={overview.segmentPerformance.categories} />
      </Section>
    </Stack>
  );
}
