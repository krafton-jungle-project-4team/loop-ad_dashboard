import { Table, Text } from "@mantine/core";
import type { CustomerSegment } from "@loopad/shared";

export function SegmentTable({ segments }: { segments: CustomerSegment[] }) {
  return (
    <Table.ScrollContainer minWidth={900}>
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
          {segments.map((segment) => (
            <Table.Tr key={segment.id}>
              <Table.Td fw={700}>{segment.name}</Table.Td>
              <Table.Td>{segment.channel}</Table.Td>
              <Table.Td>{segment.ageGroup}</Table.Td>
              <Table.Td>{segment.gender}</Table.Td>
              <Table.Td>{segment.category}</Table.Td>
              <Table.Td>{segment.region}</Table.Td>
              <Table.Td>{segment.device}</Table.Td>
              <Table.Td>
                <Text c="red.5" fw={800}>
                  {segment.conversionRate}
                </Text>
              </Table.Td>
              <Table.Td>{segment.majorDropOffStep}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}
