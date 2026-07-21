import type {
  DashboardAudienceAllocationPreview,
  DashboardAudienceAllocationPreviewContext,
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
import { Field, FieldLabel } from "@loopad/ui/shadcn/field";
import { cn } from "@loopad/ui/shadcn/utils";
import { BarChart3, Bot, CheckCircle2, FileText, Users } from "lucide-react";
import { useState } from "react";
import { useDashboardAssistant } from "../../../../../layout/DashboardAssistantContext.js";
import { formatInteger } from "../../../../../model/dashboard-format.js";
import { formatStatusLabel } from "../../../../../model/dashboard-labels.js";
import { EmptyState } from "../../../../shared/EmptyState.js";
import {
  formatJsonObject,
  formatPercentValue,
  segmentAssistantSourceSuggestion,
  segmentAudienceSummary,
  statusBadgeVariant
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
  audienceAllocationPreviewContext,
  archiveScopedSegmentIsPending,
  confirmIsPending,
  confirmedSegmentCount,
  decideIsPending,
  onArchiveScopedSegment,
  onConfirmSuggestions,
  onDecideSuggestion,
  onOpenConfirmedSegments,
  onRecommendSegments,
  promotionAnalysisIsPending,
  scopedSegments,
  scopedSegmentsIsLoading,
  suggestions,
  suggestionsIsLoading
}: {
  audienceAllocationPreviewContext: DashboardAudienceAllocationPreviewContext | null;
  archiveScopedSegmentIsPending: boolean;
  confirmIsPending: boolean;
  confirmedSegmentCount: number;
  decideIsPending: boolean;
  onArchiveScopedSegment: (segmentId: string) => void;
  onConfirmSuggestions: (segmentIds: string[]) => void;
  onDecideSuggestion: (
    suggestionId: string,
    status: "suggested" | "accepted" | "dismissed"
  ) => void;
  onOpenConfirmedSegments: () => void;
  onRecommendSegments: () => void;
  promotionAnalysisIsPending: boolean;
  scopedSegments: DashboardPromotionScopedSegmentDefinition[];
  scopedSegmentsIsLoading: boolean;
  suggestions: DashboardPromotionSegmentSuggestion[];
  suggestionsIsLoading: boolean;
}) {
  const { openSegmentCandidateAssistant } = useDashboardAssistant();
  const [deleteTarget, setDeleteTarget] = useState<SegmentCandidateDeleteTarget | null>(null);
  const [selectedScopedSegmentIds, setSelectedScopedSegmentIds] = useState<string[]>([]);
  const [reportSuggestion, setReportSuggestion] =
    useState<DashboardPromotionSegmentSuggestion | null>(null);
  const visibleSuggestions = suggestions.filter(
    (suggestion) =>
      suggestion.suggestion_status === "suggested" || suggestion.suggestion_status === "accepted"
  );
  const acceptedCount = visibleSuggestions.filter(
    (suggestion) => suggestion.suggestion_status === "accepted"
  ).length;
  const confirmableCount = acceptedCount + selectedScopedSegmentIds.length;
  const candidateCount = visibleSuggestions.length + scopedSegments.length;
  const allocationPreview =
    selectedScopedSegmentIds.length > 0
      ? null
      : selectedAudienceAllocationPreview(audienceAllocationPreviewContext, visibleSuggestions);
  const allocatedUserCountBySegmentId = new Map(
    allocationPreview?.per_segment.map((segment) => [
      segment.segment_id,
      segment.allocated_user_count
    ]) ?? []
  );
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
    <Card className="shrink-0 shadow-none">
      <CardHeader className="grid shrink-0 gap-1 border-b sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="grid min-h-[3.25rem] gap-1.5">
          <div className="flex items-center gap-2">
            <CardTitle>고객군 후보</CardTitle>
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
            onClick={() => openSegmentCandidateAssistant()}
            size="sm"
            type="button"
            variant="outline"
          >
            <Bot data-icon="inline-start" />
            챗봇으로 직접 만들기
          </Button>
          <SegmentColumnDeleteMenu
            ariaLabel="고객군 후보 작업"
            disabled={archiveScopedSegmentIsPending || decideIsPending}
            emptyLabel="관리할 후보가 없어요"
            items={candidateMenuItems}
            label="고객군 후보"
            onDelete={setDeleteTarget}
          />
        </div>
      </CardHeader>
      <CardContent className="grid content-start gap-4">
        {scopedSegmentsIsLoading ? (
          <EmptyState message="직접 추가한 후보를 불러오는 중이에요." />
        ) : null}
        {scopedSegments.length > 0 ? (
          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">직접 추가 고객군 후보</h3>
              <Badge variant="secondary">{formatInteger(scopedSegments.length)}</Badge>
            </div>
            <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,17rem),1fr))]">
              {scopedSegments.map((segment) => {
                const isSelected = selectedScopedSegmentIds.includes(segment.segment_id);

                return (
                  <div
                    className={cn(
                      "grid gap-3 rounded-lg border bg-muted/30 p-4",
                      isSelected && "border-primary bg-accent/60 ring-2 ring-primary/30 shadow-sm"
                    )}
                    key={segment.segment_id}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="grid gap-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-semibold text-primary">
                            {segment.source}
                          </span>
                          {isSelected ? <Badge>선택됨</Badge> : null}
                        </div>
                        <h3 className="text-base font-semibold">{segment.segment_name}</h3>
                      </div>
                      <Field
                        className={buttonVariants({
                          className: "w-auto gap-2",
                          size: "sm",
                          variant: "outline"
                        })}
                        data-disabled={archiveScopedSegmentIsPending}
                        orientation="horizontal"
                      >
                        <Checkbox
                          aria-label={`${segment.segment_name} 선택`}
                          checked={selectedScopedSegmentIds.includes(segment.segment_id)}
                          disabled={archiveScopedSegmentIsPending}
                          id={`scoped-segment-acceptance-${segment.segment_id}`}
                          onCheckedChange={(checked) =>
                            setSelectedScopedSegmentIds((current) =>
                              checked === true
                                ? [...new Set([...current, segment.segment_id])]
                                : current.filter((segmentId) => segmentId !== segment.segment_id)
                            )
                          }
                        />
                        <FieldLabel
                          className="cursor-pointer font-medium"
                          htmlFor={`scoped-segment-acceptance-${segment.segment_id}`}
                        >
                          선택
                        </FieldLabel>
                      </Field>
                    </div>
                    <div className="grid gap-1">
                      <Badge className="w-fit" variant={statusBadgeVariant(segment.status)}>
                        {formatStatusLabel(segment.status)}
                      </Badge>
                    </div>
                    <div className="grid gap-2 text-sm leading-6 text-foreground/80">
                      <div>
                        평가 대상 {formatInteger(segment.sample_size)}명 · 비율{" "}
                        {formatInteger(segment.sample_ratio * 100)}%
                      </div>
                      <div className="[overflow-wrap:anywhere] [word-break:keep-all]">
                        {(segment.natural_language_query ?? formatJsonObject(segment.rule_json)) ||
                          "조건 설명이 없어요."}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
        {promotionAnalysisIsPending ? (
          <EmptyState
            loading
            message="분석이 끝나면 추천 후보를 보여드릴게요."
            title="고객군 후보를 찾고 있어요"
          />
        ) : suggestionsIsLoading ? (
          <EmptyState message="추천 후보를 불러오는 중이에요." />
        ) : null}
        {!promotionAnalysisIsPending && visibleSuggestions.length > 0 ? (
          <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleSuggestions.map((suggestion) => (
              <SegmentSuggestionCard
                allocatedUserCount={
                  suggestion.suggestion_status === "accepted"
                    ? (allocatedUserCountBySegmentId.get(suggestion.segment_id) ?? null)
                    : null
                }
                decideIsPending={decideIsPending}
                key={suggestion.suggestion_id}
                onDecideSuggestion={onDecideSuggestion}
                onEditSuggestion={() =>
                  openSegmentCandidateAssistant(segmentAssistantSourceSuggestion(suggestion))
                }
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
              <EmptyTitle>아직 고객군 후보가 없어요</EmptyTitle>
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
      </CardContent>
      <CardFooter className="flex shrink-0 flex-col gap-3 border-t bg-muted/20 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-foreground/75" aria-live="polite">
          후보 {formatInteger(candidateCount)}개 중{" "}
          <strong className="font-semibold text-foreground">
            {formatInteger(confirmableCount)}개 선택
          </strong>
        </p>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button
            className="w-full sm:w-auto"
            onClick={onOpenConfirmedSegments}
            size="sm"
            type="button"
            variant="outline"
          >
            <Users data-icon="inline-start" />
            확정 고객군 {formatInteger(confirmedSegmentCount)}개 보기
          </Button>
          <Button
            className="w-full sm:w-auto"
            disabled={
              confirmableCount === 0 ||
              confirmIsPending ||
              decideIsPending ||
              archiveScopedSegmentIsPending ||
              suggestionsIsLoading ||
              scopedSegmentsIsLoading ||
              promotionAnalysisIsPending
            }
            onClick={() => onConfirmSuggestions(selectedScopedSegmentIds)}
            size="sm"
            type="button"
          >
            <CheckCircle2 data-icon="inline-start" />
            {confirmIsPending ? "후보 확정 중…" : `선택한 후보 확정 (${confirmableCount})`}
          </Button>
        </div>
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
            <AlertDialogTitle>고객군 후보를 삭제할까요?</AlertDialogTitle>
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
              고객군 후보 삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function SegmentSuggestionCard({
  allocatedUserCount,
  decideIsPending,
  onDecideSuggestion,
  onEditSuggestion,
  onOpenReport,
  suggestion
}: {
  allocatedUserCount: number | null;
  decideIsPending: boolean;
  onDecideSuggestion: (
    suggestionId: string,
    status: "suggested" | "accepted" | "dismissed"
  ) => void;
  onEditSuggestion: () => void;
  onOpenReport: (suggestion: DashboardPromotionSegmentSuggestion) => void;
  suggestion: DashboardPromotionSegmentSuggestion;
}) {
  const isAccepted = suggestion.suggestion_status === "accepted";
  const displayCopy = suggestion.display_copy;
  const acceptanceId = `segment-suggestion-acceptance-${suggestion.suggestion_id}`;
  const strategyRole = displayCopy?.strategy_role ?? displayCopy?.rank_role;
  const performanceEstimate = displayCopy?.performance_estimate;
  const strengthSummary =
    displayCopy?.strength_summary ?? suggestion.ai_report?.candidate_strengths?.join(" ");
  const tradeoffSummary =
    displayCopy?.tradeoff_summary ??
    displayCopy?.recommendation_tier_reason ??
    suggestion.ai_report?.selection_considerations?.join(" ");
  const recommendationReason =
    displayCopy?.reason || formatJsonObject(suggestion.reason_json) || "추천 이유가 없어요.";
  const fallbackSummary = segmentAudienceSummary(suggestion.sample_size, suggestion.sample_ratio);

  return (
    <Card
      className={cn(
        "min-w-0 shadow-none",
        isAccepted && "border-primary bg-accent/60 ring-2 ring-primary/30 shadow-sm"
      )}
    >
      <CardHeader className="gap-3">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <Badge
              className="min-w-0 max-w-full whitespace-normal border-primary/20 bg-accent px-2 py-1 text-left leading-4 text-primary [word-break:keep-all]"
              variant="outline"
            >
              {strategyRole ?? "추천 전략 후보"}
            </Badge>
            {isAccepted ? <Badge>선택됨</Badge> : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              aria-label={`${displayCopy?.title ?? suggestion.segment_name} 참고해 고객군 만들기`}
              onClick={onEditSuggestion}
              size="icon-sm"
              title="이 추천을 참고해 고객군 만들기"
              type="button"
              variant="outline"
            >
              <Bot aria-hidden="true" />
            </Button>
            {suggestion.ai_report ? (
              <Button
                onClick={() => onOpenReport(suggestion)}
                size="sm"
                type="button"
                variant="outline"
              >
                <FileText data-icon="inline-start" />
                리포트
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
                aria-label={`${displayCopy?.title ?? suggestion.segment_name} 선택`}
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
              <FieldLabel className="cursor-pointer font-medium" htmlFor={acceptanceId}>
                선택
              </FieldLabel>
            </Field>
          </div>
        </div>
        <div className="grid min-w-0 gap-1">
          <CardTitle className="text-lg leading-7 font-semibold [overflow-wrap:anywhere] [word-break:keep-all]">
            {displayCopy?.title ?? suggestion.segment_name}
          </CardTitle>
          <CardDescription className="text-sm text-foreground/75">
            {displayCopy
              ? "AI 추천 고객군"
              : `${suggestion.segment_source} · ${suggestion.suggestion_source}`}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm text-foreground/90">
        {performanceEstimate ? <SegmentPerformanceSummary estimate={performanceEstimate} /> : null}
        <SegmentAudienceStats
          audience={displayCopy?.audience}
          fallbackSummary={displayCopy?.audience_summary ?? fallbackSummary}
        />
        {isAccepted && allocatedUserCount !== null ? (
          <div className="flex items-center justify-between gap-3 rounded-md border border-primary/20 bg-accent/50 px-3 py-2">
            <span className="text-xs font-medium text-primary">
              현재 선택 기준 최종 배정 사용자
            </span>
            <strong className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
              {formatInteger(allocatedUserCount)}명
            </strong>
          </div>
        ) : null}
        {displayCopy?.signal_chips.length ? (
          <div className="flex flex-wrap gap-1.5">
            {displayCopy.signal_chips.map((chip) => (
              <Badge
                className="h-auto max-w-full whitespace-normal py-1 text-xs leading-5 [overflow-wrap:anywhere] [word-break:keep-all]"
                key={chip}
                variant="outline"
              >
                {chip}
              </Badge>
            ))}
          </div>
        ) : null}
        <div className="grid gap-1">
          <span className="text-xs font-semibold text-foreground">추천 이유</span>
          <p
            className="line-clamp-2 min-h-12 leading-6 [overflow-wrap:anywhere] [word-break:keep-all]"
            title={recommendationReason}
          >
            {recommendationReason}
          </p>
        </div>
        <SegmentCandidateGuidance
          strengthSummary={strengthSummary}
          tradeoffSummary={tradeoffSummary}
        />
      </CardContent>
    </Card>
  );
}

function SegmentPerformanceSummary({ estimate }: { estimate: SegmentPerformanceEstimate }) {
  const isAvailable = estimate.availability !== "unavailable" && Boolean(estimate.formatted);

  return (
    <div className="grid min-w-0 gap-2 rounded-md bg-accent/60 p-3">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-primary">{estimate.label}</span>
        {estimate.confidence_label ? (
          <Badge className="shrink-0 text-xs" variant="outline">
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
      <div className="grid min-w-0 gap-0.5 text-xs leading-5 text-foreground/75" data-report-muted>
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
    return (
      <p className="text-sm leading-6 text-foreground/75" data-report-muted>
        {fallbackSummary}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-3 divide-x rounded-md bg-muted/60 py-2 text-center">
      <AudienceStat label="분석 가능 사용자" value={audience.total_eligible_user_count} />
      <AudienceStat label="행동 조건 부합" value={audience.matching_user_count} />
      <AudienceStat label="단독 대상 사용자" value={audience.selected_user_count} />
    </div>
  );
}

export function selectedAudienceAllocationPreview(
  context: DashboardAudienceAllocationPreviewContext | null,
  suggestions: DashboardPromotionSegmentSuggestion[]
): DashboardAudienceAllocationPreview | null {
  if (!context) {
    return null;
  }

  const selectedSegmentIds = suggestions
    .filter((suggestion) => suggestion.suggestion_status === "accepted")
    .map((suggestion) => suggestion.segment_id)
    .filter((segmentId, index, segmentIds) => segmentIds.indexOf(segmentId) === index)
    .sort((left, right) => left.localeCompare(right));
  if (selectedSegmentIds.length === 0) {
    return null;
  }

  const belongsToCurrentBatch = suggestions.every(
    (suggestion) => suggestion.analysis_id === context.candidate_batch_analysis_id
  );
  if (!belongsToCurrentBatch) {
    return null;
  }

  return (
    context.allocation_previews.find((preview) => {
      const previewSegmentIds = [...preview.selected_segment_ids].sort((left, right) =>
        left.localeCompare(right)
      );
      return (
        preview.candidate_batch_analysis_id === context.candidate_batch_analysis_id &&
        preview.preview_version === context.preview_version &&
        preview.exclusion_revision === context.exclusion_revision &&
        previewSegmentIds.length === selectedSegmentIds.length &&
        previewSegmentIds.every((segmentId, index) => segmentId === selectedSegmentIds[index])
      );
    }) ?? null
  );
}

function AudienceStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="grid min-w-0 gap-0.5 px-2">
      <span
        className="text-xs leading-4 text-foreground/70 [word-break:keep-all]"
        data-report-muted
      >
        {label}
      </span>
      <strong className="text-base font-semibold tabular-nums text-foreground">
        {formatInteger(value)}명
      </strong>
    </div>
  );
}

function SegmentCandidateGuidance({
  strengthSummary,
  tradeoffSummary
}: {
  strengthSummary: string | undefined;
  tradeoffSummary: string | undefined;
}) {
  if (!strengthSummary && !tradeoffSummary) {
    return null;
  }

  return (
    <div className="grid gap-3 border-l-2 border-primary bg-accent/40 px-3 py-3 text-sm leading-6 text-foreground/90">
      {strengthSummary ? (
        <div className="grid gap-1">
          <span className="font-semibold text-foreground">후보 강점</span>
          <p className="[overflow-wrap:anywhere] [word-break:keep-all]">{strengthSummary}</p>
        </div>
      ) : null}
      {tradeoffSummary ? (
        <div className="grid gap-1">
          <span className="font-semibold text-foreground">선택 시 고려사항</span>
          <p className="[overflow-wrap:anywhere] [word-break:keep-all]">{tradeoffSummary}</p>
        </div>
      ) : null}
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
            <DialogDescription className="text-foreground/85">
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
    <div className="grid gap-4 [&_[data-report-muted]]:text-foreground/85">
      <section className="grid gap-2 rounded-lg border bg-muted/45 p-4">
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
              <span className="text-[11px] text-foreground/85">
                {formatObservedPerformance(
                  performanceEstimate,
                  displayCopy?.audience?.selected_user_count
                )}
              </span>
            ) : null}
            {performanceEstimate.confidence_reason ? (
              <span className="text-[11px] text-foreground/85">
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
        <p className="text-sm leading-6 text-foreground">{report.action_hint}</p>
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
      <ul className="grid gap-2 text-sm leading-6 text-foreground">
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
