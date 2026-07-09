import type {
  DashboardCampaignPromotion,
  DashboardCampaignDetail,
  DashboardCampaignSegment,
  DashboardEvaluatePromotionRunResult,
  DashboardPromotionScopedSegmentDefinition,
  DashboardSegmentDetail,
  DashboardPromotionSegmentSuggestion,
  DashboardStartPromotionGenerationResult
} from "@loopad/shared";
import { Alert, AlertDescription, AlertTitle } from "@loopad/ui/shadcn/alert";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@loopad/ui/shadcn/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@loopad/ui/shadcn/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@loopad/ui/shadcn/table";
import { Textarea } from "@loopad/ui/shadcn/textarea";
import { BarChart3, CheckCircle2, FileText, ImageIcon, Plus, Send, Target, Trash2, Users, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { formatInteger } from "../../../../../model/dashboard-format.js";
import { formatActionLabel, formatBasisLabel, formatChannelLabel, formatMetricLabel, formatStatusLabel } from "../../../../../model/dashboard-labels.js";
import { EmptyState } from "../../../../shared/EmptyState.js";
import {
  campaignSegmentDisplayCopy,
  createEmptyPromotionSegmentFormState,
  formatGoalValue,
  formatJsonObject,
  formatPercentValue,
  hasPendingOnsiteBannerImage,
  latestSegmentPerSegmentId,
  mutationErrorMessage,
  parseJsonObject,
  promotionSegmentCreateFormToRequest,
  segmentAudienceSummary,
  segmentLoopCount,
  statusBadgeVariant,
  contentCandidateMessage,
  contentCandidateTitle,
  type PromotionSegmentCreateFormState,
  type PromotionWorkspaceTab
} from "../promotionUtils.js";

const promotionWorkspaceTabLabels: Record<PromotionWorkspaceTab, string> = {
  overview: "프로모션 개요",
  segments: "세그먼트 추천/확정",
  "segment-detail": "세그먼트 맞춤 광고 생성"
};

export function PromotionChromeTabs({
  onAdd,
  onClosePromotion,
  onSelectPromotion,
  openPromotions,
  selectedPromotionId
}: {
  onAdd: () => void;
  onClosePromotion: (promotionId: string) => void;
  onSelectPromotion: (promotionId: string) => void;
  openPromotions: DashboardCampaignPromotion[];
  selectedPromotionId: string;
}) {
  return (
    <div className="flex min-h-14 items-end gap-1 border-b bg-[#edf3ff] px-5 pt-3">
      <Button
        aria-label="프로모션 탭 추가"
        className="mb-0 h-11 w-14 rounded-b-none rounded-t-md border-b-0 bg-white text-[#1d1d1f] shadow-none hover:bg-white"
        onClick={onAdd}
        size="icon"
        type="button"
        variant="outline"
      >
        <Plus className="size-4" />
      </Button>
      {openPromotions.map((promotion) => {
        const isSelected = promotion.promotion_id === selectedPromotionId;
        return (
          <button
            className={`mb-0 flex h-11 max-w-[260px] items-center gap-2 rounded-b-none rounded-t-md border px-3 text-left text-sm ${
              isSelected
                ? "border-b-white bg-white font-semibold text-[#2f24d9]"
                : "border-transparent bg-transparent text-muted-foreground hover:bg-white/60"
            }`}
            key={promotion.promotion_id}
            onClick={() => onSelectPromotion(promotion.promotion_id)}
            type="button"
          >
            <span className="truncate">{promotion.marketing_theme}</span>
            <span
              className="grid size-5 place-items-center rounded-sm text-muted-foreground hover:bg-muted"
              onClick={(event) => {
                event.stopPropagation();
                onClosePromotion(promotion.promotion_id);
              }}
              role="button"
              tabIndex={0}
            >
              <X className="size-3.5" />
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function PromotionEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <section className="grid min-h-[620px] content-between gap-8">
      <div className="grid place-items-center gap-6 pt-14 text-center">
        <div className="relative h-40 w-40">
          <div className="absolute left-9 top-10 size-28 rotate-3 rounded-[28px] border bg-[#dfe9ff]" />
          <div className="absolute right-3 top-6 grid size-12 place-items-center rounded-md bg-emerald-300 text-emerald-900">
            <Target className="size-6" />
          </div>
          <div className="absolute bottom-4 left-3 grid size-14 -rotate-12 place-items-center rounded-md bg-rose-100 text-rose-600">
            <BarChart3 className="size-6" />
          </div>
        </div>
        <div className="grid max-w-xl gap-3">
          <h2 className="text-2xl font-semibold tracking-tight text-[#102033]">
            현재 프로모션이 없습니다.
          </h2>
          <p className="text-sm leading-7 text-muted-foreground">
            새 프로모션을 생성하면 현재 캠페인의 프로모션 탭으로 열립니다. 진행 중인 캠페인의 상세
            지표와 워크플로우를 한눈에 관리할 수 있습니다.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button className="gap-2 bg-[#3927d9] px-8" onClick={onAdd} type="button">
            <Plus className="size-4" />탭 추가
          </Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <PromotionGuideCard
          icon={<Target className="size-5" />}
          title="빠른 설정"
          value="새 프로모션을 생성하면 캠페인 하위 탭으로 바로 동기화됩니다."
        />
        <PromotionGuideCard
          icon={<Users className="size-5" />}
          title="세그먼트 타겟팅"
          value="고객군별로 특화된 프로모션 뷰를 구성하여 정밀한 마케팅을 지원합니다."
        />
        <PromotionGuideCard
          icon={<BarChart3 className="size-5" />}
          title="실시간 분석"
          value="추가된 탭에서 각 프로모션의 성과를 실시간으로 모니터링할 수 있습니다."
        />
      </div>
    </section>
  );
}

function PromotionGuideCard({
  icon,
  title,
  value
}: {
  icon: ReactNode;
  title: string;
  value: string;
}) {
  return (
    <div className="grid gap-4 rounded-md border bg-[#f2f6ff] p-6">
      <div className="text-[#3927d9]">{icon}</div>
      <div className="grid gap-2">
        <h3 className="text-sm font-semibold text-[#1d1d1f]">{title}</h3>
        <p className="text-sm leading-6 text-muted-foreground">{value}</p>
      </div>
    </div>
  );
}

export function PromotionTabWorkspace({
  archiveScopedSegmentError,
  archiveScopedSegmentIsError,
  archiveScopedSegmentIsPending,
  approveContentCandidateError,
  approveContentCandidateIsError,
  approveContentCandidateIsPending,
  confirmError,
  confirmIsError,
  confirmIsPending,
  decideError,
  decideIsError,
  decideIsPending,
  deleteConfirmedSegmentError,
  deleteConfirmedSegmentIsError,
  deleteConfirmedSegmentIsPending,
  dispatchPromotionRunError,
  dispatchPromotionRunIsError,
  dispatchPromotionRunIsPending,
  createPromotionRunError,
  createPromotionRunIsError,
  createPromotionRunIsPending,
  buildAssignmentsError,
  buildAssignmentsIsError,
  buildAssignmentsIsPending,
  evaluatePromotionRunError,
  evaluatePromotionRunIsError,
  evaluatePromotionRunIsPending,
  evaluatePromotionRunResult,
  createNextLoopError,
  createNextLoopIsError,
  createNextLoopIsPending,
  onArchiveScopedSegment,
  onApproveContentCandidate,
  onBuildAssignments,
  onConfirmSuggestions,
  onCreateNextLoop,
  onCreatePromotionRun,
  onCreateScopedSegment,
  onDecideSuggestion,
  onDeleteConfirmedSegment,
  onDispatchPromotionRun,
  onEvaluatePromotionRun,
  onRejectContentCandidate,
  onSelectSegment,
  onStartAdExperiment,
  onStartAnalysis,
  onStartGeneration,
  onTabChange,
  promotion,
  promotionAnalysisError,
  promotionAnalysisIsError,
  promotionAnalysisIsPending,
  promotionGeneration,
  promotionGenerationError,
  promotionGenerationIsError,
  promotionGenerationIsPending,
  rejectContentCandidateError,
  rejectContentCandidateIsError,
  rejectContentCandidateIsPending,
  startAdExperimentError,
  startAdExperimentIsError,
  startAdExperimentIsPending,
  scopedSegmentCreateError,
  scopedSegmentCreateIsError,
  scopedSegmentCreateIsPending,
  scopedSegments,
  scopedSegmentsError,
  scopedSegmentsIsError,
  scopedSegmentsIsLoading,
  segments,
  selectedSegmentDetail,
  selectedSegmentDetailError,
  selectedSegmentDetailIsError,
  selectedSegmentDetailIsLoading,
  selectedSegmentId,
  suggestions,
  suggestionsError,
  suggestionsIsError,
  suggestionsIsLoading,
  tab,
  visibleTabs
}: {
  archiveScopedSegmentError: Error | null;
  archiveScopedSegmentIsError: boolean;
  archiveScopedSegmentIsPending: boolean;
  approveContentCandidateError: Error | null;
  approveContentCandidateIsError: boolean;
  approveContentCandidateIsPending: boolean;
  confirmError: Error | null;
  confirmIsError: boolean;
  confirmIsPending: boolean;
  decideError: Error | null;
  decideIsError: boolean;
  decideIsPending: boolean;
  deleteConfirmedSegmentError: Error | null;
  deleteConfirmedSegmentIsError: boolean;
  deleteConfirmedSegmentIsPending: boolean;
  dispatchPromotionRunError: Error | null;
  dispatchPromotionRunIsError: boolean;
  dispatchPromotionRunIsPending: boolean;
  createPromotionRunError: Error | null;
  createPromotionRunIsError: boolean;
  createPromotionRunIsPending: boolean;
  buildAssignmentsError: Error | null;
  buildAssignmentsIsError: boolean;
  buildAssignmentsIsPending: boolean;
  evaluatePromotionRunError: Error | null;
  evaluatePromotionRunIsError: boolean;
  evaluatePromotionRunIsPending: boolean;
  evaluatePromotionRunResult: DashboardEvaluatePromotionRunResult | null;
  createNextLoopError: Error | null;
  createNextLoopIsError: boolean;
  createNextLoopIsPending: boolean;
  onArchiveScopedSegment: (segmentId: string) => void;
  onApproveContentCandidate: (promotionId: string, segmentId: string, contentId: string) => void;
  onBuildAssignments: (promotionRunId: string) => void;
  onConfirmSuggestions: () => void;
  onCreateNextLoop: (
    promotionRunId: string,
    failedSegmentIds: string[],
    failedAdExperimentIds: string[]
  ) => void;
  onCreatePromotionRun: (promotionId: string, analysisId: string, generationId: string) => void;
  onCreateScopedSegment: (form: PromotionSegmentCreateFormState) => void;
  onDecideSuggestion: (suggestionId: string, status: "accepted" | "dismissed") => void;
  onDeleteConfirmedSegment: (promotionId: string, segmentId: string) => void;
  onDispatchPromotionRun: (promotionRunId: string) => void;
  onEvaluatePromotionRun: (promotionRunId: string) => void;
  onRejectContentCandidate: (promotionId: string, segmentId: string, contentId: string) => void;
  onSelectSegment: (promotionId: string, segmentId: string) => void;
  onStartAdExperiment: (promotionId: string, adExperimentId: string) => void;
  onStartAnalysis: () => void;
  onStartGeneration: (analysisId: string) => void;
  onTabChange: (tab: PromotionWorkspaceTab) => void;
  promotion: DashboardCampaignPromotion;
  promotionAnalysisError: Error | null;
  promotionAnalysisIsError: boolean;
  promotionAnalysisIsPending: boolean;
  promotionGeneration: DashboardStartPromotionGenerationResult | null;
  promotionGenerationError: Error | null;
  promotionGenerationIsError: boolean;
  promotionGenerationIsPending: boolean;
  rejectContentCandidateError: Error | null;
  rejectContentCandidateIsError: boolean;
  rejectContentCandidateIsPending: boolean;
  startAdExperimentError: Error | null;
  startAdExperimentIsError: boolean;
  startAdExperimentIsPending: boolean;
  scopedSegmentCreateError: Error | null;
  scopedSegmentCreateIsError: boolean;
  scopedSegmentCreateIsPending: boolean;
  scopedSegments: DashboardPromotionScopedSegmentDefinition[];
  scopedSegmentsError: Error | null;
  scopedSegmentsIsError: boolean;
  scopedSegmentsIsLoading: boolean;
  segments: DashboardCampaignSegment[];
  selectedSegmentDetail: DashboardSegmentDetail | undefined;
  selectedSegmentDetailError: Error | null;
  selectedSegmentDetailIsError: boolean;
  selectedSegmentDetailIsLoading: boolean;
  selectedSegmentId: string;
  suggestions: DashboardPromotionSegmentSuggestion[];
  suggestionsError: Error | null;
  suggestionsIsError: boolean;
  suggestionsIsLoading: boolean;
  tab: PromotionWorkspaceTab;
  visibleTabs: PromotionWorkspaceTab[];
}) {
  const activeSegments = segments.filter((segment) => segment.status !== "stopped");
  const selectedSegmentSuggestion =
    suggestions.find((suggestion) => suggestion.segment_id === selectedSegmentId) ?? null;
  const showsOverviewTab = visibleTabs.includes("overview");
  const showsSegmentsTab = visibleTabs.includes("segments");
  const showsSegmentDetailTab = visibleTabs.includes("segment-detail");
  return (
    <section className="grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <div className="text-sm font-medium text-[#3927d9]">프로모션 보기</div>
          <h2 className="text-3xl font-semibold tracking-tight text-[#102033]">
            {promotion.marketing_theme}
          </h2>
          <p className="text-sm text-muted-foreground">{formatChannelLabel(promotion.channel)}</p>
        </div>
        <Badge variant={statusBadgeVariant(promotion.status)}>
          {formatStatusLabel(promotion.status)}
        </Badge>
      </div>
      <div className="grid gap-4 md:grid-cols-5">
        <PromotionMetricCard label="목표 지표" value={formatMetricLabel(promotion.goal_metric)} />
        <PromotionMetricCard label="목표값" value={formatGoalValue(promotion.goal_target_value)} />
        <PromotionMetricCard
          label="현재값"
          value={
            promotion.latest_actual_value === null
              ? "-"
              : formatGoalValue(promotion.latest_actual_value)
          }
        />
        <PromotionMetricCard label="세그먼트" value={formatInteger(activeSegments.length)} />
        <PromotionMetricCard label="실험" value={formatInteger(promotion.ad_experiment_count)} />
      </div>
      <Tabs
        className="grid gap-4"
        onValueChange={(value) => onTabChange(value as PromotionWorkspaceTab)}
        value={tab}
      >
        {visibleTabs.length > 1 ? (
          <TabsList className="w-fit" variant="line">
            {visibleTabs.map((visibleTab) => (
              <TabsTrigger key={visibleTab} value={visibleTab}>
                {promotionWorkspaceTabLabels[visibleTab]}
              </TabsTrigger>
            ))}
          </TabsList>
        ) : null}
        {showsOverviewTab ? (
          <TabsContent value="overview">
            <PromotionOverviewTab
              activeSegments={activeSegments}
              promotion={promotion}
            />
          </TabsContent>
        ) : null}
        {showsSegmentsTab ? (
          <TabsContent value="segments">
            <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
              <PromotionSegmentSuggestionPanel
                confirmError={confirmError}
                confirmIsError={confirmIsError}
                confirmIsPending={confirmIsPending}
                createScopedSegmentError={scopedSegmentCreateError}
                createScopedSegmentIsError={scopedSegmentCreateIsError}
                createScopedSegmentIsPending={scopedSegmentCreateIsPending}
                decideError={decideError}
                decideIsError={decideIsError}
                decideIsPending={decideIsPending}
                archiveScopedSegmentError={archiveScopedSegmentError}
                archiveScopedSegmentIsError={archiveScopedSegmentIsError}
                archiveScopedSegmentIsPending={archiveScopedSegmentIsPending}
                onArchiveScopedSegment={onArchiveScopedSegment}
                onConfirmSuggestions={onConfirmSuggestions}
                onCreateScopedSegment={onCreateScopedSegment}
                onDecideSuggestion={onDecideSuggestion}
                onStartAnalysis={onStartAnalysis}
                promotionAnalysisError={promotionAnalysisError}
                promotionAnalysisIsError={promotionAnalysisIsError}
                promotionAnalysisIsPending={promotionAnalysisIsPending}
                scopedSegments={scopedSegments}
                scopedSegmentsError={scopedSegmentsError}
                scopedSegmentsIsError={scopedSegmentsIsError}
                scopedSegmentsIsLoading={scopedSegmentsIsLoading}
                suggestions={suggestions}
                suggestionsError={suggestionsError}
                suggestionsIsError={suggestionsIsError}
                suggestionsIsLoading={suggestionsIsLoading}
              />
              <PromotionCurrentSegmentsPanel
                deleteError={deleteConfirmedSegmentError}
                deleteIsError={deleteConfirmedSegmentIsError}
                deleteIsPending={deleteConfirmedSegmentIsPending}
                onDeleteSegment={onDeleteConfirmedSegment}
                onSelectSegment={onSelectSegment}
                promotion={promotion}
                segments={activeSegments}
                selectedSegmentId={selectedSegmentId}
              />
            </div>
          </TabsContent>
        ) : null}
        {showsSegmentDetailTab ? (
          <TabsContent value="segment-detail">
            <PromotionSegmentDetailTab
              approveContentCandidateError={approveContentCandidateError}
              approveContentCandidateIsError={approveContentCandidateIsError}
              approveContentCandidateIsPending={approveContentCandidateIsPending}
              detail={selectedSegmentDetail}
              dispatchPromotionRunError={dispatchPromotionRunError}
              dispatchPromotionRunIsError={dispatchPromotionRunIsError}
              dispatchPromotionRunIsPending={dispatchPromotionRunIsPending}
              createPromotionRunError={createPromotionRunError}
              createPromotionRunIsError={createPromotionRunIsError}
              createPromotionRunIsPending={createPromotionRunIsPending}
              buildAssignmentsError={buildAssignmentsError}
              buildAssignmentsIsError={buildAssignmentsIsError}
              buildAssignmentsIsPending={buildAssignmentsIsPending}
              evaluatePromotionRunError={evaluatePromotionRunError}
              evaluatePromotionRunIsError={evaluatePromotionRunIsError}
              evaluatePromotionRunIsPending={evaluatePromotionRunIsPending}
              evaluatePromotionRunResult={evaluatePromotionRunResult}
              createNextLoopError={createNextLoopError}
              createNextLoopIsError={createNextLoopIsError}
              createNextLoopIsPending={createNextLoopIsPending}
              error={selectedSegmentDetailError}
              generation={promotionGeneration}
              generationError={promotionGenerationError}
              generationIsError={promotionGenerationIsError}
              generationIsPending={promotionGenerationIsPending}
              isError={selectedSegmentDetailIsError}
              isLoading={selectedSegmentDetailIsLoading}
              onApproveContentCandidate={onApproveContentCandidate}
              onBuildAssignments={onBuildAssignments}
              onCreateNextLoop={onCreateNextLoop}
              onCreatePromotionRun={onCreatePromotionRun}
              onDispatchPromotionRun={onDispatchPromotionRun}
              onEvaluatePromotionRun={onEvaluatePromotionRun}
              onRejectContentCandidate={onRejectContentCandidate}
              onStartAdExperiment={onStartAdExperiment}
              onStartGeneration={onStartGeneration}
              rejectContentCandidateError={rejectContentCandidateError}
              rejectContentCandidateIsError={rejectContentCandidateIsError}
              rejectContentCandidateIsPending={rejectContentCandidateIsPending}
              segmentSuggestion={selectedSegmentSuggestion}
              selectedSegmentId={selectedSegmentId}
              startAdExperimentError={startAdExperimentError}
              startAdExperimentIsError={startAdExperimentIsError}
              startAdExperimentIsPending={startAdExperimentIsPending}
            />
          </TabsContent>
        ) : null}
      </Tabs>
    </section>
  );
}

function PromotionOverviewTab({
  activeSegments,
  promotion
}: {
  activeSegments: DashboardCampaignSegment[];
  promotion: DashboardCampaignPromotion;
}) {
  return (
    <div className="grid gap-4">
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>프로모션 사용자 여정 효율</CardTitle>
          <CardDescription>현재 프로모션 목표와 루프 상태를 기준으로 확인합니다.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <PromotionProgressRow
            label="목표 달성"
            value={Math.min((promotion.latest_actual_value ?? 0) * 100, 100)}
          />
          <PromotionProgressRow
            label="루프 진행"
            value={
              promotion.max_loop_count > 0
                ? Math.min((promotion.current_loop_count / promotion.max_loop_count) * 100, 100)
                : 0
            }
          />
          <div className="grid gap-3 md:grid-cols-3">
            <SummaryItem label="목표 기준" value={formatBasisLabel(promotion.goal_basis)} />
            <SummaryItem label="최소 표본" value={formatInteger(promotion.min_sample_size)} />
            <SummaryItem label="다음 액션" value={formatActionLabel(promotion.next_action)} />
          </div>
        </CardContent>
      </Card>
      <Card className="border-[#3927d9]/20 bg-[#f2f6ff] shadow-none">
        <CardContent className="grid gap-2 p-5">
          <div className="flex items-center gap-2 font-semibold text-[#3927d9]">
            <CheckCircle2 className="size-4" />
            최적화 힌트
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            세그먼트 추천, 광고 생성, 실험 연결은 세그먼트 관리 탭에서 진행합니다.
          </p>
          <div className="text-xs text-muted-foreground">
            활성 세그먼트 {formatInteger(activeSegments.length)}개 · 실험{" "}
            {formatInteger(promotion.ad_experiment_count)}개
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PromotionCurrentSegmentsPanel({
  deleteError,
  deleteIsError,
  deleteIsPending,
  onDeleteSegment,
  onSelectSegment,
  promotion,
  segments,
  selectedSegmentId
}: {
  deleteError: Error | null;
  deleteIsError: boolean;
  deleteIsPending: boolean;
  onDeleteSegment: (promotionId: string, segmentId: string) => void;
  onSelectSegment: (promotionId: string, segmentId: string) => void;
  promotion: DashboardCampaignPromotion;
  segments: DashboardCampaignSegment[];
  selectedSegmentId: string;
}) {
  const visibleSegments = latestSegmentPerSegmentId(segments);

  return (
    <Card className="h-full shadow-none">
      <CardHeader>
        <CardTitle className="text-base">확정 세그먼트</CardTitle>
        <CardDescription>현재 프로모션에 최종 연결된 세그먼트입니다.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        {deleteIsError ? (
          <Alert variant="destructive">
            <AlertTitle>확정 세그먼트를 삭제하지 못했습니다</AlertTitle>
            <AlertDescription>{mutationErrorMessage(deleteError)}</AlertDescription>
          </Alert>
        ) : null}
        {visibleSegments.map((segment) => {
          const isSelected = segment.segment_id === selectedSegmentId;
          const loopCount = segmentLoopCount(segment);
          const displayCopy = campaignSegmentDisplayCopy(segment);
          const hiddenLoopCount = segments.filter(
            (candidate) =>
              candidate.segment_id === segment.segment_id &&
              candidate.analysis_id !== segment.analysis_id
          ).length;
          return (
            <div
              className={`rounded-md border p-3 text-left transition ${
                isSelected ? "border-[#3927d9] bg-[#f2f0ff]" : "bg-background hover:bg-muted/30"
              }`}
              key={`${segment.segment_id}:${segment.analysis_id}`}
              onClick={() => onSelectSegment(promotion.promotion_id, segment.segment_id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectSegment(promotion.promotion_id, segment.segment_id);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="truncate font-medium">
                      {displayCopy?.title ?? segment.segment_name}
                    </span>
                    <Badge variant="secondary">루프 {formatInteger(loopCount)}</Badge>
                    {loopCount > 1 ? <Badge variant="default">다음 루프</Badge> : null}
                  </div>
                  {displayCopy?.signal_chips.length ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {displayCopy.signal_chips.map((chip) => (
                        <Badge className="text-[11px]" key={chip} variant="outline">
                          {chip}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-1 text-xs text-muted-foreground">
                    {displayCopy?.audience_summary ??
                      `${formatInteger(segment.estimated_size)}명 · 표본 ${formatInteger(
                        segment.sample_size
                      )} · ${formatMetricLabel(segment.goal_metric)}`}
                    {hiddenLoopCount > 0
                      ? ` · 이전 루프 ${formatInteger(hiddenLoopCount)}개 숨김`
                      : ""}
                  </div>
                  {displayCopy?.reason ? (
                    <div className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                      {displayCopy.reason}
                    </div>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={statusBadgeVariant(segment.status)}>
                    {formatStatusLabel(segment.status)}
                  </Badge>
                  <Button
                    aria-label={`${segment.segment_name} 확정 세그먼트 삭제`}
                    disabled={deleteIsPending}
                    onClick={(event) => {
                      event.stopPropagation();
                      onDeleteSegment(promotion.promotion_id, segment.segment_id);
                    }}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function PromotionSegmentDetailTab({
  approveContentCandidateError,
  approveContentCandidateIsError,
  approveContentCandidateIsPending,
  detail,
  dispatchPromotionRunError,
  dispatchPromotionRunIsError,
  dispatchPromotionRunIsPending,
  createPromotionRunError,
  createPromotionRunIsError,
  createPromotionRunIsPending,
  buildAssignmentsError,
  buildAssignmentsIsError,
  buildAssignmentsIsPending,
  evaluatePromotionRunError,
  evaluatePromotionRunIsError,
  evaluatePromotionRunIsPending,
  evaluatePromotionRunResult,
  createNextLoopError,
  createNextLoopIsError,
  createNextLoopIsPending,
  error,
  generation,
  generationError,
  generationIsError,
  generationIsPending,
  isError,
  isLoading,
  onApproveContentCandidate,
  onBuildAssignments,
  onCreateNextLoop,
  onCreatePromotionRun,
  onDispatchPromotionRun,
  onEvaluatePromotionRun,
  onRejectContentCandidate,
  onStartAdExperiment,
  onStartGeneration,
  rejectContentCandidateError,
  rejectContentCandidateIsError,
  rejectContentCandidateIsPending,
  segmentSuggestion,
  selectedSegmentId,
  startAdExperimentError,
  startAdExperimentIsError,
  startAdExperimentIsPending
}: {
  approveContentCandidateError: Error | null;
  approveContentCandidateIsError: boolean;
  approveContentCandidateIsPending: boolean;
  detail: DashboardSegmentDetail | undefined;
  dispatchPromotionRunError: Error | null;
  dispatchPromotionRunIsError: boolean;
  dispatchPromotionRunIsPending: boolean;
  createPromotionRunError: Error | null;
  createPromotionRunIsError: boolean;
  createPromotionRunIsPending: boolean;
  buildAssignmentsError: Error | null;
  buildAssignmentsIsError: boolean;
  buildAssignmentsIsPending: boolean;
  evaluatePromotionRunError: Error | null;
  evaluatePromotionRunIsError: boolean;
  evaluatePromotionRunIsPending: boolean;
  evaluatePromotionRunResult: DashboardEvaluatePromotionRunResult | null;
  createNextLoopError: Error | null;
  createNextLoopIsError: boolean;
  createNextLoopIsPending: boolean;
  error: Error | null;
  generation: DashboardStartPromotionGenerationResult | null;
  generationError: Error | null;
  generationIsError: boolean;
  generationIsPending: boolean;
  isError: boolean;
  isLoading: boolean;
  onApproveContentCandidate: (promotionId: string, segmentId: string, contentId: string) => void;
  onBuildAssignments: (promotionRunId: string) => void;
  onCreateNextLoop: (
    promotionRunId: string,
    failedSegmentIds: string[],
    failedAdExperimentIds: string[]
  ) => void;
  onCreatePromotionRun: (promotionId: string, analysisId: string, generationId: string) => void;
  onDispatchPromotionRun: (promotionRunId: string) => void;
  onEvaluatePromotionRun: (promotionRunId: string) => void;
  onRejectContentCandidate: (promotionId: string, segmentId: string, contentId: string) => void;
  onStartAdExperiment: (promotionId: string, adExperimentId: string) => void;
  onStartGeneration: (analysisId: string) => void;
  rejectContentCandidateError: Error | null;
  rejectContentCandidateIsError: boolean;
  rejectContentCandidateIsPending: boolean;
  segmentSuggestion: DashboardPromotionSegmentSuggestion | null;
  selectedSegmentId: string;
  startAdExperimentError: Error | null;
  startAdExperimentIsError: boolean;
  startAdExperimentIsPending: boolean;
}) {
  if (!selectedSegmentId) {
    return <EmptyState message="상세를 확인할 세그먼트를 선택해주세요." />;
  }
  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>광고 생성을 불러오지 못했습니다</AlertTitle>
        <AlertDescription>{error?.message ?? "API 요청에 실패했습니다."}</AlertDescription>
      </Alert>
    );
  }
  if (isLoading || !detail) {
    return <EmptyState message="세그먼트 맞춤 광고 생성 중입니다..." />;
  }

  const insufficientMetrics = detail.experiment_metrics.filter(
    (metric) => metric.status === "insufficient_data"
  );
  const latestMetric = detail.experiment_metrics[0];
  const approvedContentCandidate = detail.content_candidates.find(
    (candidate) => candidate.status === "approved"
  );
  const hasGeneratedContentCandidates = detail.content_candidates.length > 0;
  const hasPendingImage = hasPendingOnsiteBannerImage(detail);
  const generationFailed = generation?.status.toLowerCase() === "failed";

  return (
    <section className="grid gap-4">
      <Card className="shadow-none">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="grid gap-1">
            <CardTitle>{detail.segment.segment_name}</CardTitle>
            <CardDescription>
              {detail.segment.natural_language_query ?? "세그먼트 조건 미등록"}
            </CardDescription>
          </div>
          <Badge variant={statusBadgeVariant(detail.segment.status)}>
            {formatStatusLabel(detail.segment.status)}
          </Badge>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <SummaryItem label="대상 규모" value={formatInteger(detail.segment.estimated_size)} />
          <SummaryItem label="표본 수" value={formatInteger(detail.segment.sample_size)} />
          <SummaryItem label="표본 비율" value={formatPercentValue(detail.segment.sample_ratio)} />
          <SummaryItem label="연결 실험" value={formatInteger(detail.ad_experiments.length)} />
          <SummaryItem label="목표 지표" value={formatMetricLabel(detail.segment.goal_metric)} />
          <SummaryItem
            label="최근 지표"
            value={
              latestMetric
                ? `${formatMetricLabel(latestMetric.metric)} ${formatGoalValue(latestMetric.actual_value)}`
                : "-"
            }
          />
          <SummaryItem
            label="콘텐츠 후보"
            value={formatInteger(detail.content_candidates.length)}
          />
          <SummaryItem
            label="실시간 이벤트"
            value={formatInteger(detail.realtime_metrics.total_event_count)}
          />
        </CardContent>
      </Card>

      {insufficientMetrics.length > 0 || detail.segment.status === "insufficient_data" ? (
        <Alert variant="destructive">
          <AlertTitle>표본 부족 상태</AlertTitle>
          <AlertDescription>
            표본 부족은 실패가 아니라 판단 보류 상태입니다. 실험 대상 수와 평가 결과 JSON을 함께
            확인해야 합니다.
          </AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="grid gap-1">
            <h3 className="text-base font-semibold">세그먼트별 생성 광고</h3>
            <p className="text-sm text-muted-foreground">
              Decision 생성 결과로 저장된 콘텐츠 후보를 세그먼트 기준으로 조회합니다.
            </p>
          </div>
          <Button
            disabled={
              generationIsPending || !detail.segment.analysis_id || hasGeneratedContentCandidates
            }
            onClick={() => onStartGeneration(detail.segment.analysis_id)}
            type="button"
            variant="outline"
          >
            <ImageIcon className="mr-2 size-4" />
            {generationIsPending
              ? "생성 요청 중"
              : hasGeneratedContentCandidates
                ? "생성 완료"
                : "광고 생성 요청"}
          </Button>
        </div>
        <div className="grid gap-3">
          {generationIsError ? (
            <Alert variant="destructive">
              <AlertTitle>광고 생성 요청에 실패했습니다</AlertTitle>
              <AlertDescription>{mutationErrorMessage(generationError)}</AlertDescription>
            </Alert>
          ) : null}
          {generation && generationFailed ? (
            <Alert variant={generationFailed ? "destructive" : "default"}>
              <AlertTitle>광고 생성이 실패했습니다</AlertTitle>
              <AlertDescription>
                {generation.generation_id} · {formatStatusLabel(generation.status)}
                {generation.content_candidate_count === undefined
                  ? ""
                  : ` · 후보 ${formatInteger(generation.content_candidate_count)}개`}
              </AlertDescription>
            </Alert>
          ) : null}
          {hasPendingImage ? (
            <Alert>
              <AlertTitle>배너 이미지를 생성하는 중입니다</AlertTitle>
              <AlertDescription>
                이미지 URL이 저장되면 자동으로 다시 불러와 카드에 표시합니다.
              </AlertDescription>
            </Alert>
          ) : null}
          {approveContentCandidateIsError ? (
            <Alert variant="destructive">
              <AlertTitle>광고 후보를 승인하지 못했습니다</AlertTitle>
              <AlertDescription>
                {mutationErrorMessage(approveContentCandidateError)}
              </AlertDescription>
            </Alert>
          ) : null}
          {rejectContentCandidateIsError ? (
            <Alert variant="destructive">
              <AlertTitle>광고 후보를 거절하지 못했습니다</AlertTitle>
              <AlertDescription>
                {mutationErrorMessage(rejectContentCandidateError)}
              </AlertDescription>
            </Alert>
          ) : null}
          {detail.content_candidates.length > 0 ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {detail.content_candidates.map((candidate) => {
                const hasDifferentApprovedCandidate = Boolean(
                  approvedContentCandidate &&
                  approvedContentCandidate.content_id !== candidate.content_id
                );
                const selectionLabel =
                  candidate.status === "approved"
                    ? "선택됨"
                    : hasDifferentApprovedCandidate
                      ? "선택 불가"
                      : "선택";

                return (
                  <Card className="shadow-none" key={candidate.content_id}>
                    <CardHeader className="grid gap-3">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="grid min-w-0 gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{formatChannelLabel(candidate.channel)}</Badge>
                            <Badge variant={statusBadgeVariant(candidate.status)}>
                              {formatStatusLabel(candidate.status)}
                            </Badge>
                          </div>
                          <CardTitle className="break-words text-base">
                            {contentCandidateTitle(candidate)}
                          </CardTitle>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Button
                            disabled={
                              approveContentCandidateIsPending ||
                              hasDifferentApprovedCandidate ||
                              candidate.status === "approved" ||
                              candidate.status === "rejected"
                            }
                            onClick={() =>
                              onApproveContentCandidate(
                                detail.segment.promotion_id,
                                detail.segment.segment_id,
                                candidate.content_id
                              )
                            }
                            size="sm"
                            type="button"
                            variant={candidate.status === "approved" ? "secondary" : "default"}
                          >
                            <CheckCircle2 className="mr-2 size-4" />
                            {selectionLabel}
                          </Button>
                          <Button
                            disabled={
                              rejectContentCandidateIsPending ||
                              Boolean(approvedContentCandidate) ||
                              candidate.status === "approved" ||
                              candidate.status === "rejected"
                            }
                            onClick={() =>
                              onRejectContentCandidate(
                                detail.segment.promotion_id,
                                detail.segment.segment_id,
                                candidate.content_id
                              )
                            }
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            <X className="mr-2 size-4" />
                            {candidate.status === "rejected" ? "거절됨" : "거절"}
                          </Button>
                        </div>
                      </div>
                      <CardDescription className="break-all">
                        {candidate.content_option_id}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                      {candidate.image_url ? (
                        <img
                          alt={`${contentCandidateTitle(candidate)} 이미지`}
                          className="aspect-video w-full rounded-md border object-cover"
                          src={candidate.image_url}
                        />
                      ) : null}
                      <div className="grid gap-3 md:grid-cols-2">
                        <InsightBlock
                          label="메시지"
                          value={[
                            candidate.subject,
                            candidate.preheader,
                            contentCandidateMessage(candidate)
                          ]
                            .filter(Boolean)
                            .join("\n")}
                        />
                        <InsightBlock
                          label="CTA / 랜딩"
                          value={[
                            candidate.cta ?? "-",
                            candidate.landing_url ?? "랜딩 URL 없음"
                          ].join("\n")}
                        />
                      </div>
                      <div className="rounded-md border bg-muted/20 p-3">
                        <div className="mb-2 text-xs font-medium text-muted-foreground">근거</div>
                        <div className="grid gap-2 text-sm leading-6 text-muted-foreground">
                          <p className="break-words">{candidate.reason_summary ?? "-"}</p>
                          {candidate.message_strategy ? (
                            <p className="break-words">전략: {candidate.message_strategy}</p>
                          ) : null}
                          {candidate.image_prompt ? (
                            <p className="break-words">이미지: {candidate.image_prompt}</p>
                          ) : null}
                          {candidate.image_url ? (
                            <a
                              className="break-all underline underline-offset-4"
                              href={candidate.image_url}
                              rel="noreferrer"
                              target="_blank"
                            >
                              이미지 URL
                            </a>
                          ) : null}
                          <p className="break-all">
                            {formatJsonObject(candidate.data_evidence_json)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <EmptyState message="아직 생성된 광고 후보가 없습니다." />
          )}
        </div>
      </section>

      <SegmentConnectedExperimentsCard
        buildAssignmentsError={buildAssignmentsError}
        buildAssignmentsIsError={buildAssignmentsIsError}
        buildAssignmentsIsPending={buildAssignmentsIsPending}
        createNextLoopError={createNextLoopError}
        createNextLoopIsError={createNextLoopIsError}
        createNextLoopIsPending={createNextLoopIsPending}
        createPromotionRunError={createPromotionRunError}
        createPromotionRunIsError={createPromotionRunIsError}
        createPromotionRunIsPending={createPromotionRunIsPending}
        detail={detail}
        dispatchPromotionRunError={dispatchPromotionRunError}
        dispatchPromotionRunIsError={dispatchPromotionRunIsError}
        dispatchPromotionRunIsPending={dispatchPromotionRunIsPending}
        evaluatePromotionRunError={evaluatePromotionRunError}
        evaluatePromotionRunIsError={evaluatePromotionRunIsError}
        evaluatePromotionRunIsPending={evaluatePromotionRunIsPending}
        evaluatePromotionRunResult={evaluatePromotionRunResult}
        onBuildAssignments={onBuildAssignments}
        onCreateNextLoop={onCreateNextLoop}
        onCreatePromotionRun={onCreatePromotionRun}
        onDispatchPromotionRun={onDispatchPromotionRun}
        onEvaluatePromotionRun={onEvaluatePromotionRun}
        onStartAdExperiment={onStartAdExperiment}
        startAdExperimentError={startAdExperimentError}
        startAdExperimentIsError={startAdExperimentIsError}
        startAdExperimentIsPending={startAdExperimentIsPending}
      />

      <SegmentDetailReportCard suggestion={segmentSuggestion} />
    </section>
  );
}

function SegmentConnectedExperimentsCard({
  buildAssignmentsError,
  buildAssignmentsIsError,
  buildAssignmentsIsPending,
  createNextLoopError,
  createNextLoopIsError,
  createNextLoopIsPending,
  createPromotionRunError,
  createPromotionRunIsError,
  createPromotionRunIsPending,
  detail,
  dispatchPromotionRunError,
  dispatchPromotionRunIsError,
  dispatchPromotionRunIsPending,
  evaluatePromotionRunError,
  evaluatePromotionRunIsError,
  evaluatePromotionRunIsPending,
  evaluatePromotionRunResult,
  onBuildAssignments,
  onCreateNextLoop,
  onCreatePromotionRun,
  onDispatchPromotionRun,
  onEvaluatePromotionRun,
  onStartAdExperiment,
  startAdExperimentError,
  startAdExperimentIsError,
  startAdExperimentIsPending
}: {
  buildAssignmentsError: Error | null;
  buildAssignmentsIsError: boolean;
  buildAssignmentsIsPending: boolean;
  createNextLoopError: Error | null;
  createNextLoopIsError: boolean;
  createNextLoopIsPending: boolean;
  createPromotionRunError: Error | null;
  createPromotionRunIsError: boolean;
  createPromotionRunIsPending: boolean;
  detail: DashboardSegmentDetail;
  dispatchPromotionRunError: Error | null;
  dispatchPromotionRunIsError: boolean;
  dispatchPromotionRunIsPending: boolean;
  evaluatePromotionRunError: Error | null;
  evaluatePromotionRunIsError: boolean;
  evaluatePromotionRunIsPending: boolean;
  evaluatePromotionRunResult: DashboardEvaluatePromotionRunResult | null;
  onBuildAssignments: (promotionRunId: string) => void;
  onCreateNextLoop: (
    promotionRunId: string,
    failedSegmentIds: string[],
    failedAdExperimentIds: string[]
  ) => void;
  onCreatePromotionRun: (promotionId: string, analysisId: string, generationId: string) => void;
  onDispatchPromotionRun: (promotionRunId: string) => void;
  onEvaluatePromotionRun: (promotionRunId: string) => void;
  onStartAdExperiment: (promotionId: string, adExperimentId: string) => void;
  startAdExperimentError: Error | null;
  startAdExperimentIsError: boolean;
  startAdExperimentIsPending: boolean;
}) {
  const approvedContentCandidate = detail.content_candidates.find(
    (candidate) => candidate.status === "approved"
  );
  const activePromotionRunId = detail.ad_experiments[0]?.promotion_run_id ?? null;
  const failedSegmentIds = uniqueStringValues(
    (
      evaluatePromotionRunResult?.failed_segment_ids ??
      detail.experiment_metrics
        .filter((metric) => metric.status === "goal_not_met" && metric.segment_id)
        .map((metric) => metric.segment_id)
    ).filter(isPresentString)
  );
  const failedAdExperimentIds = uniqueStringValues(
    (
      evaluatePromotionRunResult?.failed_ad_experiment_ids ??
      detail.experiment_metrics
        .filter((metric) => metric.status === "goal_not_met" && metric.ad_experiment_id)
        .map((metric) => metric.ad_experiment_id)
    ).filter(isPresentString)
  );
  const canCreateNextLoop = Boolean(
    activePromotionRunId &&
      (evaluatePromotionRunResult?.next_loop_required ||
        failedSegmentIds.length > 0 ||
        failedAdExperimentIds.length > 0)
  );

  return (
    <Card className="shadow-none">
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="grid gap-1">
          <CardTitle className="text-base">연결된 광고 실험</CardTitle>
          <CardDescription>실험 시작 후 발송/노출 대상 assignment가 활성화됩니다.</CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={
              createPromotionRunIsPending ||
              !approvedContentCandidate ||
              detail.ad_experiments.length > 0
            }
            onClick={() => {
              if (approvedContentCandidate) {
                onCreatePromotionRun(
                  detail.segment.promotion_id,
                  approvedContentCandidate.analysis_id,
                  approvedContentCandidate.generation_id
                );
              }
            }}
            type="button"
            variant="outline"
          >
            <Plus className="mr-2 size-4" />
            {createPromotionRunIsPending ? "실험 생성 중" : "실험 생성"}
          </Button>
          <Button
            disabled={!activePromotionRunId || buildAssignmentsIsPending}
            onClick={() => {
              if (activePromotionRunId) {
                onBuildAssignments(activePromotionRunId);
              }
            }}
            type="button"
            variant="outline"
          >
            <Target className="mr-2 size-4" />
            {buildAssignmentsIsPending ? "배정 생성 중" : "대상 배정 생성"}
          </Button>
          <Button
            disabled={!activePromotionRunId || evaluatePromotionRunIsPending}
            onClick={() => {
              if (activePromotionRunId) {
                onEvaluatePromotionRun(activePromotionRunId);
              }
            }}
            type="button"
            variant="outline"
          >
            <BarChart3 className="mr-2 size-4" />
            {evaluatePromotionRunIsPending ? "평가 중" : "성과 평가"}
          </Button>
          <Button
            disabled={!canCreateNextLoop || createNextLoopIsPending}
            onClick={() => {
              if (activePromotionRunId) {
                onCreateNextLoop(activePromotionRunId, failedSegmentIds, failedAdExperimentIds);
              }
            }}
            type="button"
            variant="outline"
          >
            <Plus className="mr-2 size-4" />
            {createNextLoopIsPending ? "다음 루프 생성 중" : "다음 루프 생성"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        {createPromotionRunIsError ? (
          <Alert variant="destructive">
            <AlertTitle>실험 생성 요청에 실패했습니다</AlertTitle>
            <AlertDescription>{mutationErrorMessage(createPromotionRunError)}</AlertDescription>
          </Alert>
        ) : null}
        {buildAssignmentsIsError ? (
          <Alert variant="destructive">
            <AlertTitle>대상 배정 생성에 실패했습니다</AlertTitle>
            <AlertDescription>{mutationErrorMessage(buildAssignmentsError)}</AlertDescription>
          </Alert>
        ) : null}
        {evaluatePromotionRunIsError ? (
          <Alert variant="destructive">
            <AlertTitle>성과 평가 요청에 실패했습니다</AlertTitle>
            <AlertDescription>{mutationErrorMessage(evaluatePromotionRunError)}</AlertDescription>
          </Alert>
        ) : null}
        {createNextLoopIsError ? (
          <Alert variant="destructive">
            <AlertTitle>다음 루프 생성에 실패했습니다</AlertTitle>
            <AlertDescription>{mutationErrorMessage(createNextLoopError)}</AlertDescription>
          </Alert>
        ) : null}
        {dispatchPromotionRunIsError ? (
          <Alert variant="destructive">
            <AlertTitle>광고 실행 요청에 실패했습니다</AlertTitle>
            <AlertDescription>{mutationErrorMessage(dispatchPromotionRunError)}</AlertDescription>
          </Alert>
        ) : null}
        {startAdExperimentIsError ? (
          <Alert variant="destructive">
            <AlertTitle>광고 실험을 시작하지 못했습니다</AlertTitle>
            <AlertDescription>{mutationErrorMessage(startAdExperimentError)}</AlertDescription>
          </Alert>
        ) : null}
        {detail.ad_experiments.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>실험</TableHead>
                <TableHead>콘텐츠</TableHead>
                <TableHead>채널</TableHead>
                <TableHead>루프</TableHead>
                <TableHead>목표</TableHead>
                <TableHead>상태</TableHead>
                <TableHead className="text-right">액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.ad_experiments.map((experiment, index) => {
                const canDispatch =
                  experiment.status === "running" &&
                  (experiment.channel === "email" || experiment.channel === "sms");
                const contentCandidate =
                  detail.content_candidates.find(
                    (candidate) => candidate.content_id === experiment.content_id
                  ) ?? null;

                return (
                  <TableRow key={experiment.ad_experiment_id}>
                    <TableCell className="font-medium">
                      {experimentDisplayName(experiment.loop_count, index)}
                    </TableCell>
                    <TableCell>{contentCandidate ? contentCandidateTitle(contentCandidate) : "-"}</TableCell>
                    <TableCell>{formatChannelLabel(experiment.channel)}</TableCell>
                    <TableCell>{formatInteger(experiment.loop_count)}</TableCell>
                    <TableCell>
                      {formatMetricLabel(experiment.goal_metric)} ·{" "}
                      {formatGoalValue(experiment.goal_target_value)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(experiment.status)}>
                        {formatStatusLabel(experiment.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          disabled={
                            startAdExperimentIsPending || !canStartAdExperiment(experiment.status)
                          }
                          onClick={() =>
                            onStartAdExperiment(
                              experiment.promotion_id,
                              experiment.ad_experiment_id
                            )
                          }
                          size="sm"
                          type="button"
                          variant={experiment.status === "running" ? "outline" : "default"}
                        >
                          <CheckCircle2 className="mr-2 size-4" />
                          {experiment.status === "running" ? "실행 중" : "실험 시작"}
                        </Button>
                        <Button
                          disabled={!canDispatch || dispatchPromotionRunIsPending}
                          onClick={() => onDispatchPromotionRun(experiment.promotion_run_id)}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <Send className="mr-2 size-4" />
                          {experiment.channel === "onsite_banner" ? "배너 제외" : "실행"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <EmptyState message="아직 연결된 광고 실험이 없습니다." />
        )}
      </CardContent>
    </Card>
  );
}

function PromotionSegmentSuggestionPanel({
  archiveScopedSegmentError,
  archiveScopedSegmentIsError,
  archiveScopedSegmentIsPending,
  confirmError,
  confirmIsError,
  confirmIsPending,
  createScopedSegmentError,
  createScopedSegmentIsError,
  createScopedSegmentIsPending,
  decideError,
  decideIsError,
  decideIsPending,
  onArchiveScopedSegment,
  onConfirmSuggestions,
  onCreateScopedSegment,
  onDecideSuggestion,
  onStartAnalysis,
  promotionAnalysisError,
  promotionAnalysisIsError,
  promotionAnalysisIsPending,
  scopedSegments,
  scopedSegmentsError,
  scopedSegmentsIsError,
  scopedSegmentsIsLoading,
  suggestions,
  suggestionsError,
  suggestionsIsError,
  suggestionsIsLoading
}: {
  archiveScopedSegmentError: Error | null;
  archiveScopedSegmentIsError: boolean;
  archiveScopedSegmentIsPending: boolean;
  confirmError: Error | null;
  confirmIsError: boolean;
  confirmIsPending: boolean;
  createScopedSegmentError: Error | null;
  createScopedSegmentIsError: boolean;
  createScopedSegmentIsPending: boolean;
  decideError: Error | null;
  decideIsError: boolean;
  decideIsPending: boolean;
  onArchiveScopedSegment: (segmentId: string) => void;
  onConfirmSuggestions: () => void;
  onCreateScopedSegment: (form: PromotionSegmentCreateFormState) => void;
  onDecideSuggestion: (suggestionId: string, status: "accepted" | "dismissed") => void;
  onStartAnalysis: () => void;
  promotionAnalysisError: Error | null;
  promotionAnalysisIsError: boolean;
  promotionAnalysisIsPending: boolean;
  scopedSegments: DashboardPromotionScopedSegmentDefinition[];
  scopedSegmentsError: Error | null;
  scopedSegmentsIsError: boolean;
  scopedSegmentsIsLoading: boolean;
  suggestions: DashboardPromotionSegmentSuggestion[];
  suggestionsError: Error | null;
  suggestionsIsError: boolean;
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
            className="bg-[#3927d9]"
            disabled={confirmableCount === 0 || confirmIsPending}
            onClick={onConfirmSuggestions}
            type="button"
          >
            {confirmIsPending ? "확정 중" : `후보 확정 (${confirmableCount})`}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        {promotionAnalysisIsError ? (
          <Alert variant="destructive">
            <AlertTitle>AI 추천 요청에 실패했습니다</AlertTitle>
            <AlertDescription>{mutationErrorMessage(promotionAnalysisError)}</AlertDescription>
          </Alert>
        ) : null}
        {suggestionsIsError ? (
          <Alert variant="destructive">
            <AlertTitle>추천 세그먼트를 불러오지 못했습니다</AlertTitle>
            <AlertDescription>{mutationErrorMessage(suggestionsError)}</AlertDescription>
          </Alert>
        ) : null}
        {decideIsError ? (
          <Alert variant="destructive">
            <AlertTitle>추천 후보 상태를 변경하지 못했습니다</AlertTitle>
            <AlertDescription>{mutationErrorMessage(decideError)}</AlertDescription>
          </Alert>
        ) : null}
        {confirmIsError ? (
          <Alert variant="destructive">
            <AlertTitle>추천 후보를 확정하지 못했습니다</AlertTitle>
            <AlertDescription>{mutationErrorMessage(confirmError)}</AlertDescription>
          </Alert>
        ) : null}
        {scopedSegmentsIsError ? (
          <Alert variant="destructive">
            <AlertTitle>직접 추가 세그먼트를 불러오지 못했습니다</AlertTitle>
            <AlertDescription>{mutationErrorMessage(scopedSegmentsError)}</AlertDescription>
          </Alert>
        ) : null}
        {createScopedSegmentIsError ? (
          <Alert variant="destructive">
            <AlertTitle>직접 추가 세그먼트를 저장하지 못했습니다</AlertTitle>
            <AlertDescription>{mutationErrorMessage(createScopedSegmentError)}</AlertDescription>
          </Alert>
        ) : null}
        {archiveScopedSegmentIsError ? (
          <Alert variant="destructive">
            <AlertTitle>직접 추가 세그먼트를 삭제하지 못했습니다</AlertTitle>
            <AlertDescription>{mutationErrorMessage(archiveScopedSegmentError)}</AlertDescription>
          </Alert>
        ) : null}
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
                  className="grid gap-3 rounded-md border bg-[#f7fbff] p-4"
                  key={segment.segment_id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid gap-1">
                      <div className="text-xs font-semibold text-[#3927d9]">{segment.source}</div>
                      <h3 className="text-base font-semibold">{segment.segment_name}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={statusBadgeVariant(segment.status)}>
                        {formatStatusLabel(segment.status)}
                      </Badge>
                      <Button
                        aria-label={`${segment.segment_name} 직접 추가 후보 삭제`}
                        disabled={archiveScopedSegmentIsPending}
                        onClick={() => onArchiveScopedSegment(segment.segment_id)}
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <Trash2 className="size-4" />
                      </Button>
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
          <div className="grid gap-3 md:grid-cols-2">
            {suggestions.map((suggestion) => {
              const isAccepted = suggestion.suggestion_status === "accepted";
              const isConfirmed = suggestion.suggestion_status === "confirmed";
              const isDismissed = suggestion.suggestion_status === "dismissed";
              const displayCopy = suggestion.display_copy;
              const fallbackSummary = segmentAudienceSummary(
                suggestion.sample_size,
                suggestion.sample_ratio
              );
              return (
                <div
                  className={`grid gap-3 rounded-md border p-4 ${
                    isAccepted ? "border-[#3927d9] bg-[#f2f0ff]" : "bg-white"
                  }`}
                  key={suggestion.suggestion_id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid gap-1">
                      <div className="text-xs font-semibold text-[#3927d9]">
                        Rank {formatInteger(suggestion.suggested_rank)}
                      </div>
                      <h3 className="text-base font-semibold">
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
                  <div className="grid gap-2 text-sm text-muted-foreground">
                    <div>{displayCopy?.audience_summary ?? fallbackSummary}</div>
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
                    {displayCopy?.action_hint ? (
                      <div className="rounded-md bg-[#f7f8ff] px-3 py-2 text-xs leading-5 text-foreground">
                        {displayCopy.action_hint}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
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
        <PromotionSegmentCreateDialog
          createIsPending={createScopedSegmentIsPending}
          onCreate={onCreateScopedSegment}
          onOpenChange={setIsCreateDialogOpen}
          open={isCreateDialogOpen}
        />
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

  return (
    <Dialog onOpenChange={onOpenChange} open={Boolean(report)}>
      {report ? (
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                Rank {formatInteger(suggestion?.suggested_rank ?? 0)}
              </Badge>
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

function SegmentDetailReportCard({
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

  if (!report) {
    return null;
  }

  return (
    <div className="grid gap-4">
      <section className="grid gap-2 rounded-md border bg-[#f8f8ff] p-4">
        <div className="text-sm font-medium text-foreground">{report.summary}</div>
        <div className="text-sm text-muted-foreground">
          {displayCopy?.audience_summary ??
            segmentAudienceSummary(suggestion?.sample_size ?? 0, suggestion?.sample_ratio ?? 0)}
        </div>
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
      <ReportSection items={report.why_recommended} title="왜 추천했나요" />
      <ReportSection items={report.evidence} title="확인된 근거" />
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

function ReportSection({ items, title }: { items: string[]; title: string }) {
  return (
    <section className="grid gap-2 rounded-md border p-4">
      <h4 className="text-sm font-semibold">{title}</h4>
      <ul className="grid gap-2 text-sm leading-6 text-muted-foreground">
        {items.map((item, index) => (
          <li className="flex gap-2" key={`${title}-${index}-${item}`}>
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#3927d9]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
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
  const [jsonError, setJsonError] = useState("");

  useEffect(() => {
    if (open) {
      setForm(createEmptyPromotionSegmentFormState());
      setJsonError("");
    }
  }, [open]);

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
          {jsonError ? (
            <Alert variant="destructive">
              <AlertTitle>조건 JSON을 확인해주세요</AlertTitle>
              <AlertDescription>{jsonError}</AlertDescription>
            </Alert>
          ) : null}
          <Field>
            <FieldLabel htmlFor="promotion-segment-name">세그먼트 이름</FieldLabel>
            <Input
              id="promotion-segment-name"
              onChange={(event) => setForm({ ...form, segmentName: event.target.value })}
              placeholder="VIP 장기 미구매 고객"
              value={form.segmentName}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="promotion-segment-natural-query">생성 이유/조건 설명</FieldLabel>
            <Textarea
              id="promotion-segment-natural-query"
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
              onChange={(event) => setForm({ ...form, ruleJsonText: event.target.value })}
              value={form.ruleJsonText}
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="promotion-segment-sample-size">샘플 수</FieldLabel>
              <Input
                id="promotion-segment-sample-size"
                min="0"
                onChange={(event) => setForm({ ...form, sampleSize: event.target.value })}
                type="number"
                value={form.sampleSize}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="promotion-segment-eligible-size">모수</FieldLabel>
              <Input
                id="promotion-segment-eligible-size"
                min="0"
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
                min="0"
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
            className="bg-[#3927d9]"
            disabled={!canSubmit}
            onClick={() => {
              const ruleJson = parseJsonObject(form.ruleJsonText);
              if (!ruleJson) {
                setJsonError("객체 형태의 JSON만 입력할 수 있습니다.");
                return;
              }
              setJsonError("");
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

function PromotionMetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-h-28 content-between rounded-md border bg-[#f2f6ff] p-5">
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className="truncate text-2xl font-semibold text-[#102033]">{value}</div>
    </div>
  );
}

function PromotionProgressRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums">{formatInteger(value)}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-sm bg-[#e8eefc]">
        <div className="h-full bg-[#3927d9]" style={{ width: `${Math.max(value, 4)}%` }} />
      </div>
    </div>
  );
}

function experimentDisplayName(loopCount: number | null | undefined, index = 0) {
  const loopLabel = loopCount ? `${formatInteger(loopCount)}차` : `${formatInteger(index + 1)}번`;
  return `${loopLabel} 광고 실험`;
}

function canStartAdExperiment(status: string) {
  return status === "created" || status === "ready" || status === "approved";
}

function uniqueStringValues(values: string[]) {
  return Array.from(new Set(values));
}

function isPresentString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-medium">{value}</div>
    </div>
  );
}

function InsightBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-md border bg-muted/20 p-3">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="whitespace-pre-wrap text-sm leading-6">{value || "-"}</div>
    </div>
  );
}
