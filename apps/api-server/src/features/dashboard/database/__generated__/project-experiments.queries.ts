/** Types generated for queries found in "src/features/dashboard/database/project-experiments.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

/** 'ListDashboardProjectExperiments' parameters type */
export interface IListDashboardProjectExperimentsParams {
  projectId?: string | null | void;
}

/** 'ListDashboardProjectExperiments' return type */
export interface IListDashboardProjectExperimentsResult {
  adExperimentId: string;
  assignmentCount: number | null;
  campaignId: string;
  campaignName: string;
  channel: string;
  contentId: string;
  contentOptionId: string;
  endedAt: Date | null;
  evaluationActualValue: number | null;
  evaluationBasis: string;
  evaluationCreatedAt: Date;
  evaluationDenominatorCount: number;
  evaluationFeedback: string | null;
  evaluationMetric: string;
  evaluationNextLoopRequired: boolean;
  evaluationNumeratorCount: number;
  evaluationResultJson: Json;
  evaluationSampleSize: number;
  evaluationStatus: string;
  evaluationTargetValue: number | null;
  executionMode: string;
  goalBasis: string;
  goalMetric: string;
  goalTargetValue: number | null;
  loopCount: number;
  loopIntervalUnit: string;
  loopIntervalValue: number;
  maxLoopCount: number;
  nextLoopCount: number;
  nextLoopStatus: string;
  nextPromotionRunId: string;
  promotionId: string;
  promotionName: string;
  promotionRunId: string;
  scheduledEndAt: Date | null;
  scheduledStartAt: Date | null;
  segmentId: string;
  segmentName: string | null;
  startedAt: Date | null;
  status: string;
  updatedAt: Date;
}

/** 'ListDashboardProjectExperiments' query type */
export interface IListDashboardProjectExperimentsQuery {
  params: IListDashboardProjectExperimentsParams;
  result: IListDashboardProjectExperimentsResult;
}

const listDashboardProjectExperimentsIR: any = {"usedParamSet":{"projectId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":194,"b":203},{"a":3232,"b":3241}]}],"statement":"WITH assignment_counts AS (\n  SELECT\n    project_id,\n    promotion_run_id,\n    ad_experiment_id,\n    COUNT(user_id)::int AS assignment_count\n  FROM user_segment_assignments\n  WHERE project_id = :projectId\n  GROUP BY project_id, promotion_run_id, ad_experiment_id\n)\nSELECT\n  ae.ad_experiment_id AS \"adExperimentId\",\n  ae.promotion_run_id AS \"promotionRunId\",\n  ae.campaign_id AS \"campaignId\",\n  c.name AS \"campaignName\",\n  ae.promotion_id AS \"promotionId\",\n  p.marketing_theme AS \"promotionName\",\n  ae.segment_id AS \"segmentId\",\n  ae.segment_name AS \"segmentName\",\n  ae.content_id AS \"contentId\",\n  ae.content_option_id AS \"contentOptionId\",\n  ae.channel,\n  ae.loop_count AS \"loopCount\",\n  p.max_loop_count AS \"maxLoopCount\",\n  p.execution_mode AS \"executionMode\",\n  p.scheduled_start_at AS \"scheduledStartAt\",\n  p.scheduled_end_at AS \"scheduledEndAt\",\n  p.loop_interval_unit AS \"loopIntervalUnit\",\n  p.loop_interval_value AS \"loopIntervalValue\",\n  ae.goal_metric AS \"goalMetric\",\n  CAST(ae.goal_target_value AS float8) AS \"goalTargetValue\",\n  ae.goal_basis AS \"goalBasis\",\n  COALESCE(ac.assignment_count, 0)::int AS \"assignmentCount\",\n  ae.status,\n  ae.started_at AS \"startedAt\",\n  ae.ended_at AS \"endedAt\",\n  ae.updated_at AS \"updatedAt\",\n  evaluation.metric AS \"evaluationMetric\",\n  CAST(evaluation.target_value AS float8) AS \"evaluationTargetValue\",\n  CAST(evaluation.actual_value AS float8) AS \"evaluationActualValue\",\n  evaluation.numerator_count AS \"evaluationNumeratorCount\",\n  evaluation.denominator_count AS \"evaluationDenominatorCount\",\n  evaluation.sample_size AS \"evaluationSampleSize\",\n  evaluation.basis AS \"evaluationBasis\",\n  evaluation.status AS \"evaluationStatus\",\n  evaluation.feedback AS \"evaluationFeedback\",\n  evaluation.next_loop_required AS \"evaluationNextLoopRequired\",\n  evaluation.result_json AS \"evaluationResultJson\",\n  evaluation.created_at AS \"evaluationCreatedAt\",\n  next_run.promotion_run_id AS \"nextPromotionRunId\",\n  next_run.loop_count AS \"nextLoopCount\",\n  next_run.status AS \"nextLoopStatus\"\nFROM ad_experiments ae\nJOIN campaigns c\n  ON c.project_id = ae.project_id\n AND c.campaign_id = ae.campaign_id\nJOIN promotions p\n  ON p.project_id = ae.project_id\n AND p.campaign_id = ae.campaign_id\n AND p.promotion_id = ae.promotion_id\nLEFT JOIN assignment_counts ac\n  ON ac.project_id = ae.project_id\n AND ac.promotion_run_id = ae.promotion_run_id\n AND ac.ad_experiment_id = ae.ad_experiment_id\nLEFT JOIN LATERAL (\n  SELECT\n    pe.metric,\n    pe.target_value,\n    pe.actual_value,\n    pe.numerator_count,\n    pe.denominator_count,\n    pe.sample_size,\n    pe.basis,\n    pe.status,\n    pe.feedback,\n    pe.next_loop_required,\n    pe.result_json,\n    pe.created_at\n  FROM promotion_evaluations pe\n  WHERE pe.project_id = ae.project_id\n    AND pe.ad_experiment_id = ae.ad_experiment_id\n  ORDER BY pe.created_at DESC, pe.evaluation_id DESC\n  LIMIT 1\n) evaluation ON TRUE\nLEFT JOIN LATERAL (\n  SELECT\n    pr.promotion_run_id,\n    pr.loop_count,\n    pr.status\n  FROM promotion_runs pr\n  WHERE pr.project_id = ae.project_id\n    AND pr.promotion_id = ae.promotion_id\n    AND pr.loop_count = ae.loop_count + 1\n  ORDER BY pr.updated_at DESC, pr.created_at DESC\n  LIMIT 1\n) next_run ON TRUE\nWHERE ae.project_id = :projectId\n  AND c.status <> 'stopped'\n  AND p.status <> 'stopped'\nORDER BY ae.updated_at DESC, ae.created_at DESC, ae.ad_experiment_id ASC                                   "};

