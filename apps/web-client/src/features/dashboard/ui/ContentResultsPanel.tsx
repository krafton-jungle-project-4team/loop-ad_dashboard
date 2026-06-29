import { Anchor, Badge, Stack, Table } from "@mantine/core";
import type { DashboardRecommendations } from "@loopad/shared";
import { formatDateTime } from "../model/dashboard-format.js";
import { EmptyState } from "./EmptyState.js";
import { Section } from "./Section.js";

export function ContentResultsPanel({
  recommendations
}: {
  recommendations: DashboardRecommendations;
}) {
  const contentRows = recommendations.recommendations.flatMap((recommendation) =>
    recommendation.actions.map((action) => ({
      action,
      recommendation
    }))
  );

  return (
    <Stack gap="xl">
      <Section title="생성 콘텐츠">
        {contentRows.length > 0 ? (
          <Table.ScrollContainer minWidth={920}>
            <Table verticalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>recommendation_id</Table.Th>
                  <Table.Th>action_id</Table.Th>
                  <Table.Th>name</Table.Th>
                  <Table.Th>content</Table.Th>
                  <Table.Th>created_at</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {contentRows.map(({ action, recommendation }) => (
                  <Table.Tr key={`${recommendation.recommendation_id}:${action.action_id}`}>
                    <Table.Td fw={600}>{recommendation.recommendation_id}</Table.Td>
                    <Table.Td>{action.action_id}</Table.Td>
                    <Table.Td>{action.action_name}</Table.Td>
                    <Table.Td>
                      {action.content ? (
                        <Anchor
                          c="actionBlue.6"
                          href={action.content.content_url}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {action.content.content_id}
                        </Anchor>
                      ) : (
                        <Badge color="gray" radius="xl" variant="light">
                          콘텐츠 미생성
                        </Badge>
                      )}
                    </Table.Td>
                    <Table.Td>
                      {action.content ? formatDateTime(action.content.created_at) : "-"}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        ) : (
          <EmptyState message="콘텐츠 생성 결과가 없습니다." />
        )}
      </Section>
    </Stack>
  );
}
