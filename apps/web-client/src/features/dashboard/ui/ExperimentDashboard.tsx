import type {
  DashboardAdExperiment,
  DashboardCampaignDetail,
  DashboardCampaignExperimentMetric,
  DashboardCampaignPromotion,
  DashboardCampaignSegment,
  DashboardContentCandidate,
  DashboardMain
} from "@loopad/shared";
import { Badge } from "@loopad/ui/shadcn/badge";
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
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ComponentProps } from "react";
import { fetchDashboardCampaignDetail } from "../api/dashboard-api.js";
import { formatDateTime, formatInteger, formatPercent } from "../model/dashboard-format.js";
import { useDashboardQueryState } from "../model/dashboard-query.js";
import { dashboardCampaignDetailQueryKey } from "../model/dashboard-query-keys.js";
import type { DashboardQuery } from "../model/dashboard-types.js";
import { EmptyState } from "./EmptyState.js";

type BadgeVariant = ComponentProps<typeof Badge>["variant"];
const FALLBACK_SEGMENT_ID = "seg_existing_all";

type ExperimentRow = {
  actualValue: number | null;
  contentId: string | null;
  createdAt: string | null;
  evaluationStatus: string | null;
  experimentId: string;
  feedback: string | null;
  experiment: DashboardAdExperiment | null;
  contentCandidate: DashboardContentCandidate | null;
  experimentStatus: string;
  latestMetric: DashboardCampaignExperimentMetric | null;
  metrics: DashboardCampaignExperimentMetric[];
  nextLoopRequired: boolean;
  promotion: DashboardCampaignPromotion | null;
  sampleSize: number;
  segment: DashboardCampaignSegment | null;
  targetValue: number | null;
};

