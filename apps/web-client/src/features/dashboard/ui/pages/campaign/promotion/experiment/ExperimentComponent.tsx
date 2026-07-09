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
import { Card, CardDescription, CardHeader, CardTitle } from "@loopad/ui/shadcn/card";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  buildDashboardPromotionRunAssignments,
  createDashboardNextLoop,
  createDashboardPromotionRun,
  dispatchDashboardPromotionRun,
  evaluateDashboardPromotionRun,
  fetchDashboardCampaignDetail,
  fetchDashboardSegmentDetail,
  startDashboardAdExperiment
} from "../../../../../api/dashboard-api.js";
import { useDashboardQueryState } from "../../../../../model/dashboard-query.js";
import {
  dashboardCampaignDetailQueryKey,
  dashboardSegmentDetailQueryKey
} from "../../../../../model/dashboard-query-keys.js";
import type { DashboardQuery } from "../../../../../model/dashboard-types.js";
import { EmptyState } from "../../../../shared/EmptyState.js";
import { ExperimentContent } from "./components/ExperimentContent.js";
import { selectExperimentSegment, toErrorMessage } from "./experimentUtils.js";

export function ExperimentComponent({
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
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-[#1d1d1f]">실험</h1>
        <p className="text-sm text-muted-foreground">
          {selectedCampaign.campaign_name} 아래의 프로모션, 세그먼트, 실험 상태를 확인합니다.
        </p>
      </div>

      {detailQuery.isError ? (
        <Card>
          <CardHeader>
            <CardTitle>실험 데이터를 불러오지 못했습니다</CardTitle>
            <CardDescription>{toErrorMessage(detailQuery.error)}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <ExperimentContent
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
