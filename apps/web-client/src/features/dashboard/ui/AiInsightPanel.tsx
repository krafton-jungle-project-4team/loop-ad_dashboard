import { Badge, Group, List, Progress, SimpleGrid, Stack, Table, Text } from "@mantine/core";
import type {
  DashboardAiAnalysis,
  DashboardAiRecommendation,
  DashboardCustomerDetail,
  DashboardMetricValue
} from "@loopad/shared";
import { formatMoney, formatPercent } from "../model/dashboard-format.js";
import { DashboardMetric } from "./DashboardMetric.js";
import { EmptyState } from "./EmptyState.js";
import { Section } from "./Section.js";

export function AiInsightPanel({
  data,
  mode
}: {
  data: DashboardAiAnalysis | DashboardAiRecommendation;
  mode: "analysis" | "recommendation";
}) {
  return (
    <Stack gap="xl">
      <Section title={`전환율 ${mode === "analysis" ? "하위" : "상위"} 고객군`}>
        {data.customers.length > 0 ? (
          <Table.ScrollContainer minWidth={1120}>
            <Table verticalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>고객군</Table.Th>
                  <Table.Th>채널</Table.Th>
                  <Table.Th>연령</Table.Th>
                  <Table.Th>성별</Table.Th>
                  <Table.Th>카테고리</Table.Th>
                  <Table.Th>지역</Table.Th>
                  <Table.Th>기기</Table.Th>
                  <Table.Th>전환율</Table.Th>
                  <Table.Th>주요 이탈 단계</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {data.customers.map((customer, index) => (
                  <Table.Tr key={customer.customer_group_id} bg={index === 0 ? "red.0" : undefined}>
                    <Table.Td fw={700}>{customer.customer_group_name}</Table.Td>
                    <Table.Td>{customer.channel}</Table.Td>
                    <Table.Td>{customer.age_group}</Table.Td>
                    <Table.Td>{customer.gender}</Table.Td>
                    <Table.Td>{customer.category}</Table.Td>
                    <Table.Td>{customer.region}</Table.Td>
                    <Table.Td>{customer.device}</Table.Td>
                    <Table.Td c={mode === "analysis" ? "actionBlue.6" : "red.5"} fw={700}>
                      {formatPercent(customer.conversion_rate)}
                    </Table.Td>
                    <Table.Td>{customer.major_drop_off_stage}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        ) : (
          <EmptyState message="고객군 데이터가 없습니다." />
        )}
      </Section>

      {data.selected_customer ? <CustomerDetail detail={data.selected_customer} /> : null}

      {mode === "recommendation" && "recommended_actions" in data ? (
        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
          <Section title="추천하는 광고 액션">
            {data.recommended_actions.length > 0 ? (
              <Stack gap="md">
                {data.recommended_actions.map((action) => (
                  <Stack key={action.action_id} gap={4}>
                    <Group justify="space-between">
                      <Text fw={700}>{action.title}</Text>
                      <Badge color="actionBlue.6" radius="xl" variant="light">
                        {action.status}
                      </Badge>
                    </Group>
                    <Text c="appleInk.5" size="sm">
                      {action.description}
                    </Text>
                    {action.probability !== null ? (
                      <Progress color="actionBlue.6" value={action.probability * 100} />
                    ) : null}
                  </Stack>
                ))}
              </Stack>
            ) : (
              <EmptyState message="저장된 추천 액션이 없습니다." />
            )}
          </Section>

          <Section title="추천 근거">
            {data.recommendation_rationale.length > 0 ? (
              <List spacing="sm">
                {data.recommendation_rationale.map((item) => (
                  <List.Item key={item}>{item}</List.Item>
                ))}
              </List>
            ) : (
              <EmptyState message="저장된 추천 근거가 없습니다." />
            )}
          </Section>
        </SimpleGrid>
      ) : null}
    </Stack>
  );
}

function CustomerDetail({ detail }: { detail: DashboardCustomerDetail }) {
  return (
    <Stack gap="lg">
      <Section title={detail.customer_group.customer_group_name}>
        <Group gap="xs">
          <Badge color="actionBlue.6" radius="xl" variant="light">
            {detail.customer_group.channel}
          </Badge>
          <Text c="appleInk.5" size="sm">
            {detail.customer_group.age_group} · {detail.customer_group.gender} ·{" "}
            {detail.customer_group.category} · {detail.customer_group.region} ·{" "}
            {detail.customer_group.device}
          </Text>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
          {detail.metrics.map((metric) => (
            <DashboardMetric key={metric.label} label={metric.label} value={formatMetric(metric)} />
          ))}
        </SimpleGrid>
      </Section>

      <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="lg">
        <TextList title="케이스 분석" values={detail.case_analysis} />
        <Section title="과거 구매이력">
          <Stack gap="md">
            {detail.purchase_history.map((item) => (
              <Stack key={item.label} gap={6}>
                <Group justify="space-between">
                  <Text fw={600}>{item.label}</Text>
                  <Text c="appleInk.5">{formatPercent(item.share)}</Text>
                </Group>
                <Progress color="actionBlue.6" value={item.share * 100} />
              </Stack>
            ))}
          </Stack>
        </Section>
        <TextList title="판단 근거" values={detail.rationale} />
      </SimpleGrid>

      <Section title="구매 단계 흐름">
        <SimpleGrid cols={{ base: 1, md: 5 }} spacing="md">
          {detail.stage_flow.map((stage) => (
            <Stack key={stage.key} gap="xs">
              <Text c="appleInk.5" size="sm">
                {stage.label}
              </Text>
              <Text fw={700}>{formatPercent(stage.rate)}</Text>
              <Progress color="actionBlue.6" value={stage.rate * 100} />
            </Stack>
          ))}
        </SimpleGrid>
      </Section>
    </Stack>
  );
}

function TextList({ title, values }: { title: string; values: string[] }) {
  return (
    <Section title={title}>
      {values.length > 0 ? (
        <List spacing="sm">
          {values.map((value) => (
            <List.Item key={value}>{value}</List.Item>
          ))}
        </List>
      ) : (
        <EmptyState message="저장된 내용이 없습니다." />
      )}
    </Section>
  );
}

function formatMetric(metric: DashboardMetricValue): string {
  switch (metric.value_type) {
    case "money":
      return formatMoney(metric.value);
    case "rate":
      return formatPercent(metric.value);
    case "delta":
      return `${metric.value >= 0 ? "+" : ""}${formatPercent(metric.value)}`;
  }
}