export function ExperimentDashboardPanel({
  data,
  query
}: {
  data: DashboardMain;
  query: DashboardQuery;
}) {
  const [, setDashboardQueryState] = useDashboardQueryState();
  const selectedCampaign =
    data.campaigns.find((campaign) => campaign.campaign_id === query.selectedCampaignId) ??
    data.campaigns[0];
  const selectedCampaignId = selectedCampaign?.campaign_id ?? "";
  const detailQuery = useQuery({
    enabled: Boolean(selectedCampaignId),
    queryFn: ({ signal }) => fetchDashboardCampaignDetail(query, selectedCampaignId, signal),
    queryKey: dashboardCampaignDetailQueryKey(query.projectId, selectedCampaignId)
  });

  useEffect(() => {
    if (selectedCampaign && query.selectedCampaignId !== selectedCampaign.campaign_id) {
      void setDashboardQueryState({
        selectedCampaignId: selectedCampaign.campaign_id,
        selectedPromotionId: "",
        selectedSegmentId: ""
      });
    }
  }, [query.selectedCampaignId, selectedCampaign, setDashboardQueryState]);

  if (!selectedCampaign) {
    return <EmptyState message="실험을 확인할 캠페인이 없습니다." />;
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-[#1d1d1f]">실험</h1>
          <p className="text-sm text-muted-foreground">
            {selectedCampaign.campaign_name} 아래의 프로모션, 세그먼트, 실험 상태를 확인합니다.
          </p>
        </div>
        <Field className="w-full md:w-80">
          <FieldLabel>캠페인</FieldLabel>
          <Select
            onValueChange={(campaignId) =>
              void setDashboardQueryState({
                selectedCampaignId: campaignId,
                selectedPromotionId: "",
                selectedSegmentId: ""
              })
            }
            value={selectedCampaignId}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {data.campaigns.map((campaign) => (
                <SelectItem key={campaign.campaign_id} value={campaign.campaign_id}>
                  {campaign.campaign_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      {detailQuery.isError ? (
        <Card>
          <CardHeader>
            <CardTitle>실험 데이터를 불러오지 못했습니다</CardTitle>
            <CardDescription>{toErrorMessage(detailQuery.error)}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <ExperimentDashboardContent detail={detailQuery.data} isLoading={detailQuery.isFetching} />
      )}
    </div>
  );
}

function ExperimentDashboardContent({
  detail,
  isLoading
}: {
  detail: DashboardCampaignDetail | undefined;
  isLoading: boolean;
}) {
  const [promotionFilter, setPromotionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const rows = useMemo(() => (detail ? buildExperimentRows(detail) : []), [detail]);
  const statusOptions = uniqueValues(rows.map((row) => row.experimentStatus));
  const filteredRows = rows.filter(
    (row) =>
      (promotionFilter === "all" || row.promotion?.promotion_id === promotionFilter) &&
      (statusFilter === "all" || row.experimentStatus === statusFilter)
  );
  const nextLoopCount = rows.filter((row) => row.nextLoopRequired).length;
  const insufficientCount = rows.filter(
    (row) => row.evaluationStatus === "insufficient_data"
  ).length;
  const totalAssignmentCount = rows.reduce(
    (sum, row) => sum + (row.experiment?.assignment_count ?? 0),
    0
  );

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
            <Select onValueChange={setPromotionFilter} value={promotionFilter}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 프로모션</SelectItem>
                {detail.promotions.map((promotion) => (
                  <SelectItem key={promotion.promotion_id} value={promotion.promotion_id}>
                    {promotion.channel} · {promotion.promotion_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field className="w-full md:w-44">
            <FieldLabel>실험 상태</FieldLabel>
            <Select onValueChange={setStatusFilter} value={statusFilter}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 상태</SelectItem>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
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
            <ExperimentTable rows={filteredRows} />
          )}
        </CardContent>
      </Card>
    </>
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
                  <span className="font-medium">{row.experimentId}</span>
                  <span className="text-xs text-muted-foreground">
                    {row.experiment?.promotion_run_id ?? row.latestMetric?.promotion_run_id ?? "-"}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div className="grid min-w-[180px] gap-1">
                  <span>{row.promotion?.channel ?? row.experiment?.channel ?? "-"}</span>
                  <span className="text-xs text-muted-foreground">
                    {row.promotion?.promotion_id ??
                      row.experiment?.promotion_id ??
                      row.latestMetric?.promotion_id ??
                      "-"}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div className="grid min-w-[200px] gap-1">
                  <span className="font-medium">
                    {row.segment?.segment_name ?? fallbackSegmentName(row)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {row.segment?.segment_id ??
                      row.experiment?.segment_id ??
                      row.latestMetric?.segment_id ??
                      "-"}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div className="grid min-w-[220px] gap-1">
                  <span className="font-medium">{contentCandidateTitle(row.contentCandidate)}</span>
                  <span className="text-xs text-muted-foreground">{row.contentId ?? "-"}</span>
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
                  {row.experimentStatus}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant={statusBadgeVariant(row.evaluationStatus ?? "not_evaluated")}>
                    {row.evaluationStatus ?? "not_evaluated"}
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

function buildExperimentRows(detail: DashboardCampaignDetail): ExperimentRow[] {
  const promotionsById = new Map(
    detail.promotions.map((promotion) => [promotion.promotion_id, promotion])
  );
  const segmentsByKey = new Map(
    detail.segments.map((segment) => [
      segmentKey(segment.promotion_id, segment.segment_id),
      segment
    ])
  );
  const rawMetricsByExperiment = new Map<string, DashboardCampaignExperimentMetric[]>();

  for (const metric of detail.experiment_metrics) {
    if (!metric.ad_experiment_id) {
      continue;
    }

    rawMetricsByExperiment.set(metric.ad_experiment_id, [
      ...(rawMetricsByExperiment.get(metric.ad_experiment_id) ?? []),
      metric
    ]);
  }

  const visibleExperiments = detail.ad_experiments.filter((experiment) =>
    shouldDisplayExperiment(experiment, rawMetricsByExperiment.get(experiment.ad_experiment_id) ?? [])
  );
  const experimentsById = new Map(
    visibleExperiments.map((experiment) => [experiment.ad_experiment_id, experiment])
  );
  const contentCandidatesById = new Map(
    detail.content_candidates.map((candidate) => [candidate.content_id, candidate])
  );
  const groups = new Map<string, DashboardCampaignExperimentMetric[]>();

  for (const metric of detail.experiment_metrics) {
    if (!metric.ad_experiment_id) {
      continue;
    }

    if (!experimentsById.has(metric.ad_experiment_id)) {
      if (metric.segment_id === FALLBACK_SEGMENT_ID && !hasEvaluationSignal(metric)) {
        continue;
      }

      if (detail.ad_experiments.some((experiment) => experiment.ad_experiment_id === metric.ad_experiment_id)) {
        continue;
      }
    }

    groups.set(metric.ad_experiment_id, [...(groups.get(metric.ad_experiment_id) ?? []), metric]);
  }

  for (const experiment of visibleExperiments) {
    if (!groups.has(experiment.ad_experiment_id)) {
      groups.set(experiment.ad_experiment_id, []);
    }
  }

  return [...groups.entries()]
    .map(([experimentId, metrics]) => {
      const sortedMetrics = sortMetricsByNewest(metrics);
      const latestMetric = sortedMetrics[0] ?? null;
      const experiment = experimentsById.get(experimentId) ?? null;
      const contentCandidate = experiment
        ? (contentCandidatesById.get(experiment.content_id) ?? null)
        : latestMetric?.content_id
          ? (contentCandidatesById.get(latestMetric.content_id) ?? null)
          : null;
      const segment =
        findSegmentForExperiment(detail.segments, experimentId, latestMetric) ??
        (experiment
          ? (segmentsByKey.get(segmentKey(experiment.promotion_id, experiment.segment_id)) ?? null)
          : null) ??
        (latestMetric?.segment_id
          ? (segmentsByKey.get(segmentKey(latestMetric.promotion_id, latestMetric.segment_id)) ??
            null)
          : null);
      const promotionId =
        latestMetric?.promotion_id ?? experiment?.promotion_id ?? segment?.promotion_id ?? "";
      const promotion = promotionsById.get(promotionId) ?? null;
      const sampleSize =
        sortedMetrics.length > 0
          ? sortedMetrics.reduce((sum, metric) => sum + metric.sample_size, 0)
          : 0;

      return {
        actualValue: latestMetric?.actual_value ?? null,
        contentId:
          latestMetric?.content_option_id ??
          latestMetric?.content_id ??
          experiment?.content_option_id ??
          experiment?.content_id ??
          null,
        contentCandidate,
        createdAt: latestMetric?.created_at ?? null,
        evaluationStatus: latestMetric?.status ?? null,
        experimentId,
        experiment,
        experimentStatus: experiment?.status ?? "missing_experiment",
        feedback: latestMetric?.feedback ?? segment?.natural_language_query ?? null,
        latestMetric,
        metrics: sortedMetrics,
        nextLoopRequired: sortedMetrics.some((metric) => metric.next_loop_required),
        promotion,
        sampleSize,
        segment,
        targetValue: latestMetric?.target_value ?? experiment?.goal_target_value ?? null
      };
    })
    .sort(compareExperimentRows);
}

function compareExperimentRows(left: ExperimentRow, right: ExperimentRow) {
  const timestampDelta = metricTimestamp(right.latestMetric) - metricTimestamp(left.latestMetric);
  if (timestampDelta !== 0) {
    return timestampDelta;
  }

  const loopDelta = (right.experiment?.loop_count ?? 0) - (left.experiment?.loop_count ?? 0);
  if (loopDelta !== 0) {
    return loopDelta;
  }

  return left.experimentId.localeCompare(right.experimentId);
}

function findSegmentForExperiment(
  segments: DashboardCampaignSegment[],
  experimentId: string,
  metric: DashboardCampaignExperimentMetric | null
) {
  if (metric?.segment_id) {
    return (
      segments.find(
        (segment) =>
          segment.promotion_id === metric.promotion_id && segment.segment_id === metric.segment_id
      ) ?? null
    );
  }

  return segments.find((segment) => segment.ad_experiment_id === experimentId) ?? null;
}

function shouldDisplayExperiment(
  experiment: DashboardAdExperiment,
  metrics: DashboardCampaignExperimentMetric[]
) {
  if (experiment.segment_id !== FALLBACK_SEGMENT_ID) {
    return true;
  }

  return experiment.assignment_count > 0 || metrics.some(hasEvaluationSignal);
}

function hasEvaluationSignal(metric: DashboardCampaignExperimentMetric) {
  return metric.sample_size > 0 || metric.denominator_count > 0 || metric.numerator_count > 0;
}

function fallbackSegmentName(row: ExperimentRow) {
  const segmentId = row.experiment?.segment_id ?? row.latestMetric?.segment_id;
  return segmentId === FALLBACK_SEGMENT_ID ? "기본 광고 비교군" : "-";
}

function segmentKey(promotionId: string, segmentId: string) {
  return `${promotionId}:${segmentId}`;
}

function sortMetricsByNewest(metrics: DashboardCampaignExperimentMetric[]) {
  return [...metrics].sort((a, b) => metricTimestamp(b) - metricTimestamp(a));
}

function metricTimestamp(metric: DashboardCampaignExperimentMetric | null) {
  if (!metric) {
    return 0;
  }
  const timestamp = new Date(metric.created_at).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function contentCandidateTitle(candidate: DashboardContentCandidate | null) {
  return (
    candidate?.title ??
    candidate?.subject ??
    candidate?.message ??
    candidate?.content_option_id ??
    "-"
  );
}

function uniqueValues(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function statusBadgeVariant(status: string): BadgeVariant {
  if (
    status === "goal_met" ||
    status === "approved" ||
    status === "running" ||
    status === "active"
  ) {
    return "secondary";
  }

  if (
    status === "goal_not_met" ||
    status === "insufficient_data" ||
    status === "failed" ||
    status === "rejected"
  ) {
    return "destructive";
  }

  return "outline";
}

function formatGoalValue(value: number | null) {
  if (value === null) {
    return "-";
  }
  return value <= 1 ? formatPercent(value) : formatInteger(Math.round(value));
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "요청을 처리하지 못했습니다.";
}
