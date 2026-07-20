import {
  DataExplorerAiQueryPlanResponseSchema,
  DataExplorerQueryRunResponseSchema,
  type DataExplorerAiChatCurrentResult
} from "@loopad/shared";
import { ChatKit, useChatKit, type StartScreenPrompt } from "@openai/chatkit-react";
import { useCallback, useMemo } from "react";
import { z } from "zod";
import {
  createDataExplorerChatKitFetch,
  dataExplorerChatKitUrl
} from "../api/data-explorer-chatkit-api.js";
import { dashboardConfig } from "../../dashboard/model/dashboard-config.js";

const START_SCREEN_PROMPTS: StartScreenPrompt[] = [
  {
    icon: "chart",
    label: "최근 이벤트 추이",
    prompt: "최근 7일 이벤트 추이를 보는 SQL을 만들고 실행해 줘."
  },
  {
    icon: "analytics",
    label: "많이 발생한 이벤트",
    prompt: "이 프로젝트에서 가장 많이 발생한 이벤트 10개를 보여 줘."
  },
  {
    icon: "sparkle",
    label: "결과 해석",
    prompt: "현재 쿼리 결과에서 눈여겨볼 점을 한국어로 요약해 줘."
  }
];

const ChatKitQueryRunEffectSchema = z.object({
  action: z.literal("query_run"),
  query_plan: DataExplorerAiQueryPlanResponseSchema,
  query_result: DataExplorerQueryRunResponseSchema
});

const ChatKitQueryPlanEffectSchema = z.object({
  action: z.literal("query_plan"),
  query_plan: DataExplorerAiQueryPlanResponseSchema,
  query_result: z.null()
});

const ChatKitQueryEffectSchema = z.discriminatedUnion("action", [
  ChatKitQueryPlanEffectSchema,
  ChatKitQueryRunEffectSchema
]);

export type DataExplorerChatKitQueryEffect = z.infer<typeof ChatKitQueryEffectSchema>;

export function ChatKitQueryPanel({
  currentResult,
  onError,
  onQueryRun,
  projectId,
  showTitle = true
}: {
  currentResult: DataExplorerAiChatCurrentResult | null;
  onError: (message: string) => void;
  onQueryRun: (effect: DataExplorerChatKitQueryEffect) => void;
  projectId: string;
  showTitle?: boolean;
}) {
  const chatKitFetch = useMemo(
    () =>
      createDataExplorerChatKitFetch({
        currentResult,
        projectId
      }),
    [currentResult, projectId]
  );

  const handleEffect = useCallback(
    ({ data, name }: { data?: Record<string, unknown>; name: string }) => {
      if (name !== "data_explorer_query_plan" && name !== "data_explorer_query_run") {
        return;
      }

      const parsed = ChatKitQueryEffectSchema.safeParse(data);
      if (!parsed.success) {
        onError("AI 답변을 읽지 못했어요. 다시 요청해 주세요.");
        return;
      }

      onQueryRun(parsed.data);
    },
    [onError, onQueryRun]
  );

  const chatKit = useChatKit({
    api: {
      domainKey: dashboardConfig.chatKitDomainKey,
      fetch: chatKitFetch,
      url: dataExplorerChatKitUrl()
    },
    composer: {
      placeholder: ""
    },
    header: {
      enabled: false
    },
    history: {
      enabled: false
    },
    locale: "ko-KR",
    onEffect: handleEffect,
    onError: ({ error }) => {
      onError(error.message || "AI 도우미가 답하지 못했어요. 다시 시도해 주세요.");
    },
    startScreen: {
      greeting: "무엇을 조회할까요?",
      prompts: START_SCREEN_PROMPTS
    },
    theme: {
      color: {
        accent: {
          level: 1,
          primary: "#0066cc"
        }
      },
      colorScheme: "light",
      density: "compact",
      radius: "soft"
    },
    thread: {
      autoScroll: true
    },
    threadItemActions: {
      feedback: false
    }
  });

  return (
    <aside
      className={
        showTitle
          ? "grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-card"
          : "grid h-full min-h-0 grid-rows-[minmax(0,1fr)] overflow-hidden bg-card"
      }
    >
      {showTitle ? (
        <div className="border-b border-border bg-muted/40 px-4 py-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-foreground/70">
            AI 도우미
          </div>
        </div>
      ) : null}
      <div className="min-h-0 overflow-hidden">
        <ChatKit control={chatKit.control} className="block h-full w-full" />
      </div>
    </aside>
  );
}
