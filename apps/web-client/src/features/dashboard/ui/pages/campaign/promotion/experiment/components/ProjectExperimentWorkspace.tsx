import type { DashboardProjectExperiment } from "@loopad/shared";
import { Alert, AlertDescription, AlertTitle } from "@loopad/ui/shadcn/alert";
import { Badge } from "@loopad/ui/shadcn/badge";
import { Button } from "@loopad/ui/shadcn/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@loopad/ui/shadcn/card";
import { Field, FieldLabel } from "@loopad/ui/shadcn/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@loopad/ui/shadcn/select";
import { Spinner } from "@loopad/ui/shadcn/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@loopad/ui/shadcn/table";
import { ChevronRight, Plus, RefreshCw } from "lucide-react";
import { useEffect, useMemo } from "react";
import { formatDateTime, formatInteger } from "../../../../../../model/dashboard-format.js";
import {
  formatBasisLabel,
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
  promotionRunIdsForRunningExperiments,
  projectExperimentPageSizeOptions,
  projectExperimentSelectionQuery,
  repeatCreativeTargetForExperiment,
  type RepeatCreativePreparationInput,
  type RunningEvaluationRefreshResult,
  userVisibleProjectExperiments,
  uniqueProjectExperimentValues
} from "../projectExperimentUtils.js";

