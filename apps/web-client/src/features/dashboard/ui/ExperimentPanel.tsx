import { Badge, Group, SimpleGrid, Stack, Table, Text } from "@mantine/core";
import type { DashboardExperiment, DashboardExperimentPerformance } from "@loopad/shared";
import { formatDateTime, formatInteger, formatPercent } from "../model/dashboard-format.js";
import { DashboardMetric } from "./DashboardMetric.js";
import { EmptyState } from "./EmptyState.js";
import { Section } from "./Section.js";

export function ExperimentPanel({
  experiment,
  performance
}: {
  experiment: DashboardExperiment;
  performance: DashboardExperimentPerformance;
}) {
  return (
    <Stack gap="xl">
      <Section title={experiment.experiment_id}>
        <Stack gap="lg">
          <Group gap="sm">
            <Badge color="actionBlue.6" radius="xl" variant="light">
              {experiment.status}
            </Badge>
            <Text c="appleInk.5" size="sm">
              {experiment.segment_id}
            </Text>
            <Text c="appleInk.5" size="sm">
              {experiment.recommendation_id}
            </Text>
          </Group>
          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
            <DashboardMetric label="목표 지표" value={experiment.goal_metric} />
            <DashboardMetric
              label="액션"
              value={experiment.action_id}
              description={experiment.action_type}
            />
            <DashboardMetric
              label="밴딧 정책"
              value={experiment.bandit_policy_id ?? "-"}
              description={`arm ${experiment.bandit_arm_id ?? "-"}`}
            />
          </SimpleGrid>
          <Text c="appleInk.5" size="sm">
            시작 {formatDateTime(experiment.started_at)}
          </Text>
        </Stack>
      </Section>

      <Section title="액션 선택 확률">
        {experiment.action_probabilities.length > 0 ? (
          <Table.ScrollContainer minWidth={860}>
            <Table verticalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>action_id</Table.Th>
                  <Table.Th>name</Table.Th>
                  <Table.Th>probability</Table.Th>
                  <Table.Th>impressions</Table.Th>
                  <Table.Th>clicks</Table.Th>
                  <Table.Th>purchases</Table.Th>
                  <Table.Th>updated_at</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {experiment.action_probabilities.map((action) => (
                  <Table.Tr key={action.action_id}>
                    <Table.Td fw={600}>{action.action_id}</Table.Td>
                    <Table.Td>{action.action_name}</Table.Td>
                    <Table.Td>{formatPercent(action.probability)}</Table.Td>
                    <Table.Td>{formatInteger(action.impressions)}</Table.Td>
                    <Table.Td>{formatInteger(action.clicks)}</Table.Td>
                    <Table.Td>{formatInteger(action.purchases)}</Table.Td>
                    <Table.Td>{formatDateTime(action.updated_at)}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        ) : (
          <EmptyState message="액션 확률 데이터가 없습니다." />
        )}
      </Section>

      <Section title="실험 성과">
        {performance.actions.length > 0 ? (
          <Table.ScrollContainer minWidth={860}>
            <Table verticalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>action_id</Table.Th>
                  <Table.Th>name</Table.Th>
                  <Table.Th>probability</Table.Th>
                  <Table.Th>impressions</Table.Th>
                  <Table.Th>clicks</Table.Th>
                  <Table.Th>purchases</Table.Th>
                  <Table.Th>CTR</Table.Th>
                  <Table.Th>CVR</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {performance.actions.map((action) => (
                  <Table.Tr key={action.action_id}>
                    <Table.Td fw={600}>{action.action_id}</Table.Td>
                    <Table.Td>{action.action_name}</Table.Td>
                    <Table.Td>{formatPercent(action.probability)}</Table.Td>
                    <Table.Td>{formatInteger(action.impressions)}</Table.Td>
                    <Table.Td>{formatInteger(action.clicks)}</Table.Td>
                    <Table.Td>{formatInteger(action.purchases)}</Table.Td>
                    <Table.Td>{formatPercent(action.ctr)}</Table.Td>
                    <Table.Td>{formatPercent(action.cvr)}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        ) : (
          <EmptyState message="실험 성과 데이터가 없습니다." />
        )}
      </Section>
    </Stack>
  );
}
