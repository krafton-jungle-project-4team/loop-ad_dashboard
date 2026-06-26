import { Button, Card, Center, Stack, Text, Title } from "@mantine/core";

export function MediaCard({ title, label }: { title: string; label: string }) {
  return (
    <Card bg="appleInk.0" p="xl" withBorder>
      <Stack gap="md">
        <Title order={3}>{title}</Title>
        <Center
          h={220}
          style={{ border: "1px dashed var(--mantine-color-gray-4)", borderRadius: 18 }}
        >
          <Stack align="center">
            <Text c="dimmed" fw={700} size="xl">
              {title}
            </Text>
            <Text c="dimmed">{label}</Text>
          </Stack>
        </Center>
        <Button color="actionBlue.6" fullWidth variant="light">
          관리자 승인
        </Button>
      </Stack>
    </Card>
  );
}
