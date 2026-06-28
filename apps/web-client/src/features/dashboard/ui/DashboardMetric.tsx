import { Card, Text, Title } from "@mantine/core";

export function DashboardMetric({
  label,
  value,
  description
}: {
  label: string;
  value: string;
  description?: string;
}) {
  return (
    <Card bg="white" p="xl" radius="lg" withBorder>
      <Text c="appleInk.5" size="sm">
        {label}
      </Text>
      <Title c="appleInk.9" mt={6} order={3} size={34}>
        {value}
      </Title>
      {description ? (
        <Text c="appleInk.5" mt="xs" size="sm">
          {description}
        </Text>
      ) : null}
    </Card>
  );
}
