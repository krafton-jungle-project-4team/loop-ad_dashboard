import { SimpleGrid, Stack, Table } from "@mantine/core";
import type { DashboardFunnel } from "@loopad/shared";
import { formatInteger, formatPercent } from "../model/dashboard-format.js";
import { DashboardMetric } from "./DashboardMetric.js";
import { EmptyState } from "./EmptyState.js";
import { Section } from "./Section.js";

export function FunnelPanel({ funnel }: { funnel: DashboardFunnel }) {
  return (
    <Stack gap="xl">
      <SimpleGrid cols={{ base: 1, sm: 2, xl: 3 }} spacing="lg">
        <DashboardMetric label="상품 조회" value={formatInteger(funnel.product_view_count)} />
        <DashboardMetric
          label="장바구니 추가"
          value={formatInteger(funnel.add_to_cart_count)}
          description={formatPercent(funnel.view_to_cart_rate)}
        />
        <DashboardMetric
          label="구매"
          value={formatInteger(funnel.purchase_count)}
          description={formatPercent(funnel.view_to_purchase_rate)}
        />
      </SimpleGrid>

      <Section title="전환율">
        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
          <DashboardMetric
            label="조회 → 장바구니"
            value={formatPercent(funnel.view_to_cart_rate)}
          />
          <DashboardMetric
            label="장바구니 → 구매"
            value={formatPercent(funnel.cart_to_purchase_rate)}
          />
          <DashboardMetric
            label="조회 → 구매"
            value={formatPercent(funnel.view_to_purchase_rate)}
          />
        </SimpleGrid>
      </Section>

      <Section title="세그먼트 퍼널">
        {funnel.segment_funnels.length > 0 ? (
          <Table.ScrollContainer minWidth={900}>
            <Table verticalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>segment_id</Table.Th>
                  <Table.Th>product_view</Table.Th>
                  <Table.Th>add_to_cart</Table.Th>
                  <Table.Th>purchase</Table.Th>
                  <Table.Th>view_to_cart</Table.Th>
                  <Table.Th>cart_to_purchase</Table.Th>
                  <Table.Th>view_to_purchase</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {funnel.segment_funnels.map((segment) => (
                  <Table.Tr key={segment.segment_id}>
                    <Table.Td fw={600}>{segment.segment_id}</Table.Td>
                    <Table.Td>{formatInteger(segment.product_view_count)}</Table.Td>
                    <Table.Td>{formatInteger(segment.add_to_cart_count)}</Table.Td>
                    <Table.Td>{formatInteger(segment.purchase_count)}</Table.Td>
                    <Table.Td>{formatPercent(segment.view_to_cart_rate)}</Table.Td>
                    <Table.Td>{formatPercent(segment.cart_to_purchase_rate)}</Table.Td>
                    <Table.Td>{formatPercent(segment.view_to_purchase_rate)}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        ) : (
          <EmptyState message="세그먼트 퍼널 데이터가 없습니다." />
        )}
      </Section>
    </Stack>
  );
}