export function ProjectExperimentWorkspace({
  evaluationRefreshIsPending,
  evaluationRefreshResult,
  experiments,
  isLoading,
  onPrepareRepeatCreatives,
  onRefreshRunningEvaluations,
  prepareRepeatCreativesError,
  prepareRepeatCreativesIsError,
  prepareRepeatCreativesIsPending,
  prepareRepeatCreativesVariables,
  query
}: {
  evaluationRefreshIsPending: boolean;
  evaluationRefreshResult: RunningEvaluationRefreshResult | null;
  experiments: DashboardProjectExperiment[];
  isLoading: boolean;
  onPrepareRepeatCreatives: (input: RepeatCreativePreparationInput) => void;
  onRefreshRunningEvaluations: (promotionRunIds: string[]) => void;
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
        promotionId: query.experimentPromotionFilter || "all",
        status: query.experimentStatusFilter || "all"
      }),
    [
      visibleExperiments,
      query.experimentPromotionFilter,
      query.experimentStatusFilter,
      query.selectedCampaignId
    ]
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
  const promotions = uniqueEntities(
    visibleExperiments.flatMap((experiment) =>
      filters.campaignId === "all" || experiment.campaign_id === filters.campaignId
        ? [
            {
              id: experiment.promotion_id,
              name: experiment.promotion_name
            }
          ]
        : []
    )
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
  const runningPromotionRunIds = promotionRunIdsForRunningExperiments(visibleExperiments);
  const nextLoopCount = visibleExperiments.filter(
    (experiment) => experiment.latest_evaluation?.next_loop_required
  ).length;
  const insufficientCount = visibleExperiments.filter(
    (experiment) => experiment.latest_evaluation?.status === "insufficient_data"
  ).length;
  const totalAssignmentCount = visibleExperiments.reduce(
    (total, experiment) => total + experiment.assignment_count,
    0
  );

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ExperimentSummaryCard label="전체 실험" value={formatInteger(visibleExperiments.length)} />
        <ExperimentSummaryCard label="실행 중" value={formatInteger(runningCount)} />
        <ExperimentSummaryCard label="배정 합계" value={formatInteger(totalAssignmentCount)} />
        <ExperimentSummaryCard
          label="후속 작업"
          value={`반복 실험 ${formatInteger(nextLoopCount)} · 대상 부족 ${formatInteger(insufficientCount)}`}
        />
      </div>

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="grid gap-1">
              <CardTitle>프로젝트 실험 목록</CardTitle>
              <CardDescription>
                캠페인, 프로모션, 상태로 실험을 찾고 자세한 성과를 볼 수 있어요.
              </CardDescription>
            </div>
            <Button
              aria-label={
                evaluationRefreshIsPending ? "진행 중 실험 평가 갱신 중" : "진행 중 실험 평가 갱신"
              }
              disabled={runningPromotionRunIds.length === 0 || evaluationRefreshIsPending}
              onClick={() => onRefreshRunningEvaluations(runningPromotionRunIds)}
              type="button"
            >
              {evaluationRefreshIsPending ? (
                <Spinner aria-label="진행 중 실험 평가 갱신 중" data-icon="inline-start" />
              ) : (
                <RefreshCw aria-hidden="true" data-icon="inline-start" />
              )}
              {evaluationRefreshIsPending ? "실험 평가 갱신 중…" : "진행 중 실험 평가 갱신"}
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-3 xl:ml-auto">
            <ExperimentFilter
              id="project-experiment-campaign-filter"
              label="캠페인"
              onValueChange={(value) => {
                void setDashboardQueryState({
                  experimentPage: 1,
                  experimentPromotionFilter: "all",
                  selectedAdExperimentId: "",
                  selectedCampaignId: value === "all" ? "" : value,
                  selectedPromotionId: "",
                  selectedSegmentId: ""
                });
              }}
              options={campaigns}
              placeholder="전체 캠페인"
              value={filters.campaignId}
            />
            <ExperimentFilter
              id="project-experiment-promotion-filter"
              label="프로모션"
              onValueChange={(value) => {
                void setDashboardQueryState({
                  experimentPage: 1,
                  experimentPromotionFilter: value,
                  selectedAdExperimentId: "",
                  selectedPromotionId: "",
                  selectedSegmentId: ""
                });
              }}
              options={promotions}
              placeholder="전체 프로모션"
              value={filters.promotionId}
            />
            <ExperimentFilter
              id="project-experiment-status-filter"
              label="실험 상태"
              onValueChange={(value) => {
                void setDashboardQueryState({
                  experimentPage: 1,
                  experimentStatusFilter: value,
                  selectedAdExperimentId: "",
                  selectedPromotionId: "",
                  selectedSegmentId: ""
                });
              }}
              options={statuses.map((status) => ({ id: status, name: formatStatusLabel(status) }))}
              placeholder="전체 상태"
              value={filters.status}
            />
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          {evaluationRefreshResult && !evaluationRefreshIsPending ? (
            <Alert
              aria-live="polite"
              variant={evaluationRefreshResult.failedRunCount > 0 ? "destructive" : "default"}
            >
              <AlertTitle>
                {evaluationRefreshResult.failedRunCount === 0
                  ? "진행 중 실험 평가를 갱신했어요"
                  : evaluationRefreshResult.succeededRunCount > 0
                    ? "일부 실험 평가를 갱신하지 못했어요"
                    : "실험 평가를 갱신하지 못했어요"}
              </AlertTitle>
              <AlertDescription>
                {evaluationRefreshResult.failedRunCount === 0
                  ? `${formatInteger(evaluationRefreshResult.totalRunCount)}개 회차의 진행 중 실험 평가를 갱신했어요.`
                  : evaluationRefreshFailureMessage(evaluationRefreshResult)}
              </AlertDescription>
            </Alert>
          ) : null}
          {visibleExperiments.length === 0 ? (
            <EmptyState message="아직 시작한 실험이 없어요." />
          ) : filteredExperiments.length === 0 ? (
            <EmptyState message="조건에 맞는 실험이 없어요." />
          ) : (
            <div className="grid gap-4">
              <ProjectExperimentTable
                onSelect={(experiment) => {
                  void setDashboardQueryState(projectExperimentSelectionQuery(experiment));
                }}
                rows={pagination.rows}
                selectedExperimentId={query.selectedAdExperimentId}
              />
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
            </div>
          )}
        </CardContent>
      </Card>

      {selectedExperiment ? (
        <SelectedProjectExperimentDetail
          experiment={selectedExperiment}
          onPrepareRepeatCreatives={onPrepareRepeatCreatives}
          prepareRepeatCreativesError={prepareRepeatCreativesError}
          prepareRepeatCreativesIsError={prepareRepeatCreativesIsError}
          prepareRepeatCreativesIsPending={prepareRepeatCreativesIsPending}
          prepareRepeatCreativesVariables={prepareRepeatCreativesVariables}
        />
      ) : null}
    </>
  );
}

function evaluationRefreshFailureMessage(result: RunningEvaluationRefreshResult): string {
  const failureMessage = result.failureMessage ?? "요청을 처리하지 못했어요.";
  const retryGuide = failureMessage.includes("다시 시도")
    ? ""
    : " 버튼을 다시 눌러 다시 시도해 주세요.";

  return `${formatInteger(result.succeededRunCount)}개 회차 성공, ${formatInteger(result.failedRunCount)}개 회차 실패했어요. ${failureMessage}${retryGuide}`;
}