/**
 * Query generated from SQL:
 * ```
 * WITH assignment_counts AS (
 *   SELECT
 *     project_id,
 *     promotion_run_id,
 *     ad_experiment_id,
 *     COUNT(user_id)::int AS assignment_count
 *   FROM user_segment_assignments
 *   WHERE project_id = :projectId
 *   GROUP BY project_id, promotion_run_id, ad_experiment_id
 * )
 * SELECT
 *   ae.ad_experiment_id AS "adExperimentId",
 *   ae.promotion_run_id AS "promotionRunId",
 *   ae.campaign_id AS "campaignId",
 *   c.name AS "campaignName",
 *   ae.promotion_id AS "promotionId",
 *   p.marketing_theme AS "promotionName",
 *   ae.segment_id AS "segmentId",
 *   ae.segment_name AS "segmentName",
 *   ae.content_id AS "contentId",
 *   ae.content_option_id AS "contentOptionId",
 *   ae.channel,
 *   ae.loop_count AS "loopCount",
 *   p.max_loop_count AS "maxLoopCount",
 *   p.execution_mode AS "executionMode",
 *   p.scheduled_start_at AS "scheduledStartAt",
 *   p.scheduled_end_at AS "scheduledEndAt",
 *   p.loop_interval_unit AS "loopIntervalUnit",
 *   p.loop_interval_value AS "loopIntervalValue",
 *   ae.goal_metric AS "goalMetric",
 *   CAST(ae.goal_target_value AS float8) AS "goalTargetValue",
 *   ae.goal_basis AS "goalBasis",
 *   COALESCE(ac.assignment_count, 0)::int AS "assignmentCount",
 *   ae.status,
 *   ae.started_at AS "startedAt",
 *   ae.ended_at AS "endedAt",
 *   ae.updated_at AS "updatedAt",
 *   evaluation.metric AS "evaluationMetric",
 *   CAST(evaluation.target_value AS float8) AS "evaluationTargetValue",
 *   CAST(evaluation.actual_value AS float8) AS "evaluationActualValue",
 *   evaluation.numerator_count AS "evaluationNumeratorCount",
 *   evaluation.denominator_count AS "evaluationDenominatorCount",
 *   evaluation.sample_size AS "evaluationSampleSize",
 *   evaluation.basis AS "evaluationBasis",
 *   evaluation.status AS "evaluationStatus",
 *   evaluation.feedback AS "evaluationFeedback",
 *   evaluation.next_loop_required AS "evaluationNextLoopRequired",
 *   evaluation.result_json AS "evaluationResultJson",
 *   evaluation.created_at AS "evaluationCreatedAt",
 *   next_run.promotion_run_id AS "nextPromotionRunId",
 *   next_run.loop_count AS "nextLoopCount",
 *   next_run.status AS "nextLoopStatus"
 * FROM ad_experiments ae
 * JOIN campaigns c
 *   ON c.project_id = ae.project_id
 *  AND c.campaign_id = ae.campaign_id
 * JOIN promotions p
 *   ON p.project_id = ae.project_id
 *  AND p.campaign_id = ae.campaign_id
 *  AND p.promotion_id = ae.promotion_id
 * LEFT JOIN assignment_counts ac
 *   ON ac.project_id = ae.project_id
 *  AND ac.promotion_run_id = ae.promotion_run_id
 *  AND ac.ad_experiment_id = ae.ad_experiment_id
 * LEFT JOIN LATERAL (
 *   SELECT
 *     pe.metric,
 *     pe.target_value,
 *     pe.actual_value,
 *     pe.numerator_count,
 *     pe.denominator_count,
 *     pe.sample_size,
 *     pe.basis,
 *     pe.status,
 *     pe.feedback,
 *     pe.next_loop_required,
 *     pe.result_json,
 *     pe.created_at
 *   FROM promotion_evaluations pe
 *   WHERE pe.project_id = ae.project_id
 *     AND pe.ad_experiment_id = ae.ad_experiment_id
 *   ORDER BY pe.created_at DESC, pe.evaluation_id DESC
 *   LIMIT 1
 * ) evaluation ON TRUE
 * LEFT JOIN LATERAL (
 *   SELECT
 *     pr.promotion_run_id,
 *     pr.loop_count,
 *     pr.status
 *   FROM promotion_runs pr
 *   WHERE pr.project_id = ae.project_id
 *     AND pr.promotion_id = ae.promotion_id
 *     AND pr.loop_count = ae.loop_count + 1
 *   ORDER BY pr.updated_at DESC, pr.created_at DESC
 *   LIMIT 1
 * ) next_run ON TRUE
 * WHERE ae.project_id = :projectId
 *   AND c.status <> 'stopped'
 *   AND p.status <> 'stopped'
 * ORDER BY ae.updated_at DESC, ae.created_at DESC, ae.ad_experiment_id ASC
 * ```
 */
