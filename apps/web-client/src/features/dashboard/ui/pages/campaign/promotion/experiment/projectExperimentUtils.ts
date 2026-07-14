import type {
  DashboardEvaluatePromotionRunResult,
  DashboardProjectExperiment
} from "@loopad/shared";
import type { DashboardQuery } from "../../../../../model/dashboard-types.js";

export const projectExperimentPageSizeOptions = [10, 25, 50] as const;

export type ProjectExperimentFilters = {
  campaignId: string;
  promotionId: string;
  status: string;
};

export type RunningEvaluationRefreshResult = {
  evaluatedExperimentCount: number;
  failedRunCount: number;
  failureMessage: string | null;
  succeededRunCount: number;
  totalRunCount: number;
};

export function normalizeProjectExperimentFilters(
  experiments: DashboardProjectExperiment[],
  filters: ProjectExperimentFilters
): ProjectExperimentFilters {
  const campaignId =
    filters.campaignId &&
    experiments.some((experiment) => experiment.campaign_id === filters.campaignId)
      ? filters.campaignId
      : "all";
  const promotionId =
    filters.promotionId &&
    experiments.some(
      (experiment) =>
        experiment.promotion_id === filters.promotionId &&
        (campaignId === "all" || experiment.campaign_id === campaignId)
    )
      ? filters.promotionId
      : "all";
  const status =
    filters.status && experiments.some((experiment) => experiment.status === filters.status)
      ? filters.status
      : "all";

  return { campaignId, promotionId, status };
}

export function filterProjectExperiments(
  experiments: DashboardProjectExperiment[],
  filters: ProjectExperimentFilters
) {
  return experiments.filter(
    (experiment) =>
      (filters.campaignId === "all" || experiment.campaign_id === filters.campaignId) &&
      (filters.promotionId === "all" || experiment.promotion_id === filters.promotionId) &&
      (filters.status === "all" || experiment.status === filters.status)
  );
}

export function paginateProjectExperiments(
  experiments: DashboardProjectExperiment[],
  page: number,
  pageSize: number
) {
  const pageCount = Math.max(1, Math.ceil(experiments.length / pageSize));
  const safePage = Math.min(Math.max(1, Math.trunc(page)), pageCount);

  return {
    page: safePage,
    pageCount,
    rows: experiments.slice((safePage - 1) * pageSize, safePage * pageSize)
  };
}

export function projectExperimentSelectionQuery(
  experiment: DashboardProjectExperiment
): Pick<
  DashboardQuery,
  "selectedAdExperimentId" | "selectedCampaignId" | "selectedPromotionId" | "selectedSegmentId"
> {
  return {
    selectedAdExperimentId: experiment.ad_experiment_id,
    selectedCampaignId: experiment.campaign_id,
    selectedPromotionId: experiment.promotion_id,
    selectedSegmentId: experiment.segment_id
  };
}

export function promotionRunIdsForRunningExperiments(
  experiments: DashboardProjectExperiment[]
): string[] {
  return uniqueValues(
    experiments
      .filter((experiment) => experiment.status === "running")
      .map((experiment) => experiment.promotion_run_id)
  );
}

export function failedTargetsForPromotionRun(
  experiments: DashboardProjectExperiment[],
  promotionRunId: string,
  evaluationResult?: DashboardEvaluatePromotionRunResult | null
) {
  if (evaluationResult?.promotion_run_id === promotionRunId) {
    return {
      failedAdExperimentIds: uniqueValues(evaluationResult.failed_ad_experiment_ids),
      failedSegmentIds: uniqueValues(evaluationResult.failed_segment_ids)
    };
  }

  const failedExperiments = experiments.filter(
    (experiment) =>
      experiment.promotion_run_id === promotionRunId &&
      (experiment.latest_evaluation?.next_loop_required === true ||
        experiment.latest_evaluation?.status === "goal_not_met")
  );

  return {
    failedAdExperimentIds: uniqueValues(
      failedExperiments.map((experiment) => experiment.ad_experiment_id)
    ),
    failedSegmentIds: uniqueValues(failedExperiments.map((experiment) => experiment.segment_id))
  };
}

export function uniqueProjectExperimentValues(values: string[]) {
  return uniqueValues(values);
}

function uniqueValues(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right));
}