function repeatCreativePreparationErrorMessage(error: unknown): string {
  const message = toErrorMessage(error);
  return message.includes("다시 시도") ? message : `${message} 잠시 후 다시 시도해 주세요.`;
}

function ExperimentFilter({
  id,
  label,
  onValueChange,
  options,
  placeholder,
  value
}: {
  id: string;
  label: string;
  onValueChange: (value: string) => void;
  options: Array<{ id: string; name: string }>;
  placeholder: string;
  value: string;
}) {
  return (
    <Field className="w-full xl:w-52">
      <FieldLabel id={`${id}-label`}>{label}</FieldLabel>
      <Select onValueChange={onValueChange} value={value}>
        <SelectTrigger aria-labelledby={`${id}-label`} className="w-full" id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{placeholder}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

function ProjectExperimentTable({
  onSelect,
  rows,
  selectedExperimentId
}: {
  onSelect: (experiment: DashboardProjectExperiment) => void;
  rows: DashboardProjectExperiment[];
  selectedExperimentId: string;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border">
      <Table className="min-w-[1080px]">
        <TableHeader>
          <TableRow>
            <TableHead>캠페인 / 프로모션</TableHead>
            <TableHead>세그먼트</TableHead>
            <TableHead>노출 방식</TableHead>
            <TableHead className="text-right">배정</TableHead>
            <TableHead className="text-right">현황 / 목표</TableHead>
            <TableHead>실행 상태</TableHead>
            <TableHead>평가</TableHead>
            <TableHead>업데이트</TableHead>
            <TableHead className="w-40 pl-7">실험</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((experiment) => {
            const evaluation = experiment.latest_evaluation;
            const isSelected = experiment.ad_experiment_id === selectedExperimentId;

            return (
              <TableRow aria-selected={isSelected} key={experiment.ad_experiment_id}>
                <TableCell>
                  <div className="grid min-w-52 gap-0.5">
                    <span className="font-medium">{experiment.campaign_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {experiment.promotion_name}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{experiment.segment_name}</TableCell>
                <TableCell>{formatChannelLabel(experiment.channel)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatInteger(experiment.assignment_count)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  <MetricPair
                    left={formatGoalValue(evaluation?.actual_value ?? null)}
                    right={formatGoalValue(
                      evaluation?.target_value ?? experiment.goal_target_value
                    )}
                  />
                </TableCell>
                <TableCell>
                  <Badge variant={statusBadgeVariant(experiment.status)}>
                    {formatStatusLabel(experiment.status)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant={statusBadgeVariant(evaluation?.status ?? "not_evaluated")}>
                      {formatStatusLabel(evaluation?.status ?? "not_evaluated")}
                    </Badge>
                    {evaluation?.next_loop_required ? (
                      <Badge variant="outline">반복 실험 필요</Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>{formatDateTime(experiment.updated_at)}</TableCell>
                <TableCell className="w-40">
                  <Button
                    aria-label={`${experiment.segment_name} ${experiment.loop_count}번째 반복 실험 자세히 보기`}
                    className="h-9 min-w-28 justify-center px-4"
                    onClick={() => onSelect(experiment)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <span className="font-medium">
                      {formatInteger(experiment.loop_count)}번째 실험
                    </span>
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
  experiment,
  onPrepareRepeatCreatives,
  prepareRepeatCreativesError,
  prepareRepeatCreativesIsError,
  prepareRepeatCreativesIsPending,
  prepareRepeatCreativesVariables
}: {
  experiment: DashboardProjectExperiment;
  onPrepareRepeatCreatives: (input: RepeatCreativePreparationInput) => void;
  prepareRepeatCreativesError: unknown;
  prepareRepeatCreativesIsError: boolean;
  prepareRepeatCreativesIsPending: boolean;
  prepareRepeatCreativesVariables: RepeatCreativePreparationInput | null;
}) {
  const evaluation = experiment.latest_evaluation;
  const repeatTarget = repeatCreativeTargetForExperiment(experiment);
  const canPrepareRepeatCreatives =
    !experiment.next_loop &&
    (evaluation?.next_loop_required === true || evaluation?.status === "goal_not_met");
  const isPreparingRepeatCreativesForSelected =
    prepareRepeatCreativesIsPending &&
    prepareRepeatCreativesVariables?.failedAdExperimentIds.includes(experiment.ad_experiment_id) ===
      true;

  return (
    <Card>
      <CardHeader className="gap-4 lg:grid-cols-[1fr_auto]">
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
          </div>
          <CardDescription>
            성과, 평가 결과, 대상 부족 이유와 다음 반복 실험을 한곳에서 볼 수 있어요.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-start gap-2">
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
              : "다음 실험용 광고 만들기"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6">
        {prepareRepeatCreativesIsError &&
        prepareRepeatCreativesVariables?.failedAdExperimentIds.includes(
          experiment.ad_experiment_id
        ) === true ? (
          <Alert aria-live="polite" variant="destructive">
            <AlertTitle>다음 실험용 광고를 만들지 못했어요</AlertTitle>
            <AlertDescription>
              {repeatCreativePreparationErrorMessage(prepareRepeatCreativesError)}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <DetailMetric label="목표 지표" value={formatMetricLabel(experiment.goal_metric)} />
          <DetailMetric
            label="목표 / 실제"
            value={`${formatGoalValue(evaluation?.target_value ?? experiment.goal_target_value)} / ${formatGoalValue(evaluation?.actual_value ?? null)}`}
          />
          <DetailMetric
            label="평가 대상 / 배정"
            value={`${formatInteger(evaluation?.sample_size ?? 0)} / ${formatInteger(experiment.assignment_count)}`}
          />
          <DetailMetric
            label="평가 기준"
            value={formatBasisLabel(evaluation?.basis ?? experiment.goal_basis)}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="grid content-start gap-3 rounded-xl border p-4">
            <div className="grid gap-1">
              <h3 className="font-semibold">평가 대상과 결과</h3>
              <p className="text-sm text-muted-foreground">
                최신 평가 결과와 계산에 쓴 대상을 보여 줘요.
              </p>
            </div>
            {evaluation ? (
              <div className="grid gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusBadgeVariant(evaluation.status)}>
                    {formatStatusLabel(evaluation.status)}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {formatDateTime(evaluation.created_at)}
                  </span>
                </div>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <DefinitionItem label="분자" value={formatInteger(evaluation.numerator_count)} />
                  <DefinitionItem
                    label="분모"
                    value={formatInteger(evaluation.denominator_count)}
                  />
                </dl>
                {evaluation.status === "insufficient_data" ? (
                  <Alert>
                    <AlertTitle>평가 대상이 더 필요해요</AlertTitle>
                    <AlertDescription>
                      {evaluation.feedback ??
                        `현재 ${formatInteger(evaluation.sample_size)}명으로는 안정적인 평가가 어려워요.`}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {evaluation.feedback ?? "추가 안내가 없어요."}
                  </p>
                )}
              </div>
            ) : (
              <EmptyState message="아직 평가 결과가 없어요. 성과 평가를 시작해 주세요." />
            )}
          </section>

          <section className="grid content-start gap-3 rounded-xl border p-4">
            <div className="grid gap-1">
              <h3 className="font-semibold">반복 실험</h3>
              <p className="text-sm text-muted-foreground">
                목표에 미치지 못한 대상의 다음 실험 준비 상태를 보여 줘요.
              </p>
            </div>
            {experiment.next_loop ? (
              <div className="grid gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusBadgeVariant(experiment.next_loop.status)}>
                    {formatStatusLabel(experiment.next_loop.status)}
                  </Badge>
                  <span className="text-sm font-medium">
                    {formatInteger(experiment.next_loop.loop_count)}번째 반복 실험
                  </span>
                </div>
              </div>
            ) : evaluation?.next_loop_required ? (
              <Alert>
                <AlertTitle>반복 실험이 필요해요</AlertTitle>
                <AlertDescription>
                  현재 선택한 {experiment.segment_name} 세그먼트의 광고를 새로 만들 수 있어요.
                </AlertDescription>
              </Alert>
            ) : (
              <EmptyState message="지금은 다시 실험할 대상이 없어요." />
            )}
          </section>
        </div>

        <dl className="grid gap-3 border-t pt-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
          <DefinitionItem label="노출 방식" value={formatChannelLabel(experiment.channel)} />
          <DefinitionItem label="시작" value={formatDateTime(experiment.started_at)} />
          <DefinitionItem label="종료" value={formatDateTime(experiment.ended_at)} />
          <DefinitionItem label="업데이트" value={formatDateTime(experiment.updated_at)} />
        </dl>
      </CardContent>
    </Card>
  );
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

function ExperimentSummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-lg font-semibold">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-xl bg-muted/50 p-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
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
    <div className="inline-flex min-w-24 items-center justify-end gap-1.5 rounded-md bg-muted/50 px-2 py-1 text-sm font-medium">
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
