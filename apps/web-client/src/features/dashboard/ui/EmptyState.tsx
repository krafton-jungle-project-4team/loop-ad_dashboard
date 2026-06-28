import { Card, Text } from "@mantine/core";

export function EmptyState({ message }: { message: string }) {
  return (
    <Card bg="appleInk.0" p="xl" radius="lg" withBorder>
      <Text c="appleInk.5" ta="center">
        {message}
      </Text>
    </Card>
  );
}