export const listDashboardProjectExperiments = new PreparedQuery<IListDashboardProjectExperimentsParams,IListDashboardProjectExperimentsResult>(listDashboardProjectExperimentsIR);


/** 'ListDashboardRunningAdExperimentCounts' parameters type */
export interface IListDashboardRunningAdExperimentCountsParams {
  projectId?: string | null | void;
}

/** 'ListDashboardRunningAdExperimentCounts' return type */
export interface IListDashboardRunningAdExperimentCountsResult {
  campaignId: string;
  runningAdExperimentCount: number | null;
}

/** 'ListDashboardRunningAdExperimentCounts' query type */
export interface IListDashboardRunningAdExperimentCountsQuery {
  params: IListDashboardRunningAdExperimentCountsParams;
  result: IListDashboardRunningAdExperimentCountsResult;
}

const listDashboardRunningAdExperimentCountsIR: any = {"usedParamSet":{"projectId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":346,"b":355}]}],"statement":"SELECT\n  c.campaign_id AS \"campaignId\",\n  (COUNT(DISTINCT ae.ad_experiment_id) FILTER (\n    WHERE ae.status = 'running'\n      AND ae.segment_id <> 'seg_existing_all'\n  ))::int\n    AS \"runningAdExperimentCount\"\nFROM campaigns c\nLEFT JOIN ad_experiments ae\n  ON ae.project_id = c.project_id\n AND ae.campaign_id = c.campaign_id\nWHERE c.project_id = :projectId\n  AND c.status <> 'stopped'\nGROUP BY c.campaign_id"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   c.campaign_id AS "campaignId",
 *   (COUNT(DISTINCT ae.ad_experiment_id) FILTER (
 *     WHERE ae.status = 'running'
 *       AND ae.segment_id <> 'seg_existing_all'
 *   ))::int
 *     AS "runningAdExperimentCount"
 * FROM campaigns c
 * LEFT JOIN ad_experiments ae
 *   ON ae.project_id = c.project_id
 *  AND ae.campaign_id = c.campaign_id
 * WHERE c.project_id = :projectId
 *   AND c.status <> 'stopped'
 * GROUP BY c.campaign_id
 * ```
 */
export const listDashboardRunningAdExperimentCounts = new PreparedQuery<IListDashboardRunningAdExperimentCountsParams,IListDashboardRunningAdExperimentCountsResult>(listDashboardRunningAdExperimentCountsIR);
