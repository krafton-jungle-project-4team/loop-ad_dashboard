import { Stack, Table } from "@mantine/core";
import type { RecommendationReport } from "@loopad/shared";
import { CompactFlow } from "./FunnelViews.js";
import { Section } from "./Section.js";

export function RecommendationsPanel({
  recommendations
}: {
  recommendations: RecommendationReport;
}) {
  return (
    <Stack gap="xl">
      <Section title="고객군 목록">
        <Table.ScrollContainer minWidth={960}>
          <Table verticalSpacing="md">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>고객군</Table.Th>
                <Table.Th>추천 액션</Table.Th>
                <Table.Th>추천 근거</Table.Th>
                <Table.Th>예상 전환율 상승</Table.Th>
                <Table.Th>예상 매출</Table.Th>
                <Table.Th>우선순위</Table.Th>
                <Table.Th>적용 채널</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {recommendations.actions.map((action) => (
                <Table.Tr key={action.id}>
                  <Table.Td fw={700}>{action.segment.name}</Table.Td>
                  <Table.Td>{action.action}</Table.Td>
                  <Table.Td>{action.rationale}</Table.Td>
                  <Table.Td>{action.expectedConversionLift}</Table.Td>
                  <Table.Td>{action.forecastRevenue}</Table.Td>
                  <Table.Td>{action.priority}</Table.Td>
                  <Table.Td>{action.channels.join(", ")}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Section>
      {recommendations.actions[0] ? (
        <Section title="구매 단계 흐름">
          <CompactFlow steps={recommendations.actions[0].purchaseFlow} />
        </Section>
      ) : null}
    </Stack>
  );
}
