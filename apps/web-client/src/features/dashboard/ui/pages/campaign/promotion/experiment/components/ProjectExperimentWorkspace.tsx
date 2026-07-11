import type {
  DashboardEvaluatePromotionRunResult,
  DashboardProjectExperiment
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@loopad/ui/shadcn/table";
import { BarChart3, ChevronRight, Plus } from "lucide-react";
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
import type { PromotionExperimentLaunchResult } from "../../promotionExperimentFlow.js";
import { EmptyState } from "../../../../../shared/EmptyState.js";
import { formatGoalValue, statusBadgeVariant, toErrorMessage } from "../experimentUtils.js";
import {
  failedTargetsForPromotionRun,
  filterProjectExperiments,
  normalizeProjectExperimentFilters,
  paginateProjectExperiments,
  projectExperimentPageSizeOptions,
  projectExperimentSelectionQuery,
  uniqueProjectExperimentValues
} from "../projectExperimentUtils.js";

type NextLoopInput = {
  failedAdExperimentIds: string[];
  failedSegmentIds: string[];
  promotionId: string;
  promotionRunId: string;
};

export function ProjectExperimentWorkspace({
  createNextLoopError,
  createNextLoopIsError,
  createNextLoopIsPending,
  createNextLoopResult,
  createNextLoopVariables,
  evaluatePromotionRunError,
  evaluatePromotionRunIsError,
  evaluatePromotionRunIsPending,
  evaluatePromotionRunResult,
  evaluatePromotionRunVariables,
  experiments,
  isLoading,
  onCreateNextLoop,
  onEvaluatePromotionRun,
  query
}: {
  createNextLoopError: unknown;
  createNextLoopIsError: boolean;
  createNextLoopIsPending: boolean;
  createNextLoopResult: PromotionExperimentLaunchResult | null;
  createNextLoopVariables: NextLoopInput | null;
  evaluatePromotionRunError: unknown;
  evaluatePromotionRunIsError: boolean;
  evaluatePromotionRunIsPending: boolean;
  evaluatePromotionRunResult: DashboardEvaluatePromotionRunResult | null;
  evaluatePromotionRunVariables: string | null;
  experiments: DashboardProjectExperiment[];
  isLoading: boolean;
  onCreateNextLoop: (input: NextLoopInput) => void;
  onEvaluatePromotionRun: (promotionRunId: string) => void;
  query: DashboardQuery;
}) {
  const [, setDashboardQueryState] = useDashboardQueryState();
  const filters = useMemo(
    () =>
      normalizeProjectExperimentFilters(experiments, {
        campaignId: query.selectedCampaignId || "all",
        promotionId: query.experimentPromotionFilter || "all",
        status: query.experimentStatusFilter || "all"
      }),
    [
      experiments,
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
    () => filterProjectExperiments(experiments, filters),
    [experiments, filters]
  );
  const pagination = useMemo(
    () => paginateProjectExperiments(filteredExperiments, query.experimentPage, pageSize),
    [filteredExperiments, pageSize, query.experimentPage]
  );
  const selectedExperiment =
    experiments.find(
      (experiment) => experiment.ad_experiment_id === query.selectedAdExperimentId
    ) ?? null;
  const campaigns = uniqueEntities(
    experiments.map((experiment) => ({
      id: experiment.campaign_id,
      name: experiment.campaign_name
    }))
  );
  const promotions = uniqueEntities(
    experiments
      .filter(
        (experiment) =>
          filters.campaignId === "all" || experiment.campaign_id === filters.campaignId
      )
      .map((experiment) => ({
        id: experiment.promotion_id,
        name: experiment.promotion_name
      }))
  );
  const statuses = uniqueProjectExperimentValues(
    experiments.map((experiment) => experiment.status)
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
          <CardDescription>캠페인 전체의 실행 및 평가 상태를 모으고 있습니다.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const runningCount = experiments.filter((experiment) => experiment.status === "running").length;
  const nextLoopCount = experiments.filter(
    (experiment) => experiment.latest_evaluation?.next_loop_required
  ).length;
  const insufficientCount = experiments.filter(
    (experiment) => experiment.latest_evaluation?.status === "insufficient_data"
  ).length;
  const totalAssignmentCount = experiments.reduce(
    (total, experiment) => total + experiment.assignment_count,
    0
  );

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ExperimentSummaryCard label="전체 실험" value={formatInteger(experiments.length)} />
        <ExperimentSummaryCard label="실행 중" value={formatInteger(runningCount)} />
        <ExperimentSummaryCard label="배정 합계" value={formatInteger(totalAssignmentCount)} />
        <ExperimentSummaryCard
          label="후속 작업"
          value={`다음 루프 ${formatInteger(nextLoopCount)} · 표본 부족 ${formatInteger(insufficientCount)}`}
        />
      </div>

      <Card>
        <CardHeader className="gap-4 xl:grid-cols-[1fr_auto_auto_auto]">
          <div className="grid gap-1">
            <CardTitle>프로젝트 실험 목록</CardTitle>
            <CardDescription>
              캠페인, 프로모션, 실행 상태로 필터링하고 실험을 선택해 상세 성과를 확인합니다.
            </CardDescription>
          </div>
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
        </CardHeader>
        <CardContent>
          {experiments.length === 0 ? (
            <EmptyState message="프로젝트에 생성된 실험이 없습니다." />
          ) : filteredExperiments.length === 0 ? (
            <EmptyState message="필터 조건에 맞는 실험이 없습니다." />
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
          createNextLoopError={createNextLoopError}
          createNextLoopIsError={createNextLoopIsError}
          createNextLoopIsPending={createNextLoopIsPending}
          createNextLoopResult={createNextLoopResult}
          createNextLoopVariables={createNextLoopVariables}
          evaluatePromotionRunError={evaluatePromotionRunError}
          evaluatePromotionRunIsError={evaluatePromotionRunIsError}
          evaluatePromotionRunIsPending={evaluatePromotionRunIsPending}
          evaluatePromotionRunResult={evaluatePromotionRunResult}
          evaluatePromotionRunVariables={evaluatePromotionRunVariables}
          experiment={selectedExperiment}
          experiments={experiments}
          onCreateNextLoop={onCreateNextLoop}
          onEvaluatePromotionRun={onEvaluatePromotionRun}
        />
      ) : null}
    </>
  );
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
            <TableHead>실험</TableHead>
            <TableHead>캠페인 / 프로모션</TableHead>
            <TableHead>세그먼트</TableHead>
            <TableHead>채널</TableHead>
            <TableHead className="text-right">배정</TableHead>
            <TableHead className="text-right">목표 / 실제</TableHead>
            <TableHead>실행 상태</TableHead>
            <TableHead>평가</TableHead>
            <TableHead>업데이트</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((experiment) => {
            const evaluation = experiment.latest_evaluation;
            const isSelected = experiment.ad_experiment_id === selectedExperimentId;

            return (
              <TableRow aria-selected={isSelected} key={experiment.ad_experiment_id}>
                <TableCell>
                  <Button
                    aria-label={`${experiment.segment_name} 루프 ${experiment.loop_count} 실험 상세 보기`}
                    className="h-auto justify-start px-0 text-left"
                    onClick={() => onSelect(experiment)}
                    type="button"
                    variant="link"
                  >
                    <span className="grid gap-0.5">
                      <span className="font-medium">
                        루프 {formatInteger(experiment.loop_count)}
                      </span>
                      <span className="max-w-40 truncate text-xs text-muted-foreground">
                        {experiment.ad_experiment_id}
                      </span>
                    </span>
                  </Button>
                </TableCell>
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
                    left={formatGoalValue(evaluation?.target_value ?? experiment.goal_target_value)}
                    right={formatGoalValue(evaluation?.actual_value ?? null)}
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
                      <Badge variant="outline">다음 루프</Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>{formatDateTime(experiment.updated_at)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function SelectedProjectExperimentDetail({
  createNextLoopError,
  createNextLoopIsError,
  createNextLoopIsPending,
  createNextLoopResult,
  createNextLoopVariables,
  evaluatePromotionRunError,
  evaluatePromotionRunIsError,
  evaluatePromotionRunIsPending,
  evaluatePromotionRunResult,
  evaluatePromotionRunVariables,
  experiment,
  experiments,
  onCreateNextLoop,
  onEvaluatePromotionRun
}: {
  createNextLoopError: unknown;
  createNextLoopIsError: boolean;
  createNextLoopIsPending: boolean;
  createNextLoopResult: PromotionExperimentLaunchResult | null;
  createNextLoopVariables: NextLoopInput | null;
  evaluatePromotionRunError: unknown;
  evaluatePromotionRunIsError: boolean;
  evaluatePromotionRunIsPending: boolean;
  evaluatePromotionRunResult: DashboardEvaluatePromotionRunResult | null;
  evaluatePromotionRunVariables: string | null;
  experiment: DashboardProjectExperiment;
  experiments: DashboardProjectExperiment[];
  onCreateNextLoop: (input: NextLoopInput) => void;
  onEvaluatePromotionRun: (promotionRunId: string) => void;
}) {
  const currentEvaluationResult =
    evaluatePromotionRunResult?.promotion_run_id === experiment.promotion_run_id
      ? evaluatePromotionRunResult
      : null;
  const currentCreateNextLoopResult =
    createNextLoopResult && createNextLoopVariables?.promotionRunId === experiment.promotion_run_id
      ? createNextLoopResult
      : null;
  const failedTargets = failedTargetsForPromotionRun(
    experiments,
    experiment.promotion_run_id,
    currentEvaluationResult
  );
  const canCreateNextLoop =
    !experiment.next_loop &&
    failedTargets.failedAdExperimentIds.length + failedTargets.failedSegmentIds.length > 0;
  const evaluation = experiment.latest_evaluation;
  const isEvaluatingSelected =
    evaluatePromotionRunIsPending && evaluatePromotionRunVariables === experiment.promotion_run_id;
  const isCreatingNextLoopForSelected =
    createNextLoopIsPending &&
    createNextLoopVariables?.promotionRunId === experiment.promotion_run_id;

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
            <CardTitle>루프 {formatInteger(experiment.loop_count)} 실험 상세</CardTitle>
            <Badge variant={statusBadgeVariant(experiment.status)}>
              {formatStatusLabel(experiment.status)}
            </Badge>
          </div>
          <CardDescription>
            성과, 평가 결과, 표본 부족 사유와 다음 루프 상태를 같은 화면에서 확인합니다.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <Button
            disabled={evaluatePromotionRunIsPending}
            onClick={() => onEvaluatePromotionRun(experiment.promotion_run_id)}
            type="button"
            variant="outline"
          >
            <BarChart3 data-icon="inline-start" />
            {isEvaluatingSelected ? "평가 중" : "성과 평가"}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={!canCreateNextLoop || createNextLoopIsPending} type="button">
                <Plus data-icon="inline-start" />
                {isCreatingNextLoopForSelected ? "다음 루프 시작 중" : "다음 루프 생성 및 시작"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>실패 대상을 다음 루프로 이어갈까요?</AlertDialogTitle>
                <AlertDialogDescription>
                  같은 실행에서 목표 미달로 평가된 세그먼트와 실험만 포함합니다. 생성 후 사용자
                  배정, 실험 시작, 지원 채널 발송 순서로 실행됩니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    onCreateNextLoop({
                      ...failedTargets,
                      promotionId: experiment.promotion_id,
                      promotionRunId: experiment.promotion_run_id
                    })
                  }
                >
                  생성 및 시작
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6">
        {currentEvaluationResult ? (
          <Alert>
            <AlertTitle>성과 평가를 완료했습니다</AlertTitle>
            <AlertDescription>
              {formatInteger(currentEvaluationResult.ad_experiment_results.length)}개 실험을
              평가했고, 실패 대상{" "}
              {formatInteger(currentEvaluationResult.failed_ad_experiment_ids.length)}개를
              확인했습니다.
            </AlertDescription>
          </Alert>
        ) : null}
        {evaluatePromotionRunIsError &&
        evaluatePromotionRunVariables === experiment.promotion_run_id ? (
          <Alert variant="destructive">
            <AlertTitle>성과를 평가하지 못했습니다</AlertTitle>
            <AlertDescription>{toErrorMessage(evaluatePromotionRunError)}</AlertDescription>
          </Alert>
        ) : null}
        {currentCreateNextLoopResult ? (
          <Alert>
            <AlertTitle>
              {currentCreateNextLoopResult.dispatchFailed
                ? "다음 루프는 시작했지만 발송하지 못했습니다"
                : currentCreateNextLoopResult.failedExperimentIds.length > 0
                  ? "다음 루프의 일부 실험만 시작됐습니다"
                  : "다음 루프를 생성하고 시작했습니다"}
            </AlertTitle>
            <AlertDescription>
              {formatInteger(currentCreateNextLoopResult.startedExperimentIds.length)}개 실험을
              시작했습니다.
            </AlertDescription>
          </Alert>
        ) : null}
        {createNextLoopIsError &&
        createNextLoopVariables?.promotionRunId === experiment.promotion_run_id ? (
          <Alert variant="destructive">
            <AlertTitle>다음 루프를 시작하지 못했습니다</AlertTitle>
            <AlertDescription>{toErrorMessage(createNextLoopError)}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <DetailMetric label="목표 지표" value={formatMetricLabel(experiment.goal_metric)} />
          <DetailMetric
            label="목표 / 실제"
            value={`${formatGoalValue(evaluation?.target_value ?? experiment.goal_target_value)} / ${formatGoalValue(evaluation?.actual_value ?? null)}`}
          />
          <DetailMetric
            label="평가 표본 / 배정"
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
              <h3 className="font-semibold">평가 및 표본 상태</h3>
              <p className="text-sm text-muted-foreground">
                최신 평가 결과와 계산에 사용된 표본을 표시합니다.
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
                    <AlertTitle>표본이 더 필요합니다</AlertTitle>
                    <AlertDescription>
                      {evaluation.feedback ??
                        `현재 ${formatInteger(evaluation.sample_size)}명의 표본으로는 안정적인 평가가 어렵습니다.`}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {evaluation.feedback ?? "추가 평가 피드백이 없습니다."}
                  </p>
                )}
              </div>
            ) : (
              <EmptyState message="아직 평가 결과가 없습니다. 성과 평가를 실행해주세요." />
            )}
          </section>

          <section className="grid content-start gap-3 rounded-xl border p-4">
            <div className="grid gap-1">
              <h3 className="font-semibold">다음 루프</h3>
              <p className="text-sm text-muted-foreground">
                목표 미달 대상의 후속 실험 준비 상태를 표시합니다.
              </p>
            </div>
            {experiment.next_loop ? (
              <div className="grid gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusBadgeVariant(experiment.next_loop.status)}>
                    {formatStatusLabel(experiment.next_loop.status)}
                  </Badge>
                  <span className="text-sm font-medium">
                    루프 {formatInteger(experiment.next_loop.loop_count)} 생성됨
                  </span>
                </div>
                <p className="break-all text-xs text-muted-foreground">
                  {experiment.next_loop.promotion_run_id}
                </p>
              </div>
            ) : evaluation?.next_loop_required ? (
              <Alert>
                <AlertTitle>다음 루프가 필요합니다</AlertTitle>
                <AlertDescription>
                  같은 실행에서 실패한 실험{" "}
                  {formatInteger(failedTargets.failedAdExperimentIds.length)}개, 세그먼트{" "}
                  {formatInteger(failedTargets.failedSegmentIds.length)}개를 이어갈 수 있습니다.
                </AlertDescription>
              </Alert>
            ) : (
              <EmptyState message="현재 생성할 다음 루프가 없습니다." />
            )}
          </section>
        </div>

        <dl className="grid gap-3 border-t pt-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
          <DefinitionItem label="채널" value={formatChannelLabel(experiment.channel)} />
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
