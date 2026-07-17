import type { DashboardSegmentAssistantResponse } from "@loopad/shared";
import { Badge } from "@loopad/ui/shadcn/badge";
import { Button } from "@loopad/ui/shadcn/button";
import { Spinner } from "@loopad/ui/shadcn/spinner";
import { Textarea } from "@loopad/ui/shadcn/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { Bot, Database, Plus, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  assistDashboardPromotionSegment,
  createDashboardPromotionScopedSegmentDefinition
} from "../api/dashboard-api.js";
import {
  dashboardCampaignDetailQueryKey,
  dashboardPromotionDetailQueryKey,
  dashboardPromotionScopedSegmentDefinitionsQueryKey
} from "../model/dashboard-query-keys.js";
import type { DashboardQuery } from "../model/dashboard-types.js";
import {
  INITIAL_SEGMENT_ASSISTANT_MESSAGE,
  segmentAssistantFailureMessage
} from "../model/segment-candidate-assistant.js";

type AssistantMessage = {
  id: number;
  role: "assistant" | "user";
  text: string;
};

export function SegmentCandidateAssistantPanel({
  onClose,
  promotionId,
  query
}: {
  onClose: () => void;
  promotionId: string;
  query: DashboardQuery;
}) {
  const queryClient = useQueryClient();
  const nextMessageId = useRef(1);
  const [messages, setMessages] = useState<AssistantMessage[]>(() => [
    { id: 0, role: "assistant", text: INITIAL_SEGMENT_ASSISTANT_MESSAGE }
  ]);
  const [draft, setDraft] = useState("");
  const [result, setResult] = useState<DashboardSegmentAssistantResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    nextMessageId.current = 1;
    setMessages([{ id: 0, role: "assistant", text: INITIAL_SEGMENT_ASSISTANT_MESSAGE }]);
    setDraft("");
    setResult(null);
    setIsSaved(false);
  }, [promotionId]);

  const appendMessage = (role: AssistantMessage["role"], text: string) => {
    const id = nextMessageId.current;
    nextMessageId.current += 1;
    setMessages((current) => [...current, { id, role, text }]);
  };

  const submit = async () => {
    const userMessage = draft.trim();
    if (!userMessage || isLoading || !promotionId) {
      return;
    }

    const conversation = messages.slice(-12).map((message) => ({
      role: message.role,
      content: message.text
    }));
    appendMessage("user", userMessage);
    setDraft("");
    setIsLoading(true);
    setResult(null);
    setIsSaved(false);

    try {
      const response = await assistDashboardPromotionSegment(query, promotionId, {
        message: userMessage,
        conversation
      });
      setResult(response);
      appendMessage("assistant", response.assistant_message);
    } catch (error) {
      setResult(null);
      appendMessage("assistant", segmentAssistantFailureMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const saveSegment = async () => {
    if (!result?.preview || !result.segment_name || isSaving || isSaved) {
      return;
    }

    setIsSaving(true);
    try {
      const segment = await createDashboardPromotionScopedSegmentDefinition(query, promotionId, {
        segment_name: result.segment_name,
        source: "custom_chatkit",
        query_preview_id: result.preview.query_preview_id,
        natural_language_query: null,
        rule_json: {},
        profile_json: {},
        sample_size: result.preview.sample_size,
        total_eligible_user_count: result.preview.total_eligible_user_count,
        sample_ratio: result.preview.sample_ratio
      });
      setIsSaved(true);
      appendMessage(
        "assistant",
        `'${segment.segment_name}' 세그먼트를 추가했습니다. 후보 목록에서 선택해 확정할 수 있습니다.`
      );
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: dashboardCampaignDetailQueryKey(query.projectId, query.selectedCampaignId)
        }),
        queryClient.invalidateQueries({
          queryKey: dashboardPromotionDetailQueryKey(query.projectId, promotionId)
        }),
        queryClient.invalidateQueries({
          queryKey: dashboardPromotionScopedSegmentDefinitionsQueryKey(query.projectId, promotionId)
        })
      ]);
    } catch (error) {
      appendMessage("assistant", segmentAssistantFailureMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <aside
      aria-labelledby="loopad-segment-assistant-title"
      className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-white shadow-[-8px_0_24px_rgba(15,23,42,0.06)]"
      id="loopad-dashboard-assistant-panel"
    >
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-black/10 px-4">
        <Bot aria-hidden="true" className="size-4 text-primary" />
        <h2 className="text-sm font-semibold" id="loopad-segment-assistant-title">
          세그먼트 후보 도우미
        </h2>
        <Button
          aria-label="세그먼트 후보 도우미 닫기"
          className="ml-auto"
          onClick={onClose}
          size="icon-sm"
          title="세그먼트 후보 도우미 닫기"
          type="button"
          variant="ghost"
        >
          <X aria-hidden="true" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="grid gap-3">
          {messages.map((message) => (
            <div
              className={
                message.role === "assistant"
                  ? "max-w-[92%] rounded-md bg-muted px-3 py-2 text-sm leading-6 text-foreground"
                  : "ml-auto max-w-[92%] rounded-md bg-primary px-3 py-2 text-sm leading-6 text-primary-foreground"
              }
              key={message.id}
            >
              {message.text}
            </div>
          ))}
          {isLoading ? (
            <div className="flex w-fit items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
              <Spinner className="size-4" />
              요청을 이해하고 행동 데이터를 조회하고 있어요
            </div>
          ) : null}
        </div>

        {result?.preview ? (
          <SegmentAssistantResult
            isSaved={isSaved}
            isSaving={isSaving}
            onSave={() => void saveSegment()}
            result={result}
          />
        ) : null}
      </div>

      <div className="shrink-0 border-t bg-background p-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
          <Textarea
            aria-label="고객 데이터 질문 또는 세그먼트 조건"
            className="max-h-32 min-h-20 resize-none"
            disabled={isLoading}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void submit();
              }
            }}
            placeholder="예: 최근 제주 숙소를 검색했지만 예약하지 않은 고객은 몇 명이야?"
            value={draft}
          />
          <Button
            aria-label="요청 보내기"
            disabled={!draft.trim() || isLoading}
            onClick={() => void submit()}
            size="icon"
            title="요청 보내기"
            type="button"
          >
            <Send aria-hidden="true" />
          </Button>
        </div>
      </div>
    </aside>
  );
}

