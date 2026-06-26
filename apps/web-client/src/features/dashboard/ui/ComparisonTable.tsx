import { Table } from "@mantine/core";
import type { ConversionReport } from "@loopad/shared";
import { Section } from "./Section.js";

export function ComparisonTable({
  title,
  rows
}: {
  title: string;
  rows: ConversionReport["deviceComparison"];
}) {
  return (
    <Section title={title}>
      <Table.ScrollContainer minWidth={620}>
        <Table verticalSpacing="md">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>구분</Table.Th>
              {rows[0]?.steps.map((step) => (
                <Table.Th key={step.key}>{step.label}</Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((row) => (
              <Table.Tr key={row.segment}>
                <Table.Td fw={700}>{row.segment}</Table.Td>
                {row.steps.map((step) => (
                  <Table.Td key={`${row.segment}-${step.key}`}>{step.displayUserCount}</Table.Td>
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Section>
  );
}
