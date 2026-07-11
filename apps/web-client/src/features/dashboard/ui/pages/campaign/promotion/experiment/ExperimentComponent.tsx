import type { DashboardMain } from "@loopad/shared";
import { Card, CardDescription, CardHeader, CardTitle } from "@loopad/ui/shadcn/card";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  buildDashboardPromotionRunAssignments,
  createDashboardNextLoop,
  dispatchDashboardPromotionRun,
  evaluateDashboardPromotionRun,
  fetchDashboardCampaignDetail,
  fetchDashboardSegmentDetail,
  startDashboardAdExperiment
} from "../../../../../api/dashboard-api.js";
import {
  dashboardCampaignDetailQueryKey,
  dashboardSegmentDetailQueryKey
} from "../../../../../model/dashboard-query-keys.js";
import type { DashboardQuery } from "../../../../../model/dashboard-types.js";
import { EmptyState } from "../../../../shared/EmptyState.js";
import { launchPromotionExperiment } from "../promotionExperimentFlow.js";
import { ExperimentContent } from "./components/ExperimentContent.js";
import { selectExperimentSegment, toErrorMessage } from "./experimentUtils.js";

export function ExperimentComponent({
  data,
  query
}: {
  data: DashboardMain;
  query: DashboardQuery;
}) {
  const queryClient = useQueryClient();
  const selectedCampaign = data.campaigns.find(
    (campaign) => campaign.campaign_id === query.selectedCampaignId
  );
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
    queryKey: dashboardSegmentDetailQueryKey(
      query.projectId,
      selectedPromotionId,
      selectedSegmentId
    )
  });
  const evaluatePromotionRunMutation = useMutation({
    mutationFn: (promotionRunId: string) => evaluateDashboardPromotionRun(query, promotionRunId),
    onSuccess: async () => invalidateExperimentData()
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
      launchPromotionExperiment(
        { existingExperiments: [] },
        {
          buildAssignments: (nextPromotionRunId) =>
            buildDashboardPromotionRunAssignments(query, nextPromotionRunId),
          createRun: async () => {
            const nextLoop = await createDashboardNextLoop(query, promotionRunId, {
              failed_ad_experiment_ids: failedAdExperimentIds,
              failed_segment_ids: failedSegmentIds,
              operator_instruction: null
            });
            if (!nextLoop.next_promotion_run_id) {
              throw new Error("다음 루프에 포함할 실패 대상이 없습니다.");
            }
            return {
              experiments: nextLoop.next_ad_experiments.map((experiment) => ({
                adExperimentId: experiment.ad_experiment_id,
                channel: experiment.channel,
                status: experiment.status
              })),
              promotionRunId: nextLoop.next_promotion_run_id
            };
          },
          dispatch: dispatchDashboardPromotionRun,
          startExperiment: (adExperimentId) =>
            startDashboardAdExperiment(query, selectedPromotionId, adExperimentId)
        }
      ),
    onSettled: async () => invalidateExperimentData()
  });

  async function invalidateExperimentData() {
    await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    await queryClient.invalidateQueries({
      queryKey: dashboardCampaignDetailQueryKey(query.projectId, selectedCampaignId)
    });
    await queryClient.invalidateQueries({
      queryKey: dashboardSegmentDetailQueryKey(
        query.projectId,
        selectedPromotionId,
        selectedSegmentId
      )
    });
  }

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
          createNextLoopError={createNextLoopMutation.error}
          createNextLoopIsError={createNextLoopMutation.isError}
          createNextLoopIsPending={createNextLoopMutation.isPending}
          createNextLoopResult={createNextLoopMutation.data ?? null}
          detail={detailQuery.data}
          evaluatePromotionRunIsPending={evaluatePromotionRunMutation.isPending}
          evaluatePromotionRunResult={evaluatePromotionRunMutation.data ?? null}
          isLoading={detailQuery.isFetching}
          onCreateNextLoop={(promotionRunId, failedSegmentIds, failedAdExperimentIds) =>
            createNextLoopMutation.mutate({
              failedAdExperimentIds,
              failedSegmentIds,
              promotionRunId
            })
          }
          onEvaluatePromotionRun={(promotionRunId) =>
            evaluatePromotionRunMutation.mutate(promotionRunId)
          }
          query={query}
          selectedSegmentDetail={segmentDetailQuery.data}
          selectedSegmentDetailIsError={segmentDetailQuery.isError}
          selectedSegmentDetailIsLoading={segmentDetailQuery.isLoading}
          selectedSegmentId={selectedSegmentId}
        />
      )}
    </div>
  );
}
