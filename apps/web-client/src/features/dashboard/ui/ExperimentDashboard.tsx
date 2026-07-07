import type {
  DashboardAdExperiment,
  DashboardCampaignDetail,
  DashboardCampaignExperimentMetric,
  DashboardCampaignPromotion,
  DashboardCampaignSegment,
  DashboardContentCandidate,
  DashboardEvaluatePromotionRunResult,
  DashboardMain,
  DashboardSegmentDetail
} from "@loopad/shared";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@loopad/ui/shadcn/table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, CheckCircle2, Plus, Send, Target } from "lucide-react";
import { useEffect, useMemo, useState, type ComponentProps } from "react";
import {
  buildDashboardPromotionRunAssignments,
  createDashboardNextLoop,
  createDashboardPromotionRun,
  dispatchDashboardPromotionRun,
  evaluateDashboardPromotionRun,
  fetchDashboardCampaignDetail,
  fetchDashboardSegmentDetail,
  startDashboardAdExperiment
} from "../api/dashboard-api.js";
import {
  formatChannelLabel,
  formatMetricLabel,
  formatStatusLabel
} from "../model/dashboard-labels.js";
import { formatDateTime, formatInteger, formatPercent } from "../model/dashboard-format.js";
import { useDashboardQueryState } from "../model/dashboard-query.js";
import {
  dashboardCampaignDetailQueryKey,
  dashboardSegmentDetailQueryKey
} from "../model/dashboard-query-keys.js";
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
  const queryClient = useQueryClient();
  const selectedCampaign =
    data.campaigns.find((campaign) => campaign.campaign_id === query.selectedCampaignId) ??
    data.campaigns[0];
  const selectedCampaignId = selectedCampaign?.campaign_id ?? "";
  const detailQuery = useQuery({
    enabled: Boolean(selectedCampaignId),
    queryFn: ({ signal }) => fetchDashboardCampaignDetail(query, selectedCampaignId, signal),
    queryKey: dashboardCampaignDetailQueryKey(query.projectId, selectedCampaignId)
  });
  const selectedSegment = selectExperimentSegment(detailQuery.data, query);
  const selectedSegmentId = selectedSegment?.segment_id ?? "";
  const selectedPromotionId = selectedSegment?.promotion_id ?? "";
  const segmentDetailQuery = useQuery({
    enabled: Boolean(selectedPromotionId && selectedSegmentId),
    queryFn: ({ signal }) =>
      fetchDashboardSegmentDetail(query, selectedPromotionId, selectedSegmentId, signal),
    queryKey: dashboardSegmentDetailQueryKey(query.projectId, selectedPromotionId, selectedSegmentId)
  });
  const invalidateExperimentQueries = async (promotionId?: string, segmentId?: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      queryClient.invalidateQueries({
        queryKey: dashboardCampaignDetailQueryKey(query.projectId, selectedCampaignId)
      }),
      promotionId && segmentId
        ? queryClient.invalidateQueries({
            queryKey: dashboardSegmentDetailQueryKey(query.projectId, promotionId, segmentId)
          })
        : Promise.resolve()
    ]);
  };
  const createPromotionRunMutation = useMutation({
    mutationFn: ({
      analysisId,
      generationId,
      promotionId
    }: {
      analysisId: string;
      generationId: string;
      promotionId: string;
    }) =>
      createDashboardPromotionRun(query, promotionId, {
        analysis_id: analysisId,
        generation_id: generationId,
        loop_count: 1
      }),
    onSuccess: async (result) => {
      const createdSegmentId = result.ad_experiments[0]?.segment_id ?? selectedSegmentId;
      await invalidateExperimentQueries(result.promotion_id, createdSegmentId);
    }
  });
  const buildPromotionRunAssignmentsMutation = useMutation({
    mutationFn: (promotionRunId: string) =>
      buildDashboardPromotionRunAssignments(query, promotionRunId),
    onSuccess: async () => {
      await invalidateExperimentQueries(selectedPromotionId, selectedSegmentId);
    }
  });
  const evaluatePromotionRunMutation = useMutation({
    mutationFn: (promotionRunId: string) => evaluateDashboardPromotionRun(query, promotionRunId),
    onSuccess: async () => {
      await invalidateExperimentQueries(selectedPromotionId, selectedSegmentId);
    }
  });
  const createNextLoopMutation = useMutation({
    mutationFn: ({
      failedAdExperimentIds,
      failedSegmentIds,
      promotionRunId
    }: {
      failedAdExperimentIds: string[];
      failedSegmentIds: string[];
      promotionRunId: string;
    }) =>
      createDashboardNextLoop(query, promotionRunId, {
        failed_ad_experiment_ids: failedAdExperimentIds,
        failed_segment_ids: failedSegmentIds
      }),
    onSuccess: async (result) => {
      await invalidateExperimentQueries(result.promotion_id, selectedSegmentId);
    }
  });
  const dispatchPromotionRunMutation = useMutation({
    mutationFn: (promotionRunId: string) => dispatchDashboardPromotionRun(promotionRunId),
    onSuccess: async () => {
      await invalidateExperimentQueries(selectedPromotionId, selectedSegmentId);
    }
  });
  const startAdExperimentMutation = useMutation({
    mutationFn: ({
      adExperimentId,
      promotionId
    }: {
      adExperimentId: string;
      promotionId: string;
    }) => startDashboardAdExperiment(query, promotionId, adExperimentId),
    onSuccess: async (experiment) => {
      await invalidateExperimentQueries(experiment.promotion_id, experiment.segment_id);
    }
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

  useEffect(() => {
    if (
      selectedCampaignId &&
      selectedSegment &&
      (query.selectedPromotionId !== selectedSegment.promotion_id ||
        query.selectedSegmentId !== selectedSegment.segment_id)
    ) {
      void setDashboardQueryState({
        selectedPromotionId: selectedSegment.promotion_id,
        selectedSegmentId: selectedSegment.segment_id
      });
    }
  }, [
    query.selectedPromotionId,
    query.selectedSegmentId,
    selectedCampaignId,
    selectedSegment,
    setDashboardQueryState
  ]);

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
        <ExperimentDashboardContent
          buildAssignmentsError={buildPromotionRunAssignmentsMutation.error}
          buildAssignmentsIsError={buildPromotionRunAssignmentsMutation.isError}
          buildAssignmentsIsPending={buildPromotionRunAssignmentsMutation.isPending}
          createNextLoopError={createNextLoopMutation.error}
          createNextLoopIsError={createNextLoopMutation.isError}
          createNextLoopIsPending={createNextLoopMutation.isPending}
          createPromotionRunError={createPromotionRunMutation.error}
          createPromotionRunIsError={createPromotionRunMutation.isError}
          createPromotionRunIsPending={createPromotionRunMutation.isPending}
          detail={detailQuery.data}
          dispatchPromotionRunError={dispatchPromotionRunMutation.error}
          dispatchPromotionRunIsError={dispatchPromotionRunMutation.isError}
          dispatchPromotionRunIsPending={dispatchPromotionRunMutation.isPending}
          evaluatePromotionRunError={evaluatePromotionRunMutation.error}
          evaluatePromotionRunIsError={evaluatePromotionRunMutation.isError}
          evaluatePromotionRunIsPending={evaluatePromotionRunMutation.isPending}
          evaluatePromotionRunResult={evaluatePromotionRunMutation.data ?? null}
          isLoading={detailQuery.isFetching}
          onBuildAssignments={(promotionRunId) =>
            buildPromotionRunAssignmentsMutation.mutate(promotionRunId)
          }
          onCreateNextLoop={(promotionRunId, failedSegmentIds, failedAdExperimentIds) =>
            createNextLoopMutation.mutate({
              failedAdExperimentIds,
              failedSegmentIds,
              promotionRunId
            })
          }
          onCreatePromotionRun={(promotionId, analysisId, generationId) =>
            createPromotionRunMutation.mutate({ analysisId, generationId, promotionId })
          }
          onDispatchPromotionRun={(promotionRunId) =>
            dispatchPromotionRunMutation.mutate(promotionRunId)
          }
          onEvaluatePromotionRun={(promotionRunId) =>
            evaluatePromotionRunMutation.mutate(promotionRunId)
          }
          onSelectSegment={(promotionId, segmentId) =>
            void setDashboardQueryState({
              selectedPromotionId: promotionId,
              selectedSegmentId: segmentId
            })
          }
          onStartAdExperiment={(promotionId, adExperimentId) =>
            startAdExperimentMutation.mutate({ adExperimentId, promotionId })
          }
          selectedSegmentDetail={segmentDetailQuery.data}
          selectedSegmentDetailError={segmentDetailQuery.error}
          selectedSegmentDetailIsError={segmentDetailQuery.isError}
          selectedSegmentDetailIsLoading={segmentDetailQuery.isLoading}
          selectedSegmentId={selectedSegmentId}
          startAdExperimentError={startAdExperimentMutation.error}
          startAdExperimentIsError={startAdExperimentMutation.isError}
          startAdExperimentIsPending={startAdExperimentMutation.isPending}
        />
      )}
    </div>
  );
}

