/** Types generated for queries found in "src/features/dashboard/database/promotion-run-compatibility.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'BackfillDashboardPromotionRunMinSampleSize' parameters type */
export interface IBackfillDashboardPromotionRunMinSampleSizeParams {
  projectId?: string | null | void;
  promotionRunId?: string | null | void;
}

/** 'BackfillDashboardPromotionRunMinSampleSize' return type */
export interface IBackfillDashboardPromotionRunMinSampleSizeResult {
  promotionRunId: string;
}

/** 'BackfillDashboardPromotionRunMinSampleSize' query type */
export interface IBackfillDashboardPromotionRunMinSampleSizeQuery {
  params: IBackfillDashboardPromotionRunMinSampleSizeParams;
  result: IBackfillDashboardPromotionRunMinSampleSizeResult;
}

const backfillDashboardPromotionRunMinSampleSizeIR: any = {"usedParamSet":{"projectId":true,"promotionRunId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":278,"b":287}]},{"name":"promotionRunId","required":false,"transform":{"type":"scalar"},"locs":[{"a":328,"b":342}]}],"statement":"UPDATE promotion_runs AS promotion_run\nSET\n  goal_snapshot_json = jsonb_set(\n    promotion_run.goal_snapshot_json,\n    '{min_sample_size}',\n    to_jsonb(promotion.min_sample_size),\n    true\n  ),\n  updated_at = now()\nFROM promotions AS promotion\nWHERE promotion_run.project_id = :projectId\n  AND promotion_run.promotion_run_id = :promotionRunId\n  AND promotion.project_id = promotion_run.project_id\n  AND promotion.promotion_id = promotion_run.promotion_id\n  AND jsonb_typeof(promotion_run.goal_snapshot_json) = 'object'\n  AND NOT (promotion_run.goal_snapshot_json ? 'min_sample_size')\nRETURNING promotion_run.promotion_run_id AS \"promotionRunId\"                                                       "};

/**
 * Query generated from SQL:
 * ```
 * UPDATE promotion_runs AS promotion_run
 * SET
 *   goal_snapshot_json = jsonb_set(
 *     promotion_run.goal_snapshot_json,
 *     '{min_sample_size}',
 *     to_jsonb(promotion.min_sample_size),
 *     true
 *   ),
 *   updated_at = now()
 * FROM promotions AS promotion
 * WHERE promotion_run.project_id = :projectId
 *   AND promotion_run.promotion_run_id = :promotionRunId
 *   AND promotion.project_id = promotion_run.project_id
 *   AND promotion.promotion_id = promotion_run.promotion_id
 *   AND jsonb_typeof(promotion_run.goal_snapshot_json) = 'object'
 *   AND NOT (promotion_run.goal_snapshot_json ? 'min_sample_size')
 * RETURNING promotion_run.promotion_run_id AS "promotionRunId"
 * ```
 */
export const backfillDashboardPromotionRunMinSampleSize = new PreparedQuery<IBackfillDashboardPromotionRunMinSampleSizeParams,IBackfillDashboardPromotionRunMinSampleSizeResult>(backfillDashboardPromotionRunMinSampleSizeIR);


/** 'NormalizeDashboardPromotionRunLegacyGoalNearEvaluations' parameters type */
export interface INormalizeDashboardPromotionRunLegacyGoalNearEvaluationsParams {
  projectId?: string | null | void;
  promotionRunId?: string | null | void;
}

/** 'NormalizeDashboardPromotionRunLegacyGoalNearEvaluations' return type */
export interface INormalizeDashboardPromotionRunLegacyGoalNearEvaluationsResult {
  evaluationId: string;
}

/** 'NormalizeDashboardPromotionRunLegacyGoalNearEvaluations' query type */
export interface INormalizeDashboardPromotionRunLegacyGoalNearEvaluationsQuery {
  params: INormalizeDashboardPromotionRunLegacyGoalNearEvaluationsParams;
  result: INormalizeDashboardPromotionRunLegacyGoalNearEvaluationsResult;
}

const normalizeDashboardPromotionRunLegacyGoalNearEvaluationsIR: any = {"usedParamSet":{"projectId":true,"promotionRunId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":107,"b":116}]},{"name":"promotionRunId","required":false,"transform":{"type":"scalar"},"locs":[{"a":143,"b":157}]}],"statement":"UPDATE promotion_evaluations\nSET\n  status = 'goal_not_met',\n  next_loop_required = true\nWHERE project_id = :projectId\n  AND promotion_run_id = :promotionRunId\n  AND ad_experiment_id IS NOT NULL\n  AND status = 'goal_near'\n  AND actual_value < target_value\nRETURNING evaluation_id AS \"evaluationId\""};

/**
 * Query generated from SQL:
 * ```
 * UPDATE promotion_evaluations
 * SET
 *   status = 'goal_not_met',
 *   next_loop_required = true
 * WHERE project_id = :projectId
 *   AND promotion_run_id = :promotionRunId
 *   AND ad_experiment_id IS NOT NULL
 *   AND status = 'goal_near'
 *   AND actual_value < target_value
 * RETURNING evaluation_id AS "evaluationId"
 * ```
 */
export const normalizeDashboardPromotionRunLegacyGoalNearEvaluations = new PreparedQuery<INormalizeDashboardPromotionRunLegacyGoalNearEvaluationsParams,INormalizeDashboardPromotionRunLegacyGoalNearEvaluationsResult>(normalizeDashboardPromotionRunLegacyGoalNearEvaluationsIR);
