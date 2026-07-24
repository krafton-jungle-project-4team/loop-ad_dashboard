import type {
  DashboardSegmentAssistantRefinementKey,
  DashboardSegmentAssistantResponse,
  DashboardSegmentAssistantSourceContext,
  DashboardSegmentAssistantSourceSuggestion
} from "@loopad/shared";
import { Badge } from "@loopad/ui/shadcn/badge";
import { Button } from "@loopad/ui/shadcn/button";
import { Spinner } from "@loopad/ui/shadcn/spinner";
import { Textarea } from "@loopad/ui/shadcn/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { Bot, Database, Lightbulb, Pencil, Plus, Send, X } from "lucide-react";
import { useEffect } from "react";
import {
  assistDashboardPromotionSegment,
  createDashboardPromotionScopedSegmentDefinition,
  fetchDashboardPromotionSegmentAssistantSourceContext
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
  const {
    draft,
    isLoading,
    isSaved,
    isSaving,
    isSourceContextLoading,
    messages,
    result,
    sourceContext,
    sourceSuggestion
  } = session;
  const projectId = query.projectId;
  const sourceSuggestionId = sourceSuggestion?.suggestion_id;

  useEffect(() => {
    if (!sourceSuggestionId) {
      return;
    }
    if (sourceContext?.suggestion_id === sourceSuggestionId) {
      return;
    }

    const controller = new AbortController();
    updateSession((current) => ({ ...current, isSourceContextLoading: true }));
    void fetchDashboardPromotionSegmentAssistantSourceContext(
      { projectId },
      promotionId,
      sourceSuggestionId,
      controller.signal
    )
      .then((context) => {
        updateSession((current) =>
          current.sourceSuggestion?.suggestion_id === context.suggestion_id
            ? { ...current, isSourceContextLoading: false, sourceContext: context }
            : current
        );
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        updateSession((current) => ({
          ...current,
          isSourceContextLoading: false,
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
      });
    return () => controller.abort();
  }, [promotionId, projectId, sourceContext?.suggestion_id, sourceSuggestionId, updateSession]);

  const submit = async (
    messageOverride?: string,
    refinementKey?: DashboardSegmentAssistantRefinementKey
  ) => {
    const userMessage = (messageOverride ?? draft).trim();
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
        conversation,
        source_suggestion: sourceSuggestion ?? undefined,
        refinement_key: refinementKey,
        previous_query_preview_id: result?.preview?.query_preview_id
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
        createdSegmentAnalysisId: null,
        createdSegmentId: segment.segment_id,
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
      className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-card shadow-[-8px_0_24px_rgb(54_45_89_/_0.1)]"
      id="loopad-dashboard-assistant-panel"
    >
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-muted/55 px-4">
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
          {sourceSuggestion ? (
            <SourceSuggestionContext
              context={sourceContext}
              disabled={isLoading}
              isLoading={isSourceContextLoading}
              onPromptSelect={(prompt, refinementKey) => void submit(prompt, refinementKey)}
              source={sourceSuggestion}
            />
          ) : null}
          {messages.map((message) => {
            if (message.role === "assistant" && message.result?.preview) {
              const isCurrentResult =
                result?.preview?.query_preview_id === message.result.preview.query_preview_id;
              return (
                <SegmentAssistantResult
                  isSaved={isCurrentResult && isSaved}
                  isSaving={isCurrentResult && isSaving}
                  key={message.id}
                  onAdjustmentSelect={(prompt) => void submit(prompt)}
                  onSave={() => void saveSegment()}
                  result={message.result}
                  showSaveAction={isCurrentResult}
                  suggestionsDisabled={isLoading || !isCurrentResult}
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
  onAdjustmentSelect,
  onSave,
  result,
  showSaveAction,
  suggestionsDisabled
}: {
  isSaved: boolean;
  isSaving: boolean;
  onAdjustmentSelect: (prompt: string) => void;
  onSave: () => void;
  result: DashboardSegmentAssistantResponse;
  showSaveAction: boolean;
  suggestionsDisabled: boolean;
}) {
  const preview = result.preview;
  if (!preview) {
    return null;
  }

  const isSaveable = preview.sample_size_status === "valid" && preview.sample_size > 0;
  const baseAudienceSize = result.base_audience?.sample_size ?? null;
  const ratio =
    baseAudienceSize && baseAudienceSize > 0
      ? preview.sample_size / baseAudienceSize
      : preview.sample_ratio;
  const ratioPercent = Math.min(100, Math.max(0, ratio * 100));
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
          <p className="text-xs font-medium text-primary">
            {result.base_audience ? "추가 조건에 맞는 고객" : "조건에 맞는 고객"}
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {preview.sample_size.toLocaleString()}명
          </p>
        </div>
        <div
          aria-label={`${result.base_audience ? "기준 추천 고객군" : "분석 가능 사용자"} 중 ${ratioPercent.toFixed(2)}%`}
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
            {result.base_audience ? (
              <ResultRow
                label="기준 AI 추천 고객군"
                value={`${result.base_audience.sample_size.toLocaleString()}명`}
              />
            ) : null}
            <ResultRow
              label={result.base_audience ? "추가 조건 부합" : "행동 조건 부합"}
              value={`${preview.sample_size.toLocaleString()}명`}
            />
            <ResultRow
              label={result.base_audience ? "기준 고객군 대비" : "전체 대비"}
              value={`${ratioPercent.toFixed(2)}%`}
            />
            <ResultRow
              label="고객군 운영 기준"
              value={`${result.minimum_sample_size.toLocaleString()}명 이상`}
            />
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

      {preview.sample_size_status === "too_small" ? (
        <SegmentConditionDiagnostics result={result} />
      ) : null}

      {result.suggested_adjustments.length > 0 ? (
        <div className="grid gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Lightbulb aria-hidden="true" className="size-3.5 text-primary" />
            운영 기준을 충족하기 위한 조정안
          </div>
          <div className="grid gap-2">
            {result.suggested_adjustments.map((adjustment) => (
              <Button
                className="h-auto min-h-9 justify-between whitespace-normal px-3 py-2 text-left"
                disabled={suggestionsDisabled}
                key={`${adjustment.kind}:${adjustment.label}`}
                onClick={() => onAdjustmentSelect(adjustment.prompt)}
                size="sm"
                type="button"
                variant="outline"
              >
                <span className="[overflow-wrap:anywhere]">{adjustment.label}</span>
                {adjustment.estimated_sample_size !== null ? (
                  <Badge className="ml-2 shrink-0" variant="secondary">
                    약 {adjustment.estimated_sample_size.toLocaleString()}명
                  </Badge>
                ) : null}
              </Button>
            ))}
          </div>
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
          현재 결과는 고객군 운영 기준을 충족하지 않아 추가할 수 없습니다. 위 조정안을 선택해 다시
          계산해 주세요.
        </p>
      ) : null}
    </section>
  );
}

function SourceSuggestionContext({
  context,
  disabled,
  isLoading,
  onPromptSelect,
  source
}: {
  context: DashboardSegmentAssistantSourceContext | null;
  disabled: boolean;
  isLoading: boolean;
  onPromptSelect: (prompt: string, refinementKey: DashboardSegmentAssistantRefinementKey) => void;
  source: DashboardSegmentAssistantSourceSuggestion;
}) {
  const title = context?.title ?? source.title;
  const strategyRole = context?.strategy_role ?? source.strategy_role;
  const sampleSize = context?.sample_size ?? source.sample_size;
  const referenceLabels = context?.reference_labels ?? source.reference_labels ?? [];

  return (
    <section className="grid gap-3 border-l-2 border-primary bg-primary/5 px-3 py-3">
      <div className="flex items-start gap-2">
        <Pencil aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-primary">참고 중인 AI 추천 고객군</p>
          <h3 className="mt-0.5 text-sm font-semibold [overflow-wrap:anywhere]">{title}</h3>
          <p className="mt-1 text-xs text-foreground/70">
            {strategyRole ?? "추천 전략 후보"} · 추천 대상 {sampleSize.toLocaleString()}명
          </p>
        </div>
      </div>
      {context?.base_condition_labels.length ? (
        <div className="grid gap-1.5">
          <p className="text-[11px] font-medium text-foreground/70">추천 기준</p>
          <div className="flex flex-wrap gap-1.5">
            {context.base_condition_labels.map((label) => (
              <Badge key={label} variant="secondary">
                {label}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}
      {referenceLabels.length ? (
        <div className="grid gap-1.5">
          <p className="text-[11px] font-medium text-foreground/70">추천 참고 신호</p>
          <div className="flex flex-wrap gap-1.5">
            {referenceLabels.map((label) => (
              <Badge key={label} variant="outline">
                {label}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}
      <div className="grid gap-1.5">
        <p className="text-[11px] font-medium text-foreground/70">추가해 볼 조건</p>
        {isLoading ? (
          <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
            <Spinner className="size-3.5" />
            추천 고객군을 분석하고 있어요
          </div>
        ) : null}
        {!isLoading && context?.suggested_refinements.length === 0 ? (
          <p className="py-1 text-xs text-muted-foreground">
            추가로 구분되는 행동 조건이 없습니다.
          </p>
        ) : null}
        {context?.suggested_refinements.map((item) => (
          <Button
            className="h-auto justify-between whitespace-normal px-2.5 py-2 text-left text-xs"
            disabled={disabled}
            key={item.refinement_key}
            onClick={() => onPromptSelect(item.prompt, item.refinement_key)}
            size="sm"
            type="button"
            variant="outline"
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <Plus aria-hidden="true" className="shrink-0" />
              <span className="[overflow-wrap:anywhere]">{item.label}</span>
            </span>
            <Badge className="ml-2 shrink-0" variant="secondary">
              {item.estimated_user_count.toLocaleString()}명
            </Badge>
          </Button>
        ))}
      </div>
    </section>
  );
}

function SegmentConditionDiagnostics({ result }: { result: DashboardSegmentAssistantResponse }) {
  if (result.condition_diagnostics.length === 0) {
    return (
      <div className="rounded-md bg-muted px-3 py-2 text-xs leading-5 text-foreground/75">
        현재 결과는 {result.minimum_sample_size.toLocaleString()}명 운영 기준보다 작습니다. 조회
        기간을 넓히거나 조건을 완화해 주세요.
      </div>
    );
  }

  return (
    <div className="grid gap-2 rounded-md bg-muted/60 p-3">
      <p className="text-xs font-semibold">조건별 인원 제한 진단</p>
      <div className="grid gap-1.5">
        {result.condition_diagnostics.map((diagnostic) => (
          <div
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-xs"
            key={diagnostic.condition_label}
          >
            <span className="min-w-0 [overflow-wrap:anywhere]">
              {diagnostic.condition_label}
              {diagnostic.is_bottleneck ? (
                <Badge className="ml-1.5" variant="destructive">
                  가장 큰 제한
                </Badge>
              ) : null}
            </span>
            <span className="text-right tabular-nums text-foreground/70">
              제외 시 {diagnostic.sample_size_without_condition.toLocaleString()}명
              {diagnostic.recovered_user_count > 0
                ? ` (+${diagnostic.recovered_user_count.toLocaleString()})`
                : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
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
