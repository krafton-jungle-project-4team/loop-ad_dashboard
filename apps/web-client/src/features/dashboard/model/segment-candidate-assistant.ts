export const INITIAL_SEGMENT_ASSISTANT_MESSAGE =
  "세그먼트 후보를 챗봇을 통해 직접 생성할 수 있습니다. 원하시는 세그먼트나 조건 등을 알려주세요.";

const MAX_CONVERSATION_USER_TURNS = 6;
const MAX_SEGMENT_INSTRUCTION_LENGTH = 2_000;
const NO_MATCH_ERROR_DETAIL = "no segment candidates matched segment instruction";

export function buildSegmentAssistantInstruction(userMessages: string[]) {
  const normalized = userMessages
    .map((message) => message.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(-MAX_CONVERSATION_USER_TURNS);
  const retained: string[] = [];
  let length = 0;

  for (const message of normalized.reverse()) {
    const separatorLength = retained.length > 0 ? "\n후속 요청: ".length : 0;
    if (length + separatorLength + message.length > MAX_SEGMENT_INSTRUCTION_LENGTH) {
      if (retained.length === 0) {
        retained.push(message.slice(0, MAX_SEGMENT_INSTRUCTION_LENGTH));
        length = MAX_SEGMENT_INSTRUCTION_LENGTH;
      }
      continue;
    }
    retained.push(message);
    length += separatorLength + message.length;
  }

  return retained
    .reverse()
    .map((message, index) => (index === 0 ? message : `후속 요청: ${message}`))
    .join("\n");
}

export function segmentAssistantFailureMessage(error: unknown) {
  if (error instanceof Error && error.message.includes(NO_MATCH_ERROR_DETAIL)) {
    return "조건과 일치하는 고객군을 찾지 못했습니다. 목적지, 최근 행동 기간, 검색·상세 조회·예약 이탈 중 원하는 행동을 조금 더 구체적으로 알려주세요.";
  }

  return "세그먼트 후보를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.";
}
