import type {
  DashboardCampaignDetail,
  DashboardCampaignSegment,
  DashboardEvaluatePromotionRunResult,
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
import { useEffect, useMemo } from "react";
import { Plus } from "lucide-react";
import {
  formatChannelLabel,
  formatMetricLabel,
  formatStatusLabel
} from "../../../../../../model/dashboard-labels.js";
import { formatDateTime, formatInteger } from "../../../../../../model/dashboard-format.js";
import { useDashboardQueryState } from "../../../../../../model/dashboard-query.js";
import type { DashboardQuery } from "../../../../../../model/dashboard-types.js";
import type { PromotionExperimentLaunchResult } from "../../promotionExperimentFlow.js";
import { EmptyState } from "../../../../../shared/EmptyState.js";
import {
  buildExperimentRows,
  contentCandidateTitle,
  experimentPageSizeOptions,
  metricExperimentLabel,
  experimentRowLabel,
  experimentRowSubLabel,
  fallbackSegmentName,
  formatGoalValue,
  insufficientReason,
  statusBadgeVariant,
  toErrorMessage,
  uniqueValues,
  type ExperimentRow
} from "../experimentUtils.js";

export function ExperimentContent({
  createNextLoopError,
  createNextLoopIsError,
  createNextLoopIsPending,
  createNextLoopResult,
  detail,
  evaluatePromotionRunResult,
  isLoading,
  onCreateNextLoop,
  query,
  selectedSegmentDetail,
  selectedSegmentDetailIsError,
  selectedSegmentDetailIsLoading,
  selectedSegmentId
}: {
  createNextLoopError: unknown;
  createNextLoopIsError: boolean;
  createNextLoopIsPending: boolean;
  createNextLoopResult: PromotionExperimentLaunchResult | null;
  detail: DashboardCampaignDetail | undefined;
  evaluatePromotionRunResult: DashboardEvaluatePromotionRunResult | null;
  isLoading: boolean;
  onCreateNextLoop: (
    promotionRunId: string,
    failedSegmentIds: string[],
    failedAdExperimentIds: string[]
  ) => void;
  query: DashboardQuery;
  selectedSegmentDetail: DashboardSegmentDetail | undefined;
  selectedSegmentDetailIsError: boolean;
  selectedSegmentDetailIsLoading: boolean;
  selectedSegmentId: string;
}) {
  const [, setDashboardQueryState] = useDashboardQueryState();
  const rows = useMemo(() => (detail ? buildExperimentRows(detail) : []), [detail]);
  const statusOptions = uniqueValues(rows.map((row) => row.experimentStatus));
  const promotionFilter =
    query.experimentPromotionFilter === "all" ||
    detail?.promotions.some(
      (promotion) => promotion.promotion_id === query.experimentPromotionFilter
    )
      ? query.experimentPromotionFilter
      : "all";
  const statusFilter =
    query.experimentStatusFilter === "all" || statusOptions.includes(query.experimentStatusFilter)
      ? query.experimentStatusFilter
      : "all";
  const pageSize = experimentPageSizeOptions.includes(
    query.experimentPageSize as (typeof experimentPageSizeOptions)[number]
  )
    ? (query.experimentPageSize as (typeof experimentPageSizeOptions)[number])
    : 10;
  const filteredRows = rows.filter(
    (row) =>
      (promotionFilter === "all" || row.promotion?.promotion_id === promotionFilter) &&
      (statusFilter === "all" || row.experimentStatus === statusFilter)
  );
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const page = Math.max(1, query.experimentPage);
  const safePage = Math.min(page, pageCount);
  const pageRows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize);
  const nextLoopCount = rows.filter((row) => row.nextLoopRequired).length;
  const insufficientCount = rows.filter(
    (row) => row.evaluationStatus === "insufficient_data"
  ).length;
  const totalAssignmentCount = rows.reduce(
    (sum, row) => sum + (row.experiment?.assignment_count ?? 0),
    0
  );

  useEffect(() => {
    const nextQuery: Partial<DashboardQuery> = {};

    if (promotionFilter !== query.experimentPromotionFilter) {
      nextQuery.experimentPromotionFilter = promotionFilter;
      nextQuery.experimentPage = 1;
    }
    if (statusFilter !== query.experimentStatusFilter) {
      nextQuery.experimentStatusFilter = statusFilter;
      nextQuery.experimentPage = 1;
    }
    if (pageSize !== query.experimentPageSize) {
      nextQuery.experimentPageSize = pageSize;
      nextQuery.experimentPage = 1;
    }
    if (!nextQuery.experimentPage && page !== safePage) {
      nextQuery.experimentPage = safePage;
    }

    if (Object.keys(nextQuery).length > 0) {
      void setDashboardQueryState(nextQuery);
    }
  }, [
    page,
    pageSize,
    promotionFilter,
    query.experimentPageSize,
    query.experimentPromotionFilter,
    query.experimentStatusFilter,
    safePage,
    setDashboardQueryState,
    statusFilter
  ]);

  if (!detail) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{isLoading ? "실험을 불러오는 중" : "아직 실험이 없어요"}</CardTitle>
          <CardDescription>
            {isLoading ? "잠시만 기다려 주세요." : "이 캠페인에서 아직 실험을 시작하지 않았어요."}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-3 md:grid-cols-5">
        <ExperimentSummaryCard label="프로모션" value={formatInteger(detail.promotions.length)} />
        <ExperimentSummaryCard label="고객군" value={formatInteger(detail.segments.length)} />
        <ExperimentSummaryCard label="실험" value={formatInteger(rows.length)} />
        <ExperimentSummaryCard label="배정 합계" value={formatInteger(totalAssignmentCount)} />
        <ExperimentSummaryCard
          label="재실험 필요"
          value={`${formatInteger(nextLoopCount)} / 부족 ${formatInteger(insufficientCount)}`}
        />
      </div>

      <ExperimentSegmentPanel
        createNextLoopError={createNextLoopError}
        createNextLoopIsError={createNextLoopIsError}
        createNextLoopIsPending={createNextLoopIsPending}
        createNextLoopResult={createNextLoopResult}
        detail={selectedSegmentDetail}
        evaluatePromotionRunResult={evaluatePromotionRunResult}
        isError={selectedSegmentDetailIsError}
        isLoading={selectedSegmentDetailIsLoading}
        onCreateNextLoop={onCreateNextLoop}
        selectedSegmentId={selectedSegmentId}
        segments={detail.segments}
      />

      <Card>
        <CardHeader className="gap-3 md:grid-cols-[1fr_auto_auto]">
          <div className="grid gap-1">
            <CardTitle>진행 실험 목록</CardTitle>
            <CardDescription>
              프로모션과 고객군에 연결된 실험, 평가 지표, 반복 실험 여부를 함께 볼 수 있어요.
            </CardDescription>
          </div>
          <Field className="w-full md:w-56">
            <FieldLabel id="experiment-promotion-filter-label">프로모션</FieldLabel>
            <Select
              onValueChange={(value) => {
                void setDashboardQueryState({
                  experimentPage: 1,
                  experimentPromotionFilter: value
                });
              }}
              value={promotionFilter}
            >
              <SelectTrigger aria-labelledby="experiment-promotion-filter-label" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 프로모션</SelectItem>
                {detail.promotions.map((promotion) => (
                  <SelectItem key={promotion.promotion_id} value={promotion.promotion_id}>
                    {promotion.marketing_theme} · {formatChannelLabel(promotion.channel)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field className="w-full md:w-44">
            <FieldLabel id="experiment-status-filter-label">실험 상태</FieldLabel>
            <Select
              onValueChange={(value) => {
                void setDashboardQueryState({
                  experimentPage: 1,
                  experimentStatusFilter: value
                });
              }}
              value={statusFilter}
            >
              <SelectTrigger aria-labelledby="experiment-status-filter-label" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 상태</SelectItem>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {formatStatusLabel(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <EmptyState message="이 캠페인에는 아직 실험이 없어요." />
          ) : filteredRows.length === 0 ? (
            <EmptyState message="조건에 맞는 실험이 없어요." />
          ) : (
            <div className="grid gap-4">
              <ExperimentTable rows={pageRows} />
              <ExperimentPagination
                onPageChange={(nextPage) => {
                  void setDashboardQueryState({ experimentPage: nextPage });
                }}
                onPageSizeChange={(value) => {
                  void setDashboardQueryState({
                    experimentPage: 1,
                    experimentPageSize: value
                  });
                }}
                page={safePage}
                pageCount={pageCount}
                pageSize={pageSize}
                totalCount={filteredRows.length}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function ExperimentSegmentPanel({
  createNextLoopError,
  createNextLoopIsError,
  createNextLoopIsPending,
  createNextLoopResult,
  detail,
  evaluatePromotionRunResult,
  isError,
  isLoading,
  onCreateNextLoop,
  selectedSegmentId,
  segments
}: {
  createNextLoopError: unknown;
  createNextLoopIsError: boolean;
  createNextLoopIsPending: boolean;
  createNextLoopResult: PromotionExperimentLaunchResult | null;
  detail: DashboardSegmentDetail | undefined;
  evaluatePromotionRunResult: DashboardEvaluatePromotionRunResult | null;
  isError: boolean;
  isLoading: boolean;
  onCreateNextLoop: (
    promotionRunId: string,
    failedSegmentIds: string[],
    failedAdExperimentIds: string[]
  ) => void;
  selectedSegmentId: string;
  segments: DashboardCampaignSegment[];
}) {
  if (segments.length === 0) {
    return <EmptyState message="실험을 확인할 고객군이 없어요." />;
  }
  return (
    <section className="grid gap-4">
      <SelectedSegmentExperimentCards
        createNextLoopError={createNextLoopError}
        createNextLoopIsError={createNextLoopIsError}
        createNextLoopIsPending={createNextLoopIsPending}
        createNextLoopResult={createNextLoopResult}
        detail={detail}
        evaluatePromotionRunResult={evaluatePromotionRunResult}
        isError={isError}
        isLoading={isLoading}
        onCreateNextLoop={onCreateNextLoop}
        selectedSegmentId={selectedSegmentId}
      />
    </section>
  );
}

function SelectedSegmentExperimentCards({
  createNextLoopError,
  createNextLoopIsError,
  createNextLoopIsPending,
  createNextLoopResult,
  detail,
  evaluatePromotionRunResult,
  isError,
  isLoading,
  onCreateNextLoop,
  selectedSegmentId
}: {
  createNextLoopError: unknown;
  createNextLoopIsError: boolean;
  createNextLoopIsPending: boolean;
  createNextLoopResult: PromotionExperimentLaunchResult | null;
  detail: DashboardSegmentDetail | undefined;
  evaluatePromotionRunResult: DashboardEvaluatePromotionRunResult | null;
  isError: boolean;
  isLoading: boolean;
  onCreateNextLoop: (
    promotionRunId: string,
    failedSegmentIds: string[],
    failedAdExperimentIds: string[]
  ) => void;
  selectedSegmentId: string;
}) {
  if (!selectedSegmentId) {
    return <EmptyState message="고객군을 선택해 주세요." />;
  }
  if (isError) {
    return null;
  }
  if (isLoading || !detail) {
    return <EmptyState message="고객군 실험을 불러오는 중이에요." />;
  }

  const activePromotionRunId = detail.ad_experiments[0]?.promotion_run_id ?? null;
  const currentCreateNextLoopResult = createNextLoopResult
    ? detail.ad_experiments.some(
        (experiment) => experiment.promotion_run_id === createNextLoopResult.promotionRunId
      )
      ? createNextLoopResult
      : null
    : null;
  const currentEvaluationResult =
    evaluatePromotionRunResult?.promotion_run_id === activePromotionRunId
      ? evaluatePromotionRunResult
      : null;
  const failedSegmentIds = uniqueValues(
    (
      currentEvaluationResult?.failed_segment_ids ??
      detail.experiment_metrics
        .filter((metric) => metric.status === "goal_not_met" && metric.segment_id)
        .map((metric) => metric.segment_id)
    ).filter(isPresentString)
  );
  const failedAdExperimentIds = uniqueValues(
    (
      currentEvaluationResult?.failed_ad_experiment_ids ??
      detail.experiment_metrics
        .filter((metric) => metric.status === "goal_not_met" && metric.ad_experiment_id)
        .map((metric) => metric.ad_experiment_id)
    ).filter(isPresentString)
  );
  const canCreateNextLoop = Boolean(
    activePromotionRunId &&
    (currentEvaluationResult?.next_loop_required ||
      failedSegmentIds.length > 0 ||
      failedAdExperimentIds.length > 0)
  );

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="grid gap-1">
            <CardTitle className="text-base">성과와 평가 대상</CardTitle>
            <CardDescription>
              최신 평가 결과를 확인하고 실패한 대상만 다시 실험해요.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={!canCreateNextLoop || createNextLoopIsPending} type="button">
                  <Plus data-icon="inline-start" />
                  {createNextLoopIsPending ? "반복 실험 시작 중" : "반복 실험 시작하기"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>실패한 대상을 다시 실험할까요?</AlertDialogTitle>
                  <AlertDialogDescription>
                    실패한 고객군을 다시 분석해 광고 소재와 실험을 만들고, 사용자 배정과 광고
                    전달까지 이어서 진행해요.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      if (activePromotionRunId) {
                        onCreateNextLoop(
                          activePromotionRunId,
                          failedSegmentIds,
                          failedAdExperimentIds
                        );
                      }
                    }}
                  >
                    생성 및 시작
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          {currentCreateNextLoopResult ? (
            <Alert>
              <AlertTitle>
                {currentCreateNextLoopResult.dispatchFailed
                  ? "반복 실험은 시작했지만 광고를 보내지 못했어요"
                  : currentCreateNextLoopResult.failedExperimentIds.length > 0
                    ? "일부 반복 실험만 시작됐어요"
                    : "반복 실험을 시작했어요"}
              </AlertTitle>
              <AlertDescription>
                {formatInteger(currentCreateNextLoopResult.startedExperimentIds.length)}개 실험을
                시작했어요.
                {currentCreateNextLoopResult.dispatchFailed
                  ? " 시작된 실험은 유지돼요. 발송 상태를 확인해 주세요."
                  : currentCreateNextLoopResult.failedExperimentIds.length > 0
                    ? ` ${formatInteger(currentCreateNextLoopResult.failedExperimentIds.length)}개 실험은 시작하지 못했어요.`
                    : currentCreateNextLoopResult.dispatched
                      ? " 사용자 배정과 발송도 마쳤어요."
                      : " 사용자 배정을 마쳤어요."}
              </AlertDescription>
            </Alert>
          ) : null}
          {createNextLoopIsError ? (
            <Alert variant="destructive">
              <AlertTitle>반복 실험을 시작하지 못했어요</AlertTitle>
              <AlertDescription>{toErrorMessage(createNextLoopError)}</AlertDescription>
            </Alert>
          ) : null}
          {detail.experiment_metrics.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>지표</TableHead>
                  <TableHead>평가</TableHead>
                  <TableHead className="text-right">목표</TableHead>
                  <TableHead className="text-right">실제</TableHead>
                  <TableHead className="text-right">평가 대상</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>사유</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.experiment_metrics.map((metric) => (
                  <TableRow
                    key={`${metric.promotion_run_id}-${metric.ad_experiment_id ?? metric.segment_id}-${metric.created_at}`}
                  >
                    <TableCell className="font-medium">
                      {formatMetricLabel(metric.metric)}
                    </TableCell>
                    <TableCell>{metricExperimentLabel(metric, detail.ad_experiments)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatGoalValue(metric.target_value)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatGoalValue(metric.actual_value)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatInteger(metric.sample_size)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(metric.status)}>
                        {formatStatusLabel(metric.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[360px]">
                      {metric.status === "insufficient_data"
                        ? insufficientReason(metric)
                        : (metric.feedback ?? "-")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState message="아직 확인할 실험 성과가 없어요." />
          )}
        </CardContent>
      </Card>
    </>
  );
}

function isPresentString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function ExperimentPagination({
  onPageChange,
  onPageSizeChange,
  page,
  pageCount,
  pageSize,
  totalCount
}: {
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: (typeof experimentPageSizeOptions)[number]) => void;
  page: number;
  pageCount: number;
  pageSize: (typeof experimentPageSizeOptions)[number];
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
          <FieldLabel className="sr-only" id="experiment-page-size-label">
            페이지당 표시 개수
          </FieldLabel>
          <Select
            onValueChange={(value) =>
              onPageSizeChange(Number(value) as (typeof experimentPageSizeOptions)[number])
            }
            value={String(pageSize)}
          >
            <SelectTrigger aria-labelledby="experiment-page-size-label" className="h-9 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {experimentPageSizeOptions.map((option) => (
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

function ExperimentTable({ rows }: { rows: ExperimentRow[] }) {
  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[1180px]">
        <TableHeader>
          <TableRow>
            <TableHead>실험</TableHead>
            <TableHead>프로모션</TableHead>
            <TableHead>고객군</TableHead>
            <TableHead>광고 소재</TableHead>
            <TableHead className="text-right">목표 / 실제</TableHead>
            <TableHead className="text-right">평가 대상 / 배정</TableHead>
            <TableHead>실험 상태</TableHead>
            <TableHead>평가 상태</TableHead>
            <TableHead>업데이트</TableHead>
            <TableHead>피드백</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.experimentId}>
              <TableCell>
                <div className="grid min-w-[180px] gap-1">
                  <span className="font-medium">{experimentRowLabel(row)}</span>
                  <span className="text-xs text-muted-foreground">
                    {experimentRowSubLabel(row)}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div className="grid min-w-[180px] gap-1">
                  <span>
                    {formatChannelLabel(row.promotion?.channel ?? row.experiment?.channel)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {row.promotion?.marketing_theme ?? "프로모션"}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div className="grid min-w-[200px] gap-1">
                  <span className="font-medium">
                    {row.segment?.segment_name ?? fallbackSegmentName(row)}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div className="grid min-w-[220px] gap-1">
                  <span className="font-medium">{contentCandidateTitle(row.contentCandidate)}</span>
                  <span className="text-xs text-muted-foreground">
                    {row.contentCandidate?.cta ?? "광고 소재"}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                <MetricPair
                  left={formatGoalValue(row.targetValue)}
                  right={formatGoalValue(row.actualValue)}
                />
              </TableCell>
              <TableCell className="text-right tabular-nums">
                <MetricPair
                  left={row.latestMetric ? formatInteger(row.sampleSize) : "-"}
                  right={formatInteger(row.experiment?.assignment_count ?? 0)}
                />
              </TableCell>
              <TableCell>
                <Badge variant={statusBadgeVariant(row.experimentStatus)}>
                  {formatStatusLabel(row.experimentStatus)}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant={statusBadgeVariant(row.evaluationStatus ?? "not_evaluated")}>
                    {formatStatusLabel(row.evaluationStatus ?? "not_evaluated")}
                  </Badge>
                  {row.nextLoopRequired ? <Badge variant="outline">반복 실험 필요</Badge> : null}
                </div>
              </TableCell>
              <TableCell>{formatDateTime(row.createdAt)}</TableCell>
              <TableCell>
                <div className="line-clamp-2 min-w-[220px] text-sm">{row.feedback ?? "-"}</div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function MetricPair({ left, right }: { left: string; right: string }) {
  return (
    <div className="inline-flex min-w-[92px] items-center justify-end gap-1.5 rounded-md bg-muted/50 px-2 py-1 text-sm font-medium">
      <span>{left}</span>
      <span className="text-muted-foreground">/</span>
      <span>{right}</span>
    </div>
  );
}

function ExperimentSummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-xl font-semibold">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
