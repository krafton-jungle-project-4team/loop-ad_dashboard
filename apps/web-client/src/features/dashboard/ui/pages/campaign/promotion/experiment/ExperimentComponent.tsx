import { Card, CardDescription, CardHeader, CardTitle } from "@loopad/ui/shadcn/card";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  buildDashboardPromotionRunAssignments,
  createDashboardNextLoop,
  dispatchDashboardPromotionRun,
  evaluateDashboardPromotionRun,
  fetchDashboardProjectExperiments,
  startDashboardAdExperiment
} from "../../../../../api/dashboard-api.js";
import { dashboardProjectExperimentsQueryKey } from "../../../../../model/dashboard-query-keys.js";
import type { DashboardQuery } from "../../../../../model/dashboard-types.js";
import { launchPromotionExperiment } from "../promotionExperimentFlow.js";
import { ProjectExperimentWorkspace } from "./components/ProjectExperimentWorkspace.js";
import { toErrorMessage } from "./experimentUtils.js";

type NextLoopInput = {
  failedAdExperimentIds: string[];
  failedSegmentIds: string[];
  promotionId: string;
  promotionRunId: string;
};

export function ExperimentComponent({ query }: { query: DashboardQuery }) {
  const queryClient = useQueryClient();
  const experimentsQuery = useQuery({
    queryFn: ({ signal }) => fetchDashboardProjectExperiments(query.projectId, signal),
    queryKey: dashboardProjectExperimentsQueryKey(query.projectId)
  });
  const evaluatePromotionRunMutation = useMutation({
    mutationFn: (promotionRunId: string) => evaluateDashboardPromotionRun(query, promotionRunId),
    onSettled: invalidateExperimentData
  });
  const createNextLoopMutation = useMutation({
    mutationFn: ({
      failedAdExperimentIds,
      failedSegmentIds,
      promotionId,
      promotionRunId
    }: NextLoopInput) =>
      launchNextLoop({
        failedAdExperimentIds,
        failedSegmentIds,
        promotionId,
        promotionRunId
      }),
    onSettled: invalidateExperimentData
  });

  function launchNextLoop({
    failedAdExperimentIds,
    failedSegmentIds,
    promotionId,
    promotionRunId
  }: NextLoopInput) {
    if (failedSegmentIds.length === 0) {
      throw new Error("다시 실험할 실패 세그먼트가 없어요.");
    }
    return launchPromotionExperiment(
      { segmentIds: failedSegmentIds },
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
            throw new Error("다시 실험할 실패 대상이 없어요.");
          }
          return {
            experiments: nextLoop.next_ad_experiments.map((experiment) => ({
              adExperimentId: experiment.ad_experiment_id,
              channel: experiment.channel,
              isFallback: experiment.is_fallback,
              segmentId: experiment.segment_id,
              status: experiment.status
            })),
            promotionRunId: nextLoop.next_promotion_run_id,
            segmentIds: nextLoop.segment_ids
          };
        },
        dispatch: dispatchDashboardPromotionRun,
        startExperiment: (adExperimentId) =>
          startDashboardAdExperiment(query, promotionId, adExperimentId)
      }
    );
  }

  async function invalidateExperimentData() {
    await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  }

  if (experimentsQuery.isError) {
    return (
      <div className="grid gap-6">
        <ExperimentPageHeader />
        <Card>
          <CardHeader>
            <CardTitle>프로젝트 실험을 불러오지 못했어요</CardTitle>
            <CardDescription>{toErrorMessage(experimentsQuery.error)}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <ExperimentPageHeader />
      <ProjectExperimentWorkspace
        createNextLoopError={createNextLoopMutation.error}
        createNextLoopIsError={createNextLoopMutation.isError}
        createNextLoopIsPending={createNextLoopMutation.isPending}
        createNextLoopResult={createNextLoopMutation.data ?? null}
        createNextLoopVariables={createNextLoopMutation.variables ?? null}
        evaluatePromotionRunError={evaluatePromotionRunMutation.error}
        evaluatePromotionRunIsError={evaluatePromotionRunMutation.isError}
        evaluatePromotionRunIsPending={evaluatePromotionRunMutation.isPending}
        evaluatePromotionRunResult={evaluatePromotionRunMutation.data ?? null}
        evaluatePromotionRunVariables={evaluatePromotionRunMutation.variables ?? null}
        experiments={experimentsQuery.data?.experiments ?? []}
        isLoading={experimentsQuery.isLoading}
        onCreateNextLoop={(input) => createNextLoopMutation.mutate(input)}
        onEvaluatePromotionRun={(promotionRunId) =>
          evaluatePromotionRunMutation.mutate(promotionRunId)
        }
        query={query}
      />
    </div>
  );
}

function ExperimentPageHeader() {
  return (
    <div className="grid gap-1">
      <h1 className="text-2xl font-semibold tracking-tight text-[#1d1d1f]">실험</h1>
      <p className="text-sm text-muted-foreground">
        모든 캠페인의 실험 상태와 성과, 다음 반복 실험을 한곳에서 관리해요.
      </p>
    </div>
  );
}
