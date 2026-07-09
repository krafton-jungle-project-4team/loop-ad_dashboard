import type {
  DashboardCampaignDetail,
  DashboardCampaignExperimentMetric,
  DashboardCampaignPromotion,
  DashboardCampaignSegment,
  DashboardSegmentDetail
} from "@loopad/shared";
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
import { useEffect, useMemo, useState } from "react";
import { formatChannelLabel, formatMetricLabel, formatStatusLabel } from "../../../../../../model/dashboard-labels.js";
import { formatDateTime, formatInteger, formatPercent } from "../../../../../../model/dashboard-format.js";
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
  detail,
  isLoading,
  selectedSegmentDetail,
  selectedSegmentDetailIsError,
  selectedSegmentDetailIsLoading,
  selectedSegmentId,
}: {
  detail: DashboardCampaignDetail | undefined;
  isLoading: boolean;
  selectedSegmentDetail: DashboardSegmentDetail | undefined;
  selectedSegmentDetailIsError: boolean;
  selectedSegmentDetailIsLoading: boolean;
  selectedSegmentId: string;
}) {
  const [promotionFilter, setPromotionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof experimentPageSizeOptions)[number]>(10);
  const rows = useMemo(() => (detail ? buildExperimentRows(detail) : []), [detail]);
  const statusOptions = uniqueValues(rows.map((row) => row.experimentStatus));
  const filteredRows = rows.filter(
    (row) =>
      (promotionFilter === "all" || row.promotion?.promotion_id === promotionFilter) &&
      (statusFilter === "all" || row.experimentStatus === statusFilter)
  );
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
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
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  if (!detail) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{isLoading ? "실험 데이터를 불러오는 중" : "실험 데이터 없음"}</CardTitle>
          <CardDescription>선택된 캠페인의 실험 정보를 준비하고 있습니다.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-3 md:grid-cols-5">
        <ExperimentSummaryCard label="프로모션" value={formatInteger(detail.promotions.length)} />
        <ExperimentSummaryCard label="세그먼트" value={formatInteger(detail.segments.length)} />
        <ExperimentSummaryCard label="실험" value={formatInteger(rows.length)} />
        <ExperimentSummaryCard label="배정 합계" value={formatInteger(totalAssignmentCount)} />
        <ExperimentSummaryCard
          label="재실험 필요"
          value={`${formatInteger(nextLoopCount)} / 부족 ${formatInteger(insufficientCount)}`}
        />
      </div>

      <ExperimentSegmentPanel
        detail={selectedSegmentDetail}
        isError={selectedSegmentDetailIsError}
        isLoading={selectedSegmentDetailIsLoading}
        selectedSegmentId={selectedSegmentId}
        segments={detail.segments}
      />

      <Card>
        <CardHeader className="gap-3 md:grid-cols-[1fr_auto_auto]">
          <div className="grid gap-1">
            <CardTitle>진행 실험 목록</CardTitle>
            <CardDescription>
              프로모션과 세그먼트에 연결된 실험, 평가 지표, 다음 루프 여부를 함께 봅니다.
            </CardDescription>
          </div>
          <Field className="w-full md:w-56">
            <FieldLabel>프로모션</FieldLabel>
            <Select
              onValueChange={(value) => {
                setPromotionFilter(value);
                setPage(1);
              }}
              value={promotionFilter}
            >
              <SelectTrigger className="w-full">
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
            <FieldLabel>실험 상태</FieldLabel>
            <Select
              onValueChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
              value={statusFilter}
            >
              <SelectTrigger className="w-full">
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
            <EmptyState message="선택된 캠페인에 연결된 실험이 없습니다." />
          ) : filteredRows.length === 0 ? (
            <EmptyState message="필터 조건에 맞는 실험이 없습니다." />
          ) : (
            <div className="grid gap-4">
              <ExperimentTable rows={pageRows} />
              <ExperimentPagination
                onPageChange={setPage}
                onPageSizeChange={(value) => {
                  setPageSize(value);
                  setPage(1);
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
  detail,
  isError,
  isLoading,
  selectedSegmentId,
  segments
}: {
  detail: DashboardSegmentDetail | undefined;
  isError: boolean;
  isLoading: boolean;
  selectedSegmentId: string;
  segments: DashboardCampaignSegment[];
}) {
  if (segments.length === 0) {
    return <EmptyState message="실험을 확인할 세그먼트가 없습니다." />;
  }
  return (
    <section className="grid gap-4">
      <SelectedSegmentExperimentCards
        detail={detail}
        error={error}
        isError={isError}
        isLoading={isLoading}
        selectedSegmentId={selectedSegmentId}
      />
    </section>
  );
}

function SelectedSegmentExperimentCards({
  detail,
  error,
  isError,
  isLoading,
  selectedSegmentId
}: {
  detail: DashboardSegmentDetail | undefined;
  error: Error | null;
  isError: boolean;
  isLoading: boolean;
  selectedSegmentId: string;
}) {
  if (!selectedSegmentId) {
    return <EmptyState message="실험을 확인할 세그먼트를 선택해주세요." />;
  }
  if (isError) {
    return null;
  }
  if (isLoading || !detail) {
    return <EmptyState message="세그먼트 실험 정보를 불러오는 중입니다." />;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">지표 / 표본 부족 사유</CardTitle>
          <CardDescription>평가는 세그먼트 하위 실험 지표 기준으로 확인합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {detail.experiment_metrics.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>지표</TableHead>
                  <TableHead>평가</TableHead>
                  <TableHead className="text-right">목표</TableHead>
                  <TableHead className="text-right">실제</TableHead>
                  <TableHead className="text-right">표본</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>사유</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.experiment_metrics.map((metric) => (
                  <TableRow
                    key={`${metric.promotion_run_id}-${metric.ad_experiment_id ?? metric.segment_id}-${metric.created_at}`}
                  >
                    <TableCell className="font-medium">{formatMetricLabel(metric.metric)}</TableCell>
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
            <EmptyState message="아직 세그먼트 실험 지표가 없습니다." />
          )}
        </CardContent>
      </Card>
    </>
  );
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
          <FieldLabel className="sr-only">페이지당 표시 개수</FieldLabel>
          <Select
            onValueChange={(value) =>
              onPageSizeChange(Number(value) as (typeof experimentPageSizeOptions)[number])
            }
            value={String(pageSize)}
          >
            <SelectTrigger className="h-9 w-full">
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
            <TableHead>세그먼트</TableHead>
            <TableHead>콘텐츠</TableHead>
            <TableHead className="text-right">목표 / 실제</TableHead>
            <TableHead className="text-right">평가 표본 / 배정</TableHead>
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
                    {row.contentCandidate?.cta ?? "광고 콘텐츠"}
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
                  {row.nextLoopRequired ? <Badge variant="outline">다음 루프</Badge> : null}
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
