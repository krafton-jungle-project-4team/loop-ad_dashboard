import { Center, Loader, Stack, Text } from "@mantine/core";

export function LoadingState() {
  return (
    <Center h={420}>
      <Stack align="center">
        <Loader color="actionBlue.6" />
        <Text c="dimmed">데이터를 불러오는 중입니다.</Text>
      </Stack>
    </Center>
  );
}
