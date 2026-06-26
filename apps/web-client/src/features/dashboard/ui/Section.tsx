import { Card, Title } from "@mantine/core";
import type { ReactNode } from "react";

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card bg="white" p="xl" radius="lg" withBorder>
      <Title c="appleInk.9" mb="lg" order={2} size="h3">
        {title}
      </Title>
      {children}
    </Card>
  );
}
