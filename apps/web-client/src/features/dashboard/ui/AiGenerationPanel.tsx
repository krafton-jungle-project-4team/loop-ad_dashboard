import { Anchor, Badge, Card, Group, Image, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import type { DashboardAiGeneration } from "@loopad/shared";
import { EmptyState } from "./EmptyState.js";
import { Section } from "./Section.js";

export function AiGenerationPanel({ data }: { data: DashboardAiGeneration }) {
  return (
    <Stack gap="xl">
      <Section title="선택 고객군">
        {data.selected_customer ? (
          <Stack gap="xs">
            <Title c="appleInk.9" order={2} size="h3">
              {data.selected_customer.customer_group_name}
            </Title>
            <Text c="appleInk.5">
              {data.selected_customer.channel} · {data.selected_customer.age_group} ·{" "}
              {data.selected_customer.gender} · {data.selected_customer.category} ·{" "}
              {data.selected_customer.region} · {data.selected_customer.device}
            </Text>
          </Stack>
        ) : (
          <EmptyState message="선택된 고객군이 없습니다." />
        )}
      </Section>

      <Section title="생성 콘텐츠">
        {data.generated_items.length > 0 ? (
          <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="lg">
            {data.generated_items.map((item) => (
              <Card key={item.action.action_id} bg="appleInk.0" p="lg" radius="lg" withBorder>
                <Stack gap="md">
                  <Group justify="space-between">
                    <Title c="appleInk.9" order={3} size="h4">
                      {item.action.title}
                    </Title>
                    <Badge color="actionBlue.6" radius="xl" variant="light">
                      {item.content?.status ?? "콘텐츠 미생성"}
                    </Badge>
                  </Group>
                  <Text c="appleInk.5" size="sm">
                    {item.action.description}
                  </Text>
                  {item.content ? (
                    <Stack gap="md">
                      <Badge color="actionBlue.6" radius="xl" variant="outline" w="fit-content">
                        {item.content.content_type}
                      </Badge>
                      {item.content.message ? <Text>{item.content.message}</Text> : null}
                      {item.content.content_url ? (
                        item.content.content_type === "image" ? (
                          <Image
                            alt={item.content.title}
                            fit="cover"
                            radius="md"
                            src={item.content.content_url}
                          />
                        ) : (
                          <Anchor
                            c="actionBlue.6"
                            href={item.content.content_url}
                            rel="noreferrer"
                            target="_blank"
                          >
                            {item.content.content_url}
                          </Anchor>
                        )
                      ) : (
                        <Badge color="gray" radius="xl" variant="light">
                          content_url 없음
                        </Badge>
                      )}
                    </Stack>
                  ) : (
                    <EmptyState message="콘텐츠 미생성" />
                  )}
                </Stack>
              </Card>
            ))}
          </SimpleGrid>
        ) : (
          <EmptyState message="저장된 생성 콘텐츠가 없습니다." />
        )}
      </Section>
    </Stack>
  );
}
