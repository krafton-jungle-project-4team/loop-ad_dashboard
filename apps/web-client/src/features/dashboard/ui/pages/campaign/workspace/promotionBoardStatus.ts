export type PromotionBoardStatus = "preparing" | "in_progress" | "next_experiment" | "completed";

export type PromotionBoardCandidate = {
  current_loop_count: number;
  max_loop_count: number;
  promotion_id: string;
};

export type PromotionBoardExperiment = {
  loop_count: number;
  promotion_id: string;
  promotion_run_id: string;
  status: string;
};

export type PromotionBoardEvaluation = {
  ad_experiment_id: string | null;
  created_at: string;
  next_loop_required: boolean;
  promotion_id: string;
  promotion_run_id: string;
  segment_id: string | null;
  status: string;
};

const ACTIVE_EXPERIMENT_STATUSES = new Set(["running", "evaluating"]);
const TERMINAL_EVALUATION_STATUSES = new Set([
  "goal_met",
  "goal_not_met",
  "partial_goal_met",
  "insufficient_data"
]);

export function promotionBoardStatus(
  promotion: PromotionBoardCandidate,
  experiments: ReadonlyArray<PromotionBoardExperiment>,
  evaluations: ReadonlyArray<PromotionBoardEvaluation>
): PromotionBoardStatus {
  const promotionExperiments = experiments.filter(
    (experiment) => experiment.promotion_id === promotion.promotion_id
  );
  if (promotionExperiments.length === 0) {
    return "preparing";
  }

  const currentLoopCount = Math.max(
    promotion.current_loop_count,
    ...promotionExperiments.map((experiment) => experiment.loop_count)
  );
  const currentExperiments = promotionExperiments.filter(
    (experiment) => experiment.loop_count === currentLoopCount
  );
  const currentRunIds = new Set(
    currentExperiments.map((experiment) => experiment.promotion_run_id)
  );
  const aggregateEvaluations = evaluations.filter(
    (evaluation) =>
      evaluation.promotion_id === promotion.promotion_id &&
      evaluation.ad_experiment_id === null &&
      evaluation.segment_id === null
  );
  const currentEvaluation = latestEvaluation(
    aggregateEvaluations.filter((evaluation) => currentRunIds.has(evaluation.promotion_run_id))
  );

  if (currentEvaluation) {
    if (currentEvaluation.status === "goal_met") {
      return "completed";
    }
    if (
      TERMINAL_EVALUATION_STATUSES.has(currentEvaluation.status) &&
      currentLoopCount >= promotion.max_loop_count
    ) {
      return "completed";
    }
    if (currentEvaluation.next_loop_required) {
      return "next_experiment";
    }
    if (currentEvaluation.status === "insufficient_data") {
      return "in_progress";
    }
    if (TERMINAL_EVALUATION_STATUSES.has(currentEvaluation.status)) {
      return "completed";
    }
  }

  if (currentExperiments.some((experiment) => ACTIVE_EXPERIMENT_STATUSES.has(experiment.status))) {
    return "in_progress";
  }

  const previousEvaluation = latestEvaluation(aggregateEvaluations);
  if (currentLoopCount > 1 && previousEvaluation?.next_loop_required) {
    return "next_experiment";
  }

  return "preparing";
}

export function groupPromotionsByBoardStatus<T extends PromotionBoardCandidate>(
  promotions: ReadonlyArray<T>,
  experiments: ReadonlyArray<PromotionBoardExperiment>,
  evaluations: ReadonlyArray<PromotionBoardEvaluation>
): Record<PromotionBoardStatus, T[]> {
  const groups: Record<PromotionBoardStatus, T[]> = {
    completed: [],
    in_progress: [],
    next_experiment: [],
    preparing: []
  };

  for (const promotion of promotions) {
    groups[promotionBoardStatus(promotion, experiments, evaluations)].push(promotion);
  }

  return groups;
}

function latestEvaluation(
  evaluations: ReadonlyArray<PromotionBoardEvaluation>
): PromotionBoardEvaluation | undefined {
  return evaluations.toSorted((left, right) => right.created_at.localeCompare(left.created_at))[0];
}
