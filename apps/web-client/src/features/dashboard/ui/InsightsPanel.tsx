import { SimpleGrid, Stack, Text, Title } from "@mantine/core";
import type { InsightReport } from "@loopad/shared";
import { CompactFlow } from "./FunnelViews.js";
import { MetricCard } from "./MetricCard.js";
import { PerformanceList } from "./PerformanceList.js";
import { Section } from "./Section.js";
import { SegmentTable } from "./SegmentTable.js";
import { Signals } from "./Signals.js";

export function InsightsPanel({ insights }: { insights: InsightReport }) {
  const detail = insights.selectedInsight;

  return (
    <Stack gap="xl">
      <Section title="전환율 상위 고객군 목록">
        <SegmentTable segments={insights.topSegments} />
      </Section>
      {detail ? (
        <Section title="AI 분석 요약">
          <Stack gap="lg">
            <Title order={2}>{detail.segment.name}</Title>
            <SimpleGrid cols={{ base: 1, md: 4 }}>
              <MetricCard metric={{ label: "실제 전환율", value: detail.actualConversionRate }} />
              <MetricCard metric={{ label: "예상 전환율", value: detail.expectedConversionRate }} />
              <MetricCard metric={{ label: "전환율 차이", value: detail.conversionGap }} />
              <MetricCard metric={{ label: "예상 매출", value: detail.forecastRevenue }} />
            </SimpleGrid>
            <SimpleGrid cols={{ base: 1, lg: 3 }}>
              <Section title="품절/가격/채널/기기 관찰 신호">
                <Signals items={detail.observedSignals} />
              </Section>
              <Section title="과거 구매이력">
                <PerformanceList items={detail.purchaseHistory} />
              </Section>
              <Section title="주요 이탈 단계">
                <Text>{detail.summary}</Text>
              </Section>
            </SimpleGrid>
            <Section title="구매 단계 흐름">
              <CompactFlow steps={detail.purchaseFlow} />
            </Section>
          </Stack>
        </Section>
      ) : null}
      <Section title="전환율 하위 고객군 목록">
        <SegmentTable segments={insights.bottomSegments} />
      </Section>
    </Stack>
  );
}