function ExperimentDashboardContent({
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
  isLoading,
  onBuildAssignments,
  onCreateNextLoop,
  onCreatePromotionRun,
  onDispatchPromotionRun,
  onEvaluatePromotionRun,
  onSelectSegment,
  onStartAdExperiment,
  selectedSegmentDetail,
  selectedSegmentDetailError,
  selectedSegmentDetailIsError,
  selectedSegmentDetailIsLoading,
  selectedSegmentId,
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
  detail: DashboardCampaignDetail | undefined;
  dispatchPromotionRunError: Error | null;
  dispatchPromotionRunIsError: boolean;
  dispatchPromotionRunIsPending: boolean;
  evaluatePromotionRunError: Error | null;
  evaluatePromotionRunIsError: boolean;
  evaluatePromotionRunIsPending: boolean;
  evaluatePromotionRunResult: DashboardEvaluatePromotionRunResult | null;
  isLoading: boolean;
  onBuildAssignments: (promotionRunId: string) => void;
  onCreateNextLoop: (
    promotionRunId: string,
    failedSegmentIds: string[],
    failedAdExperimentIds: string[]
  ) => void;
  onCreatePromotionRun: (
    promotionId: string,
    analysisId: string,
    generationId: string
  ) => void;
  onDispatchPromotionRun: (promotionRunId: string) => void;
  onEvaluatePromotionRun: (promotionRunId: string) => void;
  onSelectSegment: (promotionId: string, segmentId: string) => void;
  onStartAdExperiment: (promotionId: string, adExperimentId: string) => void;
  selectedSegmentDetail: DashboardSegmentDetail | undefined;
  selectedSegmentDetailError: Error | null;
  selectedSegmentDetailIsError: boolean;
  selectedSegmentDetailIsLoading: boolean;
  selectedSegmentId: string;
  startAdExperimentError: Error | null;
  startAdExperimentIsError: boolean;
  startAdExperimentIsPending: boolean;
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

      <ExperimentSegmentPanel
        buildAssignmentsError={buildAssignmentsError}
        buildAssignmentsIsError={buildAssignmentsIsError}
        buildAssignmentsIsPending={buildAssignmentsIsPending}
        createNextLoopError={createNextLoopError}
        createNextLoopIsError={createNextLoopIsError}
        createNextLoopIsPending={createNextLoopIsPending}
        createPromotionRunError={createPromotionRunError}
        createPromotionRunIsError={createPromotionRunIsError}
        createPromotionRunIsPending={createPromotionRunIsPending}
        detail={selectedSegmentDetail}
        dispatchPromotionRunError={dispatchPromotionRunError}
        dispatchPromotionRunIsError={dispatchPromotionRunIsError}
        dispatchPromotionRunIsPending={dispatchPromotionRunIsPending}
        error={selectedSegmentDetailError}
        evaluatePromotionRunError={evaluatePromotionRunError}
        evaluatePromotionRunIsError={evaluatePromotionRunIsError}
        evaluatePromotionRunIsPending={evaluatePromotionRunIsPending}
        evaluatePromotionRunResult={evaluatePromotionRunResult}
        isError={selectedSegmentDetailIsError}
        isLoading={selectedSegmentDetailIsLoading}
        onBuildAssignments={onBuildAssignments}
        onCreateNextLoop={onCreateNextLoop}
        onCreatePromotionRun={onCreatePromotionRun}
        onDispatchPromotionRun={onDispatchPromotionRun}
        onEvaluatePromotionRun={onEvaluatePromotionRun}
        onSelectSegment={onSelectSegment}
        onStartAdExperiment={onStartAdExperiment}
        selectedSegmentId={selectedSegmentId}
        segments={detail.segments}
        startAdExperimentError={startAdExperimentError}
        startAdExperimentIsError={startAdExperimentIsError}
        startAdExperimentIsPending={startAdExperimentIsPending}
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
            <Select onValueChange={setPromotionFilter} value={promotionFilter}>
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
            <Select onValueChange={setStatusFilter} value={statusFilter}>
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
            <ExperimentTable rows={filteredRows} />
          )}
        </CardContent>
      </Card>
    </>
  );
}

