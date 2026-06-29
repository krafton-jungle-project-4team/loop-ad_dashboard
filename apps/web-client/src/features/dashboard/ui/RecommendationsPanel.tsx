import { Badge, Group, Stack, Table, Text } from "@mantine/core";
import type { DashboardRecommendations } from "@loopad/shared";
import { formatDateTime } from "../model/dashboard-format.js";
import { EmptyState } from "./EmptyState.js";
import { Section } from "./Section.js";

export function RecommendationsPanel({
  recommendations
}: {
  recommendations: DashboardRecommendations;
}) {
  return (
    <Stack gap="xl">
      {recommendations.recommendations.length > 0 ? (
        recommendations.recommendations.map((recommendation) => (
          <Section key={recommendation.recommendation_id} title={recommendation.title}>
            <Stack gap="lg">
              <Group gap="sm">
                <Badge color="actionBlue.6" radius="xl" variant="light">
                  {recommendation.status}
                </Badge>
                <Text c="appleInk.5" size="sm">
                  {recommendation.segment_id}
                </Text>
                <Text c="appleInk.5" size="sm">
                  {formatDateTime(recommendation.created_at)}
                </Text>
              </Group>
              <Text c="appleInk.7">{recommendation.reason}</Text>
              {recommendation.actions.length > 0 ? (
                <Table.ScrollContainer minWidth={920}>
                  <Table verticalSpacing="md">
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>action_id</Table.Th>
                        <Table.Th>type</Table.Th>
                        <Table.Th>name</Table.Th>
                        <Table.Th>description</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {recommendation.actions.map((action) => (
                        <Table.Tr key={action.action_id}>
                          <Table.Td fw={600}>{action.action_id}</Table.Td>
                          <Table.Td>{action.action_type}</Table.Td>
                          <Table.Td>{action.action_name}</Table.Td>
                          <Table.Td>{action.description}</Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              ) : (
                <EmptyState message="추천 액션이 없습니다." />
              )}
            </Stack>
          </Section>
        ))
      ) : (
        <EmptyState message="추천 결과가 없습니다." />
      )}
    </Stack>
  );
}
