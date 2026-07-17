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
  AlertDialogTitle
} from "@loopad/ui/shadcn/alert-dialog";
import { Badge } from "@loopad/ui/shadcn/badge";
import { Button, buttonVariants } from "@loopad/ui/shadcn/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@loopad/ui/shadcn/card";
import { Checkbox } from "@loopad/ui/shadcn/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@loopad/ui/shadcn/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from "@loopad/ui/shadcn/empty";
import { Field, FieldError, FieldLabel } from "@loopad/ui/shadcn/field";
import { Input } from "@loopad/ui/shadcn/input";
import { Textarea } from "@loopad/ui/shadcn/textarea";
import { cn } from "@loopad/ui/shadcn/utils";
import { BarChart3, CheckCircle2, FileText, Plus } from "lucide-react";
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
import {
  SegmentColumnDeleteMenu,
  type SegmentColumnDeleteMenuItem
} from "./SegmentColumnDeleteMenu.js";

type SegmentSuggestionDisplayCopy = NonNullable<
  DashboardPromotionSegmentSuggestion["display_copy"]
>;
type SegmentPerformanceEstimate = NonNullable<SegmentSuggestionDisplayCopy["performance_estimate"]>;
type SegmentAudience = NonNullable<SegmentSuggestionDisplayCopy["audience"]>;

