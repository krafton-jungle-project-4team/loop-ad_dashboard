import { Card, CardDescription, CardHeader, CardTitle } from "@loopad/ui/shadcn/card";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  analyzeDashboardPromotionSegments,
  evaluateDashboardPromotionRun,
  fetchDashboardPromotionDetail,
  fetchDashboardProjectExperiments,
  startDashboardPromotionGeneration
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

const ANALYSIS_POLL_INTERVAL_MS = 1000;
const ANALYSIS_POLL_LIMIT = 60;
const pendingAnalysisStatuses = new Set([
  "pending",
  "processing",
  "queued",
  "requested",
  "running"
]);

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
    onSettled: invalidateExperimentData,
    onSuccess: async (_result, variables) => {
      await setDashboardQueryState({
        campaignView: "manage",
        promotionView: "manage",
        segmentView: "experiments",
        selectedAdExperimentId: "",
        selectedCampaignId: variables.campaignId,
        selectedPromotionId: variables.promotionId,
        selectedSegmentId: variables.failedSegmentIds[0] ?? ""
      });
      await navigate({
        params: { projectId: query.projectId, tabPath: "campaigns" },
        search: (current) => current,
        to: "/dashboard/$projectId/$tabPath"
      });
    }
  });

  async function prepareRepeatCreatives({
    failedSegmentIds,
    promotionId
  }: RepeatCreativePreparationInput) {
    if (failedSegmentIds.length === 0) {
      throw new Error("다시 실험할 실패 세그먼트가 없어요.");
    }

    const analysis = await analyzeDashboardPromotionSegments(query, promotionId, {
      operator_instruction: null,
      segment_ids: failedSegmentIds
    });
    await waitForAnalysis(analysis.analysis_id, analysis.status, promotionId);
    const generation = await startDashboardPromotionGeneration(query, promotionId, {
      analysis_id: analysis.analysis_id,
      content_option_count: 3,
      operator_instruction: null
    });

    return {
      analysisId: analysis.analysis_id,
      generationId: generation.generation_id,
      segmentIds: failedSegmentIds
    };
  }

  async function waitForAnalysis(analysisId: string, initialStatus: string, promotionId: string) {
    if (!pendingAnalysisStatuses.has(initialStatus)) {
      assertAnalysisSucceeded(initialStatus);
      return;
    }

    for (let attempt = 0; attempt < ANALYSIS_POLL_LIMIT; attempt += 1) {
      await delay(ANALYSIS_POLL_INTERVAL_MS);
      const detail = await fetchDashboardPromotionDetail(
        query,
        promotionId,
        new AbortController().signal
      );
      const status = detail.analyses.find(
        (analysis) => analysis.analysis_id === analysisId
      )?.status;
      if (!status || pendingAnalysisStatuses.has(status)) {
        continue;
      }
      assertAnalysisSucceeded(status);
      return;
    }

    throw new Error("세그먼트 분석이 오래 걸리고 있어요. 잠시 후 다시 시도해 주세요.");
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

function assertAnalysisSucceeded(status: string) {
  if (status === "failed" || status === "cancelled" || status === "canceled") {
    throw new Error("세그먼트 분석을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.");
  }
}

function delay(durationMs: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, durationMs);
  });
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
