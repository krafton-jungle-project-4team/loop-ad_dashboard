import { SimpleGrid, Stack, Table } from "@mantine/core";
import type { ConversionReport } from "@loopad/shared";
import { ComparisonTable } from "./ComparisonTable.js";
import { Funnel } from "./FunnelViews.js";
import { Section } from "./Section.js";

export function ConversionPanel({ conversion }: { conversion: ConversionReport }) {
  return (
    <Stack gap="xl">
      <Section title="구매 전환 퍼널">
        <Funnel steps={conversion.funnel} />
      </Section>
      <SimpleGrid cols={{ base: 1, xl: 2 }} spacing="lg">
        <ComparisonTable title="기기별 퍼널 비교" rows={conversion.deviceComparison} />
        <ComparisonTable title="채널별 퍼널 비교" rows={conversion.channelComparison} />
      </SimpleGrid>
      <Section title="고객군별 구매 행동 테이블">
        <Table.ScrollContainer minWidth={860}>
          <Table verticalSpacing="md">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>고객군</Table.Th>
                <Table.Th>구매 전환율</Table.Th>
                <Table.Th>주요 이탈률</Table.Th>
                <Table.Th>예상 매출</Table.Th>
                <Table.Th>관찰 신호</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {conversion.customerBehaviors.map((row) => (
                <Table.Tr key={row.segment}>
                  <Table.Td fw={700}>{row.segment}</Table.Td>
                  <Table.Td>{row.conversionRate}</Table.Td>
                  <Table.Td>{row.dropOffRate}</Table.Td>
                  <Table.Td>{row.forecastRevenue}</Table.Td>
                  <Table.Td>{row.observedSignals.join(", ")}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Section>
    </Stack>
  );
}
