import type { DashboardPromotionSegmentSuggestion } from "@loopad/shared";
import { Badge } from "@loopad/ui/shadcn/badge";
import { Button } from "@loopad/ui/shadcn/button";
import { Checkbox } from "@loopad/ui/shadcn/checkbox";
import { Spinner } from "@loopad/ui/shadcn/spinner";
import { Textarea } from "@loopad/ui/shadcn/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { Bot, Send, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  confirmDashboardPromotionSegmentSuggestions,
  fetchDashboardPromotionSegmentSuggestions,
  recommendDashboardPromotionSegments
} from "../api/dashboard-api.js";
import {
  dashboardCampaignDetailQueryKey,
  dashboardPromotionAnalysisProgressQueryKey,
  dashboardPromotionDetailQueryKey,
  dashboardPromotionSegmentSuggestionsQueryKey
} from "../model/dashboard-query-keys.js";
import type { DashboardQuery } from "../model/dashboard-types.js";
import {
  buildSegmentAssistantInstruction,
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
  const [candidates, setCandidates] = useState<DashboardPromotionSegmentSuggestion[]>([]);
  const [selectedSuggestionIds, setSelectedSuggestionIds] = useState<Set<string>>(new Set());
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    nextMessageId.current = 1;
    setMessages([{ id: 0, role: "assistant", text: INITIAL_SEGMENT_ASSISTANT_MESSAGE }]);
    setDraft("");
    setCandidates([]);
    setSelectedSuggestionIds(new Set());
    setAnalysisId(null);
  }, [promotionId]);

  const userMessages = useMemo(
    () => messages.filter((message) => message.role === "user").map((message) => message.text),
    [messages]
  );

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

    const instruction = buildSegmentAssistantInstruction([...userMessages, userMessage]);
    appendMessage("user", userMessage);
    setDraft("");
    setIsLoading(true);
    setCandidates([]);
    setSelectedSuggestionIds(new Set());
    setAnalysisId(null);

    try {
      const analysis = await recommendDashboardPromotionSegments(query, promotionId, {
        segment_instruction: instruction
      });
      const result = await fetchDashboardPromotionSegmentSuggestions(
        query,
        promotionId,
        new AbortController().signal,
        analysis.analysis_id
      );

      setAnalysisId(analysis.analysis_id);
      setCandidates(result.suggestions);
      queryClient.setQueryData(
        dashboardPromotionAnalysisProgressQueryKey(query.projectId, promotionId),
        {
          analysisId: analysis.analysis_id,
          errorMessage: null,
          startedAt: Date.now(),
          status: "success"
        }
      );
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: dashboardPromotionDetailQueryKey(query.projectId, promotionId)
        }),
        queryClient.invalidateQueries({
          queryKey: dashboardPromotionSegmentSuggestionsQueryKey(
            query.projectId,
            promotionId,
            analysis.analysis_id
          )
        })
      ]);

      if (result.suggestions.length === 0) {
        appendMessage("assistant", clarificationMessage());
      } else {
        appendMessage(
          "assistant",
          `요청 조건과 실제 행동 데이터를 연결해 ${result.suggestions.length}개의 후보를 찾았습니다. 원하는 후보를 선택하거나 조건을 더 말씀해 주세요.`
        );
      }
    } catch (error) {
      setCandidates([]);
      setAnalysisId(null);
      appendMessage("assistant", segmentAssistantFailureMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const confirmSelectedCandidates = async () => {
    if (!analysisId || selectedSuggestionIds.size === 0 || isConfirming) {
      return;
    }

    const suggestionIds = [...selectedSuggestionIds];
    setIsConfirming(true);
    try {
      const result = await confirmDashboardPromotionSegmentSuggestions(query, promotionId, {
        analysis_id: analysisId,
        segment_ids: [],
        suggestion_ids: suggestionIds
      });
      setCandidates((current) =>
        current.map((candidate) =>
          selectedSuggestionIds.has(candidate.suggestion_id)
            ? { ...candidate, suggestion_status: "confirmed" }
            : candidate
        )
      );
      setSelectedSuggestionIds(new Set());
      appendMessage(
        "assistant",
        `${result.confirmed_segment_count}개의 세그먼트 후보를 확정했습니다. 광고 소재 생성 단계에서 바로 사용할 수 있습니다.`
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({
          queryKey: dashboardCampaignDetailQueryKey(query.projectId, query.selectedCampaignId)
        }),
        queryClient.invalidateQueries({
          queryKey: dashboardPromotionSegmentSuggestionsQueryKey(
            query.projectId,
            promotionId,
            analysisId
          )
        })
      ]);
    } catch {
      appendMessage(
        "assistant",
        "후보를 확정하지 못했습니다. 후보가 현재 분석 결과에 포함되어 있는지 확인한 뒤 다시 시도해 주세요."
      );
    } finally {
      setIsConfirming(false);
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
              행동 데이터를 분석하고 있어요
            </div>
          ) : null}
        </div>

        {candidates.length > 0 ? (
          <div className="mt-5 grid gap-3">
            {candidates.map((candidate) => (
              <AssistantCandidateItem
                candidate={candidate}
                checked={selectedSuggestionIds.has(candidate.suggestion_id)}
                key={candidate.suggestion_id}
                onCheckedChange={(checked) => {
                  setSelectedSuggestionIds((current) => {
                    const next = new Set(current);
                    if (checked) {
                      next.add(candidate.suggestion_id);
                    } else {
                      next.delete(candidate.suggestion_id);
                    }
                    return next;
                  });
                }}
              />
            ))}
            <Button
              disabled={selectedSuggestionIds.size === 0 || isConfirming}
              onClick={() => void confirmSelectedCandidates()}
              type="button"
            >
              {isConfirming
                ? "선택한 후보를 확정하고 있어요…"
                : `선택한 후보 확정 (${selectedSuggestionIds.size})`}
            </Button>
          </div>
        ) : null}
      </div>

      <div className="shrink-0 border-t bg-background p-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
          <Textarea
            aria-label="원하는 세그먼트 조건"
            className="max-h-32 min-h-20 resize-none"
            disabled={isLoading}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void submit();
              }
            }}
            placeholder="예: 최근 제주 숙소를 반복 검색했지만 예약하지 않은 고객"
            value={draft}
          />
          <Button
            aria-label="조건 보내기"
            disabled={!draft.trim() || isLoading}
            onClick={() => void submit()}
            size="icon"
            title="조건 보내기"
            type="button"
          >
            <Send aria-hidden="true" />
          </Button>
        </div>
      </div>
    </aside>
  );
}