function SegmentAssistantResult({
  isSaved,
  isSaving,
  onSave,
  result
}: {
  isSaved: boolean;
  isSaving: boolean;
  onSave: () => void;
  result: DashboardSegmentAssistantResponse;
}) {
  const preview = result.preview;
  if (!preview) {
    return null;
  }

  const isSaveable = preview.sample_size_status === "valid" && preview.sample_size > 0;
  return (
    <section className="mt-5 grid gap-3 rounded-md border p-3" aria-label="세그먼트 조건 조회 결과">
      <div className="flex items-center gap-2">
        <Database aria-hidden="true" className="size-4 text-primary" />
        <h3 className="text-sm font-semibold">
          {result.action === "audience_query" ? "고객 데이터 조회" : "세그먼트 미리보기"}
        </h3>
        <Badge className="ml-auto" variant="secondary">
          최근 {result.lookback_days}일
        </Badge>
      </div>

      <dl className="grid grid-cols-3 divide-x rounded-md bg-muted/60 py-3 text-center">
        <Metric
          label="분석 가능"
          value={`${preview.total_eligible_user_count.toLocaleString()}명`}
        />
        <Metric label="조건 부합" value={`${preview.sample_size.toLocaleString()}명`} />
        <Metric label="비율" value={`${(preview.sample_ratio * 100).toFixed(2)}%`} />
      </dl>

      <div className="flex flex-wrap gap-1.5">
        {result.condition_labels.map((label) => (
          <Badge key={label} variant="outline">
            {label}
          </Badge>
        ))}
      </div>

      {result.segment_name ? (
        <div className="grid gap-1 text-sm">
          <span className="text-xs text-muted-foreground">세그먼트 이름</span>
          <span className="font-medium [overflow-wrap:anywhere]">{result.segment_name}</span>
        </div>
      ) : null}

      <Button disabled={!isSaveable || isSaving || isSaved} onClick={onSave} type="button">
        <Plus aria-hidden="true" />
        {isSaved ? "추가됨" : isSaving ? "추가하고 있어요…" : "이 조건으로 세그먼트 추가"}
      </Button>
      {!isSaveable && preview.sample_size > 0 ? (
        <p className="text-xs leading-5 text-muted-foreground">
          현재 조건의 고객 수가 세그먼트 운영 기준보다 적습니다. 기간이나 조건을 조정해 주세요.
        </p>
      ) : null}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-w-0 gap-1 px-1">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="text-sm font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
