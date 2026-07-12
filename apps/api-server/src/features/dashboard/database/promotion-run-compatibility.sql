/* 목적: 과거 promotion run snapshot에 누락된 최소 표본 수를 현재 프로모션 계약값으로 보충합니다. */
/* @name BackfillDashboardPromotionRunMinSampleSize */
UPDATE promotion_runs AS promotion_run
SET
  goal_snapshot_json = jsonb_set(
    promotion_run.goal_snapshot_json,
    '{min_sample_size}',
    to_jsonb(promotion.min_sample_size),
    true
  ),
  updated_at = now()
FROM promotions AS promotion
WHERE promotion_run.project_id = :projectId
  AND promotion_run.promotion_run_id = :promotionRunId
  AND promotion.project_id = promotion_run.project_id
  AND promotion.promotion_id = promotion_run.promotion_id
  AND jsonb_typeof(promotion_run.goal_snapshot_json) = 'object'
  AND NOT (promotion_run.goal_snapshot_json ? 'min_sample_size')
RETURNING promotion_run.promotion_run_id AS "promotionRunId";

/* 목적: 폐기된 goal_near 상태를 현재 평가 계약의 목표 미달 상태로 정규화합니다. */
/* @name NormalizeDashboardPromotionRunLegacyGoalNearEvaluations */
UPDATE promotion_evaluations
SET
  status = 'goal_not_met',
  next_loop_required = true
WHERE project_id = :projectId
  AND promotion_run_id = :promotionRunId
  AND ad_experiment_id IS NOT NULL
  AND status = 'goal_near'
  AND actual_value < target_value
RETURNING evaluation_id AS "evaluationId";
