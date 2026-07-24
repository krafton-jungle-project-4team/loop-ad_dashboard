import {
  DASHBOARD_FALLBACK_SEGMENT_ID,
  type DashboardEvaluateAdExperimentResult,
  type DashboardExperimentEvaluationDiagnosis,
  type DashboardProjectExperimentLatestEvaluation,
  type DashboardProjectExperiment
} from "@loopad/shared";
import { CartesianGrid, LabelList, Line, LineChart, XAxis, YAxis } from "@loopad/ui/charts";
import { Alert, AlertDescription, AlertTitle } from "@loopad/ui/shadcn/alert";
import { Badge } from "@loopad/ui/shadcn/badge";
import { Button } from "@loopad/ui/shadcn/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@loopad/ui/shadcn/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@loopad/ui/shadcn/chart";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from "@loopad/ui/shadcn/dropdown-menu";
import { Field, FieldLabel } from "@loopad/ui/shadcn/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@loopad/ui/shadcn/select";
import { Spinner } from "@loopad/ui/shadcn/spinner";
import { Progress } from "@loopad/ui/shadcn/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@loopad/ui/shadcn/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@loopad/ui/shadcn/tabs";
import { cn } from "@loopad/ui/shadcn/utils";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  Plus,
  RefreshCw,
  Sparkles,
  TrendingDown
} from "lucide-react";
import { useEffect, useMemo } from "react";
import {
  formatDateTime,
  formatInteger,
  formatMoney,
  formatPercent
} from "../../../../../../model/dashboard-format.js";
import {
  formatChannelLabel,
  formatMetricLabel,
  formatStatusLabel
} from "../../../../../../model/dashboard-labels.js";
import { useDashboardQueryState } from "../../../../../../model/dashboard-query.js";
import type { DashboardQuery } from "../../../../../../model/dashboard-types.js";
import { EmptyState } from "../../../../../shared/EmptyState.js";
import { formatGoalValue, statusBadgeVariant, toErrorMessage } from "../experimentUtils.js";
import {
  filterProjectExperiments,
  normalizeProjectExperimentFilters,
  paginateProjectExperiments,
  projectExperimentPageSizeOptions,
  projectExperimentSelectionQuery,
  repeatCreativeTargetForExperiment,
  type RepeatCreativePreparationInput,
  userVisibleProjectExperiments,
  uniqueProjectExperimentValues
} from "../projectExperimentUtils.js";