function AssistantCandidateItem({
  candidate,
  checked,
  onCheckedChange
}: {
  candidate: DashboardPromotionSegmentSuggestion;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const displayCopy = candidate.display_copy;
  const isConfirmed = candidate.suggestion_status === "confirmed";
  const checkboxId = `assistant-segment-${candidate.suggestion_id}`;

  return (
    <div className="grid gap-3 rounded-md border p-3">
      <div className="flex min-w-0 items-start gap-3">
        <Checkbox
          aria-label={`${displayCopy?.title ?? candidate.segment_name} 선택`}
          checked={isConfirmed || checked}
          disabled={isConfirmed}
          id={checkboxId}
          onCheckedChange={(value) => onCheckedChange(value === true)}
        />
        <label className="grid min-w-0 flex-1 cursor-pointer gap-1" htmlFor={checkboxId}>
          <span className="font-semibold leading-5 [overflow-wrap:anywhere]">
            {displayCopy?.title ?? candidate.segment_name}
          </span>
          <span className="text-xs leading-5 text-muted-foreground">
            {displayCopy?.reason ?? "요청 조건과 행동 데이터가 맞는 고객군입니다."}
          </span>
        </label>
        {isConfirmed ? <Badge variant="secondary">확정됨</Badge> : null}
      </div>
      <div className="flex flex-wrap gap-1">
        {(displayCopy?.signal_chips ?? []).slice(0, 4).map((chip) => (
          <Badge className="text-[11px]" key={chip} variant="outline">
            {chip}
          </Badge>
        ))}
      </div>
      {displayCopy?.audience_summary ? (
        <p className="text-xs leading-5 text-muted-foreground">{displayCopy.audience_summary}</p>
      ) : null}
    </div>
  );
}

function clarificationMessage() {
  return "조건과 일치하는 고객군을 찾지 못했습니다. 목적지, 최근 행동 기간, 검색·상세 조회·예약 이탈 중 원하는 행동을 조금 더 구체적으로 알려주세요.";
}
