import { Badge, Button, Card, Group, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import type { CreativeReport } from "@loopad/shared";
import { MediaCard } from "./MediaCard.js";
import { Section } from "./Section.js";
import { SegmentTable } from "./SegmentTable.js";

export function CreativesPanel({ creatives }: { creatives: CreativeReport }) {
  const selected = creatives.creatives[0];

  return (
    <Stack gap="xl">
      <Section title="고객군 목록">
        <SegmentTable segments={creatives.creatives.map((creative) => creative.segment)} />
      </Section>
      {selected ? (
        <Section title={selected.segment.name}>
          <SimpleGrid cols={{ base: 1, xl: 3 }}>
            <Card bg="appleInk.0" p="xl" withBorder>
              <Stack gap="lg">
                <Group justify="space-between">
                  <Title order={3}>생성된 광고 문구</Title>
                  <Badge color="actionBlue.6" radius="xl" variant="light">
                    {selected.channels[0]}
                  </Badge>
                </Group>
                <Title order={4}>{selected.copy.headline}</Title>
                <Text>{selected.copy.body}</Text>
                <Group justify="space-between">
                  <Button color="actionBlue.6">{selected.copy.cta}</Button>
                  <Button color="actionBlue.6" variant="light">
                    관리자 승인
                  </Button>
                </Group>
              </Stack>
            </Card>
            <MediaCard title="이미지 광고 영역" label={selected.imageAsset?.label ?? ""} />
            <MediaCard title="영상 썸네일 영역" label={selected.videoAsset?.label ?? ""} />
          </SimpleGrid>
          <Group mt="lg">
            <Badge color="actionBlue.6" radius="xl" variant="light">
              A/B 테스트 실행 상태: {selected.abTestStatus}
            </Badge>
            <Badge color="actionBlue.6" radius="xl" variant="light">
              발송 채널: {selected.channels.join(", ")}
            </Badge>
          </Group>
        </Section>
      ) : null}
    </Stack>
  );
}
