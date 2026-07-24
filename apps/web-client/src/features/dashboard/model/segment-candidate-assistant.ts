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
  createdSegmentAnalysisId: string | null;
  createdSegmentId: string | null;
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
type SegmentAssistantTargetStorage = Pick<Storage, "getItem" | "setItem">;

const SEGMENT_ASSISTANT_TARGETS_STORAGE_KEY = "loopad.dashboard.segmentAssistantTargets.v1";

export function createSegmentAssistantSession(): SegmentAssistantSession {
  return {
    createdSegmentAnalysisId: null,
    createdSegmentId: null,
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

export function readSegmentAssistantSessionTargets(
  storage?: SegmentAssistantTargetStorage | null
): SegmentAssistantSessionStore {
  const resolvedStorage = resolveTargetStorage(storage);
  if (!resolvedStorage) {
    return {};
  }

  try {
    const raw = resolvedStorage.getItem(SEGMENT_ASSISTANT_TARGETS_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(value).flatMap(([key, target]) => {
        const parsedTarget = parseSegmentAssistantTarget(target);
        return parsedTarget ? [[key, { ...createSegmentAssistantSession(), ...parsedTarget }]] : [];
      })
    );
  } catch {
    return {};
  }
}

export function persistSegmentAssistantSessionTargets(
  store: SegmentAssistantSessionStore,
  storage?: SegmentAssistantTargetStorage | null
) {
  const resolvedStorage = resolveTargetStorage(storage);
  if (!resolvedStorage) {
    return;
  }

  const targets = Object.fromEntries(
    Object.entries(store).flatMap(([key, session]) =>
      session.createdSegmentId
        ? [
            [
              key,
              {
                createdSegmentAnalysisId: session.createdSegmentAnalysisId,
                createdSegmentId: session.createdSegmentId
              }
            ]
          ]
        : []
    )
  );

  try {
    resolvedStorage.setItem(SEGMENT_ASSISTANT_TARGETS_STORAGE_KEY, JSON.stringify(targets));
  } catch {
    // Browser storage can be unavailable or full. The in-memory session still remains usable.
  }
}

function parseSegmentAssistantTarget(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const target = value as Record<string, unknown>;
  const createdSegmentId = target.createdSegmentId;
  const createdSegmentAnalysisId = target.createdSegmentAnalysisId;
  if (typeof createdSegmentId !== "string" || createdSegmentId.length === 0) {
    return null;
  }
  if (createdSegmentAnalysisId !== null && typeof createdSegmentAnalysisId !== "string") {
    return null;
  }
  return { createdSegmentAnalysisId, createdSegmentId };
}

function resolveTargetStorage(
  storage: SegmentAssistantTargetStorage | null | undefined
): SegmentAssistantTargetStorage | null {
  if (storage !== undefined) {
    return storage;
  }
  try {
    return typeof globalThis.localStorage === "undefined" ? null : globalThis.localStorage;
  } catch {
    return null;
  }
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
