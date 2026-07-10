import type {
  DashboardCampaignPromotion,
  DashboardCampaignSegment,
  DashboardEvaluatePromotionRunResult,
  DashboardPromotionScopedSegmentDefinition,
  DashboardPromotionSegmentSuggestion,
  DashboardSegmentDetail
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@loopad/ui/shadcn/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@loopad/ui/shadcn/table";
import { BarChart3, CheckCircle2, ImageIcon, Plus, Target, Trash2, Users, X } from "lucide-react";
import { formatInteger } from "../../../../../model/dashboard-format.js";
import {
  formatActionLabel,
  formatBasisLabel,
  formatChannelLabel,
  formatMetricLabel,
  formatStatusLabel
} from "../../../../../model/dashboard-labels.js";
import { EmptyState } from "../../../../shared/EmptyState.js";
import {
  EntityWorkspaceEmptyState,
  EntityWorkspaceTabs
} from "../../../../shared/EntityWorkspace.js";
import {
  campaignSegmentDisplayCopy,
  canStartAdExperiment,
  formatGoalValue,
  formatJsonObject,
  formatPercentValue,
  latestSegmentPerSegmentId,
  segmentLoopCount,
  statusBadgeVariant,
  contentCandidateMessage,
  contentCandidateTitle,
  type PromotionSegmentCreateFormState,
  type PromotionWorkspaceTab
} from "../promotionUtils.js";
import {
  PromotionSegmentSuggestionPanel,
  SegmentDetailReportCard
} from "./PromotionSegmentSuggestions.js";

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
  const promotionTabs = openPromotions.map((promotion) => ({
    id: promotion.promotion_id,
    label: promotion.marketing_theme,
    promotion
  }));

  return (
    <EntityWorkspaceTabs
      addLabel="프로모션 탭 추가"
      items={promotionTabs}
      onAdd={onAdd}
      onClose={(item) => onClosePromotion(item.promotion.promotion_id)}
      onSelect={(item) => onSelectPromotion(item.promotion.promotion_id)}
      selectedItemId={selectedPromotionId}
    />
  );
}

export function PromotionEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <EntityWorkspaceEmptyState
      actionLabel="탭 추가"
      description="새 프로모션을 생성하면 현재 캠페인의 프로모션 탭으로 열립니다. 진행 중인 캠페인의 상세 지표와 워크플로우를 한눈에 관리할 수 있습니다."
      guideCards={[
        {
          icon: <Target className="size-5" />,
          title: "빠른 설정",
          value: "새 프로모션을 생성하면 캠페인 하위 탭으로 바로 동기화됩니다."
        },
        {
          icon: <Users className="size-5" />,
          title: "세그먼트 타겟팅",
          value: "고객군별로 특화된 프로모션 뷰를 구성하여 정밀한 마케팅을 지원합니다."
        },
        {
          icon: <BarChart3 className="size-5" />,
          title: "실시간 분석",
          value: "추가된 탭에서 각 프로모션의 성과를 실시간으로 모니터링할 수 있습니다."
        }
      ]}
      onAction={onAdd}
      title="현재 프로모션이 없습니다."
    />
  );
}

