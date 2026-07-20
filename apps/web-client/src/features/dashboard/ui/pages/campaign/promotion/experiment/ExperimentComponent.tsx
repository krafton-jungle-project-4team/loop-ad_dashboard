import { Card, CardDescription, CardHeader, CardTitle } from "@loopad/ui/shadcn/card";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  createDashboardNextLoop,
  evaluateDashboardPromotionRun,
  fetchDashboardProjectExperiments
} from "../../../../../api/dashboard-api.js";
import { useDashboardQueryState } from "../../../../../model/dashboard-query.js";
import { dashboardProjectExperimentsQueryKey } from "../../../../../model/dashboard-query-keys.js";
import type { DashboardQuery } from "../../../../../model/dashboard-types.js";
import { ProjectExperimentWorkspace } from "./components/ProjectExperimentWorkspace.js";
import { toErrorMessage } from "./experimentUtils.js";
import type {
  RepeatCreativePreparationInput,
  RunningEvaluationRefreshResult
} from "./projectExperimentUtils.js";

export function ExperimentComponent({ query }: { query: DashboardQuery }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [, setDashboardQueryState] = useDashboardQueryState();
  const experimentsQuery = useQuery({
    queryFn: ({ signal }) => fetchDashboardProjectExperiments(query.projectId, signal),
    queryKey: dashboardProjectExperimentsQueryKey(query.projectId)
  });
  const refreshRunningEvaluationsMutation = useMutation({
    mutationFn: (promotionRunIds: string[]) => refreshRunningEvaluations(promotionRunIds),
    onSettled: invalidateExperimentData
  });
  const prepareRepeatCreativesMutation = useMutation({
    mutationFn: prepareRepeatCreatives,
    onSuccess: async (result, variables) => {
      await invalidateExperimentData();
      await setDashboardQueryState({
        campaignView: "manage",
        promotionView: "manage",
        segmentView: "experiments",
        selectedAdExperimentId: "",
        selectedCampaignId: variables.campaignId,
        selectedPromotionId: variables.promotionId,
        selectedSegmentId: result.segment_ids[0] ?? variables.failedSegmentIds[0] ?? ""
      });
      await navigate({
        params: { projectId: query.projectId, tabPath: "campaigns" },
        search: (current) => current,
        to: "/dashboard/$projectId/$tabPath"
      });
    }
  });

  async function prepareRepeatCreatives({
    failedAdExperimentIds,
    failedSegmentIds,
    sourcePromotionRunId
  }: RepeatCreativePreparationInput) {
    if (failedSegmentIds.length === 0) {
      throw new Error("다시 실험할 실패 고객군이 없어요.");
    }

    const result = await createDashboardNextLoop(query, sourcePromotionRunId, {
      content_approval_mode: "manual",
      failed_ad_experiment_ids: failedAdExperimentIds,
      failed_segment_ids: failedSegmentIds,
      operator_instruction: null
    });

    if (
      result.status !== "awaiting_content_approval" ||
      !result.content_approval_required ||
      !result.next_loop_preparation_id ||
      !result.next_analysis_id ||
      !result.next_generation_id
    ) {
      throw new Error("다음 실험 준비 결과가 올바르지 않아요. 잠시 후 다시 시도해 주세요.");
    }

    return result;
  }

  async function refreshRunningEvaluations(
    promotionRunIds: string[]
  ): Promise<RunningEvaluationRefreshResult> {
    const evaluations = await Promise.allSettled(
      promotionRunIds.map((promotionRunId) => evaluateDashboardPromotionRun(query, promotionRunId))
    );
    const succeededEvaluations = evaluations.filter(
      (evaluation) => evaluation.status === "fulfilled"
    );
    const failedEvaluations = evaluations.filter((evaluation) => evaluation.status === "rejected");
    const firstFailedEvaluation = failedEvaluations[0];

    return {
      failedRunCount: failedEvaluations.length,
      failureMessage: firstFailedEvaluation ? toErrorMessage(firstFailedEvaluation.reason) : null,
      succeededRunCount: succeededEvaluations.length,
      totalRunCount: promotionRunIds.length
    };
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
        evaluationRefreshIsPending={refreshRunningEvaluationsMutation.isPending}
        evaluationRefreshResult={refreshRunningEvaluationsMutation.data ?? null}
        experiments={experimentsQuery.data?.experiments ?? []}
        isLoading={experimentsQuery.isLoading}
        onPrepareRepeatCreatives={(input) => prepareRepeatCreativesMutation.mutate(input)}
        onRefreshRunningEvaluations={(promotionRunIds) =>
          refreshRunningEvaluationsMutation.mutate(promotionRunIds)
        }
        prepareRepeatCreativesError={prepareRepeatCreativesMutation.error}
        prepareRepeatCreativesIsError={prepareRepeatCreativesMutation.isError}
        prepareRepeatCreativesIsPending={prepareRepeatCreativesMutation.isPending}
        prepareRepeatCreativesVariables={prepareRepeatCreativesMutation.variables ?? null}
        query={query}
      />
    </div>
  );
}

function ExperimentPageHeader() {
  return (
    <div className="grid gap-1">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">실험</h1>
      <p className="text-sm text-muted-foreground">
        모든 캠페인의 실험 상태와 성과, 다음 반복 실험을 한곳에서 관리해요.
      </p>
    </div>
  );
}
