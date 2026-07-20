import type {
  DashboardSegmentAssistantResponse,
  DashboardSegmentAssistantSourceContext,
  DashboardSegmentAssistantSourceSuggestion
} from "@loopad/shared";

export const INITIAL_SEGMENT_ASSISTANT_MESSAGE =
  "고객 행동 데이터의 인원과 비율을 물어보거나, 원하는 조건의 고객군을 직접 만들 수 있습니다.";

export type SegmentAssistantMessage = {
  id: number;
  role: "assistant" | "user";
  text: string;
  result?: DashboardSegmentAssistantResponse;
};

export type SegmentAssistantSession = {
  draft: string;
  isLoading: boolean;
  isSourceContextLoading: boolean;
  isSaved: boolean;
  isSaving: boolean;
  messages: SegmentAssistantMessage[];
  nextMessageId: number;
  result: DashboardSegmentAssistantResponse | null;
  sourceContext: DashboardSegmentAssistantSourceContext | null;
  sourceSuggestion: DashboardSegmentAssistantSourceSuggestion | null;
};

export type SegmentAssistantSessionStore = Record<string, SegmentAssistantSession>;
export type SegmentAssistantSessionUpdater = (
  current: SegmentAssistantSession
) => SegmentAssistantSession;

export function createSegmentAssistantSession(): SegmentAssistantSession {
  return {
    draft: "",
    isLoading: false,
    isSourceContextLoading: false,
    isSaved: false,
    isSaving: false,
    messages: [{ id: 0, role: "assistant", text: INITIAL_SEGMENT_ASSISTANT_MESSAGE }],
    nextMessageId: 1,
    result: null,
    sourceContext: null,
    sourceSuggestion: null
  };
}

export function selectSegmentAssistantSource(
  current: SegmentAssistantSession,
  sourceSuggestion: DashboardSegmentAssistantSourceSuggestion | null
): SegmentAssistantSession {
  if (sameSourceSuggestion(current.sourceSuggestion, sourceSuggestion)) {
    return current;
  }
  return {
    ...current,
    draft: "",
    isLoading: false,
    isSaved: false,
    isSaving: false,
    isSourceContextLoading: Boolean(sourceSuggestion),
    messages: [{ id: 0, role: "assistant", text: INITIAL_SEGMENT_ASSISTANT_MESSAGE }],
    nextMessageId: 1,
    result: null,
    sourceContext: null,
    sourceSuggestion
  };
}

function sameSourceSuggestion(
  left: DashboardSegmentAssistantSourceSuggestion | null,
  right: DashboardSegmentAssistantSourceSuggestion | null
) {
  if (!left || !right) return left === right;
  return (
    left.suggestion_id === right.suggestion_id &&
    left.segment_id === right.segment_id &&
    left.sample_size === right.sample_size &&
    left.title === right.title &&
    left.strategy_role === right.strategy_role &&
    JSON.stringify(left.reference_labels ?? []) === JSON.stringify(right.reference_labels ?? [])
  );
}

export function segmentAssistantSessionKey(projectId: string, promotionId: string): string {
  return `${projectId}:${promotionId}`;
}

export function updateSegmentAssistantSessionStore(
  store: SegmentAssistantSessionStore,
  key: string,
  updater: SegmentAssistantSessionUpdater
): SegmentAssistantSessionStore {
  return {
    ...store,
    [key]: updater(store[key] ?? createSegmentAssistantSession())
  };
}

export function segmentAssistantFailureMessage(_error: unknown) {
  return "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

export function segmentAssistantResponseMessage(
  id: number,
  response: DashboardSegmentAssistantResponse
): SegmentAssistantMessage {
  return {
    id,
    role: "assistant",
    text: response.assistant_message,
    result: response.preview ? response : undefined
  };
}