export function PromotionTabWorkspace({
  archiveScopedSegmentIsPending,
  approveContentCandidateIsPending,
  confirmIsPending,
  decideIsPending,
  deleteConfirmedSegmentIsPending,
  evaluatePromotionRunIsPending,
  evaluatePromotionRunResult,
  createNextLoopIsPending,
  launchExperimentIsPending,
  onArchiveScopedSegment,
  onApproveContentCandidate,
  onConfirmSuggestions,
  onCreateNextLoop,
  onCreateScopedSegment,
  onDecideSuggestion,
  onDeleteConfirmedSegment,
  onEvaluatePromotionRun,
  onLaunchExperiment,
  onRejectContentCandidate,
  onSelectSegment,
  onStartAnalysis,
  onStartGeneration,
  onTabChange,
  promotion,
  promotionAnalysisIsPending,
  promotionGenerationIsPending,
  rejectContentCandidateIsPending,
  scopedSegmentCreateIsPending,
  scopedSegments,
  scopedSegmentsIsLoading,
  segments,
  selectedSegmentDetail,
  selectedSegmentDetailIsError,
  selectedSegmentDetailIsLoading,
  selectedSegmentId,
  suggestions,
  suggestionsIsLoading,
  tab,
  visibleTabs
}: {
  archiveScopedSegmentIsPending: boolean;
  approveContentCandidateIsPending: boolean;
  confirmIsPending: boolean;
  decideIsPending: boolean;
  deleteConfirmedSegmentIsPending: boolean;
  evaluatePromotionRunIsPending: boolean;
  evaluatePromotionRunResult: DashboardEvaluatePromotionRunResult | null;
  createNextLoopIsPending: boolean;
  launchExperimentIsPending: boolean;
  onArchiveScopedSegment: (segmentId: string) => void;
  onApproveContentCandidate: (promotionId: string, segmentId: string, contentId: string) => void;
  onConfirmSuggestions: () => void;
  onCreateNextLoop: (
    promotionRunId: string,
    failedSegmentIds: string[],
    failedAdExperimentIds: string[]
  ) => void;
  onCreateScopedSegment: (form: PromotionSegmentCreateFormState) => void;
  onDecideSuggestion: (suggestionId: string, status: "accepted" | "dismissed") => void;
  onDeleteConfirmedSegment: (promotionId: string, segmentId: string) => void;
  onEvaluatePromotionRun: (promotionRunId: string) => void;
  onLaunchExperiment: (promotionId: string, analysisId?: string, generationId?: string) => void;
  onRejectContentCandidate: (promotionId: string, segmentId: string, contentId: string) => void;
  onSelectSegment: (promotionId: string, segmentId: string) => void;
  onStartAnalysis: () => void;
  onStartGeneration: (analysisId: string) => void;
  onTabChange: (tab: PromotionWorkspaceTab) => void;
  promotion: DashboardCampaignPromotion;
  promotionAnalysisIsPending: boolean;
  promotionGenerationIsPending: boolean;
  rejectContentCandidateIsPending: boolean;
  scopedSegmentCreateIsPending: boolean;
  scopedSegments: DashboardPromotionScopedSegmentDefinition[];
  scopedSegmentsIsLoading: boolean;
  segments: DashboardCampaignSegment[];
  selectedSegmentDetail: DashboardSegmentDetail | undefined;
  selectedSegmentDetailIsError: boolean;
  selectedSegmentDetailIsLoading: boolean;
  selectedSegmentId: string;
  suggestions: DashboardPromotionSegmentSuggestion[];
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
          <div className="text-sm font-medium text-primary">프로모션 보기</div>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">
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
            <PromotionOverviewTab promotion={promotion} />
          </TabsContent>
        ) : null}
        {showsSegmentsTab ? (
          <TabsContent value="segments">
            <div className="grid gap-4">
              <PromotionSegmentSuggestionPanel
                confirmIsPending={confirmIsPending}
                createScopedSegmentIsPending={scopedSegmentCreateIsPending}
                decideIsPending={decideIsPending}
                archiveScopedSegmentIsPending={archiveScopedSegmentIsPending}
                onArchiveScopedSegment={onArchiveScopedSegment}
                onConfirmSuggestions={onConfirmSuggestions}
                onCreateScopedSegment={onCreateScopedSegment}
                onDecideSuggestion={onDecideSuggestion}
                onStartAnalysis={onStartAnalysis}
                promotionAnalysisIsPending={promotionAnalysisIsPending}
                scopedSegments={scopedSegments}
                scopedSegmentsIsLoading={scopedSegmentsIsLoading}
                suggestions={suggestions}
                suggestionsIsLoading={suggestionsIsLoading}
              />
              <PromotionCurrentSegmentsPanel
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
              approveContentCandidateIsPending={approveContentCandidateIsPending}
              detail={selectedSegmentDetail}
              evaluatePromotionRunIsPending={evaluatePromotionRunIsPending}
              evaluatePromotionRunResult={evaluatePromotionRunResult}
              createNextLoopIsPending={createNextLoopIsPending}
              generationIsPending={promotionGenerationIsPending}
              isError={selectedSegmentDetailIsError}
              isLoading={selectedSegmentDetailIsLoading}
              onApproveContentCandidate={onApproveContentCandidate}
              onCreateNextLoop={onCreateNextLoop}
              onEvaluatePromotionRun={onEvaluatePromotionRun}
              onLaunchExperiment={onLaunchExperiment}
              onRejectContentCandidate={onRejectContentCandidate}
              onStartGeneration={onStartGeneration}
              rejectContentCandidateIsPending={rejectContentCandidateIsPending}
              segmentSuggestion={selectedSegmentSuggestion}
              selectedSegmentId={selectedSegmentId}
              launchExperimentIsPending={launchExperimentIsPending}
            />
          </TabsContent>
        ) : null}
      </Tabs>
    </section>
  );
}

