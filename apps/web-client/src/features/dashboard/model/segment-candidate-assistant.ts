export const INITIAL_SEGMENT_ASSISTANT_MESSAGE =
  "고객 행동 데이터의 인원과 비율을 물어보거나, 원하는 조건의 세그먼트를 직접 만들 수 있습니다.";

export function segmentAssistantFailureMessage(_error: unknown) {
  return "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}
