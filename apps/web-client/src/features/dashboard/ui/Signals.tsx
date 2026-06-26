import { Group, Stack, Text, ThemeIcon } from "@mantine/core";
import { Check } from "lucide-react";

export function Signals({ items }: { items: string[] }) {
  return (
    <Stack gap="md">
      {items.map((item) => (
        <Group key={item}>
          <ThemeIcon color="actionBlue.6" radius="xl">
            <Check size={16} />
          </ThemeIcon>
          <Text>{item}</Text>
        </Group>
      ))}
    </Stack>
  );
}