function PromotionOverviewTab({ promotion }: { promotion: DashboardCampaignPromotion }) {
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
    </div>
  );
}

function PromotionCurrentSegmentsPanel({
  deleteIsPending,
  onDeleteSegment,
  onSelectSegment,
  promotion,
  segments,
  selectedSegmentId
}: {
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
                isSelected ? "border-primary bg-accent" : "bg-background hover:bg-muted/30"
              }`}
              key={`${segment.segment_id}:${segment.analysis_id}`}
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
                    aria-pressed={isSelected}
                    onClick={() => onSelectSegment(promotion.promotion_id, segment.segment_id)}
                    size="sm"
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                  >
                    {isSelected ? "열림" : "선택"}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        aria-label={`${segment.segment_name} 확정 세그먼트 삭제`}
                        disabled={deleteIsPending}
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>확정 세그먼트를 삭제할까요?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {segment.segment_name} 세그먼트가 현재 프로모션에서 삭제됩니다. 이 작업은
                          되돌릴 수 없습니다.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() =>
                            onDeleteSegment(promotion.promotion_id, segment.segment_id)
                          }
                          variant="destructive"
                        >
                          삭제
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
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
  approveContentCandidateIsPending,
  detail,
  evaluatePromotionRunIsPending,
  evaluatePromotionRunResult,
  createNextLoopIsPending,
  generationIsPending,
  isError,
  isLoading,
  launchExperimentIsPending,
  onApproveContentCandidate,
  onCreateNextLoop,
  onEvaluatePromotionRun,
  onLaunchExperiment,
  onRejectContentCandidate,
  onStartGeneration,
  rejectContentCandidateIsPending,
  segmentSuggestion,
  selectedSegmentId
}: {
  approveContentCandidateIsPending: boolean;
  detail: DashboardSegmentDetail | undefined;
  evaluatePromotionRunIsPending: boolean;
  evaluatePromotionRunResult: DashboardEvaluatePromotionRunResult | null;
  createNextLoopIsPending: boolean;
  generationIsPending: boolean;
  isError: boolean;
  isLoading: boolean;
  launchExperimentIsPending: boolean;
  onApproveContentCandidate: (promotionId: string, segmentId: string, contentId: string) => void;
  onCreateNextLoop: (
    promotionRunId: string,
    failedSegmentIds: string[],
    failedAdExperimentIds: string[]
  ) => void;
  onEvaluatePromotionRun: (promotionRunId: string) => void;
  onLaunchExperiment: (promotionId: string, analysisId?: string, generationId?: string) => void;
  onRejectContentCandidate: (promotionId: string, segmentId: string, contentId: string) => void;
  onStartGeneration: (analysisId: string) => void;
  rejectContentCandidateIsPending: boolean;
  segmentSuggestion: DashboardPromotionSegmentSuggestion | null;
  selectedSegmentId: string;
}) {
  if (!selectedSegmentId) {
    return <EmptyState message="상세를 확인할 세그먼트를 선택해주세요." />;
  }
  if (isError) {
    return null;
  }
  if (isLoading || !detail) {
    return <EmptyState message="세그먼트 맞춤 광고 생성 중입니다..." />;
  }

  const latestMetric = detail.experiment_metrics[0];
  const approvedContentCandidate = detail.content_candidates.find(
    (candidate) => candidate.status === "approved"
  );
  const hasGeneratedContentCandidates = detail.content_candidates.length > 0;

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
                          decoding="async"
                          height={675}
                          loading="lazy"
                          src={candidate.image_url}
                          width={1200}
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
        createNextLoopIsPending={createNextLoopIsPending}
        detail={detail}
        evaluatePromotionRunIsPending={evaluatePromotionRunIsPending}
        evaluatePromotionRunResult={evaluatePromotionRunResult}
        onCreateNextLoop={onCreateNextLoop}
        onEvaluatePromotionRun={onEvaluatePromotionRun}
        launchExperimentIsPending={launchExperimentIsPending}
        onLaunchExperiment={onLaunchExperiment}
      />

      <SegmentDetailReportCard suggestion={segmentSuggestion} />
    </section>
  );
}

function SegmentConnectedExperimentsCard({
  createNextLoopIsPending,
  detail,
  evaluatePromotionRunIsPending,
  evaluatePromotionRunResult,
  launchExperimentIsPending,
  onCreateNextLoop,
  onEvaluatePromotionRun,
  onLaunchExperiment
}: {
  createNextLoopIsPending: boolean;
  detail: DashboardSegmentDetail;
  evaluatePromotionRunIsPending: boolean;
  evaluatePromotionRunResult: DashboardEvaluatePromotionRunResult | null;
  launchExperimentIsPending: boolean;
  onCreateNextLoop: (
    promotionRunId: string,
    failedSegmentIds: string[],
    failedAdExperimentIds: string[]
  ) => void;
  onEvaluatePromotionRun: (promotionRunId: string) => void;
  onLaunchExperiment: (promotionId: string, analysisId?: string, generationId?: string) => void;
}) {
  const approvedContentCandidate = detail.content_candidates.find(
    (candidate) => candidate.status === "approved"
  );
  const activePromotionRunId = detail.ad_experiments[0]?.promotion_run_id ?? null;
  const activeRunExperiments = activePromotionRunId
    ? detail.ad_experiments.filter(
        (experiment) => experiment.promotion_run_id === activePromotionRunId
      )
    : [];
  const isExperimentRunning =
    activeRunExperiments.length > 0 &&
    activeRunExperiments.every((experiment) => experiment.status === "running");
  const canLaunchExperiment =
    (!activePromotionRunId && Boolean(approvedContentCandidate)) ||
    activeRunExperiments.some((experiment) => canStartAdExperiment(experiment.status));
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
          <CardDescription>실험 준비와 대상 배정을 한 번에 처리합니다.</CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={launchExperimentIsPending || isExperimentRunning || !canLaunchExperiment}
            onClick={() => {
              onLaunchExperiment(
                detail.segment.promotion_id,
                approvedContentCandidate?.analysis_id,
                approvedContentCandidate?.generation_id
              );
            }}
            type="button"
          >
            <CheckCircle2 className="mr-2 size-4" />
            {launchExperimentIsPending
              ? "실험 준비 중"
              : isExperimentRunning
                ? "실험 진행 중"
                : "실험 시작"}
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.ad_experiments.map((experiment, index) => {
                const contentCandidate =
                  detail.content_candidates.find(
                    (candidate) => candidate.content_id === experiment.content_id
                  ) ?? null;

                return (
                  <TableRow key={experiment.ad_experiment_id}>
                    <TableCell className="font-medium">
                      {experimentDisplayName(experiment.loop_count, index)}
                    </TableCell>
                    <TableCell>
                      {contentCandidate ? contentCandidateTitle(contentCandidate) : "-"}
                    </TableCell>
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

function PromotionMetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-h-28 content-between rounded-lg border bg-[#f5f5f7] p-5">
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className="truncate text-2xl font-semibold text-foreground">{value}</div>
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
      <div className="h-3 overflow-hidden rounded-full bg-[#e8e8ed]">
        <div className="h-full bg-primary" style={{ width: `${Math.max(value, 4)}%` }} />
      </div>
    </div>
  );
}

function experimentDisplayName(loopCount: number | null | undefined, index = 0) {
  const loopLabel = loopCount ? `${formatInteger(loopCount)}차` : `${formatInteger(index + 1)}번`;
  return `${loopLabel} 광고 실험`;
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
