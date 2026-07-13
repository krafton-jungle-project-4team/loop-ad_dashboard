import type {
  DashboardPromotionScopedSegmentDefinition,
  DashboardPromotionSegmentSuggestion
} from "@loopad/shared";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@loopad/ui/shadcn/alert-dialog";
import { Badge } from "@loopad/ui/shadcn/badge";
import { Button, buttonVariants } from "@loopad/ui/shadcn/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@loopad/ui/shadcn/card";
import { Checkbox } from "@loopad/ui/shadcn/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@loopad/ui/shadcn/dialog";
import { Field, FieldError, FieldLabel } from "@loopad/ui/shadcn/field";
import { Input } from "@loopad/ui/shadcn/input";
import { Textarea } from "@loopad/ui/shadcn/textarea";
import { BarChart3, CheckCircle2, FileText, Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { formatInteger } from "../../../../../model/dashboard-format.js";
import { formatStatusLabel } from "../../../../../model/dashboard-labels.js";
import { EmptyState } from "../../../../shared/EmptyState.js";
import {
  createEmptyPromotionSegmentFormState,
  formatJsonObject,
  formatPercentValue,
  parseJsonObject,
  segmentAudienceSummary,
  statusBadgeVariant,
  type PromotionSegmentCreateFormState
} from "../promotionUtils.js";

type SegmentSuggestionDisplayCopy = NonNullable<
  DashboardPromotionSegmentSuggestion["display_copy"]
>;
type SegmentPerformanceEstimate = NonNullable<SegmentSuggestionDisplayCopy["performance_estimate"]>;
type SegmentAudience = NonNullable<SegmentSuggestionDisplayCopy["audience"]>;

export function PromotionSegmentSuggestionPanel({
  archiveScopedSegmentIsPending,
  confirmIsPending,
  createScopedSegmentIsPending,
  decideIsPending,
  onArchiveScopedSegment,
  onConfirmSuggestions,
  onCreateScopedSegment,
  onDecideSuggestion,
  onRecommendSegments,
  promotionAnalysisIsPending,
  scopedSegments,
  scopedSegmentsIsLoading,
  suggestions,
  suggestionsIsLoading
}: {
  archiveScopedSegmentIsPending: boolean;
  confirmIsPending: boolean;
  createScopedSegmentIsPending: boolean;
  decideIsPending: boolean;
  onArchiveScopedSegment: (segmentId: string) => void;
  onConfirmSuggestions: () => void;
  onCreateScopedSegment: (form: PromotionSegmentCreateFormState) => void;
  onDecideSuggestion: (
    suggestionId: string,
    status: "suggested" | "accepted" | "dismissed"
  ) => void;
  onRecommendSegments: () => void;
  promotionAnalysisIsPending: boolean;
  scopedSegments: DashboardPromotionScopedSegmentDefinition[];
  scopedSegmentsIsLoading: boolean;
  suggestions: DashboardPromotionSegmentSuggestion[];
  suggestionsIsLoading: boolean;
}) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [reportSuggestion, setReportSuggestion] =
    useState<DashboardPromotionSegmentSuggestion | null>(null);
  const acceptedCount = suggestions.filter(
    (suggestion) => suggestion.suggestion_status === "accepted"
  ).length;
  const confirmableCount = acceptedCount + scopedSegments.length;

  return (
    <Card className="h-full shadow-none">
      <CardHeader className="grid gap-4">
        <div className="grid gap-1">
          <CardTitle>세그먼트 후보</CardTitle>
          <CardDescription>
            AI가 제안한 후보와 직접 추가한 후보를 확인해요. 확정하면 최종 세그먼트로 저장돼요.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            disabled={promotionAnalysisIsPending}
            onClick={onRecommendSegments}
            type="button"
            variant="outline"
          >
            <BarChart3 className="mr-2 size-4" />
            {promotionAnalysisIsPending ? "추천하는 중" : "AI 추천 받기"}
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)} type="button" variant="outline">
            <Plus className="mr-2 size-4" />
            직접 추가
          </Button>
          <Button
            disabled={confirmableCount === 0 || confirmIsPending}
            onClick={onConfirmSuggestions}
            type="button"
          >
            {confirmIsPending ? "확정 중" : `선택한 후보 확정 (${confirmableCount})`}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        {scopedSegmentsIsLoading ? (
          <EmptyState message="직접 추가한 후보를 불러오는 중이에요." />
        ) : null}
        {scopedSegments.length > 0 ? (
          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">직접 추가 세그먼트 후보</h3>
              <Badge variant="secondary">{formatInteger(scopedSegments.length)}</Badge>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {scopedSegments.map((segment) => (
                <div
                  className="grid gap-3 rounded-lg border bg-[#fafafc] p-4"
                  key={segment.segment_id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid gap-1">
                      <div className="text-xs font-semibold text-primary">{segment.source}</div>
                      <h3 className="text-base font-semibold">{segment.segment_name}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={statusBadgeVariant(segment.status)}>
                        {formatStatusLabel(segment.status)}
                      </Badge>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            aria-label={`${segment.segment_name} 직접 추가 후보 삭제`}
                            disabled={archiveScopedSegmentIsPending}
                            size="icon"
                            type="button"
                            variant="ghost"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>직접 추가 후보를 삭제할까요?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {segment.segment_name} 후보가 목록에서 사라지고 되돌릴 수 없어요.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>취소</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onArchiveScopedSegment(segment.segment_id)}
                              variant="destructive"
                            >
                              삭제
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  <div className="grid gap-2 text-sm text-muted-foreground">
                    <div>
                      평가 대상 {formatInteger(segment.sample_size)}명 · 비율{" "}
                      {formatInteger(segment.sample_ratio * 100)}%
                    </div>
                    <div className="line-clamp-2">
                      {(segment.natural_language_query ?? formatJsonObject(segment.rule_json)) ||
                        "조건 설명이 없어요."}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {suggestionsIsLoading ? <EmptyState message="추천 후보를 불러오는 중이에요." /> : null}
        {suggestions.length > 0 ? (
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,22rem),1fr))]">
            {suggestions.map((suggestion) => {
              const isAccepted = suggestion.suggestion_status === "accepted";
              const isConfirmed = suggestion.suggestion_status === "confirmed";
              const isDismissed = suggestion.suggestion_status === "dismissed";
              const displayCopy = suggestion.display_copy;
              const acceptanceId = `segment-suggestion-acceptance-${suggestion.suggestion_id}`;
              const rankLabel = `${formatInteger(suggestion.suggested_rank)}위`;
              const rankRole = displayCopy?.rank_role;
              const performanceEstimate = displayCopy?.performance_estimate;
              const fallbackSummary = segmentAudienceSummary(
                suggestion.sample_size,
                suggestion.sample_ratio
              );
              return (
                <div
                  className={`flex min-h-full min-w-0 flex-col gap-4 overflow-hidden rounded-md border p-5 ${
                    isAccepted ? "border-primary bg-accent/60" : "bg-background"
                  }`}
                  key={suggestion.suggestion_id}
                >
                  <div className="grid min-w-0 gap-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold text-primary">{rankLabel}</span>
                      <Badge
                        className="shrink-0"
                        variant={statusBadgeVariant(suggestion.suggestion_status)}
                      >
                        {formatStatusLabel(suggestion.suggestion_status)}
                      </Badge>
                    </div>
                    {rankRole ? (
                      <Badge
                        className="w-fit max-w-full whitespace-normal border-primary/20 bg-accent px-2 py-1 text-left leading-4 text-primary [word-break:keep-all]"
                        variant="outline"
                      >
                        {rankRole}
                      </Badge>
                    ) : null}
                    <div className="grid min-w-0 gap-1">
                      <h3 className="text-base font-semibold leading-6 text-foreground [overflow-wrap:anywhere] [word-break:keep-all]">
                        {displayCopy?.title ?? suggestion.segment_name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {displayCopy
                          ? "AI 추천 세그먼트"
                          : `${suggestion.segment_source} · ${suggestion.suggestion_source}`}
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-3 text-sm text-muted-foreground">
                    {performanceEstimate ? (
                      <SegmentPerformanceSummary estimate={performanceEstimate} />
                    ) : null}
                    <SegmentAudienceStats
                      audience={displayCopy?.audience}
                      fallbackSummary={displayCopy?.audience_summary ?? fallbackSummary}
                    />
                    {displayCopy?.signal_chips.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {displayCopy.signal_chips.map((chip) => (
                          <Badge
                            className="max-w-full whitespace-normal text-[11px]"
                            key={chip}
                            variant="outline"
                          >
                            {chip}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                    <div className="grid gap-1">
                      <span className="text-[11px] font-medium text-foreground">추천 이유</span>
                      <p className="line-clamp-2 leading-5">
                        {displayCopy?.reason ||
                          formatJsonObject(suggestion.reason_json) ||
                          "추천 이유가 없어요."}
                      </p>
                    </div>
                    {displayCopy ? <SegmentRankDifference displayCopy={displayCopy} /> : null}
                  </div>
                  <div className="mt-auto flex flex-wrap items-center gap-2 border-t pt-3">
                    {suggestion.ai_report ? (
                      <Button
                        onClick={() => setReportSuggestion(suggestion)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        <FileText className="mr-2 size-3.5" />
                        리포트
                      </Button>
                    ) : null}
                    <Field
                      className={buttonVariants({
                        className: "w-auto gap-2",
                        size: "sm",
                        variant: "outline"
                      })}
                      data-disabled={decideIsPending || isConfirmed || isDismissed}
                      orientation="horizontal"
                    >
                      <Checkbox
                        aria-label={`${displayCopy?.title ?? suggestion.segment_name} 후보 선택`}
                        checked={isAccepted}
                        disabled={decideIsPending || isConfirmed || isDismissed}
                        id={acceptanceId}
                        onCheckedChange={(checked) =>
                          onDecideSuggestion(
                            suggestion.suggestion_id,
                            checked === true ? "accepted" : "suggested"
                          )
                        }
                      />
                      <FieldLabel
                        className="cursor-pointer text-[0.8rem] font-medium"
                        htmlFor={acceptanceId}
                      >
                        후보 선택
                      </FieldLabel>
                    </Field>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          disabled={decideIsPending || isDismissed || isConfirmed}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <Trash2 className="mr-2 size-3.5" />
                          세그먼트 후보 삭제
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>세그먼트 후보를 삭제할까요?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {displayCopy?.title ?? suggestion.segment_name} 후보가 목록에서 사라지고
                            되돌릴 수 없어요.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>취소</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() =>
                              onDecideSuggestion(suggestion.suggestion_id, "dismissed")
                            }
                            variant="destructive"
                          >
                            세그먼트 후보 삭제
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
        <SegmentSuggestionReportDialog
          onOpenChange={(open) => {
            if (!open) {
              setReportSuggestion(null);
            }
          }}
          suggestion={reportSuggestion}
        />
        {isCreateDialogOpen ? (
          <PromotionSegmentCreateDialog
            createIsPending={createScopedSegmentIsPending}
            onCreate={onCreateScopedSegment}
            onOpenChange={setIsCreateDialogOpen}
            open
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

function SegmentPerformanceSummary({ estimate }: { estimate: SegmentPerformanceEstimate }) {
  const isAvailable = estimate.availability !== "unavailable" && Boolean(estimate.formatted);

  return (
    <div className="grid min-w-0 gap-2 rounded-md bg-accent/60 p-3">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-primary">{estimate.label}</span>
        {estimate.confidence_label ? (
          <Badge className="shrink-0 text-[10px]" variant="outline">
            신뢰도 {formatConfidenceLabel(estimate.confidence_label)}
          </Badge>
        ) : null}
      </div>
      {isAvailable ? (
        <strong className="text-2xl font-semibold tabular-nums text-foreground">
          {estimate.formatted}
        </strong>
      ) : (
        <strong className="text-sm font-semibold text-foreground">지금은 계산할 수 없어요</strong>
      )}
      <div className="grid min-w-0 gap-0.5 text-[11px] leading-4 text-muted-foreground">
        {estimate.window_label ? <span>{estimate.window_label}</span> : null}
        {isAvailable && estimate.basis_label ? <span>{estimate.basis_label}</span> : null}
        {!isAvailable && estimate.unavailable_reason ? (
          <span>{estimate.unavailable_reason}</span>
        ) : null}
      </div>
    </div>
  );
}

function SegmentAudienceStats({
  audience,
  fallbackSummary
}: {
  audience: SegmentAudience | undefined;
  fallbackSummary: string;
}) {
  if (!audience) {
    return <p className="text-xs leading-5 text-muted-foreground">{fallbackSummary}</p>;
  }

  return (
    <div className="grid grid-cols-3 divide-x rounded-md bg-muted/60 py-2 text-center">
      <AudienceStat label="전체" value={audience.total_eligible_user_count} />
      <AudienceStat label="조건 일치" value={audience.matching_user_count} />
      <AudienceStat label="추천 대상" value={audience.selected_user_count} />
    </div>
  );
}

function AudienceStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="grid min-w-0 gap-0.5 px-2">
      <span className="text-[10px] leading-4 text-muted-foreground [word-break:keep-all]">
        {label}
      </span>
      <strong className="text-sm font-semibold tabular-nums text-foreground">
        {formatInteger(value)}명
      </strong>
    </div>
  );
}

function SegmentRankDifference({ displayCopy }: { displayCopy: SegmentSuggestionDisplayCopy }) {
  const comparison = displayCopy.rank_comparison;
  const summary = comparison?.summary ?? displayCopy.difference_summary;
  if (!summary) {
    return null;
  }

  return (
    <div className="grid gap-1 border-l-2 border-primary bg-accent/40 px-3 py-2 text-xs leading-5 text-foreground">
      <span className="font-medium">
        {comparison ? `${formatInteger(comparison.reference_rank)}위와 비교` : "후보 비교"}
      </span>
      <p className="line-clamp-2">{summary}</p>
    </div>
  );
}

function SegmentSuggestionReportDialog({
  onOpenChange,
  suggestion
}: {
  onOpenChange: (open: boolean) => void;
  suggestion: DashboardPromotionSegmentSuggestion | null;
}) {
  const report = suggestion?.ai_report ?? null;
  const rankRole = suggestion?.display_copy?.rank_role;

  return (
    <Dialog onOpenChange={onOpenChange} open={Boolean(report)}>
      {report ? (
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{formatInteger(suggestion?.suggested_rank ?? 0)}위</Badge>
              {rankRole ? (
                <Badge
                  className="max-w-full whitespace-normal [word-break:keep-all]"
                  variant="outline"
                >
                  {rankRole}
                </Badge>
              ) : null}
              <Badge variant="outline">AI 추천 보고서</Badge>
            </div>
            <DialogTitle>{report.title}</DialogTitle>
            <DialogDescription>
              후보를 확정하기 전에 고객 특성과 추천 이유를 확인해 보세요.
            </DialogDescription>
          </DialogHeader>
          <SegmentSuggestionReportContent suggestion={suggestion} />
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)} type="button">
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

function SegmentSuggestionReportContent({
  suggestion
}: {
  suggestion: DashboardPromotionSegmentSuggestion | null;
}) {
  const report = suggestion?.ai_report ?? null;
  const displayCopy = suggestion?.display_copy ?? null;
  const performanceEstimate = displayCopy?.performance_estimate;
  const confidenceLabel = performanceEstimate?.confidence_label ?? report?.confidence_label;

  if (!report) {
    return null;
  }

  return (
    <div className="grid gap-4">
      <section className="grid gap-2 rounded-lg border bg-[#fafafc] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-sm font-medium text-foreground">{report.summary}</div>
          {confidenceLabel ? (
            <Badge className="text-[11px]" variant="secondary">
              신뢰도 {formatConfidenceLabel(confidenceLabel)}
            </Badge>
          ) : null}
        </div>
        <SegmentAudienceStats
          audience={displayCopy?.audience}
          fallbackSummary={
            displayCopy?.audience_summary ??
            segmentAudienceSummary(suggestion?.sample_size ?? 0, suggestion?.sample_ratio ?? 0)
          }
        />
        {performanceEstimate ? (
          <div className="grid gap-2">
            <SegmentPerformanceSummary estimate={performanceEstimate} />
            {performanceEstimate.observed_value !== undefined ? (
              <span className="text-[11px] text-muted-foreground">
                {formatObservedPerformance(
                  performanceEstimate,
                  displayCopy?.audience?.selected_user_count
                )}
              </span>
            ) : null}
            {performanceEstimate.confidence_reason ? (
              <span className="text-[11px] text-muted-foreground">
                {performanceEstimate.confidence_reason}
              </span>
            ) : null}
          </div>
        ) : null}
        {displayCopy?.signal_chips.length ? (
          <div className="flex flex-wrap gap-1">
            {displayCopy.signal_chips.map((chip) => (
              <Badge className="text-[11px]" key={chip} variant="outline">
                {chip}
              </Badge>
            ))}
          </div>
        ) : null}
      </section>
      <ReportSection items={report.promotion_interpretation} title="프로모션 해석" />
      <ReportSection items={report.why_recommended} title="추천한 이유" />
      <ReportSection items={report.evidence} title="확인된 행동 근거" />
      <ReportSection items={report.difference_from_other_ranks} title="다른 순위와의 차이" />
      <section className="grid gap-2 rounded-md border p-4">
        <h4 className="text-sm font-semibold">활용 방법</h4>
        <p className="text-sm leading-6 text-muted-foreground">{report.action_hint}</p>
      </section>
      <section className="grid gap-2 rounded-md border border-[#fee2e2] bg-[#fff7f7] p-4">
        <h4 className="text-sm font-semibold text-[#b42318]">주의할 점</h4>
        <p className="text-sm leading-6 text-[#7a271a]">{report.caution}</p>
      </section>
    </div>
  );
}

function ReportSection({ items, title }: { items: string[] | undefined; title: string }) {
  if (!items?.length) {
    return null;
  }

  return (
    <section className="grid gap-2 rounded-md border p-4">
      <h4 className="text-sm font-semibold">{title}</h4>
      <ul className="grid gap-2 text-sm leading-6 text-muted-foreground">
        {items.map((item, index) => (
          <li className="flex gap-2" key={`${title}-${index}-${item}`}>
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatConfidenceLabel(value: "high" | "medium" | "low") {
  if (value === "high") {
    return "높음";
  }
  if (value === "medium") {
    return "보통";
  }
  return "낮음";
}

function formatObservedPerformance(
  estimate: SegmentPerformanceEstimate,
  selectedUserCount: number | undefined
) {
  const metricLabel =
    estimate.metric === "booking_conversion_rate"
      ? "예약 완료율"
      : estimate.metric === "inflow_rate"
        ? "연결 페이지 도달률"
        : estimate.metric === "funnel_step_rate"
          ? "예약 시작률"
          : "목표 행동률";
  const sampleLabel =
    selectedUserCount !== undefined
      ? ` · 추천 대상 ${formatInteger(selectedUserCount)}명 기준`
      : "";

  return `최근 관찰 ${metricLabel} ${formatPercentValue(estimate.observed_value ?? 0)}${sampleLabel}`;
}

function PromotionSegmentCreateDialog({
  createIsPending,
  onCreate,
  onOpenChange,
  open
}: {
  createIsPending: boolean;
  onCreate: (form: PromotionSegmentCreateFormState) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const [form, setForm] = useState<PromotionSegmentCreateFormState>(
    createEmptyPromotionSegmentFormState()
  );
  const [ruleJsonError, setRuleJsonError] = useState<string | null>(null);
  const ruleJsonRef = useRef<HTMLTextAreaElement>(null);

  const canSubmit = Boolean(form.segmentName.trim()) && !createIsPending;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>세그먼트 후보 추가</DialogTitle>
          <DialogDescription>
            이 프로모션에서 사용할 세그먼트 후보를 저장해요. 저장한 뒤 후보 확정 버튼을 눌러 최종
            세그먼트로 바꿀 수 있어요.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field>
            <FieldLabel htmlFor="promotion-segment-name">세그먼트 이름</FieldLabel>
            <Input
              autoComplete="off"
              id="promotion-segment-name"
              name="promotionSegmentName"
              onChange={(event) => setForm({ ...form, segmentName: event.target.value })}
              placeholder="VIP 장기 미구매 고객"
              value={form.segmentName}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="promotion-segment-natural-query">만든 이유와 조건</FieldLabel>
            <Textarea
              id="promotion-segment-natural-query"
              name="promotionSegmentNaturalLanguageQuery"
              onChange={(event) => setForm({ ...form, naturalLanguageQuery: event.target.value })}
              placeholder="최근 30일 내 상세 조회는 했지만 예약 전환이 없는 고객"
              value={form.naturalLanguageQuery}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="promotion-segment-rule-json">조건 JSON</FieldLabel>
            <Textarea
              aria-describedby={ruleJsonError ? "promotion-segment-rule-json-error" : undefined}
              aria-invalid={Boolean(ruleJsonError)}
              className="font-mono text-xs"
              id="promotion-segment-rule-json"
              name="promotionSegmentRuleJson"
              onChange={(event) => {
                setForm({ ...form, ruleJsonText: event.target.value });
                if (ruleJsonError) {
                  setRuleJsonError(null);
                }
              }}
              ref={ruleJsonRef}
              value={form.ruleJsonText}
            />
            {ruleJsonError ? (
              <FieldError id="promotion-segment-rule-json-error">{ruleJsonError}</FieldError>
            ) : null}
          </Field>
          <div className="grid gap-4 md:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="promotion-segment-sample-size">대상 수</FieldLabel>
              <Input
                id="promotion-segment-sample-size"
                inputMode="numeric"
                min="0"
                name="promotionSegmentSampleSize"
                onChange={(event) => setForm({ ...form, sampleSize: event.target.value })}
                type="number"
                value={form.sampleSize}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="promotion-segment-eligible-size">전체 대상 수</FieldLabel>
              <Input
                id="promotion-segment-eligible-size"
                inputMode="numeric"
                min="0"
                name="promotionSegmentEligibleSize"
                onChange={(event) =>
                  setForm({ ...form, totalEligibleUserCount: event.target.value })
                }
                type="number"
                value={form.totalEligibleUserCount}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="promotion-segment-sample-ratio">대상 비율</FieldLabel>
              <Input
                id="promotion-segment-sample-ratio"
                inputMode="decimal"
                min="0"
                name="promotionSegmentSampleRatio"
                onChange={(event) => setForm({ ...form, sampleRatio: event.target.value })}
                step="0.001"
                type="number"
                value={form.sampleRatio}
              />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} type="button" variant="ghost">
            취소
          </Button>
          <Button
            disabled={!canSubmit}
            onClick={() => {
              const ruleJson = parseJsonObject(form.ruleJsonText);
              if (!ruleJson) {
                setRuleJsonError(
                  '조건 JSON을 읽을 수 없어요. { "source": "manual_rule" }처럼 객체 형태로 입력해 주세요.'
                );
                ruleJsonRef.current?.focus();
                return;
              }
              onCreate({ ...form, ruleJsonText: JSON.stringify(ruleJson) });
              onOpenChange(false);
            }}
            type="button"
          >
            {createIsPending ? "추가하는 중" : "후보 추가하기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
