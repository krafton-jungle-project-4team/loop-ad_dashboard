import { Alert, Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";
import type { z } from "zod";
import type { DashboardAiJobState } from "../model/dashboard-types.js";

export function AiJobPanel<T>({
  state,
  schema,
  children
}: {
  state: DashboardAiJobState;
  schema: z.ZodType<T>;
  children: (result: T) => ReactNode;
}) {
  if (state.status === "requesting" || state.status === "polling") {
    return (
      <Alert color="actionBlue.6" title="AI 분석 준비 중">
        <Stack gap={4}>
          <Text>추천 서버가 결과를 생성하고 있습니다.</Text>
          {state.resultId ? (
            <Text c="dimmed" size="sm">
              result id: {state.resultId}
            </Text>
          ) : null}
        </Stack>
      </Alert>
    );
  }

  if (state.status === "error") {
    return (
      <Alert color="red" title="AI 분석 요청 실패">
        {state.error.message}
      </Alert>
    );
  }

  if (state.status === "success" && state.result.result) {
    return children(schema.parse(state.result.result));
  }

  return (
    <Alert color="gray" title="AI 분석 대기">
      분석할 탭을 선택하면 추천 서버에 작업을 요청합니다.
    </Alert>
  );
}
