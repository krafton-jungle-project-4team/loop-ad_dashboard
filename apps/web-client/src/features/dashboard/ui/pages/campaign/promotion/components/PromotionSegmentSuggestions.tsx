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
import { Button } from "@loopad/ui/shadcn/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@loopad/ui/shadcn/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@loopad/ui/shadcn/dialog";
import { Field, FieldLabel } from "@loopad/ui/shadcn/field";
import { Input } from "@loopad/ui/shadcn/input";
import { Textarea } from "@loopad/ui/shadcn/textarea";
import { BarChart3, CheckCircle2, FileText, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
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

export function PromotionSegmentSuggestionPanel({
  archiveScopedSegmentIsPending,
  confirmIsPending,
  createScopedSegmentIsPending,
  decideIsPending,
  onArchiveScopedSegment,
  onConfirmSuggestions,
  onCreateScopedSegment,
  onDecideSuggestion,
  onStartAnalysis,
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
  onDecideSuggestion: (suggestionId: string, status: "accepted" | "dismissed") => void;
  onStartAnalysis: () => void;
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
          <CardTitle>추천 세그먼트 후보</CardTitle>
          <CardDescription>
            AI가 제안한 후보와 직접 추가한 후보를 확인합니다. 확정 시 최종 타겟 세그먼트로
            저장됩니다.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            disabled={promotionAnalysisIsPending}
            onClick={onStartAnalysis}
            type="button"
            variant="outline"
          >
            <BarChart3 className="mr-2 size-4" />
            {promotionAnalysisIsPending ? "분석 요청 중" : "AI 추천 요청"}
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
            {confirmIsPending ? "확정 중" : `후보 확정 (${confirmableCount})`}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        {scopedSegmentsIsLoading ? (
          <EmptyState message="직접 추가 세그먼트를 불러오는 중입니다." />
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
                              {segment.segment_name} 후보가 목록에서 삭제됩니다. 이 작업은 되돌릴 수
                              없습니다.
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
                      표본 {formatInteger(segment.sample_size)}명 · 비율{" "}
                      {formatInteger(segment.sample_ratio * 100)}%
                    </div>
                    <div className="line-clamp-2">
                      {(segment.natural_language_query ?? formatJsonObject(segment.rule_json)) ||
                        "조건 설명이 비어 있습니다."}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {suggestionsIsLoading ? <EmptyState message="추천 세그먼트를 불러오는 중입니다." /> : null}
        {suggestions.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {suggestions.map((suggestion) => {
              const isAccepted = suggestion.suggestion_status === "accepted";
              const isConfirmed = suggestion.suggestion_status === "confirmed";
              const isDismissed = suggestion.suggestion_status === "dismissed";
              const displayCopy = suggestion.display_copy;
              const rankLabel = `Rank ${formatInteger(suggestion.suggested_rank)}`;
              const rankRole = displayCopy?.rank_role;
              const performanceEstimate = displayCopy?.performance_estimate;
              const fallbackSummary = segmentAudienceSummary(
                suggestion.sample_size,
                suggestion.sample_ratio
              );
              return (
                <div
                  className={`flex min-h-full flex-col gap-4 rounded-md border p-4 ${
                    isAccepted ? "border-primary bg-accent" : "bg-white"
                  }`}
                  key={suggestion.suggestion_id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid min-w-0 gap-2">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-primary">
                        <span>{rankLabel}</span>
                        {rankRole ? (
                          <Badge
                            className="border-primary/20 bg-accent text-primary"
                            variant="outline"
                          >
                            {rankRole}
                          </Badge>
                        ) : null}
                      </div>
                      <h3 className="text-lg font-semibold leading-7 text-foreground">
                        {displayCopy?.title ?? suggestion.segment_name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {displayCopy
                          ? "AI 추천 세그먼트"
                          : `${suggestion.segment_source} · ${suggestion.suggestion_source}`}
                      </p>
                    </div>
                    <Badge variant={statusBadgeVariant(suggestion.suggestion_status)}>
                      {formatStatusLabel(suggestion.suggestion_status)}
                    </Badge>
                  </div>
                  <div className="grid gap-3 text-sm text-muted-foreground">
                    {performanceEstimate ? (
                      <div className="grid gap-3 rounded-lg border border-primary/15 bg-accent/50 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                        <div className="grid gap-1">
                          <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-primary">
                            <span>{performanceEstimate.label}</span>
                            {performanceEstimate.calibration_status === "not_backtested" ? (
                              <Badge className="text-[10px]" variant="outline">
                                백테스트 전
                              </Badge>
                            ) : null}
                          </div>
                          <div className="text-2xl font-semibold tabular-nums text-foreground">
                            {performanceEstimate.formatted}
                          </div>
                          {performanceEstimate.basis_label ? (
                            <div className="text-[11px] leading-4 text-muted-foreground">
                              {performanceEstimate.basis_label}
                            </div>
                          ) : null}
                        </div>
                        <div className="text-xs leading-5 text-muted-foreground sm:text-right">
                          {displayCopy?.audience_summary ?? fallbackSummary}
                        </div>
                      </div>
                    ) : (
                      <div>{displayCopy?.audience_summary ?? fallbackSummary}</div>
                    )}
                    {displayCopy?.signal_chips.length ? (
                      <div className="flex flex-wrap gap-1">
                        {displayCopy.signal_chips.map((chip) => (
                          <Badge className="text-[11px]" key={chip} variant="outline">
                            {chip}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                    <div className="line-clamp-2">
                      {displayCopy?.reason ||
                        formatJsonObject(suggestion.reason_json) ||
                        "추천 사유가 비어 있습니다."}
                    </div>
                    {displayCopy?.difference_summary ? (
                      <div className="rounded-lg border-l-2 border-primary bg-accent/50 px-3 py-2 text-xs leading-5 text-foreground">
                        {displayCopy.difference_summary}
                      </div>
                    ) : null}
                    {displayCopy?.action_hint ? (
                      <div className="rounded-md bg-muted px-3 py-2 text-xs leading-5 text-muted-foreground">
                        {displayCopy.action_hint}
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
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
                    <Button
                      disabled={decideIsPending || isAccepted || isConfirmed}
                      onClick={() => onDecideSuggestion(suggestion.suggestion_id, "accepted")}
                      size="sm"
                      type="button"
                    >
                      수락
                    </Button>
                    <Button
                      disabled={decideIsPending || isDismissed || isConfirmed}
                      onClick={() => onDecideSuggestion(suggestion.suggestion_id, "dismissed")}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <Trash2 className="mr-2 size-3.5" />
                      삭제
                    </Button>
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
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                Rank {formatInteger(suggestion?.suggested_rank ?? 0)}
              </Badge>
              {rankRole ? <Badge variant="outline">{rankRole}</Badge> : null}
              <Badge variant="outline">AI 추천 리포트</Badge>
            </div>
            <DialogTitle>{report.title}</DialogTitle>
            <DialogDescription>
              후보를 확정하기 전에 고객군의 성격과 추천 근거를 확인합니다.
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

export function SegmentDetailReportCard({
  suggestion
}: {
  suggestion: DashboardPromotionSegmentSuggestion | null;
}) {
  const report = suggestion?.ai_report ?? null;

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-base">세그먼트 리포트</CardTitle>
        <CardDescription>
          AI가 정리한 고객군 성격, 추천 근거, 활용 방법을 확인합니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {report ? (
          <SegmentSuggestionReportContent suggestion={suggestion} />
        ) : (
          <EmptyState message="이 세그먼트에 연결된 AI 추천 리포트가 없습니다." />
        )}
      </CardContent>
    </Card>
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

  if (!report) {
    return null;
  }

  return (
    <div className="grid gap-4">
      <section className="grid gap-2 rounded-lg border bg-[#fafafc] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-sm font-medium text-foreground">{report.summary}</div>
          {report.confidence_label ? (
            <Badge className="text-[11px]" variant="secondary">
              신뢰도 {formatConfidenceLabel(report.confidence_label)}
            </Badge>
          ) : null}
        </div>
        <div className="text-sm text-muted-foreground">
          {displayCopy?.audience_summary ??
            segmentAudienceSummary(suggestion?.sample_size ?? 0, suggestion?.sample_ratio ?? 0)}
        </div>
        {performanceEstimate ? (
          <div className="grid w-fit gap-1 rounded-lg border border-primary/15 bg-white px-3 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-primary">{performanceEstimate.label}</span>
              <span className="text-base font-semibold tabular-nums text-foreground">
                {performanceEstimate.formatted}
              </span>
              {performanceEstimate.calibration_status === "not_backtested" ? (
                <Badge className="text-[10px]" variant="outline">
                  백테스트 전 추정치
                </Badge>
              ) : null}
            </div>
            {performanceEstimate.basis_label ? (
              <span className="text-[11px] text-muted-foreground">
                {performanceEstimate.basis_label}
              </span>
            ) : null}
            {performanceEstimate.observed_value !== undefined ? (
              <span className="text-[11px] text-muted-foreground">
                동일 관찰 구간 사용자 성과율{" "}
                {formatPercentValue(performanceEstimate.observed_value)}
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
      <ReportSection items={report.difference_from_other_ranks} title="다른 Rank와의 차이" />
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

  const canSubmit = Boolean(form.segmentName.trim()) && !createIsPending;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>프로모션 세그먼트 후보 추가</DialogTitle>
          <DialogDescription>
            현재 프로모션에 종속되는 세그먼트 후보를 저장합니다. 최종 타겟 반영은 후보 확정 버튼에서
            처리합니다.
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
            <FieldLabel htmlFor="promotion-segment-natural-query">생성 이유/조건 설명</FieldLabel>
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
              className="font-mono text-xs"
              id="promotion-segment-rule-json"
              name="promotionSegmentRuleJson"
              onChange={(event) => setForm({ ...form, ruleJsonText: event.target.value })}
              value={form.ruleJsonText}
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="promotion-segment-sample-size">샘플 수</FieldLabel>
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
              <FieldLabel htmlFor="promotion-segment-eligible-size">모수</FieldLabel>
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
              <FieldLabel htmlFor="promotion-segment-sample-ratio">샘플 비율</FieldLabel>
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
                return;
              }
              onCreate({ ...form, ruleJsonText: JSON.stringify(ruleJson) });
              onOpenChange(false);
            }}
            type="button"
          >
            {createIsPending ? "저장 중" : "후보 저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
