import type { DashboardSegmentAssistantResponse } from "@loopad/shared";
import { Badge } from "@loopad/ui/shadcn/badge";
import { Button } from "@loopad/ui/shadcn/button";
import { Spinner } from "@loopad/ui/shadcn/spinner";
import { Textarea } from "@loopad/ui/shadcn/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { Bot, Database, Plus, Send, X } from "lucide-react";
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
  segmentAssistantFailureMessage,
  segmentAssistantResponseMessage,
  type SegmentAssistantSession,
  type SegmentAssistantSessionUpdater
} from "../model/segment-candidate-assistant.js";

export function SegmentCandidateAssistantPanel({
  onClose,
  promotionId,
  query,
  session,
  updateSession
}: {
  onClose: () => void;
  promotionId: string;
  query: DashboardQuery;
  session: SegmentAssistantSession;
  updateSession: (updater: SegmentAssistantSessionUpdater) => void;
}) {
  const queryClient = useQueryClient();
  const { draft, isLoading, isSaved, isSaving, messages, result } = session;

  const submit = async () => {
    const userMessage = draft.trim();
    if (!userMessage || isLoading || !promotionId) {
      return;
    }

    const conversation = messages.slice(-12).map((message) => ({
      role: message.role,
      content: message.text
    }));
    updateSession((current) => ({
      ...current,
      draft: "",
      isLoading: true,
      isSaved: false,
      messages: [
        ...current.messages,
        { id: current.nextMessageId, role: "user", text: userMessage }
      ],
      nextMessageId: current.nextMessageId + 1,
      result: null
    }));

    try {
      const response = await assistDashboardPromotionSegment(query, promotionId, {
        message: userMessage,
        conversation
      });
      updateSession((current) => ({
        ...current,
        isLoading: false,
        messages: [
          ...current.messages,
          segmentAssistantResponseMessage(current.nextMessageId, response)
        ],
        nextMessageId: current.nextMessageId + 1,
        result: response
      }));
    } catch (error) {
      updateSession((current) => ({
        ...current,
        isLoading: false,
        messages: [
          ...current.messages,
          {
            id: current.nextMessageId,
            role: "assistant",
            text: segmentAssistantFailureMessage(error)
          }
        ],
        nextMessageId: current.nextMessageId + 1,
        result: null
      }));
    }
  };

  const saveSegment = async () => {
    if (!result?.preview || !result.segment_name || isSaving || isSaved) {
      return;
    }

    updateSession((current) => ({ ...current, isSaving: true }));
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
      updateSession((current) => ({
        ...current,
        isSaved: true,
        isSaving: false,
        messages: [
          ...current.messages,
          {
            id: current.nextMessageId,
            role: "assistant",
            text: `'${segment.segment_name}' 고객군을 추가했습니다. 후보 목록에서 선택해 확정할 수 있습니다.`
          }
        ],
        nextMessageId: current.nextMessageId + 1
      }));
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
      updateSession((current) => ({
        ...current,
        isSaving: false,
        messages: [
          ...current.messages,
          {
            id: current.nextMessageId,
            role: "assistant",
            text: segmentAssistantFailureMessage(error)
          }
        ],
        nextMessageId: current.nextMessageId + 1
      }));
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
          고객군 후보 도우미
        </h2>
        <Button
          aria-label="고객군 후보 도우미 닫기"
          className="ml-auto"
          onClick={onClose}
          size="icon-sm"
          title="고객군 후보 도우미 닫기"
          type="button"
          variant="ghost"
        >
          <X aria-hidden="true" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="grid gap-3">
          {messages.map((message) => {
            if (message.role === "assistant" && message.result?.preview) {
              const isCurrentResult =
                result?.preview?.query_preview_id === message.result.preview.query_preview_id;
              return (
                <SegmentAssistantResult
                  isSaved={isCurrentResult && isSaved}
                  isSaving={isCurrentResult && isSaving}
                  key={message.id}
                  onSave={() => void saveSegment()}
                  result={message.result}
                  showSaveAction={isCurrentResult}
                />
              );
            }

            return (
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
            );
          })}
          {isLoading ? (
            <div className="flex w-fit items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
              <Spinner className="size-4" />
              요청을 이해하고 행동 데이터를 조회하고 있어요
            </div>
          ) : null}
        </div>
      </div>

      <div className="shrink-0 border-t bg-background p-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
          <Textarea
            aria-label="고객 데이터 질문 또는 고객군 조건"
            className="max-h-32 min-h-20 resize-none"
            disabled={isLoading}
            onChange={(event) =>
              updateSession((current) => ({ ...current, draft: event.target.value }))
            }
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
  result,
  showSaveAction
}: {
  isSaved: boolean;
  isSaving: boolean;
  onSave: () => void;
  result: DashboardSegmentAssistantResponse;
  showSaveAction: boolean;
}) {
  const preview = result.preview;
  if (!preview) {
    return null;
  }

  const isSaveable = preview.sample_size_status === "valid" && preview.sample_size > 0;
  const ratioPercent = Math.min(100, Math.max(0, preview.sample_ratio * 100));
  return (
    <section className="grid gap-3 rounded-md border p-3" aria-label="고객군 조건 조회 결과">
      <div className="flex items-center gap-2">
        <Database aria-hidden="true" className="size-4 text-primary" />
        <h3 className="text-sm font-semibold">
          {result.action === "audience_query" ? "고객 데이터 조회" : "고객군 미리보기"}
        </h3>
        <Badge className="ml-auto" variant="secondary">
          최근 {result.lookback_days}일
        </Badge>
      </div>

      <div className="grid gap-3 rounded-md bg-primary/5 p-3">
        <div>
          <p className="text-xs font-medium text-primary">조건에 맞는 고객</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {preview.sample_size.toLocaleString()}명
          </p>
        </div>
        <div
          aria-label={`분석 가능 사용자 중 ${ratioPercent.toFixed(2)}%`}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={ratioPercent}
          className="h-2 overflow-hidden rounded-full bg-primary/10"
          role="progressbar"
        >
          <div className="h-full rounded-full bg-primary" style={{ width: `${ratioPercent}%` }} />
        </div>
      </div>

      <div className="overflow-hidden rounded-md border">
        <table className="w-full table-fixed text-sm">
          <caption className="sr-only">고객 데이터 조회 결과</caption>
          <tbody className="divide-y">
            <ResultRow label="조회 기간" value={`최근 ${result.lookback_days}일`} />
            <ResultRow
              label="분석 가능 사용자"
              value={`${preview.total_eligible_user_count.toLocaleString()}명`}
            />
            <ResultRow label="행동 조건 부합" value={`${preview.sample_size.toLocaleString()}명`} />
            <ResultRow label="전체 대비" value={`${ratioPercent.toFixed(2)}%`} />
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {result.condition_labels.map((label) => (
          <Badge key={label} variant="outline">
            {label}
          </Badge>
        ))}
      </div>

      {result.segment_name ? (
        <div className="grid gap-1 text-sm">
          <span className="text-xs text-muted-foreground">고객군 이름</span>
          <span className="font-medium [overflow-wrap:anywhere]">{result.segment_name}</span>
        </div>
      ) : null}

      {showSaveAction ? (
        <Button disabled={!isSaveable || isSaving || isSaved} onClick={onSave} type="button">
          <Plus aria-hidden="true" />
          {isSaved ? "추가됨" : isSaving ? "추가하고 있어요…" : "이 조건으로 고객군 추가"}
        </Button>
      ) : null}
      {showSaveAction && !isSaveable && preview.sample_size > 0 ? (
        <p className="text-xs leading-5 text-muted-foreground">
          현재 조건의 고객 수가 고객군 운영 기준보다 적습니다. 기간이나 조건을 조정해 주세요.
        </p>
      ) : null}
    </section>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <th className="w-1/2 bg-muted/40 px-3 py-2 text-left text-xs font-medium text-muted-foreground">
        {label}
      </th>
      <td className="px-3 py-2 text-right font-semibold tabular-nums">{value}</td>
    </tr>
  );
}