function ExperimentSegmentPanel({
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
  error,
  evaluatePromotionRunError,
  evaluatePromotionRunIsError,
  evaluatePromotionRunIsPending,
  evaluatePromotionRunResult,
  isError,
  isLoading,
  onBuildAssignments,
  onCreateNextLoop,
  onCreatePromotionRun,
  onDispatchPromotionRun,
  onEvaluatePromotionRun,
  onSelectSegment,
  onStartAdExperiment,
  selectedSegmentId,
  segments,
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
  detail: DashboardSegmentDetail | undefined;
  dispatchPromotionRunError: Error | null;
  dispatchPromotionRunIsError: boolean;
  dispatchPromotionRunIsPending: boolean;
  error: Error | null;
  evaluatePromotionRunError: Error | null;
  evaluatePromotionRunIsError: boolean;
  evaluatePromotionRunIsPending: boolean;
  evaluatePromotionRunResult: DashboardEvaluatePromotionRunResult | null;
  isError: boolean;
  isLoading: boolean;
  onBuildAssignments: (promotionRunId: string) => void;
  onCreateNextLoop: (
    promotionRunId: string,
    failedSegmentIds: string[],
    failedAdExperimentIds: string[]
  ) => void;
  onCreatePromotionRun: (
    promotionId: string,
    analysisId: string,
    generationId: string
  ) => void;
  onDispatchPromotionRun: (promotionRunId: string) => void;
  onEvaluatePromotionRun: (promotionRunId: string) => void;
  onSelectSegment: (promotionId: string, segmentId: string) => void;
  onStartAdExperiment: (promotionId: string, adExperimentId: string) => void;
  selectedSegmentId: string;
  segments: DashboardCampaignSegment[];
  startAdExperimentError: Error | null;
  startAdExperimentIsError: boolean;
  startAdExperimentIsPending: boolean;
}) {
  if (segments.length === 0) {
    return <EmptyState message="실험을 확인할 세그먼트가 없습니다." />;
  }
  const selectedSegmentValue = detail?.segment
    ? segmentSelectValue(detail.segment)
    : (segments.find((segment) => segment.segment_id === selectedSegmentId)
        ? segmentSelectValue(segments.find((segment) => segment.segment_id === selectedSegmentId)!)
        : "");

  return (
    <section className="grid gap-4">
      <Card>
        <CardHeader className="gap-3 md:grid md:grid-cols-[1fr_320px] md:items-end">
          <div className="grid gap-1">
            <CardTitle>세그먼트 실험 상세</CardTitle>
            <CardDescription>
              선택한 세그먼트에 연결된 광고 실험과 평가 지표를 확인합니다.
            </CardDescription>
          </div>
          <Field>
            <FieldLabel>세그먼트</FieldLabel>
            <Select
              onValueChange={(value) => {
                const segment = segments.find(
                  (candidate) => segmentSelectValue(candidate) === value
                );
                if (segment) {
                  onSelectSegment(segment.promotion_id, segment.segment_id);
                }
              }}
              value={selectedSegmentValue}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="세그먼트 선택" />
              </SelectTrigger>
              <SelectContent>
                {segments.map((segment) => (
                  <SelectItem key={segmentSelectValue(segment)} value={segmentSelectValue(segment)}>
                    {segment.segment_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </CardHeader>
      </Card>

      <SelectedSegmentExperimentCards
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
        error={error}
        evaluatePromotionRunError={evaluatePromotionRunError}
        evaluatePromotionRunIsError={evaluatePromotionRunIsError}
        evaluatePromotionRunIsPending={evaluatePromotionRunIsPending}
        evaluatePromotionRunResult={evaluatePromotionRunResult}
        isError={isError}
        isLoading={isLoading}
        onBuildAssignments={onBuildAssignments}
        onCreateNextLoop={onCreateNextLoop}
        onCreatePromotionRun={onCreatePromotionRun}
        onDispatchPromotionRun={onDispatchPromotionRun}
        onEvaluatePromotionRun={onEvaluatePromotionRun}
        onStartAdExperiment={onStartAdExperiment}
        selectedSegmentId={selectedSegmentId}
        startAdExperimentError={startAdExperimentError}
        startAdExperimentIsError={startAdExperimentIsError}
        startAdExperimentIsPending={startAdExperimentIsPending}
      />
    </section>
  );
}

function SelectedSegmentExperimentCards({
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
  error,
  evaluatePromotionRunError,
  evaluatePromotionRunIsError,
  evaluatePromotionRunIsPending,
  evaluatePromotionRunResult,
  isError,
  isLoading,
  onBuildAssignments,
  onCreateNextLoop,
  onCreatePromotionRun,
  onDispatchPromotionRun,
  onEvaluatePromotionRun,
  onStartAdExperiment,
  selectedSegmentId,
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
  detail: DashboardSegmentDetail | undefined;
  dispatchPromotionRunError: Error | null;
  dispatchPromotionRunIsError: boolean;
  dispatchPromotionRunIsPending: boolean;
  error: Error | null;
  evaluatePromotionRunError: Error | null;
  evaluatePromotionRunIsError: boolean;
  evaluatePromotionRunIsPending: boolean;
  evaluatePromotionRunResult: DashboardEvaluatePromotionRunResult | null;
  isError: boolean;
  isLoading: boolean;
  onBuildAssignments: (promotionRunId: string) => void;
  onCreateNextLoop: (
    promotionRunId: string,
    failedSegmentIds: string[],
    failedAdExperimentIds: string[]
  ) => void;
  onCreatePromotionRun: (
    promotionId: string,
    analysisId: string,
    generationId: string
  ) => void;
  onDispatchPromotionRun: (promotionRunId: string) => void;
  onEvaluatePromotionRun: (promotionRunId: string) => void;
  onStartAdExperiment: (promotionId: string, adExperimentId: string) => void;
  selectedSegmentId: string;
  startAdExperimentError: Error | null;
  startAdExperimentIsError: boolean;
  startAdExperimentIsPending: boolean;
}) {
  if (!selectedSegmentId) {
    return <EmptyState message="실험을 확인할 세그먼트를 선택해주세요." />;
  }
  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>세그먼트 실험 정보를 불러오지 못했습니다</AlertTitle>
        <AlertDescription>{error?.message ?? "API 요청에 실패했습니다."}</AlertDescription>
      </Alert>
    );
  }
  if (isLoading || !detail) {
    return <EmptyState message="세그먼트 실험 정보를 불러오는 중입니다." />;
  }

  const approvedContentCandidate = detail.content_candidates.find(
    (candidate) => candidate.status === "approved"
  );
  const activePromotionRunId = detail.ad_experiments[0]?.promotion_run_id ?? null;
  const failedSegmentIds = uniqueValues(
    (
      evaluatePromotionRunResult?.failed_segment_ids ??
      detail.experiment_metrics
        .filter((metric) => metric.status === "goal_not_met" && metric.segment_id)
        .map((metric) => metric.segment_id)
    ).filter(isPresentString)
  );
  const failedAdExperimentIds = uniqueValues(
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
    <>
      <Card>
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
              <AlertDescription>{toErrorMessage(createPromotionRunError)}</AlertDescription>
            </Alert>
          ) : null}
          {buildAssignmentsIsError ? (
            <Alert variant="destructive">
              <AlertTitle>대상 배정 생성에 실패했습니다</AlertTitle>
              <AlertDescription>{toErrorMessage(buildAssignmentsError)}</AlertDescription>
            </Alert>
          ) : null}
          {evaluatePromotionRunIsError ? (
            <Alert variant="destructive">
              <AlertTitle>성과 평가 요청에 실패했습니다</AlertTitle>
              <AlertDescription>{toErrorMessage(evaluatePromotionRunError)}</AlertDescription>
            </Alert>
          ) : null}
          {createNextLoopIsError ? (
            <Alert variant="destructive">
              <AlertTitle>다음 루프 생성에 실패했습니다</AlertTitle>
              <AlertDescription>{toErrorMessage(createNextLoopError)}</AlertDescription>
            </Alert>
          ) : null}
          {dispatchPromotionRunIsError ? (
            <Alert variant="destructive">
              <AlertTitle>광고 실행 요청에 실패했습니다</AlertTitle>
              <AlertDescription>{toErrorMessage(dispatchPromotionRunError)}</AlertDescription>
            </Alert>
          ) : null}
          {startAdExperimentIsError ? (
            <Alert variant="destructive">
              <AlertTitle>광고 실험을 시작하지 못했습니다</AlertTitle>
              <AlertDescription>{toErrorMessage(startAdExperimentError)}</AlertDescription>
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
                      <TableCell>{contentCandidateTitle(contentCandidate)}</TableCell>
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
                              startAdExperimentIsPending ||
                              !canStartAdExperiment(experiment.status)
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

function experimentDisplayName(loopCount: number | null | undefined, index = 0) {
  return loopCount ? `루프 ${formatInteger(loopCount)} 실험` : `광고 실험 ${formatInteger(index + 1)}`;
}

function metricExperimentLabel(
  metric: DashboardCampaignExperimentMetric,
  experiments: DashboardAdExperiment[]
) {
  const experiment = experiments.find(
    (candidate) => candidate.ad_experiment_id === metric.ad_experiment_id
  );
  return experiment
    ? experimentDisplayName(experiment.loop_count)
    : `${formatMetricLabel(metric.metric)} 평가`;
}

function experimentRowLabel(row: ExperimentRow) {
  if (row.experiment) {
    return experimentDisplayName(row.experiment.loop_count);
  }
  return row.latestMetric ? `${formatMetricLabel(row.latestMetric.metric)} 평가` : "광고 실험";
}

function experimentRowSubLabel(row: ExperimentRow) {
  const metric = row.latestMetric?.metric ?? row.experiment?.goal_metric;
  return metric ? formatMetricLabel(metric) : "평가 대기";
}

function selectExperimentSegment(
  detail: DashboardCampaignDetail | undefined,
  query: DashboardQuery
) {
  if (!detail) {
    return null;
  }

  const selectedSegment = detail.segments.find(
    (segment) =>
      segment.segment_id === query.selectedSegmentId &&
      (!query.selectedPromotionId || segment.promotion_id === query.selectedPromotionId)
  );
  if (selectedSegment) {
    return selectedSegment;
  }

  const segmentsWithExperimentData = detail.segments.filter((segment) =>
    hasSegmentExperimentData(segment, detail)
  );
  return segmentsWithExperimentData[0] ?? detail.segments[0] ?? null;
}

function hasSegmentExperimentData(
  segment: DashboardCampaignSegment,
  detail: DashboardCampaignDetail
) {
  return (
    detail.ad_experiments.some(
      (experiment) =>
        experiment.promotion_id === segment.promotion_id &&
        experiment.segment_id === segment.segment_id
    ) ||
    detail.experiment_metrics.some(
      (metric) =>
        metric.promotion_id === segment.promotion_id && metric.segment_id === segment.segment_id
    ) ||
    detail.content_candidates.some(
      (candidate) =>
        candidate.promotion_id === segment.promotion_id &&
        candidate.segment_id === segment.segment_id
    )
  );
}

function segmentSelectValue(segment: DashboardCampaignSegment) {
  return `${segment.promotion_id}:${segment.segment_id}`;
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

function isPresentString(value: string | null | undefined): value is string {
  return Boolean(value);
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

function insufficientReason(metric: DashboardCampaignExperimentMetric) {
  const reason =
    pickJsonString(metric.result_json, ["insufficient_reason", "reason", "message", "note"]) ??
    metric.feedback;
  const minimumRequiredSampleSize = pickJsonNumber(metric.result_json, [
    "minimum_required_sample_size",
    "min_sample_size"
  ]);
  const assignedUserCount = pickJsonNumber(metric.result_json, [
    "assigned_user_count",
    "final_assigned_user_count"
  ]);
  const sampleReason =
    minimumRequiredSampleSize === null
      ? null
      : `최소 필요 ${formatInteger(minimumRequiredSampleSize)}명`;
  const assignedReason =
    assignedUserCount === null ? null : `최종 배정 ${formatInteger(assignedUserCount)}명`;

  return [reason, assignedReason, sampleReason].filter(Boolean).join(" · ") || "-";
}

function pickJsonString(value: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const item = value[key];
    if (typeof item === "string" && item.trim()) {
      return item;
    }
  }
  return null;
}

function pickJsonNumber(value: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const item = value[key];
    if (typeof item === "number" && Number.isFinite(item)) {
      return item;
    }
    if (typeof item === "string") {
      const numberValue = Number(item);
      if (Number.isFinite(numberValue)) {
        return numberValue;
      }
    }
  }
  return null;
}

function canStartAdExperiment(status: string) {
  return status === "planned" || status === "approved";
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
