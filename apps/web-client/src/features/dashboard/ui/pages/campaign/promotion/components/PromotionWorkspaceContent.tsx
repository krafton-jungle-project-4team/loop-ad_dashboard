import type {
  DashboardAdExperiment,
  DashboardCampaignPromotion,
  DashboardCampaignSegment,
  DashboardPromotionScopedSegmentDefinition,
  DashboardPromotionSegmentSuggestion,
  DashboardSegmentDetail
} from "@loopad/shared";
import { Alert, AlertDescription, AlertTitle } from "@loopad/ui/shadcn/alert";
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
import { Field, FieldLabel } from "@loopad/ui/shadcn/field";
import { Input } from "@loopad/ui/shadcn/input";
import { Progress } from "@loopad/ui/shadcn/progress";
import { Spinner } from "@loopad/ui/shadcn/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@loopad/ui/shadcn/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@loopad/ui/shadcn/table";
import {
  BarChart3,
  CheckCircle2,
  ImageIcon,
  Plus,
  Search,
  Target,
  Trash2,
  Users,
  X
} from "lucide-react";
import { formatInteger } from "../../../../../model/dashboard-format.js";
import {
  formatActionLabel,
  formatBasisLabel,
  formatChannelLabel,
  formatMetricLabel,
  formatStatusLabel
} from "../../../../../model/dashboard-labels.js";
import type { SegmentWorkspaceView } from "../../../../../model/dashboard-types.js";
import { EmptyState } from "../../../../shared/EmptyState.js";
import { EntityWorkspaceEmptyState } from "../../../../shared/EntityWorkspace.js";
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
  mutationErrorMessage,
  type PromotionSegmentCreateFormState,
  type PromotionWorkspaceTab
} from "../promotionUtils.js";
import type { PromotionExperimentLaunchResult } from "../promotionExperimentFlow.js";
import { PromotionSegmentSuggestionPanel } from "./PromotionSegmentSuggestions.js";

const promotionWorkspaceTabLabels: Record<PromotionWorkspaceTab, string> = {
  overview: "프로모션 성과",
  segments: "세그먼트 관리",
  "segment-detail": "세그먼트 맞춤 광고 생성"
};

