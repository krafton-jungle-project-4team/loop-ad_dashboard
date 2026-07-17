import assert from "node:assert/strict";
import test from "node:test";
import {
  groupPromotionsByBoardStatus,
  promotionBoardStatus,
  type PromotionBoardCandidate,
  type PromotionBoardEvaluation,
  type PromotionBoardExperiment
} from "../src/features/dashboard/ui/pages/campaign/workspace/promotionBoardStatus.js";

test("promotions without a running first experiment stay in preparing", () => {
  const promotion = promotionCandidate(0, 3);

  assert.equal(promotionBoardStatus(promotion, [], []), "preparing");
  assert.equal(
    promotionBoardStatus(promotionCandidate(1, 3), [experiment(1, "planned")], []),
    "preparing"
  );
});

test("running and evaluating experiments are in progress", () => {
  assert.equal(
    promotionBoardStatus(promotionCandidate(1, 3), [experiment(1, "running")], []),
    "in_progress"
  );
  assert.equal(
    promotionBoardStatus(promotionCandidate(1, 3), [experiment(1, "evaluating")], []),
    "in_progress"
  );
});

test("failed evaluations with remaining loops need the next experiment", () => {
  assert.equal(
    promotionBoardStatus(
      promotionCandidate(1, 3),
      [experiment(1, "running")],
      [evaluation("promotion-run-1", "goal_not_met", true)]
    ),
    "next_experiment"
  );
});

test("a prepared next loop stays in next experiment until it starts", () => {
  const experiments = [experiment(1, "running"), experiment(2, "planned")];

  assert.equal(
    promotionBoardStatus(promotionCandidate(2, 3), experiments, [
      evaluation("run-1", "goal_not_met", true)
    ]),
    "next_experiment"
  );
  assert.equal(
    promotionBoardStatus(
      promotionCandidate(2, 3),
      [experiment(1, "running"), experiment(2, "running")],
      [evaluation("run-1", "goal_not_met", true)]
    ),
    "in_progress"
  );
});

test("goal achievement or the final evaluated loop completes a promotion", () => {
  assert.equal(
    promotionBoardStatus(
      promotionCandidate(1, 3),
      [experiment(1, "running")],
      [evaluation("promotion-run-1", "goal_met", false)]
    ),
    "completed"
  );
  assert.equal(
    promotionBoardStatus(
      promotionCandidate(3, 3),
      [experiment(3, "running")],
      [evaluation("promotion-run-3", "goal_not_met", true)]
    ),
    "completed"
  );
});

test("insufficient data remains in progress while more data can be collected", () => {
  assert.equal(
    promotionBoardStatus(
      promotionCandidate(1, 3),
      [experiment(1, "running")],
      [evaluation("promotion-run-1", "insufficient_data", false)]
    ),
    "in_progress"
  );
});

test("promotions are grouped without changing their source order", () => {
  const promotions = [
    promotionCandidate(0, 3, "preparing"),
    promotionCandidate(1, 3, "running"),
    promotionCandidate(1, 3, "next"),
    promotionCandidate(3, 3, "completed")
  ];
  const experiments = [
    experiment(1, "running", "running"),
    experiment(1, "running", "next"),
    experiment(3, "running", "completed")
  ];
  const evaluations = [
    evaluation("next-run-1", "goal_not_met", true, "next"),
    evaluation("completed-run-3", "goal_not_met", true, "completed")
  ];

  const groups = groupPromotionsByBoardStatus(promotions, experiments, evaluations);

  assert.deepEqual(
    groups.preparing.map((promotion) => promotion.promotion_id),
    ["preparing"]
  );
  assert.deepEqual(
    groups.in_progress.map((promotion) => promotion.promotion_id),
    ["running"]
  );
  assert.deepEqual(
    groups.next_experiment.map((promotion) => promotion.promotion_id),
    ["next"]
  );
  assert.deepEqual(
    groups.completed.map((promotion) => promotion.promotion_id),
    ["completed"]
  );
});

function promotionCandidate(
  currentLoopCount: number,
  maxLoopCount: number,
  promotionId = "promotion"
): PromotionBoardCandidate {
  return {
    current_loop_count: currentLoopCount,
    max_loop_count: maxLoopCount,
    promotion_id: promotionId
  };
}

function experiment(
  loopCount: number,
  status: string,
  promotionId = "promotion"
): PromotionBoardExperiment {
  return {
    loop_count: loopCount,
    promotion_id: promotionId,
    promotion_run_id: `${promotionId}-run-${loopCount}`,
    status
  };
}

function evaluation(
  promotionRunId: string,
  status: string,
  nextLoopRequired: boolean,
  promotionId = "promotion"
): PromotionBoardEvaluation {
  return {
    ad_experiment_id: null,
    created_at: "2026-07-17T00:00:00.000Z",
    next_loop_required: nextLoopRequired,
    promotion_id: promotionId,
    promotion_run_id: promotionRunId,
    segment_id: null,
    status
  };
}