type SegmentCandidateDeleteTarget =
  | { id: string; kind: "scoped"; name: string }
  | { id: string; kind: "suggestion"; name: string };

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
  const [deleteTarget, setDeleteTarget] = useState<SegmentCandidateDeleteTarget | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [reportSuggestion, setReportSuggestion] =
    useState<DashboardPromotionSegmentSuggestion | null>(null);
  const visibleSuggestions = suggestions.filter(
    (suggestion) =>
      suggestion.suggestion_status === "suggested" || suggestion.suggestion_status === "accepted"
  );
  const acceptedCount = visibleSuggestions.filter(
    (suggestion) => suggestion.suggestion_status === "accepted"
  ).length;
  const confirmableCount = acceptedCount + scopedSegments.length;
  const candidateCount = visibleSuggestions.length + scopedSegments.length;
  const candidateMenuItems: SegmentColumnDeleteMenuItem<SegmentCandidateDeleteTarget>[] = [
    ...scopedSegments.map((segment) => ({
      id: `scoped:${segment.segment_id}`,
      label: segment.segment_name,
      value: { id: segment.segment_id, kind: "scoped" as const, name: segment.segment_name }
    })),
    ...visibleSuggestions.map((suggestion) => ({
      id: `suggestion:${suggestion.suggestion_id}`,
      label: suggestion.display_copy?.title ?? suggestion.segment_name,
      value: {
        id: suggestion.suggestion_id,
        kind: "suggestion" as const,
        name: suggestion.display_copy?.title ?? suggestion.segment_name
      }
    }))
  ];

  return (
    <Card className="min-h-0 overflow-hidden shadow-none xl:h-full">
      <CardHeader className="grid shrink-0 gap-1 border-b sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="grid min-h-[3.25rem] gap-1.5">
          <div className="flex items-center gap-2">
            <CardTitle>세그먼트 후보</CardTitle>
            <Badge variant="secondary">{formatInteger(candidateCount)}</Badge>
          </div>
          <CardDescription>사용할 고객군을 비교하고 선택해 주세요.</CardDescription>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {candidateCount > 0 || promotionAnalysisIsPending ? (
            <Button
              disabled={promotionAnalysisIsPending}
              onClick={onRecommendSegments}
              size="sm"
              type="button"
            >
              <BarChart3 data-icon="inline-start" />
              {promotionAnalysisIsPending ? "후보를 찾고 있어요…" : "AI로 후보 찾기"}
            </Button>
          ) : null}
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            size="sm"
            type="button"
            variant="outline"
          >
            <Plus data-icon="inline-start" />
            직접 추가
          </Button>
          <SegmentColumnDeleteMenu
            ariaLabel="세그먼트 후보 작업"
            disabled={archiveScopedSegmentIsPending || decideIsPending}
            emptyLabel="관리할 후보가 없어요"
            items={candidateMenuItems}
            label="세그먼트 후보"
            onDelete={setDeleteTarget}
          />
        </div>
      </CardHeader>
      <CardContent className="grid content-start gap-4 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:overscroll-contain xl:pr-2 xl:[scrollbar-width:thin]">
        {scopedSegmentsIsLoading ? (
          <EmptyState message="직접 추가한 후보를 불러오는 중이에요." />
        ) : null}
        {scopedSegments.length > 0 ? (
          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">직접 추가 세그먼트 후보</h3>
              <Badge variant="secondary">{formatInteger(scopedSegments.length)}</Badge>
            </div>
            <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,17rem),1fr))]">
              {scopedSegments.map((segment) => (
                <div
                  className="grid gap-3 rounded-lg border bg-muted/30 p-4"
                  key={segment.segment_id}
                >
                  <div className="grid gap-1">
                    <div className="text-xs font-semibold text-primary">{segment.source}</div>
                    <h3 className="text-base font-semibold">{segment.segment_name}</h3>
                    <Badge className="w-fit" variant={statusBadgeVariant(segment.status)}>
                      {formatStatusLabel(segment.status)}
                    </Badge>
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
        {promotionAnalysisIsPending ? (
          <EmptyState
            loading
            message="분석이 끝나면 추천 후보를 보여드릴게요."
            title="세그먼트 후보를 찾고 있어요"
          />
        ) : suggestionsIsLoading ? (
          <EmptyState message="추천 후보를 불러오는 중이에요." />
        ) : null}
        {!promotionAnalysisIsPending && visibleSuggestions.length > 0 ? (
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,17rem),1fr))]">
            {visibleSuggestions.map((suggestion) => (
              <SegmentSuggestionCard
                decideIsPending={decideIsPending}
                key={suggestion.suggestion_id}
                onDecideSuggestion={onDecideSuggestion}
                onOpenReport={setReportSuggestion}
                suggestion={suggestion}
              />
            ))}
          </div>
        ) : null}
        {!promotionAnalysisIsPending &&
        !suggestionsIsLoading &&
        !scopedSegmentsIsLoading &&
        candidateCount === 0 ? (
          <Empty className="min-h-52 border bg-muted/20">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BarChart3 aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>아직 세그먼트 후보가 없어요</EmptyTitle>
              <EmptyDescription>
                고객 데이터를 분석해 후보를 찾거나 직접 추가해 주세요.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={onRecommendSegments} type="button">
                <BarChart3 data-icon="inline-start" />
                AI로 후보 찾기
              </Button>
            </EmptyContent>
          </Empty>
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
      <CardFooter className="shrink-0 justify-between gap-3 bg-background">
        <span className="text-xs text-muted-foreground">
          {confirmableCount > 0
            ? `${formatInteger(confirmableCount)}개 선택됨`
            : "확정할 후보를 선택해 주세요"}
        </span>
        <Button
          disabled={confirmableCount === 0 || confirmIsPending}
          onClick={onConfirmSuggestions}
          type="button"
        >
          {confirmIsPending ? "후보 확정 중…" : `선택한 후보 확정 (${confirmableCount})`}
        </Button>
      </CardFooter>
      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        open={Boolean(deleteTarget)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>세그먼트 후보를 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.name} 후보가 목록에서 사라지고 되돌릴 수 없어요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              disabled={!deleteTarget || archiveScopedSegmentIsPending || decideIsPending}
              onClick={() => {
                if (!deleteTarget) {
                  return;
                }
                if (deleteTarget.kind === "scoped") {
                  onArchiveScopedSegment(deleteTarget.id);
                } else {
                  onDecideSuggestion(deleteTarget.id, "dismissed");
                }
                setDeleteTarget(null);
              }}
              variant="destructive"
            >
              세그먼트 후보 삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function SegmentSuggestionCard({
  decideIsPending,
  onDecideSuggestion,
  onOpenReport,
  suggestion
}: {
  decideIsPending: boolean;
  onDecideSuggestion: (
    suggestionId: string,
    status: "suggested" | "accepted" | "dismissed"
  ) => void;
  onOpenReport: (suggestion: DashboardPromotionSegmentSuggestion) => void;
  suggestion: DashboardPromotionSegmentSuggestion;
}) {
  const isAccepted = suggestion.suggestion_status === "accepted";
  const displayCopy = suggestion.display_copy;
  const acceptanceId = `segment-suggestion-acceptance-${suggestion.suggestion_id}`;
  const strategyRole = displayCopy?.strategy_role ?? displayCopy?.rank_role;
  const performanceEstimate = displayCopy?.performance_estimate;
  const fallbackSummary = segmentAudienceSummary(suggestion.sample_size, suggestion.sample_ratio);

  return (
    <Card
      className={cn(
        "min-h-full min-w-0 shadow-none",
        isAccepted && "border-primary bg-accent/40 ring-2 ring-primary/10"
      )}
      size="sm"
    >
      <CardHeader className="gap-3">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <Badge
            className="min-w-0 max-w-full whitespace-normal border-primary/20 bg-accent px-2 py-1 text-left leading-4 text-primary [word-break:keep-all]"
            variant="outline"
          >
            {strategyRole ?? "추천 전략 후보"}
          </Badge>
          {isAccepted ? (
            <Badge className="shrink-0" variant="default">
              선택됨
            </Badge>
          ) : null}
        </div>
        <div className="grid min-w-0 gap-1">
          <CardTitle className="text-base leading-6 font-semibold [overflow-wrap:anywhere] [word-break:keep-all]">
            {displayCopy?.title ?? suggestion.segment_name}
          </CardTitle>
          <CardDescription className="text-xs">
            {displayCopy
              ? "AI 추천 세그먼트"
              : `${suggestion.segment_source} · ${suggestion.suggestion_source}`}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm text-muted-foreground">
        {performanceEstimate ? <SegmentPerformanceSummary estimate={performanceEstimate} /> : null}
        <SegmentAudienceStats
          audience={displayCopy?.audience}
          fallbackSummary={displayCopy?.audience_summary ?? fallbackSummary}
        />
        <div className="grid gap-1">
          <span className="text-[11px] font-medium text-foreground">추천 이유</span>
          <p className="line-clamp-2 leading-5">
            {displayCopy?.reason ||
              formatJsonObject(suggestion.reason_json) ||
              "추천 이유가 없어요."}
          </p>
        </div>
      </CardContent>
      <CardFooter className="mt-auto flex-wrap justify-between gap-2 bg-background">
        {suggestion.ai_report ? (
          <Button
            onClick={() => onOpenReport(suggestion)}
            size="sm"
            type="button"
            variant="outline"
          >
            <FileText data-icon="inline-start" />
            추천 리포트
          </Button>
        ) : null}
        <Field
          className={buttonVariants({
            className: "w-auto gap-2",
            size: "sm",
            variant: "outline"
          })}
          data-disabled={decideIsPending}
          orientation="horizontal"
        >
          <Checkbox
            aria-label={`${displayCopy?.title ?? suggestion.segment_name} 후보 선택`}
            checked={isAccepted}
            disabled={decideIsPending}
            id={acceptanceId}
            onCheckedChange={(checked) =>
              onDecideSuggestion(
                suggestion.suggestion_id,
                checked === true ? "accepted" : "suggested"
              )
            }
          />
          <FieldLabel className="cursor-pointer text-[0.8rem] font-medium" htmlFor={acceptanceId}>
            후보 선택
          </FieldLabel>
        </Field>
      </CardFooter>
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
      <AudienceStat label="분석 가능 사용자" value={audience.total_eligible_user_count} />
      <AudienceStat label="행동 조건 부합" value={audience.matching_user_count} />
      <AudienceStat label="대표 표본" value={audience.selected_user_count} />
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

function SegmentSuggestionReportDialog({
  onOpenChange,
  suggestion
}: {
  onOpenChange: (open: boolean) => void;
  suggestion: DashboardPromotionSegmentSuggestion | null;
}) {
  const report = suggestion?.ai_report ?? null;
  const displayCopy = suggestion?.display_copy;
  const strategyRole = displayCopy?.strategy_role ?? displayCopy?.rank_role;

  return (
    <Dialog onOpenChange={onOpenChange} open={Boolean(report)}>
      {report ? (
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{strategyRole ?? "추천 전략 후보"}</Badge>
              <Badge variant="outline">AI 추천 보고서</Badge>
            </div>
            <DialogTitle>{report.title}</DialogTitle>
            <DialogDescription>
              후보를 확정하기 전에 고객 특성과 추천 이유를 확인해 봐요.
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
      <ReportSection
        items={
          report.candidate_strengths ??
          (displayCopy?.strength_summary ? [displayCopy.strength_summary] : undefined)
        }
        title="이 후보의 강점"
      />
      <ReportSection
        items={
          report.selection_considerations ??
          (displayCopy?.tradeoff_summary
            ? [displayCopy.tradeoff_summary]
            : displayCopy?.recommendation_tier_reason
              ? [displayCopy.recommendation_tier_reason]
              : undefined)
        }
        title="선택 시 고려사항"
      />
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
      ? ` · 대표 표본 ${formatInteger(selectedUserCount)}명 기준`
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
            {createIsPending ? "세그먼트 후보 추가 중…" : "세그먼트 후보 추가"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