export function PromotionManagementList({
  filter,
  onAdd,
  onDeletePromotion,
  onEditPromotion,
  onFilterChange,
  onSelectPromotion,
  openPromotions
}: {
  filter: string;
  onAdd: () => void;
  onDeletePromotion: (promotionId: string) => void;
  onEditPromotion: (promotionId: string) => void;
  onFilterChange: (value: string) => void;
  onSelectPromotion: (promotionId: string) => void;
  openPromotions: DashboardCampaignPromotion[];
}) {
  return (
    <section className="grid gap-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid gap-1">
          <h2 className="text-xl font-semibold tracking-tight">프로모션 관리</h2>
          <p className="text-sm text-muted-foreground">
            선택한 캠페인에 프로모션을 만들고 운영 상태를 관리해요.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <Field className="sm:w-72">
            <FieldLabel className="sr-only" htmlFor="promotion-management-search">
              프로모션 검색
            </FieldLabel>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoComplete="off"
                className="pl-9"
                id="promotion-management-search"
                name="promotionSearch"
                onChange={(event) => onFilterChange(event.target.value)}
                placeholder="프로모션 이름이나 채널 검색"
                type="search"
                value={filter}
              />
            </div>
          </Field>
          <Button onClick={onAdd} type="button">
            <Plus data-icon="inline-start" />
            프로모션 만들기
          </Button>
        </div>
      </div>
      {openPromotions.length === 0 ? (
        <EmptyState message="일치하는 프로모션이 없어요." />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>프로모션</TableHead>
                  <TableHead>채널</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>목표</TableHead>
                  <TableHead className="text-right">세그먼트</TableHead>
                  <TableHead className="text-right">실험</TableHead>
                  <TableHead className="w-40">
                    <span className="sr-only">작업</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openPromotions.map((promotion) => (
                  <TableRow key={promotion.promotion_id}>
                    <TableCell className="max-w-[360px]">
                      <Button
                        className="grid h-auto max-w-full justify-start gap-1 p-0 text-left"
                        onClick={() => onSelectPromotion(promotion.promotion_id)}
                        size="sm"
                        type="button"
                        variant="link"
                      >
                        <span className="truncate font-medium hover:text-primary">
                          {promotion.marketing_theme}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {promotion.message_brief ?? "아직 설명이 없어요"}
                        </span>
                      </Button>
                    </TableCell>
                    <TableCell>{formatChannelLabel(promotion.channel)}</TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(promotion.status)}>
                        {formatStatusLabel(promotion.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatMetricLabel(promotion.goal_metric)} ·{" "}
                      {formatGoalValue(promotion.goal_target_value)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatInteger(promotion.target_segment_count)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatInteger(promotion.ad_experiment_count)}
                    </TableCell>
                    <TableCell>
                      <PromotionRowActions
                        onDelete={onDeletePromotion}
                        onEdit={onEditPromotion}
                        promotion={promotion}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="grid gap-3 md:hidden">
            {openPromotions.map((promotion) => (
              <Card className="shadow-none" key={promotion.promotion_id}>
                <CardHeader className="gap-3">
                  <Button
                    className="grid h-auto justify-start gap-1 p-0 text-left"
                    onClick={() => onSelectPromotion(promotion.promotion_id)}
                    size="sm"
                    type="button"
                    variant="link"
                  >
                    <CardTitle className="text-base">{promotion.marketing_theme}</CardTitle>
                    <CardDescription>{formatChannelLabel(promotion.channel)}</CardDescription>
                  </Button>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 text-sm">
                  <SummaryItem label="상태" value={formatStatusLabel(promotion.status)} />
                  <SummaryItem
                    label="세그먼트"
                    value={formatInteger(promotion.target_segment_count)}
                  />
                  <SummaryItem label="실험" value={formatInteger(promotion.ad_experiment_count)} />
                  <PromotionRowActions
                    onDelete={onDeletePromotion}
                    onEdit={onEditPromotion}
                    promotion={promotion}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function PromotionRowActions({
  onDelete,
  onEdit,
  promotion
}: {
  onDelete: (promotionId: string) => void;
  onEdit: (promotionId: string) => void;
  promotion: DashboardCampaignPromotion;
}) {
  return (
    <div className="col-span-full flex w-full flex-nowrap items-center justify-end gap-2">
      <Button
        className="flex-1 md:flex-none"
        onClick={() => onEdit(promotion.promotion_id)}
        size="sm"
        type="button"
        variant="outline"
      >
        프로모션 수정
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button className="flex-1 md:flex-none" size="sm" type="button" variant="outline">
            프로모션 삭제
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>프로모션을 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              {promotion.marketing_theme} 프로모션과 연결된 세그먼트, 광고 소재, 실험이 모두
              사라지고 되돌릴 수 없어요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(promotion.promotion_id)}
              variant="destructive"
            >
              프로모션 삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function PromotionEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <EntityWorkspaceEmptyState
      actionLabel="프로모션 만들기"
      description="프로모션을 만들면 세그먼트와 실험을 설정할 수 있어요."
      guideCards={[
        {
          icon: <Target className="size-5" />,
          title: "빠른 설정",
          value: "프로모션을 만들면 바로 관리 화면으로 이동해요."
        },
        {
          icon: <Users className="size-5" />,
          title: "대상 설정",
          value: "프로모션을 보여 줄 고객을 세그먼트로 정할 수 있어요."
        },
        {
          icon: <BarChart3 className="size-5" />,
          title: "성과 확인",
          value: "프로모션을 만든 뒤 실시간 성과를 확인할 수 있어요."
        }
      ]}
      onAction={onAdd}
      title="아직 만든 프로모션이 없어요."
    />
  );
}

export function PromotionTabWorkspace({
  archiveScopedSegmentIsPending,
  approveContentCandidateIsPending,
  confirmIsPending,
  decideIsPending,
  deleteConfirmedSegmentIsPending,
  launchExperimentError,
  launchExperimentIsError,
  launchExperimentIsPending,
  launchExperimentResult,
  onArchiveScopedSegment,
  onContentCandidateSelectionChange,
  onConfirmSuggestions,
  onCreateScopedSegment,
  onDecideSuggestion,
  onDeleteConfirmedSegment,
  onLaunchExperiment,
  onRejectContentCandidate,
  onSelectSegment,
  onRecommendSegments,
  onStartGeneration,
  onTabChange,
  promotion,
  promotionExperiments,
  promotionAnalysisIsPending,
  promotionGenerationIsPending,
  rejectContentCandidateIsPending,
  scopedSegmentCreateIsPending,
  scopedSegments,
  scopedSegmentsIsLoading,
  segmentView,
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
  launchExperimentError: Error | null;
  launchExperimentIsError: boolean;
  launchExperimentIsPending: boolean;
  launchExperimentResult: PromotionExperimentLaunchResult | null;
  onArchiveScopedSegment: (segmentId: string) => void;
  onContentCandidateSelectionChange: (
    promotionId: string,
    segmentId: string,
    contentId: string,
    selected: boolean
  ) => void;
  onConfirmSuggestions: () => void;
  onCreateScopedSegment: (form: PromotionSegmentCreateFormState) => void;
  onDecideSuggestion: (
    suggestionId: string,
    status: "suggested" | "accepted" | "dismissed"
  ) => void;
  onDeleteConfirmedSegment: (promotionId: string, segmentId: string) => void;
  onLaunchExperiment: (
    promotionId: string,
    segmentId: string,
    analysisId?: string,
    generationId?: string
  ) => void;
  onRejectContentCandidate: (promotionId: string, segmentId: string, contentId: string) => void;
  onSelectSegment: (promotionId: string, segmentId: string) => void;
  onRecommendSegments: () => void;
  onStartGeneration: (analysisId: string) => void;
  onTabChange: (tab: PromotionWorkspaceTab) => void;
  promotion: DashboardCampaignPromotion;
  promotionExperiments: DashboardAdExperiment[];
  promotionAnalysisIsPending: boolean;
  promotionGenerationIsPending: boolean;
  rejectContentCandidateIsPending: boolean;
  scopedSegmentCreateIsPending: boolean;
  scopedSegments: DashboardPromotionScopedSegmentDefinition[];
  scopedSegmentsIsLoading: boolean;
  segmentView: SegmentWorkspaceView;
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
  const showsOverviewTab = visibleTabs.includes("overview");
  const showsSegmentsTab = visibleTabs.includes("segments");
  const showsSegmentDetailTab = visibleTabs.includes("segment-detail");
  const showsPromotionSummary = showsOverviewTab;
  return (
    <section className="grid gap-5">
      {showsPromotionSummary ? (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="grid gap-1">
              <div className="text-sm font-medium text-primary">프로모션 보기</div>
              <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                {promotion.marketing_theme}
              </h2>
              <p className="text-sm text-muted-foreground">
                {formatChannelLabel(promotion.channel)}
              </p>
            </div>
            <Badge variant={statusBadgeVariant(promotion.status)}>
              {formatStatusLabel(promotion.status)}
            </Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-5">
            <PromotionMetricCard
              label="목표 지표"
              value={formatMetricLabel(promotion.goal_metric)}
            />
            <PromotionMetricCard
              label="목표값"
              value={formatGoalValue(promotion.goal_target_value)}
            />
            <PromotionMetricCard
              label="현재값"
              value={
                promotion.latest_actual_value === null
                  ? "-"
                  : formatGoalValue(promotion.latest_actual_value)
              }
            />
            <PromotionMetricCard label="세그먼트" value={formatInteger(activeSegments.length)} />
            <PromotionMetricCard
              label="실험"
              value={formatInteger(promotion.ad_experiment_count)}
            />
          </div>
        </>
      ) : null}
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
                onRecommendSegments={onRecommendSegments}
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
              generationIsPending={promotionGenerationIsPending}
              isError={selectedSegmentDetailIsError}
              isLoading={selectedSegmentDetailIsLoading}
              launchExperimentError={launchExperimentError}
              launchExperimentIsError={launchExperimentIsError}
              onContentCandidateSelectionChange={onContentCandidateSelectionChange}
              onLaunchExperiment={onLaunchExperiment}
              onRejectContentCandidate={onRejectContentCandidate}
              onStartGeneration={onStartGeneration}
              promotionExperiments={promotionExperiments}
              rejectContentCandidateIsPending={rejectContentCandidateIsPending}
              view={segmentView}
              selectedSegmentId={selectedSegmentId}
              launchExperimentIsPending={launchExperimentIsPending}
              launchExperimentResult={launchExperimentResult}
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
          <CardTitle>프로모션 사용자 경로 효율</CardTitle>
          <CardDescription>프로모션 목표와 반복 실행 결과를 함께 보여 줘요.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <PromotionProgressRow
            label="목표 달성"
            value={Math.min((promotion.latest_actual_value ?? 0) * 100, 100)}
          />
          <PromotionProgressRow
            label="반복 실험"
            value={
              promotion.max_loop_count > 0
                ? Math.min((promotion.current_loop_count / promotion.max_loop_count) * 100, 100)
                : 0
            }
          />
          <div className="grid gap-3 md:grid-cols-3">
            <SummaryItem label="목표 기준" value={formatBasisLabel(promotion.goal_basis)} />
            <SummaryItem label="최소 평가 대상" value={formatInteger(promotion.min_sample_size)} />
            <SummaryItem label="다음 할 일" value={formatActionLabel(promotion.next_action)} />
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
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid gap-1">
          <CardTitle className="text-base">확정 세그먼트</CardTitle>
          <CardDescription>이 프로모션에 연결된 세그먼트예요.</CardDescription>
        </div>
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
                    <Badge variant="secondary">{formatInteger(loopCount)}번째 실험</Badge>
                    {loopCount > 1 ? <Badge variant="default">반복 실험</Badge> : null}
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
                      `${formatInteger(segment.estimated_size)}명 · 평가 대상 ${formatInteger(
                        segment.sample_size
                      )} · ${formatMetricLabel(segment.goal_metric)}`}
                    {hiddenLoopCount > 0
                      ? ` · 이전 실험 ${formatInteger(hiddenLoopCount)}개 숨김`
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
                    광고 소재 · 실험
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
                          {segment.segment_name} 세그먼트가 이 프로모션에서 사라지고 되돌릴 수
                          없어요.
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
                          확정 세그먼트 삭제
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
  generationIsPending,
  isError,
  isLoading,
  launchExperimentError,
  launchExperimentIsError,
  launchExperimentIsPending,
  launchExperimentResult,
  onContentCandidateSelectionChange,
  onLaunchExperiment,
  onRejectContentCandidate,
  onStartGeneration,
  promotionExperiments,
  rejectContentCandidateIsPending,
  selectedSegmentId,
  view
}: {
  approveContentCandidateIsPending: boolean;
  detail: DashboardSegmentDetail | undefined;
  generationIsPending: boolean;
  isError: boolean;
  isLoading: boolean;
  launchExperimentError: Error | null;
  launchExperimentIsError: boolean;
  launchExperimentIsPending: boolean;
  launchExperimentResult: PromotionExperimentLaunchResult | null;
  onContentCandidateSelectionChange: (
    promotionId: string,
    segmentId: string,
    contentId: string,
    selected: boolean
  ) => void;
  onLaunchExperiment: (
    promotionId: string,
    segmentId: string,
    analysisId?: string,
    generationId?: string
  ) => void;
  onRejectContentCandidate: (promotionId: string, segmentId: string, contentId: string) => void;
  onStartGeneration: (analysisId: string) => void;
  promotionExperiments: DashboardAdExperiment[];
  rejectContentCandidateIsPending: boolean;
  selectedSegmentId: string;
  view: SegmentWorkspaceView;
}) {
  if (!selectedSegmentId) {
    return <EmptyState message="세그먼트를 선택해 주세요." />;
  }
  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>세그먼트 정보를 불러올 수 없어요</AlertTitle>
        <AlertDescription>
          세그먼트를 다시 선택해 주세요. 같은 문제가 계속되면 잠시 후 다시 시도해 주세요.
        </AlertDescription>
      </Alert>
    );
  }
  if (isLoading || !detail) {
    return (
      <Card className="shadow-none" role="status">
        <CardContent className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Spinner aria-hidden="true" className="size-5" />
          {generationIsPending ? "광고 소재를 만드는 중…" : "세그먼트 정보를 불러오는 중…"}
        </CardContent>
      </Card>
    );
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
          <SummaryItem label="평가 대상" value={formatInteger(detail.segment.sample_size)} />
          <SummaryItem label="대상 비율" value={formatPercentValue(detail.segment.sample_ratio)} />
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
            label="광고 소재 후보"
            value={formatInteger(detail.content_candidates.length)}
          />
          <SummaryItem
            label="실시간 이벤트"
            value={formatInteger(detail.realtime_metrics.total_event_count)}
          />
        </CardContent>
      </Card>

      {view === "experiments" ? (
        <section className="grid gap-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="grid gap-1">
              <h3 className="text-base font-semibold">이 세그먼트의 광고 소재</h3>
              <p className="text-sm text-muted-foreground">
                이 세그먼트에 사용할 광고 소재 후보를 확인하고 하나를 선택해 주세요.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={
                  generationIsPending ||
                  !detail.segment.analysis_id ||
                  hasGeneratedContentCandidates
                }
                onClick={() => onStartGeneration(detail.segment.analysis_id)}
                type="button"
                variant="outline"
              >
                {generationIsPending ? (
                  <Spinner aria-hidden="true" className="mr-2 size-4" />
                ) : (
                  <ImageIcon className="mr-2 size-4" />
                )}
                {generationIsPending
                  ? "광고 소재 만드는 중…"
                  : hasGeneratedContentCandidates
                    ? "광고 소재 생성 완료"
                    : "광고 소재 만들기"}
              </Button>
            </div>
          </div>
          <div className="grid gap-3">
            {detail.content_candidates.length > 0 ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {detail.content_candidates.map((candidate) => {
                  const hasDifferentApprovedCandidate = Boolean(
                    approvedContentCandidate &&
                    approvedContentCandidate.content_id !== candidate.content_id
                  );
                  const selectionId = `content-candidate-selection-${candidate.content_id}`;
                  const selectionReason = contentCandidateSelectionReason(
                    candidate.status,
                    approveContentCandidateIsPending,
                    hasDifferentApprovedCandidate
                  );

                  return (
                    <Card className="shadow-none" key={candidate.content_id}>
                      <CardHeader className="grid gap-3">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="grid min-w-0 gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline">
                                {formatChannelLabel(candidate.channel)}
                              </Badge>
                              <Badge variant={statusBadgeVariant(candidate.status)}>
                                {formatStatusLabel(candidate.status)}
                              </Badge>
                            </div>
                            <CardTitle className="break-words text-base">
                              {contentCandidateTitle(candidate)}
                            </CardTitle>
                          </div>
                          <div className="flex shrink-0 flex-wrap items-center gap-2">
                            <Field
                              className={buttonVariants({
                                className: "w-auto gap-2",
                                size: "sm",
                                variant: "outline"
                              })}
                              data-disabled={
                                approveContentCandidateIsPending ||
                                hasDifferentApprovedCandidate ||
                                candidate.status === "rejected"
                              }
                              orientation="horizontal"
                            >
                              <Checkbox
                                aria-describedby={`${selectionId}-reason`}
                                aria-label={`${contentCandidateTitle(candidate)} 광고 소재 선택`}
                                checked={candidate.status === "approved"}
                                disabled={
                                  approveContentCandidateIsPending ||
                                  hasDifferentApprovedCandidate ||
                                  candidate.status === "rejected"
                                }
                                id={selectionId}
                                onCheckedChange={(checked) =>
                                  onContentCandidateSelectionChange(
                                    detail.segment.promotion_id,
                                    detail.segment.segment_id,
                                    candidate.content_id,
                                    checked === true
                                  )
                                }
                              />
                              <FieldLabel
                                className="cursor-pointer text-[0.8rem] font-medium"
                                htmlFor={selectionId}
                              >
                                {candidate.status === "approved"
                                  ? "광고 소재 선택됨"
                                  : hasDifferentApprovedCandidate
                                    ? "다른 광고 소재 선택됨"
                                    : "광고 소재 선택"}
                              </FieldLabel>
                            </Field>
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
                              {candidate.status === "rejected"
                                ? "광고 소재 거절됨"
                                : "광고 소재 거절"}
                            </Button>
                          </div>
                        </div>
                        <p
                          aria-live="polite"
                          className="text-xs leading-5 text-muted-foreground"
                          id={`${selectionId}-reason`}
                        >
                          {selectionReason}
                        </p>
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
                            label="버튼 / 연결 페이지"
                            value={[
                              candidate.cta ?? "-",
                              candidate.landing_url ?? "연결 페이지가 없어요"
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
              <EmptyState message="아직 만든 광고 소재가 없어요." />
            )}
          </div>
        </section>
      ) : null}

      {view === "experiments" ? (
        <SegmentConnectedExperimentsCard
          detail={detail}
          launchExperimentError={launchExperimentError}
          launchExperimentIsError={launchExperimentIsError}
          launchExperimentIsPending={launchExperimentIsPending}
          launchExperimentResult={launchExperimentResult}
          onLaunchExperiment={onLaunchExperiment}
          promotionExperiments={promotionExperiments}
        />
      ) : null}
    </section>
  );
}

function contentCandidateSelectionReason(
  status: string,
  isPending: boolean,
  hasDifferentApprovedCandidate: boolean
) {
  if (isPending) {
    return "광고 소재 선택 상태를 저장하고 있어요. 저장이 끝나면 다른 소재를 선택할 수 있어요.";
  }
  if (status === "rejected") {
    return "거절한 광고 소재는 선택할 수 없어요. 다른 소재를 선택해 주세요.";
  }
  if (hasDifferentApprovedCandidate) {
    return "한 세그먼트에는 광고 소재를 1개만 선택할 수 있어요. 다른 소재를 사용하려면 현재 선택을 먼저 해제해 주세요.";
  }
  if (status === "approved") {
    return "이 광고 소재가 다음 실험에 사용돼요. 다른 소재로 바꾸려면 먼저 선택을 해제해 주세요.";
  }
  return "이 광고 소재를 선택하면 다음 실험에 사용돼요.";
}

function SegmentConnectedExperimentsCard({
  detail,
  launchExperimentError,
  launchExperimentIsError,
  launchExperimentIsPending,
  launchExperimentResult,
  onLaunchExperiment,
  promotionExperiments
}: {
  detail: DashboardSegmentDetail;
  launchExperimentError: Error | null;
  launchExperimentIsError: boolean;
  launchExperimentIsPending: boolean;
  launchExperimentResult: PromotionExperimentLaunchResult | null;
  onLaunchExperiment: (
    promotionId: string,
    segmentId: string,
    analysisId?: string,
    generationId?: string
  ) => void;
  promotionExperiments: DashboardAdExperiment[];
}) {
  const approvedContentCandidate = detail.content_candidates.find(
    (candidate) => candidate.status === "approved"
  );
  const activePromotionRunId = detail.ad_experiments[0]?.promotion_run_id ?? null;
  const activeRunExperiments = activePromotionRunId
    ? promotionExperiments.filter(
        (experiment) => experiment.promotion_run_id === activePromotionRunId
      )
    : [];
  const requiredActiveRunExperiments = activeRunExperiments.filter(
    (experiment) =>
      experiment.segment_id === detail.segment.segment_id ||
      (experiment.is_fallback && experiment.assignment_count > 0)
  );
  const launchNeedsRetry =
    launchExperimentResult?.promotionRunId === activePromotionRunId &&
    (launchExperimentResult.dispatchFailed ||
      launchExperimentResult.failedExperimentIds.length > 0);
  const isExperimentRunning =
    requiredActiveRunExperiments.length > 0 &&
    requiredActiveRunExperiments.every((experiment) => experiment.status === "running") &&
    !launchNeedsRetry;
  const canLaunchExperiment =
    launchNeedsRetry ||
    (!activePromotionRunId && Boolean(approvedContentCandidate)) ||
    requiredActiveRunExperiments.some((experiment) => canStartAdExperiment(experiment.status));
  return (
    <Card className="shadow-none">
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="grid gap-1">
          <CardTitle className="text-base">연결된 광고 실험</CardTitle>
          <CardDescription>
            선택한 광고 소재로 실험을 시작해요. 성과 평가는 실험 관리에서 할 수 있어요.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={launchExperimentIsPending || isExperimentRunning || !canLaunchExperiment}
            onClick={() => {
              onLaunchExperiment(
                detail.segment.promotion_id,
                detail.segment.segment_id,
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
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        {launchExperimentResult?.dispatchFailed ? (
          <Alert variant="destructive">
            <AlertTitle>실험은 시작했지만 광고를 보내지 못했어요</AlertTitle>
            <AlertDescription>
              시작된 실험은 유지돼요. 실험 관리에서 발송 상태를 확인해 주세요.
            </AlertDescription>
          </Alert>
        ) : null}
        {launchExperimentResult && launchExperimentResult.failedExperimentIds.length > 0 ? (
          <Alert>
            <AlertTitle>일부 실험만 시작됐어요</AlertTitle>
            <AlertDescription>
              {formatInteger(launchExperimentResult.startedExperimentIds.length)}개는 시작했고,{" "}
              {formatInteger(launchExperimentResult.failedExperimentIds.length)}개는 시작하지
              못했어요. 실험 시작을 다시 누르면 실패한 항목만 다시 시도해요.
            </AlertDescription>
          </Alert>
        ) : null}
        {launchExperimentIsError ? (
          <Alert variant="destructive">
            <AlertTitle>실험을 시작하지 못했어요</AlertTitle>
            <AlertDescription>{mutationErrorMessage(launchExperimentError)}</AlertDescription>
          </Alert>
        ) : null}
        {detail.ad_experiments.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>실험</TableHead>
                <TableHead>광고 소재</TableHead>
                <TableHead>채널</TableHead>
                <TableHead>반복 횟수</TableHead>
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
          <EmptyState message="아직 연결된 광고 실험이 없어요." />
        )}
      </CardContent>
    </Card>
  );
}

function PromotionMetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="min-h-28 justify-between bg-[#f5f5f7] py-5">
      <CardContent className="grid h-full content-between">
        <div className="text-sm font-medium text-muted-foreground">{label}</div>
        <div className="truncate text-2xl font-semibold text-foreground">{value}</div>
      </CardContent>
    </Card>
  );
}

function PromotionProgressRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums">{formatInteger(value)}%</span>
      </div>
      <Progress
        aria-label={`${label} ${formatInteger(value)}%`}
        aria-valuenow={value}
        className="h-3"
        value={Math.max(value, 4)}
      />
    </div>
  );
}

function experimentDisplayName(loopCount: number | null | undefined, index = 0) {
  const loopLabel = loopCount ? `${formatInteger(loopCount)}차` : `${formatInteger(index + 1)}번`;
  return `${loopLabel} 광고 실험`;
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
