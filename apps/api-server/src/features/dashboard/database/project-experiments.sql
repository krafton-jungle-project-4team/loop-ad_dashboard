/* 목적: 프로젝트 전체 광고 실험과 최신 평가, 다음 루프를 조회합니다. */
/* @name ListDashboardProjectExperiments */
WITH assignment_counts AS (
  SELECT
    project_id,
    promotion_run_id,
    ad_experiment_id,
    COUNT(user_id)::int AS assignment_count
  FROM user_segment_assignments
  WHERE project_id = :projectId
  GROUP BY project_id, promotion_run_id, ad_experiment_id
)
SELECT
  ae.ad_experiment_id AS "adExperimentId",
  ae.promotion_run_id AS "promotionRunId",
  ae.campaign_id AS "campaignId",
  c.name AS "campaignName",
  ae.promotion_id AS "promotionId",
  p.marketing_theme AS "promotionName",
  ae.segment_id AS "segmentId",
  ae.segment_name AS "segmentName",
  ae.content_id AS "contentId",
  ae.content_option_id AS "contentOptionId",
  ae.channel,
  ae.loop_count AS "loopCount",
  p.max_loop_count AS "maxLoopCount",
  p.execution_mode AS "executionMode",
  p.scheduled_start_at AS "scheduledStartAt",
  p.scheduled_end_at AS "scheduledEndAt",
  p.loop_interval_unit AS "loopIntervalUnit",
  p.loop_interval_value AS "loopIntervalValue",
  ae.goal_metric AS "goalMetric",
  CAST(ae.goal_target_value AS float8) AS "goalTargetValue",
  ae.goal_basis AS "goalBasis",
  COALESCE(ac.assignment_count, 0)::int AS "assignmentCount",
  ae.status,
  ae.started_at AS "startedAt",
  ae.ended_at AS "endedAt",
  ae.updated_at AS "updatedAt",
  evaluation.metric AS "evaluationMetric",
  CAST(evaluation.target_value AS float8) AS "evaluationTargetValue",
  CAST(evaluation.actual_value AS float8) AS "evaluationActualValue",
  evaluation.numerator_count AS "evaluationNumeratorCount",
  evaluation.denominator_count AS "evaluationDenominatorCount",
  evaluation.sample_size AS "evaluationSampleSize",
  evaluation.basis AS "evaluationBasis",
  evaluation.status AS "evaluationStatus",
  evaluation.feedback AS "evaluationFeedback",
  evaluation.next_loop_required AS "evaluationNextLoopRequired",
  evaluation.result_json AS "evaluationResultJson",
  evaluation.created_at AS "evaluationCreatedAt",
  next_run.promotion_run_id AS "nextPromotionRunId",
  next_run.loop_count AS "nextLoopCount",
  next_run.status AS "nextLoopStatus"
FROM ad_experiments ae
JOIN campaigns c
  ON c.project_id = ae.project_id
 AND c.campaign_id = ae.campaign_id
JOIN promotions p
  ON p.project_id = ae.project_id
 AND p.campaign_id = ae.campaign_id
 AND p.promotion_id = ae.promotion_id
LEFT JOIN assignment_counts ac
  ON ac.project_id = ae.project_id
 AND ac.promotion_run_id = ae.promotion_run_id
 AND ac.ad_experiment_id = ae.ad_experiment_id
LEFT JOIN LATERAL (
  SELECT
    pe.metric,
    pe.target_value,
    pe.actual_value,
    pe.numerator_count,
    pe.denominator_count,
    pe.sample_size,
    pe.basis,
    pe.status,
    pe.feedback,
    pe.next_loop_required,
    pe.result_json,
    pe.created_at
  FROM promotion_evaluations pe
  WHERE pe.project_id = ae.project_id
    AND pe.ad_experiment_id = ae.ad_experiment_id
  ORDER BY pe.created_at DESC, pe.evaluation_id DESC
  LIMIT 1
) evaluation ON TRUE
LEFT JOIN LATERAL (
  SELECT
    pr.promotion_run_id,
    pr.loop_count,
    pr.status
  FROM promotion_runs pr
  WHERE pr.project_id = ae.project_id
    AND pr.promotion_id = ae.promotion_id
    AND pr.loop_count = ae.loop_count + 1
  ORDER BY pr.updated_at DESC, pr.created_at DESC
  LIMIT 1
) next_run ON TRUE
WHERE ae.project_id = :projectId
  AND ae.status <> 'stopped'
  AND c.status <> 'stopped'
  AND p.status <> 'stopped'
ORDER BY ae.updated_at DESC, ae.created_at DESC, ae.ad_experiment_id ASC;

/* 목적: 캠페인별 실행 중 광고 실험 수를 조회합니다. */
/* @name ListDashboardRunningAdExperimentCounts */
SELECT
  c.campaign_id AS "campaignId",
  (COUNT(DISTINCT ae.ad_experiment_id) FILTER (
    WHERE ae.status = 'running'
      AND ae.segment_id <> 'seg_existing_all'
  ))::int
    AS "runningAdExperimentCount"
FROM campaigns c
LEFT JOIN ad_experiments ae
  ON ae.project_id = c.project_id
 AND ae.campaign_id = c.campaign_id
WHERE c.project_id = :projectId
  AND c.status <> 'stopped'
GROUP BY c.campaign_id;
