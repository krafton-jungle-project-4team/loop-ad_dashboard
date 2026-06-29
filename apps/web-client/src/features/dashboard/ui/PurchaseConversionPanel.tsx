import { Badge, Group, Progress, SimpleGrid, Stack, Table, Text, Title } from "@mantine/core";
import type { DashboardPurchaseConversion } from "@loopad/shared";
import { formatInteger, formatMoney, formatPercent } from "../model/dashboard-format.js";
import { EmptyState } from "./EmptyState.js";
import { Section } from "./Section.js";

export function PurchaseConversionPanel({ data }: { data: DashboardPurchaseConversion }) {
  const maxFunnelCount = Math.max(...data.funnel_steps.map((step) => step.count), 1);

  return (
    <Stack gap="xl">
      <Section title="개방형 유입경로">
        <SimpleGrid cols={{ base: 1, md: 5 }} spacing={0}>
          {data.funnel_steps.map((step, index) => (
            <Stack key={step.key} gap="sm" p="md">
              <Group justify="space-between">
                <Text c="appleInk.5" size="sm">
                  단계 {index + 1}
                </Text>
                <Text fw={700}>{formatPercent(step.rate_from_previous)}</Text>
              </Group>
              <Title c="appleInk.9" order={3} size="h4">
                {step.label}
              </Title>
              <Progress
                color="actionBlue.6"
                radius="xs"
                size="xl"
                value={(step.count / maxFunnelCount) * 100}
              />
              <Group justify="space-between">
                <Text c="appleInk.5" size="sm">
                  이탈률
                </Text>
                <Text fw={600}>{formatPercent(step.drop_off_rate)}</Text>
              </Group>
              <Text fw={700}>{formatInteger(step.count)}</Text>
            </Stack>
          ))}
        </SimpleGrid>
      </Section>

      <Section title="기기 카테고리별 전환">
        {data.device_rows.length > 0 ? (
          <Table.ScrollContainer minWidth={1040}>
            <Table verticalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>기기</Table.Th>
                  <Table.Th>세션 시작</Table.Th>
                  <Table.Th>제품 보기</Table.Th>
                  <Table.Th>장바구니</Table.Th>
                  <Table.Th>결제 시작</Table.Th>
                  <Table.Th>구매</Table.Th>
                  <Table.Th>조회→장바구니</Table.Th>
                  <Table.Th>장바구니→구매</Table.Th>
                  <Table.Th>조회→구매</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {data.device_rows.map((row) => (
                  <Table.Tr key={row.device}>
                    <Table.Td fw={700}>{row.device}</Table.Td>
                    <Table.Td>{formatInteger(row.session_start_count)}</Table.Td>
                    <Table.Td>{formatInteger(row.product_view_count)}</Table.Td>
                    <Table.Td>{formatInteger(row.add_to_cart_count)}</Table.Td>
                    <Table.Td>{formatInteger(row.checkout_start_count)}</Table.Td>
                    <Table.Td>{formatInteger(row.purchase_count)}</Table.Td>
                    <Table.Td>{formatPercent(row.view_to_cart_rate)}</Table.Td>
                    <Table.Td>{formatPercent(row.cart_to_purchase_rate)}</Table.Td>
                    <Table.Td>{formatPercent(row.view_to_purchase_rate)}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        ) : (
          <EmptyState message="기기별 전환 데이터가 없습니다." />
        )}
      </Section>

      <Title c="appleInk.9" order={2} size={34}>
        고객군별 구매 행동
      </Title>
      <Section title="채널 · 연령 · 성별 · 지역 · 기기 · 카테고리 조합">
        {data.customer_behavior_rows.length > 0 ? (
          <Table.ScrollContainer minWidth={980}>
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
                {data.customer_behavior_rows.map((row) => (
                  <Table.Tr key={row.customer_group_id}>
                    <Table.Td fw={700}>{row.customer_group_name}</Table.Td>
                    <Table.Td>{formatPercent(row.conversion_rate)}</Table.Td>
                    <Table.Td>{formatPercent(row.major_drop_off_rate)}</Table.Td>
                    <Table.Td>{formatMoney(row.expected_revenue)}</Table.Td>
                    <Table.Td>
                      <Badge color="actionBlue.6" radius="xl" variant="light">
                        {row.observed_signal}
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        ) : (
          <EmptyState message="고객군별 구매 행동 데이터가 없습니다." />
        )}
      </Section>
    </Stack>
  );
}
