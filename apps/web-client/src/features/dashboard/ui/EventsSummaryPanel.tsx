import { Badge, SimpleGrid, Stack, Table } from "@mantine/core";
import type { DashboardEventsSummary } from "@loopad/shared";
import { formatDateTime, formatInteger } from "../model/dashboard-format.js";
import { DashboardMetric } from "./DashboardMetric.js";
import { EmptyState } from "./EmptyState.js";
import { Section } from "./Section.js";

export function EventsSummaryPanel({ summary }: { summary: DashboardEventsSummary }) {
  return (
    <Stack gap="xl">
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
        <DashboardMetric label="최근 이벤트" value={formatInteger(summary.recent_event_count)} />
        {summary.event_counts.slice(0, 2).map((event) => (
          <DashboardMetric
            key={event.event_name}
            label={event.event_name}
            value={formatInteger(event.count)}
          />
        ))}
      </SimpleGrid>

      <Section title="이벤트 카운트">
        {summary.event_counts.length > 0 ? (
          <Table.ScrollContainer minWidth={520}>
            <Table verticalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>event_name</Table.Th>
                  <Table.Th>count</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {summary.event_counts.map((event) => (
                  <Table.Tr key={event.event_name}>
                    <Table.Td>
                      <Badge color="actionBlue.6" radius="xl" variant="light">
                        {event.event_name}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{formatInteger(event.count)}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        ) : (
          <EmptyState message="수집된 이벤트가 없습니다." />
        )}
      </Section>

      <Section title="최근 이벤트">
        {summary.recent_events.length > 0 ? (
          <Table.ScrollContainer minWidth={1100}>
            <Table verticalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>시간</Table.Th>
                  <Table.Th>이벤트</Table.Th>
                  <Table.Th>사용자</Table.Th>
                  <Table.Th>세션</Table.Th>
                  <Table.Th>세그먼트</Table.Th>
                  <Table.Th>실험</Table.Th>
                  <Table.Th>액션</Table.Th>
                  <Table.Th>기기</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {summary.recent_events.map((event) => (
                  <Table.Tr key={`${event.event_time}-${event.session_id}-${event.event_name}`}>
                    <Table.Td>{formatDateTime(event.event_time)}</Table.Td>
                    <Table.Td>{event.event_name}</Table.Td>
                    <Table.Td>{event.user_id}</Table.Td>
                    <Table.Td>{event.session_id}</Table.Td>
                    <Table.Td>{event.segment_id ?? "-"}</Table.Td>
                    <Table.Td>{event.experiment_id ?? "-"}</Table.Td>
                    <Table.Td>{event.action_id ?? "-"}</Table.Td>
                    <Table.Td>{event.device ?? "-"}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        ) : (
          <EmptyState message="최근 이벤트가 없습니다." />
        )}
      </Section>
    </Stack>
  );
}