export function ProjectExperimentWorkspace({
  evaluationRefreshError,
  evaluationRefreshIsError,
  evaluationRefreshIsPending,
  evaluationRefreshResult,
  evaluationRefreshTargetId,
  experiments,
  isLoading,
  onPrepareRepeatCreatives,
  onRefreshEvaluation,
  prepareRepeatCreativesError,
  prepareRepeatCreativesIsError,
  prepareRepeatCreativesIsPending,
  prepareRepeatCreativesVariables,
  query
}: {
  evaluationRefreshError: unknown;
  evaluationRefreshIsError: boolean;
  evaluationRefreshIsPending: boolean;
  evaluationRefreshResult: DashboardEvaluateAdExperimentResult | null;
  evaluationRefreshTargetId: string | null;
  experiments: DashboardProjectExperiment[];
  isLoading: boolean;
  onPrepareRepeatCreatives: (input: RepeatCreativePreparationInput) => void;
  onRefreshEvaluation: (experiment: DashboardProjectExperiment) => void;
  prepareRepeatCreativesError: unknown;
  prepareRepeatCreativesIsError: boolean;
  prepareRepeatCreativesIsPending: boolean;
  prepareRepeatCreativesVariables: RepeatCreativePreparationInput | null;
  query: DashboardQuery;
}) {
  const [, setDashboardQueryState] = useDashboardQueryState();
  const visibleExperiments = useMemo(
    () => userVisibleProjectExperiments(experiments),
    [experiments]
  );
  const filters = useMemo(
    () =>
      normalizeProjectExperimentFilters(visibleExperiments, {
        campaignId: query.selectedCampaignId || "all",
        promotionId: "all",
        status: query.experimentStatusFilter || "all"
      }),
    [visibleExperiments, query.experimentStatusFilter, query.selectedCampaignId]
  );
  const pageSize = projectExperimentPageSizeOptions.includes(
    query.experimentPageSize as (typeof projectExperimentPageSizeOptions)[number]
  )
    ? (query.experimentPageSize as (typeof projectExperimentPageSizeOptions)[number])
    : 10;
  const filteredExperiments = useMemo(
    () => filterProjectExperiments(visibleExperiments, filters),
    [visibleExperiments, filters]
  );
  const pagination = useMemo(
    () => paginateProjectExperiments(filteredExperiments, query.experimentPage, pageSize),
    [filteredExperiments, pageSize, query.experimentPage]
  );
  const selectedExperiment =
    visibleExperiments.find(
      (experiment) => experiment.ad_experiment_id === query.selectedAdExperimentId
    ) ?? null;
  const campaigns = uniqueEntities(
    visibleExperiments.map((experiment) => ({
      id: experiment.campaign_id,
      name: experiment.campaign_name
    }))
  );
  const statuses = uniqueProjectExperimentValues(
    visibleExperiments.map((experiment) => experiment.status)
  );

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const nextQuery: Partial<DashboardQuery> = {};
    const normalizedCampaignId = filters.campaignId === "all" ? "" : filters.campaignId;

    if (normalizedCampaignId !== query.selectedCampaignId) {
      nextQuery.selectedCampaignId = normalizedCampaignId;
      nextQuery.selectedPromotionId = "";
      nextQuery.selectedSegmentId = "";
      nextQuery.selectedAdExperimentId = "";
      nextQuery.experimentPage = 1;
    }
    if (filters.promotionId !== query.experimentPromotionFilter) {
      nextQuery.experimentPromotionFilter = filters.promotionId;
      nextQuery.experimentPage = 1;
    }
    if (filters.status !== query.experimentStatusFilter) {
      nextQuery.experimentStatusFilter = filters.status;
      nextQuery.experimentPage = 1;
    }
    if (pageSize !== query.experimentPageSize) {
      nextQuery.experimentPageSize = pageSize;
      nextQuery.experimentPage = 1;
    }
    if (!nextQuery.experimentPage && pagination.page !== query.experimentPage) {
      nextQuery.experimentPage = pagination.page;
    }
    if (query.selectedAdExperimentId && !selectedExperiment) {
      nextQuery.selectedAdExperimentId = "";
    }

    if (Object.keys(nextQuery).length > 0) {
      void setDashboardQueryState(nextQuery, { history: "replace" });
    }
  }, [
    filters.campaignId,
    filters.promotionId,
    filters.status,
    isLoading,
    pageSize,
    pagination.page,
    query.experimentPage,
    query.experimentPageSize,
    query.experimentPromotionFilter,
    query.experimentStatusFilter,
    query.selectedAdExperimentId,
    query.selectedCampaignId,
    selectedExperiment,
    setDashboardQueryState
  ]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>프로젝트 실험을 불러오는 중</CardTitle>
          <CardDescription>잠시만 기다려 주세요.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const runningCount = visibleExperiments.filter(
    (experiment) => experiment.status === "running"
  ).length;
  const nextLoopCount = visibleExperiments.filter(
    (experiment) => experiment.latest_evaluation?.next_loop_required
  ).length;
  const latestUpdatedAt = visibleExperiments.reduce<string | null>((latest, experiment) => {
    if (!latest || Date.parse(experiment.updated_at) > Date.parse(latest)) {
      return experiment.updated_at;
    }
    return latest;
  }, null);

  return (
    <>
      <ExperimentOverviewStrip
        latestUpdatedAt={latestUpdatedAt}
        nextLoopCount={nextLoopCount}
        runningCount={runningCount}
        totalCount={visibleExperiments.length}
      />

      <Card>
        <CardHeader className="gap-4">
          <div className="grid gap-1">
            <CardTitle>프로젝트 실험</CardTitle>
            <CardDescription>
              실험을 선택하면 아래에서 결과와 다음 행동을 확인할 수 있어요.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          {visibleExperiments.length === 0 ? (
            <EmptyState message="아직 시작한 실험이 없어요." />
          ) : (
            <div className="grid gap-4">
              <ProjectExperimentTable
                campaignFilterOptions={campaigns}
                campaignFilterValue={filters.campaignId}
                onCampaignFilterChange={(value) => {
                  void setDashboardQueryState({
                    experimentPage: 1,
                    experimentPromotionFilter: "all",
                    selectedAdExperimentId: "",
                    selectedCampaignId: value === "all" ? "" : value,
                    selectedPromotionId: "",
                    selectedSegmentId: ""
                  });
                }}
                onSelect={(experiment) => {
                  void setDashboardQueryState(projectExperimentSelectionQuery(experiment));
                }}
                onStatusFilterChange={(value) => {
                  void setDashboardQueryState({
                    experimentPage: 1,
                    experimentStatusFilter: value,
                    selectedAdExperimentId: "",
                    selectedPromotionId: "",
                    selectedSegmentId: ""
                  });
                }}
                rows={pagination.rows}
                selectedExperimentId={query.selectedAdExperimentId}
                statusFilterOptions={statuses.map((status) => ({
                  id: status,
                  name: formatStatusLabel(status)
                }))}
                statusFilterValue={filters.status}
              />
              {filteredExperiments.length > 0 ? (
                <ProjectExperimentPagination
                  onPageChange={(page) => {
                    void setDashboardQueryState({ experimentPage: page });
                  }}
                  onPageSizeChange={(nextPageSize) => {
                    void setDashboardQueryState({
                      experimentPage: 1,
                      experimentPageSize: nextPageSize
                    });
                  }}
                  page={pagination.page}
                  pageCount={pagination.pageCount}
                  pageSize={pageSize}
                  totalCount={filteredExperiments.length}
                />
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedExperiment ? (
        <SelectedProjectExperimentDetail
          evaluationRefreshError={evaluationRefreshError}
          evaluationRefreshIsError={evaluationRefreshIsError}
          evaluationRefreshIsPending={evaluationRefreshIsPending}
          evaluationRefreshResult={evaluationRefreshResult}
          evaluationRefreshTargetId={evaluationRefreshTargetId}
          experiment={selectedExperiment}
          experiments={visibleExperiments}
          onPrepareRepeatCreatives={onPrepareRepeatCreatives}
          onRefreshEvaluation={onRefreshEvaluation}
          prepareRepeatCreativesError={prepareRepeatCreativesError}
          prepareRepeatCreativesIsError={prepareRepeatCreativesIsError}
          prepareRepeatCreativesIsPending={prepareRepeatCreativesIsPending}
          prepareRepeatCreativesVariables={prepareRepeatCreativesVariables}
        />
      ) : null}
    </>
  );
}

function retryableActionErrorMessage(error: unknown): string {
  const message = toErrorMessage(error);
  return message.includes("다시 시도") ? message : `${message} 잠시 후 다시 시도해 주세요.`;
}

function ExperimentColumnFilter({
  label,
  menuLabel,
  onValueChange,
  options,
  placeholder,
  value
}: {
  label: string;
  menuLabel: string;
  onValueChange: (value: string) => void;
  options: Array<{ id: string; name: string }>;
  placeholder: string;
  value: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`${label} 필터 열기`}
          className="-ml-3 h-8 px-3"
          size="sm"
          type="button"
          variant="ghost"
        >
          {label}
          <ChevronDown aria-hidden="true" data-icon="inline-end" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-52">
        <DropdownMenuLabel>{menuLabel}</DropdownMenuLabel>
        <DropdownMenuRadioGroup onValueChange={onValueChange} value={value}>
          <DropdownMenuRadioItem value="all">{placeholder}</DropdownMenuRadioItem>
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.id} value={option.id}>
              {option.name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ProjectExperimentTable({
  campaignFilterOptions,
  campaignFilterValue,
  onCampaignFilterChange,
  onSelect,
  onStatusFilterChange,
  rows,
  selectedExperimentId,
  statusFilterOptions,
  statusFilterValue
}: {
  campaignFilterOptions: Array<{ id: string; name: string }>;
  campaignFilterValue: string;
  onCampaignFilterChange: (value: string) => void;
  onSelect: (experiment: DashboardProjectExperiment) => void;
  onStatusFilterChange: (value: string) => void;
  rows: DashboardProjectExperiment[];
  selectedExperimentId: string;
  statusFilterOptions: Array<{ id: string; name: string }>;
  statusFilterValue: string;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border">
      <Table className="min-w-[920px]">
        <TableHeader>
          <TableRow>
            <TableHead>
              <ExperimentColumnFilter
                label="캠페인 / 프로모션"
                menuLabel="캠페인 선택"
                onValueChange={onCampaignFilterChange}
                options={campaignFilterOptions}
                placeholder="전체 캠페인"
                value={campaignFilterValue}
              />
            </TableHead>
            <TableHead>
              <ExperimentColumnFilter
                label="실행 상태"
                menuLabel="실행 상태 선택"
                onValueChange={onStatusFilterChange}
                options={statusFilterOptions}
                placeholder="전체 상태"
                value={statusFilterValue}
              />
            </TableHead>
            <TableHead>고객군</TableHead>
            <TableHead>실험결과 / 목표</TableHead>
            <TableHead>판단</TableHead>
            <TableHead>업데이트</TableHead>
            <TableHead className="w-40 pl-7">상세</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell className="p-4" colSpan={7}>
                <EmptyState message="조건에 맞는 실험이 없어요." />
              </TableCell>
            </TableRow>
          ) : null}
          {rows.map((experiment) => {
            const evaluation = experiment.latest_evaluation;
            const isSelected = experiment.ad_experiment_id === selectedExperimentId;

            return (
              <TableRow
                aria-selected={isSelected}
                className={cn(
                  "[&>td:first-child]:border-l-[3px] [&>td:first-child]:border-l-transparent",
                  isSelected
                    ? "bg-primary/[0.06]! [&>td:first-child]:border-l-primary"
                    : "bg-transparent!"
                )}
                key={experiment.ad_experiment_id}
              >
                <TableCell>
                  <div className="grid min-w-52 gap-0.5">
                    <span className="font-medium">{experiment.campaign_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {experiment.promotion_name}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant={statusBadgeVariant(experiment.status)}>
                      {formatStatusLabel(experiment.status)}
                    </Badge>
                    <Badge variant="outline">
                      {experiment.execution_mode === "automatic" ? "자동 반복" : "수동 반복"}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>{experiment.segment_name}</TableCell>
                <TableCell className="tabular-nums">
                  <MetricPair
                    left={formatGoalValue(evaluation?.actual_value ?? null)}
                    right={formatGoalValue(
                      evaluation?.target_value ?? experiment.goal_target_value
                    )}
                  />
                </TableCell>
                <TableCell>
                  <Badge variant={statusBadgeVariant(evaluation?.status ?? "not_evaluated")}>
                    {formatStatusLabel(evaluation?.status ?? "not_evaluated")}
                  </Badge>
                </TableCell>
                <TableCell className="tabular-nums">
                  {formatDateTime(experiment.updated_at)}
                </TableCell>
                <TableCell className="w-40">
                  <Button
                    aria-label={`${experiment.segment_name} ${experiment.loop_count}번째 반복 실험 자세히 보기`}
                    aria-expanded={isSelected}
                    className="min-w-32 justify-between"
                    onClick={() => onSelect(experiment)}
                    size="sm"
                    type="button"
                    variant={isSelected ? "soft" : "outline"}
                  >
                    <span>{formatInteger(experiment.loop_count)}번째 실험</span>
                    <ChevronRight aria-hidden="true" data-icon="inline-end" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function SelectedProjectExperimentDetail({
  evaluationRefreshError,
  evaluationRefreshIsError,
  evaluationRefreshIsPending,
  evaluationRefreshResult,
  evaluationRefreshTargetId,
  experiment,
  experiments,
  onPrepareRepeatCreatives,
  onRefreshEvaluation,
  prepareRepeatCreativesError,
  prepareRepeatCreativesIsError,
  prepareRepeatCreativesIsPending,
  prepareRepeatCreativesVariables
}: {
  evaluationRefreshError: unknown;
  evaluationRefreshIsError: boolean;
  evaluationRefreshIsPending: boolean;
  evaluationRefreshResult: DashboardEvaluateAdExperimentResult | null;
  evaluationRefreshTargetId: string | null;
  experiment: DashboardProjectExperiment;
  experiments: DashboardProjectExperiment[];
  onPrepareRepeatCreatives: (input: RepeatCreativePreparationInput) => void;
  onRefreshEvaluation: (experiment: DashboardProjectExperiment) => void;
  prepareRepeatCreativesError: unknown;
  prepareRepeatCreativesIsError: boolean;
  prepareRepeatCreativesIsPending: boolean;
  prepareRepeatCreativesVariables: RepeatCreativePreparationInput | null;
}) {
  const evaluation = experiment.latest_evaluation;
  const repeatTarget = repeatCreativeTargetForExperiment(experiments, experiment);
  const hasRepeatTarget = repeatTarget.failedSegmentIds.length > 0;
  const canPrepareRepeatCreatives =
    experiment.execution_mode === "manual" &&
    experiment.loop_count < experiment.max_loop_count &&
    !experiment.next_loop &&
    hasRepeatTarget &&
    (evaluation?.next_loop_required === true || evaluation?.status === "goal_not_met");
  const shouldShowManualRepeatAction =
    experiment.execution_mode === "manual" &&
    !experiment.next_loop &&
    (evaluation?.next_loop_required === true || evaluation?.status === "goal_not_met");
  const isRepeatRequestForSelected =
    prepareRepeatCreativesVariables?.failedAdExperimentIds.some((adExperimentId) =>
      repeatTarget.failedAdExperimentIds.includes(adExperimentId)
    ) === true;
  const isPreparingRepeatCreativesForSelected =
    prepareRepeatCreativesIsPending && isRepeatRequestForSelected;
  const isRefreshingSelected =
    evaluationRefreshIsPending && evaluationRefreshTargetId === experiment.ad_experiment_id;
  const refreshedEvaluation =
    evaluationRefreshResult?.ad_experiment_id === experiment.ad_experiment_id
      ? evaluationRefreshResult
      : null;
  const refreshFailedForSelected =
    evaluationRefreshIsError && evaluationRefreshTargetId === experiment.ad_experiment_id;

  return (
    <Card>
      <CardHeader className="gap-4 border-b lg:grid-cols-[1fr_auto]">
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            <span>{experiment.campaign_name}</span>
            <ChevronRight className="size-3.5" />
            <span>{experiment.promotion_name}</span>
            <ChevronRight className="size-3.5" />
            <span>{experiment.segment_name}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{formatInteger(experiment.loop_count)}번째 반복 실험</CardTitle>
            <Badge variant={statusBadgeVariant(experiment.status)}>
              {formatStatusLabel(experiment.status)}
            </Badge>
            <Badge variant="outline">
              {experiment.execution_mode === "automatic"
                ? `자동 · ${formatInteger(experiment.loop_interval_value)}${experiment.loop_interval_unit === "hour" ? "시간" : "일"}`
                : "수동 반복"}
            </Badge>
          </div>
          <CardDescription>
            {formatMetricLabel(experiment.goal_metric)}을 높이기 위한 실험 결과예요.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          {experiment.segment_id !== DASHBOARD_FALLBACK_SEGMENT_ID ? (
            <Button
              aria-label={`${experiment.segment_name} 평가 갱신`}
              disabled={experiment.status !== "running" || evaluationRefreshIsPending}
              onClick={() => onRefreshEvaluation(experiment)}
              type="button"
              variant="outline"
            >
              {isRefreshingSelected ? (
                <Spinner aria-hidden="true" data-icon="inline-start" />
              ) : (
                <RefreshCw aria-hidden="true" data-icon="inline-start" />
              )}
              {isRefreshingSelected ? "평가 갱신 중…" : "평가 갱신"}
            </Button>
          ) : null}
          {shouldShowManualRepeatAction ? (
            <Button
              disabled={!canPrepareRepeatCreatives || prepareRepeatCreativesIsPending}
              onClick={() =>
                onPrepareRepeatCreatives({
                  ...repeatTarget,
                  campaignId: experiment.campaign_id,
                  promotionId: experiment.promotion_id
                })
              }
              type="button"
            >
              {isPreparingRepeatCreativesForSelected ? (
                <Spinner aria-hidden="true" data-icon="inline-start" />
              ) : (
                <Plus aria-hidden="true" data-icon="inline-start" />
              )}
              {isPreparingRepeatCreativesForSelected
                ? "다음 실험용 광고 만드는 중…"
                : "다음 실험 준비하기"}
            </Button>
          ) : experiment.execution_mode === "automatic" ? (
            <Badge className="px-3 py-2" variant="secondary">
              자동 반복 실행 중
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="grid gap-5">
        {refreshedEvaluation && !isRefreshingSelected && !refreshFailedForSelected ? (
          <Alert aria-live="polite">
            <AlertTitle>{experiment.segment_name} 평가를 갱신했어요</AlertTitle>
            <AlertDescription>이 고객군의 최신 실험 성과만 다시 계산했습니다.</AlertDescription>
          </Alert>
        ) : null}
        {refreshFailedForSelected ? (
          <Alert aria-live="polite" variant="destructive">
            <AlertTitle>{experiment.segment_name} 평가를 갱신하지 못했어요</AlertTitle>
            <AlertDescription>
              {retryableActionErrorMessage(evaluationRefreshError)}
            </AlertDescription>
          </Alert>
        ) : null}
        {prepareRepeatCreativesIsError && isRepeatRequestForSelected ? (
          <Alert aria-live="polite" variant="destructive">
            <AlertTitle>다음 실험용 광고를 만들지 못했어요</AlertTitle>
            <AlertDescription>
              {retryableActionErrorMessage(prepareRepeatCreativesError)}
            </AlertDescription>
          </Alert>
        ) : null}

        <Tabs defaultValue="summary">
          <TabsList aria-label="실험 결과 보기" variant="line">
            <TabsTrigger value="summary">요약</TabsTrigger>
            <TabsTrigger value="funnel">사용자 경로 분석</TabsTrigger>
            <TabsTrigger value="history">반복 이력</TabsTrigger>
          </TabsList>
          <TabsContent className="grid gap-4 pt-4" value="summary">
            <ExperimentResultSummary evaluation={evaluation} experiment={experiment} />
            <AudienceIntentAnalysisSection evaluation={evaluation} />
            <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(19rem,1fr)]">
              <EvaluationSummarySection evaluation={evaluation} />
              <NextExperimentPanel
                evaluation={evaluation}
                experiment={experiment}
                hasRepeatTarget={hasRepeatTarget}
              />
            </div>
          </TabsContent>
          <TabsContent className="pt-4" value="funnel">
            <EvaluationDiagnosisSection evaluation={evaluation} />
          </TabsContent>
          <TabsContent className="pt-4" value="history">
            <ExperimentRepeatHistory evaluation={evaluation} experiment={experiment} />
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter>
        <dl className="grid w-full gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
          <DefinitionItem label="노출 방식" value={formatChannelLabel(experiment.channel)} />
          <DefinitionItem label="시작" value={formatDateTime(experiment.started_at)} />
          <DefinitionItem label="종료" value={formatDateTime(experiment.ended_at)} />
          <DefinitionItem label="업데이트" value={formatDateTime(experiment.updated_at)} />
        </dl>
      </CardFooter>
    </Card>
  );
}

function AudienceIntentAnalysisSection({
  evaluation
}: {
  evaluation: DashboardProjectExperimentLatestEvaluation | null;
}) {
  const analysis = evaluation?.diagnosis?.audience_intent_analysis;
  if (!analysis) {
    return null;
  }

  const cohort = analysis.cohort_comparison;
  const bookingValue = analysis.booking_value_comparison;

  return (
    <section
      aria-labelledby="audience-intent-analysis-title"
      className="grid gap-5 border-y bg-muted/20 px-1 py-5 sm:px-4"
    >
      <header className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Sparkles aria-hidden="true" className="size-4 text-primary" />
          <span className="text-sm font-semibold text-primary">AI 원인 분석</span>
          <Badge variant="outline">관측 기반 가설</Badge>
        </div>
        <h3 className="text-lg font-semibold" id="audience-intent-analysis-title">
          {analysis.title}
        </h3>
        <div className="grid max-w-5xl gap-2 text-sm leading-6 text-foreground">
          {analysis.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="grid content-start gap-2 border-l-2 border-primary/50 pl-3">
          <h4 className="text-sm font-semibold">현재 예약 의도 차이</h4>
          <dl className="grid gap-1 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">반복 상세 조회 고객</dt>
              <dd className="font-semibold tabular-nums">
                {formatPercent(cohort.repeat_view_conversion_rate)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">그 외 고객</dt>
              <dd className="font-semibold tabular-nums">
                {formatPercent(cohort.comparison_conversion_rate)}
              </dd>
            </div>
          </dl>
          <p className="text-xs leading-5 text-muted-foreground">
            실험 전 {formatInteger(cohort.lookback_days)}일 행동을 기준으로 비교했습니다.
          </p>
        </div>

        <div className="grid content-start gap-2 border-l-2 border-border pl-3">
          <h4 className="text-sm font-semibold">예약 단계 금액</h4>
          {bookingValue ? (
            <dl className="grid gap-1 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">예약 이탈 고객 중앙값</dt>
                <dd className="font-semibold tabular-nums">
                  {formatMoney(bookingValue.abandoned_median_revenue)}원
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">예약 완료 고객 중앙값</dt>
                <dd className="font-semibold tabular-nums">
                  {formatMoney(bookingValue.completed_median_revenue)}원
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">
              비교할 수 있는 예약 금액 표본이 아직 충분하지 않습니다.
            </p>
          )}
        </div>

        <div className="grid content-start gap-3 border-l-2 border-primary/50 pl-3">
          <div className="flex items-center gap-2">
            <Lightbulb aria-hidden="true" className="size-4 text-primary" />
            <h4 className="text-sm font-semibold">다음 세그먼트 가설</h4>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {analysis.next_segment_hypothesis.condition_labels.map((label) => (
              <Badge key={label} variant="outline">
                {label}
              </Badge>
            ))}
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            {analysis.next_segment_hypothesis.validation_note}
          </p>
        </div>
      </div>
    </section>
  );
}

function ExperimentResultSummary({
  evaluation,
  experiment
}: {
  evaluation: DashboardProjectExperimentLatestEvaluation | null;
  experiment: DashboardProjectExperiment;
}) {
  if (!evaluation) {
    return (
      <Alert>
        <AlertTitle>아직 평가 결과가 없어요</AlertTitle>
        <AlertDescription>실험 데이터가 쌓이면 목표 달성 여부를 알려 드려요.</AlertDescription>
      </Alert>
    );
  }

  const isGoalMet = evaluation.status === "goal_met";
  const resultLabel = isGoalMet
    ? "목표 달성"
    : evaluation.status === "goal_not_met"
      ? "목표 미달"
      : formatStatusLabel(evaluation.status);
  const summary =
    evaluation.diagnosis?.summary ??
    evaluation.feedback ??
    "평가 결과를 바탕으로 다음 행동을 확인해 주세요.";

  return (
    <Alert className="gap-3 px-5 py-4" variant={isGoalMet ? "default" : "destructive"}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid gap-2">
          <span className="text-xs font-semibold">핵심 결과</span>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <AlertTitle className="text-2xl font-semibold">{resultLabel}</AlertTitle>
            <div className="flex items-baseline gap-2 tabular-nums text-foreground">
              <strong className="text-2xl font-semibold">
                실험결과 {formatGoalValue(evaluation.actual_value)}
              </strong>
              <span className="text-muted-foreground">
                / 목표 {formatGoalValue(evaluation.target_value ?? experiment.goal_target_value)}
              </span>
            </div>
          </div>
          <AlertDescription className="max-w-4xl text-foreground">{summary}</AlertDescription>
        </div>
        <Badge className="shrink-0" variant="outline">
          표본 {formatInteger(evaluation.sample_size)}명 ·{" "}
          {evaluation.diagnosis ? evidenceStrengthLabel(evaluation.diagnosis) : "평가 결과"}
        </Badge>
      </div>
    </Alert>
  );
}

function EvaluationSummarySection({
  evaluation
}: {
  evaluation: DashboardProjectExperimentLatestEvaluation | null;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>사용자 경로</CardTitle>
          {evaluation ? (
            <span className="text-xs text-muted-foreground">
              평가 기준 고객 {formatInteger(evaluation.sample_size)}명
            </span>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {evaluation?.diagnosis ? (
          <EvaluationFunnel diagnosis={evaluation.diagnosis} showStageDetails={false} />
        ) : evaluation?.status === "insufficient_data" ? (
          <Alert>
            <AlertTitle>평가 대상이 더 필요해요</AlertTitle>
            <AlertDescription>
              {evaluation.feedback ??
                `현재 ${formatInteger(evaluation.sample_size)}명으로는 사용자 경로를 판단하기 어려워요.`}
            </AlertDescription>
          </Alert>
        ) : (
          <EmptyState message="아직 표시할 고객 행동 흐름이 없어요." />
        )}
      </CardContent>
    </Card>
  );
}

function NextExperimentPanel({
  evaluation,
  experiment,
  hasRepeatTarget
}: {
  evaluation: DashboardProjectExperimentLatestEvaluation | null;
  experiment: DashboardProjectExperiment;
  hasRepeatTarget: boolean;
}) {
  const improvementDirections = evaluation?.diagnosis?.improvement_directions ?? [];

  return (
    <Card className="bg-primary/[0.04]" size="sm">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>다음 실험</CardTitle>
          {experiment.next_loop ? (
            <Badge variant={statusBadgeVariant(experiment.next_loop.status)}>
              {formatStatusLabel(experiment.next_loop.status)}
            </Badge>
          ) : evaluation?.next_loop_required ? (
            <Badge variant="status-warning">반복 필요</Badge>
          ) : (
            <Badge variant="outline">대기</Badge>
          )}
        </div>
        <CardDescription>이번 결과를 다음 실험의 개선안으로 연결해요.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {experiment.next_loop ? (
          <div className="grid gap-1">
            <span className="text-xs text-muted-foreground">준비된 실험</span>
            <strong>{formatInteger(experiment.next_loop.loop_count)}번째 반복 실험</strong>
          </div>
        ) : evaluation?.next_loop_required && hasRepeatTarget ? (
          <>
            <div className="grid gap-1">
              <span className="text-xs font-semibold">개선 가설</span>
              <p className="text-sm leading-6">
                {improvementDirections[0] ??
                  (experiment.execution_mode === "automatic"
                    ? "실패 원인을 반영한 광고를 자동으로 준비해요."
                    : "실패 원인을 반영해 새로운 광고 소재를 준비해요.")}
              </p>
            </div>
            {improvementDirections.length > 1 ? (
              <ul className="grid gap-2 text-sm text-muted-foreground">
                {improvementDirections.slice(1, 3).map((item) => (
                  <li className="border-l-2 border-primary/40 pl-3" key={item}>
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : evaluation?.next_loop_required ? (
          <p className="text-sm leading-6 text-muted-foreground">
            반복 실험에 사용할 타깃 고객군이 없어요.
          </p>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">
            지금은 다시 실험할 대상이 없어요.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ExperimentRepeatHistory({
  evaluation,
  experiment
}: {
  evaluation: DashboardProjectExperimentLatestEvaluation | null;
  experiment: DashboardProjectExperiment;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Card size="sm">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>{formatInteger(experiment.loop_count)}번째 반복 실험</CardTitle>
            <Badge variant={statusBadgeVariant(experiment.status)}>
              {formatStatusLabel(experiment.status)}
            </Badge>
          </div>
          <CardDescription>현재 선택한 실험</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <DefinitionItem
              label="실험결과 / 목표"
              value={`${formatGoalValue(evaluation?.actual_value ?? null)} / ${formatGoalValue(evaluation?.target_value ?? experiment.goal_target_value)}`}
            />
            <DefinitionItem
              label="평가 대상 / 배정"
              value={`${formatInteger(evaluation?.sample_size ?? 0)} / ${formatInteger(experiment.assignment_count)}`}
            />
          </dl>
        </CardContent>
      </Card>
      <Card size="sm">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>다음 반복</CardTitle>
            {experiment.next_loop ? (
              <Badge variant={statusBadgeVariant(experiment.next_loop.status)}>
                {formatStatusLabel(experiment.next_loop.status)}
              </Badge>
            ) : (
              <Badge variant="outline">준비 전</Badge>
            )}
          </div>
          <CardDescription>
            최대 {formatInteger(experiment.max_loop_count)}회 중{" "}
            {formatInteger(experiment.loop_count)}회 진행했어요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-muted-foreground">
            {experiment.next_loop
              ? `${formatInteger(experiment.next_loop.loop_count)}번째 반복 실험이 준비됐어요.`
              : evaluation?.next_loop_required
                ? "현재 결과를 반영한 다음 실험을 준비할 수 있어요."
                : "현재 결과에서는 추가 반복이 필요하지 않아요."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function EvaluationDiagnosisSection({
  evaluation
}: {
  evaluation: DashboardProjectExperimentLatestEvaluation | null;
}) {
  if (!evaluation) {
    return (
      <section className="grid content-start gap-3">
        <h3 className="font-semibold">평가 대상과 결과</h3>
        <EmptyState message="아직 평가 결과가 없어요. 성과 평가를 시작해 주세요." />
      </section>
    );
  }

  const diagnosis = evaluation.diagnosis;
  return (
    <section className="grid content-start gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="grid gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">사용자 경로와 이탈 원인</h3>
            <Badge variant={statusBadgeVariant(evaluation.status)}>
              {formatStatusLabel(evaluation.status)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            평가 기준 {formatDateTime(evaluation.evaluation_cutoff_at ?? evaluation.created_at)} ·
            표본 {formatInteger(evaluation.sample_size)}명
          </p>
        </div>
        {diagnosis ? <Badge variant="outline">{evidenceStrengthLabel(diagnosis)}</Badge> : null}
      </header>

      {diagnosis ? (
        <>
          <EvaluationFunnel diagnosis={diagnosis} />
          <EvaluationCause diagnosis={diagnosis} />
        </>
      ) : evaluation.status === "insufficient_data" ? (
        <Alert>
          <AlertTitle>평가 대상이 더 필요해요</AlertTitle>
          <AlertDescription>
            {evaluation.feedback ??
              `현재 ${formatInteger(evaluation.sample_size)}명으로는 안정적인 평가가 어려워요.`}
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-3">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <DefinitionItem label="분자" value={formatInteger(evaluation.numerator_count)} />
            <DefinitionItem label="분모" value={formatInteger(evaluation.denominator_count)} />
          </dl>
          <p className="text-sm text-muted-foreground">
            {evaluation.feedback ?? "추가 안내가 없어요."}
          </p>
        </div>
      )}
    </section>
  );
}

function EvaluationFunnel({
  diagnosis,
  showStageDetails = true
}: {
  diagnosis: DashboardExperimentEvaluationDiagnosis;
  showStageDetails?: boolean;
}) {
  const stages = diagnosis.funnel.stages;
  const firstStageCount = stages[0]?.user_count ?? 0;
  const bottleneckToStage = diagnosis.largest_dropoff?.to_stage_key;

  if (stages.length === 0) {
    return <EmptyState message="아직 표시할 고객 행동 흐름이 없어요." />;
  }

  return (
    <div className="grid gap-4">
      <div className="min-w-0 max-w-full overflow-x-auto overscroll-x-contain">
        <ChartContainer
          aria-label="광고 반응 이후 단계별 고객 수 꺾은선 그래프"
          className="h-[240px] min-h-0 min-w-[640px] w-full aspect-auto"
          config={{
            user_count: { color: "var(--chart-1)", label: "고객 수" }
          }}
          role="img"
        >
          <LineChart data={stages} margin={{ bottom: 12, left: 4, right: 28, top: 34 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis axisLine={false} dataKey="label" interval={0} tickLine={false} tickMargin={12} />
            <YAxis
              allowDecimals={false}
              axisLine={false}
              domain={[0, "auto"]}
              tickLine={false}
              tickMargin={8}
              width={44}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              activeDot={{ r: 7 }}
              dataKey="user_count"
              dot={{ fill: "var(--color-user_count)", r: 5, strokeWidth: 2 }}
              isAnimationActive={false}
              stroke="var(--color-user_count)"
              strokeWidth={3}
              type="linear"
            >
              <LabelList
                className="fill-foreground text-xs font-semibold"
                dataKey="user_count"
                formatter={(value) => `${formatInteger(Number(value ?? 0))}명`}
                offset={12}
                position="top"
              />
            </Line>
          </LineChart>
        </ChartContainer>
      </div>

      {showStageDetails ? (
        <div
          aria-label="광고 반응 이후 사용자 경로 상세"
          className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5"
        >
          {stages.map((stage, index) => {
            const reachRate = firstStageCount > 0 ? (stage.user_count / firstStageCount) * 100 : 0;
            const isBottleneck = stage.key === bottleneckToStage;
            return (
              <div
                className={`grid min-h-32 content-between gap-3 border-l-2 px-3 py-2 ${
                  isBottleneck ? "border-destructive bg-destructive/5" : "border-border"
                }`}
                key={stage.key}
              >
                <div className="grid gap-1">
                  <span className="text-xs text-muted-foreground">{index + 1}단계</span>
                  <h4 className="text-sm font-semibold">{stage.label}</h4>
                </div>
                <div className="grid gap-2">
                  <strong className="text-2xl font-semibold tabular-nums">
                    {formatInteger(stage.user_count)}명
                  </strong>
                  <Progress aria-label={`${stage.label} 도달률`} value={reachRate} />
                  {stage.conversion_rate_from_previous === null ? (
                    <span className="text-xs text-muted-foreground">평가 기준 고객</span>
                  ) : (
                    <span
                      className={
                        isBottleneck
                          ? "text-xs font-medium text-destructive"
                          : "text-xs text-muted-foreground"
                      }
                    >
                      이전 단계 대비 {formatPercent(stage.conversion_rate_from_previous)} 도달
                      {stage.dropoff_count_from_previous
                        ? ` · ${formatInteger(stage.dropoff_count_from_previous)}명 이탈`
                        : ""}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function EvaluationCause({ diagnosis }: { diagnosis: DashboardExperimentEvaluationDiagnosis }) {
  const isGoalMet = diagnosis.status === "goal_met";
  const CauseIcon = isGoalMet ? CheckCircle2 : TrendingDown;
  return (
    <div className="grid gap-4 border-t pt-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
      <div className="grid content-start gap-2">
        <div className="flex items-center gap-2">
          <CauseIcon
            className={isGoalMet ? "size-4 text-emerald-700" : "size-4 text-destructive"}
          />
          <h4 className="text-sm font-semibold">
            {isGoalMet ? "목표 달성 요약" : "가장 큰 이탈 구간"}
          </h4>
        </div>
        <p className="text-sm leading-6 text-foreground">{diagnosis.summary}</p>
        <p className="text-xs leading-5 text-muted-foreground">
          {diagnosis.evidence_strength.reason}
        </p>
      </div>
      <div className="grid content-start gap-2">
        <h4 className="text-sm font-semibold">판단 근거</h4>
        <ul className="grid gap-1.5 text-sm text-muted-foreground">
          {diagnosis.evidence.map((item) => (
            <li className="border-l-2 border-border pl-2" key={item}>
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div className="grid content-start gap-2">
        <h4 className="text-sm font-semibold">다음 실험에서 확인할 항목</h4>
        <ul className="grid gap-1.5 text-sm text-muted-foreground">
          {diagnosis.improvement_directions.map((item) => (
            <li className="border-l-2 border-primary/40 pl-2" key={item}>
              {item}
            </li>
          ))}
        </ul>
      </div>
      {diagnosis.limitations.length > 0 ? (
        <p className="text-xs leading-5 text-muted-foreground lg:col-span-3">
          {diagnosis.limitations.join(" ")}
        </p>
      ) : null}
    </div>
  );
}

function evidenceStrengthLabel(diagnosis: DashboardExperimentEvaluationDiagnosis): string {
  switch (diagnosis.evidence_strength.level) {
    case "sufficient":
      return "원인 진단 표본 확보";
    case "limited":
      return "원인 진단 참고 수준";
    case "insufficient":
      return "평가 표본 부족";
    default:
      return "측정 데이터 없음";
  }
}

function ProjectExperimentPagination({
  onPageChange,
  onPageSizeChange,
  page,
  pageCount,
  pageSize,
  totalCount
}: {
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: (typeof projectExperimentPageSizeOptions)[number]) => void;
  page: number;
  pageCount: number;
  pageSize: (typeof projectExperimentPageSizeOptions)[number];
  totalCount: number;
}) {
  const startIndex = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, totalCount);

  return (
    <div className="flex flex-col gap-3 border-t pt-4 md:flex-row md:items-center md:justify-between">
      <div className="text-sm text-muted-foreground">
        {formatInteger(totalCount)}개 중 {formatInteger(startIndex)}-{formatInteger(endIndex)}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Field className="w-28">
          <FieldLabel className="sr-only" id="project-experiment-page-size-label">
            페이지당 표시 개수
          </FieldLabel>
          <Select
            onValueChange={(value) =>
              onPageSizeChange(Number(value) as (typeof projectExperimentPageSizeOptions)[number])
            }
            value={String(pageSize)}
          >
            <SelectTrigger
              aria-labelledby="project-experiment-page-size-label"
              className="h-9 w-full"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {projectExperimentPageSizeOptions.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {formatInteger(option)}개
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <div className="min-w-20 text-center text-sm font-medium">
          {formatInteger(page)} / {formatInteger(pageCount)}
        </div>
        <Button
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          type="button"
          variant="outline"
        >
          이전
        </Button>
        <Button
          disabled={page >= pageCount}
          onClick={() => onPageChange(Math.min(pageCount, page + 1))}
          type="button"
          variant="outline"
        >
          다음
        </Button>
      </div>
    </div>
  );
}

function ExperimentOverviewStrip({
  latestUpdatedAt,
  nextLoopCount,
  runningCount,
  totalCount
}: {
  latestUpdatedAt: string | null;
  nextLoopCount: number;
  runningCount: number;
  totalCount: number;
}) {
  return (
    <Card className="py-0" size="sm">
      <CardContent className="flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <dl className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <OverviewItem label="전체" tone="primary" value={totalCount} />
          <OverviewItem label="실행 중" tone="neutral" value={runningCount} />
          <OverviewItem label="반복 필요" tone="destructive" value={nextLoopCount} />
        </dl>
        {latestUpdatedAt ? (
          <p className="text-xs text-muted-foreground">
            마지막 갱신 {formatDateTime(latestUpdatedAt)}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function OverviewItem({
  label,
  tone,
  value
}: {
  label: string;
  tone: "destructive" | "neutral" | "primary";
  value: number;
}) {
  const toneClass = {
    destructive: "bg-destructive",
    neutral: "bg-muted-foreground",
    primary: "bg-primary"
  }[tone];

  return (
    <div className="flex items-center gap-2.5">
      <span aria-hidden="true" className={cn("size-2 rounded-full", toneClass)} />
      <dt className="font-medium">{label}</dt>
      <dd className="font-semibold tabular-nums">{formatInteger(value)}</dd>
    </div>
  );
}

function DefinitionItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function MetricPair({ left, right }: { left: string; right: string }) {
  return (
    <div className="inline-flex min-w-24 items-center justify-start gap-1.5 rounded-md bg-muted/50 px-2 py-1 text-sm font-medium">
      <span>{left}</span>
      <span className="text-muted-foreground">/</span>
      <span>{right}</span>
    </div>
  );
}

function uniqueEntities(entities: Array<{ id: string; name: string }>) {
  const byId = new Map<string, { id: string; name: string }>();
  for (const entity of entities) {
    byId.set(entity.id, entity);
  }
  return [...byId.values()].sort((left, right) => left.name.localeCompare(right.name, "ko"));
}
