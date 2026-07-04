/* 목적: 메인 대시보드에 표시할 캠페인 요약 목록을 조회합니다. */
/* @name ListDashboardCampaignSummaries */
SELECT
  c.campaign_id AS "campaignId",
  c.name AS "campaignName",
  c.objective,
  c.target_audience AS "targetAudience",
  c.primary_metric AS "primaryMetric",
  c.status,
  c.start_date AS "startDate",
  c.end_date AS "endDate",
  COALESCE(MAX(p.max_loop_count), 0)::int AS "maxLoopCount",
  COALESCE(MAX(pr.loop_count), 0)::int AS "currentLoopCount",
  COUNT(DISTINCT p.promotion_id)::int AS "promotionCount",
  COUNT(DISTINCT pts.segment_id)::int AS "segmentCount",
  COUNT(DISTINCT ae.ad_experiment_id)::int AS "adExperimentCount",
  MAX(pe.actual_value)::float8 AS "latestGoalAchievementRate",
  CASE
    WHEN c.status = 'draft' THEN 'campaign_start'
    WHEN COUNT(DISTINCT p.promotion_id) = 0 THEN 'create_promotion'
    WHEN COUNT(DISTINCT pts.segment_id) = 0 THEN 'attach_segment'
    WHEN COUNT(DISTINCT ae.ad_experiment_id) = 0 THEN 'approve_content'
    WHEN COUNT(*) FILTER (WHERE pe.next_loop_required) > 0 THEN 'next_loop'
    ELSE 'monitor'
  END AS "nextAction",
  c.updated_at AS "updatedAt"
FROM campaigns c
LEFT JOIN promotions p
  ON p.campaign_id = c.campaign_id
LEFT JOIN promotion_runs pr
  ON pr.campaign_id = c.campaign_id
LEFT JOIN promotion_target_segments pts
  ON pts.campaign_id = c.campaign_id
LEFT JOIN ad_experiments ae
  ON ae.campaign_id = c.campaign_id
LEFT JOIN promotion_evaluations pe
  ON pe.campaign_id = c.campaign_id
WHERE c.project_id = :projectId
GROUP BY c.campaign_id
ORDER BY c.updated_at DESC, c.created_at DESC;

/* 목적: 한 프로젝트 안에서 특정 캠페인 요약을 조회합니다. */
/* @name GetDashboardCampaignSummary */
SELECT
  c.campaign_id AS "campaignId",
  c.name AS "campaignName",
  c.objective,
  c.target_audience AS "targetAudience",
  c.primary_metric AS "primaryMetric",
  c.status,
  c.start_date AS "startDate",
  c.end_date AS "endDate",
  COALESCE(MAX(p.max_loop_count), 0)::int AS "maxLoopCount",
  COALESCE(MAX(pr.loop_count), 0)::int AS "currentLoopCount",
  COUNT(DISTINCT p.promotion_id)::int AS "promotionCount",
  COUNT(DISTINCT pts.segment_id)::int AS "segmentCount",
  COUNT(DISTINCT ae.ad_experiment_id)::int AS "adExperimentCount",
  MAX(pe.actual_value)::float8 AS "latestGoalAchievementRate",
  CASE
    WHEN c.status = 'draft' THEN 'campaign_start'
    WHEN COUNT(DISTINCT p.promotion_id) = 0 THEN 'create_promotion'
    WHEN COUNT(DISTINCT pts.segment_id) = 0 THEN 'attach_segment'
    WHEN COUNT(DISTINCT ae.ad_experiment_id) = 0 THEN 'approve_content'
    WHEN COUNT(*) FILTER (WHERE pe.next_loop_required) > 0 THEN 'next_loop'
    ELSE 'monitor'
  END AS "nextAction",
  c.updated_at AS "updatedAt"
FROM campaigns c
LEFT JOIN promotions p
  ON p.campaign_id = c.campaign_id
LEFT JOIN promotion_runs pr
  ON pr.campaign_id = c.campaign_id
LEFT JOIN promotion_target_segments pts
  ON pts.campaign_id = c.campaign_id
LEFT JOIN ad_experiments ae
  ON ae.campaign_id = c.campaign_id
LEFT JOIN promotion_evaluations pe
  ON pe.campaign_id = c.campaign_id
WHERE c.project_id = :projectId
  AND c.campaign_id = :campaignId
GROUP BY c.campaign_id;

/* 목적: 대시보드에서 새 캠페인을 생성합니다. */
/* @name InsertDashboardCampaign */
INSERT INTO campaigns (
  campaign_id,
  project_id,
  name,
  objective,
  target_audience,
  start_date,
  end_date,
  primary_metric,
  status
)
VALUES (
  :campaignId,
  :projectId,
  :campaignName,
  :objective,
  :targetAudience,
  :startDate,
  :endDate,
  :primaryMetric,
  :status
)
RETURNING campaign_id AS "campaignId";

/* 목적: 대시보드에서 캠페인 기본 정보를 수정합니다. */
/* @name UpdateDashboardCampaign */
UPDATE campaigns
SET
  name = COALESCE(:campaignName, name),
  objective = CASE WHEN :objectiveIsSet THEN :objective ELSE objective END,
  target_audience = COALESCE(:targetAudience, target_audience),
  start_date = CASE WHEN :startDateIsSet THEN :startDate ELSE start_date END,
  end_date = CASE WHEN :endDateIsSet THEN :endDate ELSE end_date END,
  primary_metric = CASE WHEN :primaryMetricIsSet THEN :primaryMetric ELSE primary_metric END,
  status = COALESCE(:status, status),
  updated_at = now()
WHERE project_id = :projectId
  AND campaign_id = :campaignId
  AND status <> 'stopped'
RETURNING campaign_id AS "campaignId";

/* 목적: FK가 연결된 캠페인을 물리 삭제하지 않고 중지 상태로 전환합니다. */
/* @name StopDashboardCampaign */
UPDATE campaigns
SET status = 'stopped',
    updated_at = now()
WHERE project_id = :projectId
  AND campaign_id = :campaignId
RETURNING campaign_id AS "campaignId", status;

/* 목적: 캠페인에 연결된 프로모션 요약 목록을 조회합니다. */
/* @name ListDashboardCampaignPromotions */
SELECT
  p.promotion_id AS "promotionId",
  p.channel,
  p.marketing_theme AS "marketingTheme",
  p.target_audience AS "targetAudience",
  p.goal_metric AS "goalMetric",
  p.goal_target_value::float8 AS "goalTargetValue",
  p.goal_basis AS "goalBasis",
  p.min_sample_size AS "minSampleSize",
  p.max_loop_count AS "maxLoopCount",
  COALESCE(MAX(pr.loop_count), 0)::int AS "currentLoopCount",
  p.message_brief AS "messageBrief",
  p.offer_type AS "offerType",
  p.landing_url AS "landingUrl",
  p.landing_type AS "landingType",
  p.status,
  COUNT(DISTINCT pts.segment_id)::int AS "targetSegmentCount",
  COUNT(DISTINCT ae.ad_experiment_id)::int AS "adExperimentCount",
  MAX(pe.actual_value)::float8 AS "latestActualValue",
  CASE
    WHEN p.status = 'draft' THEN 'complete_plan'
    WHEN COUNT(DISTINCT pts.segment_id) = 0 THEN 'attach_segment'
    WHEN COUNT(DISTINCT ae.ad_experiment_id) = 0 THEN 'approve_content'
    WHEN COUNT(*) FILTER (WHERE pe.next_loop_required) > 0 THEN 'next_loop'
    ELSE 'monitor'
  END AS "nextAction",
  p.updated_at AS "updatedAt"
FROM promotions p
LEFT JOIN promotion_runs pr
  ON pr.promotion_id = p.promotion_id
LEFT JOIN promotion_target_segments pts
  ON pts.promotion_id = p.promotion_id
LEFT JOIN ad_experiments ae
  ON ae.promotion_id = p.promotion_id
LEFT JOIN promotion_evaluations pe
  ON pe.promotion_id = p.promotion_id
WHERE p.project_id = :projectId
  AND p.campaign_id = :campaignId
GROUP BY p.promotion_id
ORDER BY p.updated_at DESC, p.created_at DESC;

/* 목적: 한 프로젝트 안에서 특정 프로모션 요약을 조회합니다. */
/* @name GetDashboardPromotionSummary */
SELECT
  p.promotion_id AS "promotionId",
  p.campaign_id AS "campaignId",
  p.channel,
  p.marketing_theme AS "marketingTheme",
  p.target_audience AS "targetAudience",
  p.goal_metric AS "goalMetric",
  p.goal_target_value::float8 AS "goalTargetValue",
  p.goal_basis AS "goalBasis",
  p.min_sample_size AS "minSampleSize",
  p.max_loop_count AS "maxLoopCount",
  COALESCE(MAX(pr.loop_count), 0)::int AS "currentLoopCount",
  p.message_brief AS "messageBrief",
  p.offer_type AS "offerType",
  p.landing_url AS "landingUrl",
  p.landing_type AS "landingType",
  p.status,
  COUNT(DISTINCT pts.segment_id)::int AS "targetSegmentCount",
  COUNT(DISTINCT ae.ad_experiment_id)::int AS "adExperimentCount",
  MAX(pe.actual_value)::float8 AS "latestActualValue",
  CASE
    WHEN p.status = 'draft' THEN 'complete_plan'
    WHEN COUNT(DISTINCT pts.segment_id) = 0 THEN 'attach_segment'
    WHEN COUNT(DISTINCT ae.ad_experiment_id) = 0 THEN 'approve_content'
    WHEN COUNT(*) FILTER (WHERE pe.next_loop_required) > 0 THEN 'next_loop'
    ELSE 'monitor'
  END AS "nextAction",
  p.updated_at AS "updatedAt"
FROM promotions p
LEFT JOIN promotion_runs pr
  ON pr.promotion_id = p.promotion_id
LEFT JOIN promotion_target_segments pts
  ON pts.promotion_id = p.promotion_id
LEFT JOIN ad_experiments ae
  ON ae.promotion_id = p.promotion_id
LEFT JOIN promotion_evaluations pe
  ON pe.promotion_id = p.promotion_id
WHERE p.project_id = :projectId
  AND p.promotion_id = :promotionId
GROUP BY p.promotion_id;

/* 목적: 캠페인 하위 프로모션을 생성합니다. */
/* @name InsertDashboardPromotion */
INSERT INTO promotions (
  promotion_id,
  project_id,
  campaign_id,
  channel,
  marketing_theme,
  target_audience,
  goal_metric,
  goal_target_value,
  goal_basis,
  min_sample_size,
  max_loop_count,
  message_brief,
  offer_type,
  landing_url,
  landing_type,
  status
)
SELECT
  :promotionId,
  c.project_id,
  c.campaign_id,
  :channel,
  :marketingTheme,
  :targetAudience,
  :goalMetric,
  :goalTargetValue,
  :goalBasis,
  :minSampleSize,
  :maxLoopCount,
  :messageBrief,
  :offerType,
  :landingUrl,
  :landingType,
  :status
FROM campaigns c
WHERE c.project_id = :projectId
  AND c.campaign_id = :campaignId
  AND c.status <> 'stopped'
RETURNING promotion_id AS "promotionId";

/* 목적: 프로모션 기본 정보를 수정합니다. */
/* @name UpdateDashboardPromotion */
UPDATE promotions
SET
  channel = COALESCE(:channel, channel),
  marketing_theme = COALESCE(:marketingTheme, marketing_theme),
  target_audience = COALESCE(:targetAudience, target_audience),
  goal_metric = COALESCE(:goalMetric, goal_metric),
  goal_target_value = COALESCE(:goalTargetValue, goal_target_value),
  goal_basis = COALESCE(:goalBasis, goal_basis),
  min_sample_size = COALESCE(:minSampleSize, min_sample_size),
  max_loop_count = COALESCE(:maxLoopCount, max_loop_count),
  message_brief = CASE WHEN :messageBriefIsSet THEN :messageBrief ELSE message_brief END,
  offer_type = CASE WHEN :offerTypeIsSet THEN :offerType ELSE offer_type END,
  landing_url = CASE WHEN :landingUrlIsSet THEN :landingUrl ELSE landing_url END,
  landing_type = CASE WHEN :landingTypeIsSet THEN :landingType ELSE landing_type END,
  status = COALESCE(:status, status),
  updated_at = now()
WHERE project_id = :projectId
  AND promotion_id = :promotionId
  AND status <> 'stopped'
RETURNING promotion_id AS "promotionId";

/* 목적: FK가 연결된 프로모션을 물리 삭제하지 않고 중지 상태로 전환합니다. */
/* @name StopDashboardPromotion */
UPDATE promotions
SET status = 'stopped',
    updated_at = now()
WHERE project_id = :projectId
  AND promotion_id = :promotionId
RETURNING promotion_id AS "promotionId", status;

/* 목적: 캠페인 프로모션에 연결된 세그먼트 목록을 조회합니다. */
/* @name ListDashboardCampaignSegments */
SELECT
  pts.promotion_id AS "promotionId",
  pts.segment_id AS "segmentId",
  pts.segment_name AS "segmentName",
  sd.source,
  sd.natural_language_query AS "naturalLanguageQuery",
  pts.rule_json AS "ruleJson",
  pts.profile_json AS "profileJson",
  pts.content_brief_json AS "contentBriefJson",
  pts.data_evidence_json AS "dataEvidenceJson",
  pts.estimated_size AS "estimatedSize",
  sd.sample_size AS "sampleSize",
  sd.total_eligible_user_count AS "totalEligibleUserCount",
  sd.sample_ratio::float8 AS "sampleRatio",
  p.goal_metric AS "goalMetric",
  MAX(pe.actual_value)::float8 AS "latestActualValue",
  MAX(ae.ad_experiment_id) AS "adExperimentId",
  CASE
    WHEN pts.status = 'planned' THEN 'create_content'
    WHEN COUNT(DISTINCT ae.ad_experiment_id) = 0 THEN 'approve_content'
    WHEN COUNT(*) FILTER (WHERE pe.status = 'insufficient_data') > 0 THEN 'review_sample'
    WHEN COUNT(*) FILTER (WHERE pe.next_loop_required) > 0 THEN 'next_loop'
    ELSE 'monitor'
  END AS "nextAction",
  pts.priority,
  pts.status
FROM promotion_target_segments pts
JOIN segment_definitions sd
  ON sd.segment_id = pts.segment_id
JOIN promotions p
  ON p.promotion_id = pts.promotion_id
LEFT JOIN ad_experiments ae
  ON ae.promotion_id = pts.promotion_id
 AND ae.segment_id = pts.segment_id
LEFT JOIN promotion_evaluations pe
  ON pe.promotion_id = pts.promotion_id
 AND pe.segment_id = pts.segment_id
WHERE pts.project_id = :projectId
  AND pts.campaign_id = :campaignId
GROUP BY
  pts.promotion_id,
  pts.segment_id,
  pts.segment_name,
  sd.source,
  sd.natural_language_query,
  pts.rule_json,
  pts.profile_json,
  pts.content_brief_json,
  pts.data_evidence_json,
  pts.estimated_size,
  sd.sample_size,
  sd.total_eligible_user_count,
  sd.sample_ratio,
  p.goal_metric,
  pts.priority,
  pts.status,
  pts.created_at
ORDER BY pts.promotion_id ASC, pts.created_at DESC;

/* 목적: 프로모션에 연결된 세그먼트 목록을 조회합니다. */
/* @name ListDashboardPromotionSegments */
SELECT
  pts.promotion_id AS "promotionId",
  pts.segment_id AS "segmentId",
  pts.segment_name AS "segmentName",
  sd.source,
  sd.natural_language_query AS "naturalLanguageQuery",
  pts.rule_json AS "ruleJson",
  pts.profile_json AS "profileJson",
  pts.content_brief_json AS "contentBriefJson",
  pts.data_evidence_json AS "dataEvidenceJson",
  pts.estimated_size AS "estimatedSize",
  sd.sample_size AS "sampleSize",
  sd.total_eligible_user_count AS "totalEligibleUserCount",
  sd.sample_ratio::float8 AS "sampleRatio",
  p.goal_metric AS "goalMetric",
  MAX(pe.actual_value)::float8 AS "latestActualValue",
  MAX(ae.ad_experiment_id) AS "adExperimentId",
  CASE
    WHEN pts.status = 'planned' THEN 'create_content'
    WHEN COUNT(DISTINCT ae.ad_experiment_id) = 0 THEN 'approve_content'
    WHEN COUNT(*) FILTER (WHERE pe.status = 'insufficient_data') > 0 THEN 'review_sample'
    WHEN COUNT(*) FILTER (WHERE pe.next_loop_required) > 0 THEN 'next_loop'
    ELSE 'monitor'
  END AS "nextAction",
  pts.priority,
  pts.status
FROM promotion_target_segments pts
JOIN segment_definitions sd
  ON sd.segment_id = pts.segment_id
JOIN promotions p
  ON p.promotion_id = pts.promotion_id
LEFT JOIN ad_experiments ae
  ON ae.promotion_id = pts.promotion_id
 AND ae.segment_id = pts.segment_id
LEFT JOIN promotion_evaluations pe
  ON pe.promotion_id = pts.promotion_id
 AND pe.segment_id = pts.segment_id
WHERE pts.project_id = :projectId
  AND pts.promotion_id = :promotionId
GROUP BY
  pts.promotion_id,
  pts.segment_id,
  pts.segment_name,
  sd.source,
  sd.natural_language_query,
  pts.rule_json,
  pts.profile_json,
  pts.content_brief_json,
  pts.data_evidence_json,
  pts.estimated_size,
  sd.sample_size,
  sd.total_eligible_user_count,
  sd.sample_ratio,
  p.goal_metric,
  pts.priority,
  pts.status,
  pts.created_at
ORDER BY pts.created_at DESC;

/* 목적: 프로모션 안의 특정 세그먼트 요약을 조회합니다. */
/* @name GetDashboardPromotionSegment */
SELECT
  pts.promotion_id AS "promotionId",
  pts.segment_id AS "segmentId",
  pts.segment_name AS "segmentName",
  sd.source,
  sd.natural_language_query AS "naturalLanguageQuery",
  pts.rule_json AS "ruleJson",
  pts.profile_json AS "profileJson",
  pts.content_brief_json AS "contentBriefJson",
  pts.data_evidence_json AS "dataEvidenceJson",
  pts.estimated_size AS "estimatedSize",
  sd.sample_size AS "sampleSize",
  sd.total_eligible_user_count AS "totalEligibleUserCount",
  sd.sample_ratio::float8 AS "sampleRatio",
  p.goal_metric AS "goalMetric",
  MAX(pe.actual_value)::float8 AS "latestActualValue",
  MAX(ae.ad_experiment_id) AS "adExperimentId",
  CASE
    WHEN pts.status = 'planned' THEN 'create_content'
    WHEN COUNT(DISTINCT ae.ad_experiment_id) = 0 THEN 'approve_content'
    WHEN COUNT(*) FILTER (WHERE pe.status = 'insufficient_data') > 0 THEN 'review_sample'
    WHEN COUNT(*) FILTER (WHERE pe.next_loop_required) > 0 THEN 'next_loop'
    ELSE 'monitor'
  END AS "nextAction",
  pts.priority,
  pts.status
FROM promotion_target_segments pts
JOIN segment_definitions sd
  ON sd.segment_id = pts.segment_id
JOIN promotions p
  ON p.promotion_id = pts.promotion_id
LEFT JOIN ad_experiments ae
  ON ae.promotion_id = pts.promotion_id
 AND ae.segment_id = pts.segment_id
LEFT JOIN promotion_evaluations pe
  ON pe.promotion_id = pts.promotion_id
 AND pe.segment_id = pts.segment_id
WHERE pts.project_id = :projectId
  AND pts.promotion_id = :promotionId
  AND pts.segment_id = :segmentId
GROUP BY
  pts.promotion_id,
  pts.segment_id,
  pts.segment_name,
  sd.source,
  sd.natural_language_query,
  pts.rule_json,
  pts.profile_json,
  pts.content_brief_json,
  pts.data_evidence_json,
  pts.estimated_size,
  sd.sample_size,
  sd.total_eligible_user_count,
  sd.sample_ratio,
  p.goal_metric,
  pts.priority,
  pts.status,
  pts.created_at;

/* 목적: 사용자 정의 세그먼트 연결을 위한 수동 분석 row를 생성합니다. */
/* @name InsertDashboardManualPromotionAnalysis */
INSERT INTO promotion_analyses (
  analysis_id,
  project_id,
  campaign_id,
  promotion_id,
  operator_instruction,
  status
)
VALUES (
  :analysisId,
  :projectId,
  :campaignId,
  :promotionId,
  'dashboard_manual_segment_attach',
  'completed'
)
RETURNING analysis_id AS "analysisId";

/* 목적: 저장된 세그먼트를 프로모션 타겟 세그먼트로 연결합니다. */
/* @name InsertDashboardPromotionTargetSegment */
INSERT INTO promotion_target_segments (
  analysis_id,
  project_id,
  campaign_id,
  promotion_id,
  segment_id,
  segment_name,
  rule_json,
  profile_json,
  content_brief_json,
  data_evidence_json,
  estimated_size,
  priority,
  status
)
SELECT
  (:analysisId)::varchar,
  sd.project_id,
  (:campaignId)::varchar,
  (:promotionId)::varchar,
  sd.segment_id,
  COALESCE(:segmentName, sd.segment_name),
  sd.rule_json,
  sd.profile_json,
  '{}'::jsonb,
  jsonb_build_object(
    'source', sd.source,
    'query_preview_id', sd.query_preview_id,
    'sample_size', sd.sample_size,
    'sample_ratio', sd.sample_ratio
  ),
  sd.sample_size,
  :priority,
  :status
FROM segment_definitions sd
WHERE sd.project_id = :projectId
  AND sd.segment_id = :segmentId
  AND EXISTS (
    SELECT 1
    FROM campaigns c
    JOIN promotions p
      ON p.campaign_id = c.campaign_id
    WHERE c.project_id = :projectId
      AND c.campaign_id = :campaignId
      AND c.status <> 'stopped'
      AND p.project_id = :projectId
      AND p.promotion_id = :promotionId
      AND p.status <> 'stopped'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM promotion_target_segments existing_pts
    WHERE existing_pts.project_id = :projectId
      AND existing_pts.promotion_id = :promotionId
      AND existing_pts.segment_id = :segmentId
      AND existing_pts.status <> 'stopped'
  )
RETURNING promotion_id AS "promotionId", segment_id AS "segmentId";

/* 목적: 프로모션에 연결된 세그먼트 표시 정보를 수정합니다. */
/* @name UpdateDashboardPromotionTargetSegment */
UPDATE promotion_target_segments
SET
  segment_name = COALESCE(:segmentName, segment_name),
  priority = CASE WHEN :priorityIsSet THEN :priority ELSE priority END,
  status = COALESCE(:status, status)
WHERE project_id = :projectId
  AND promotion_id = :promotionId
  AND segment_id = :segmentId
  AND status <> 'stopped'
RETURNING promotion_id AS "promotionId", segment_id AS "segmentId";

/* 목적: 프로모션 세그먼트를 물리 삭제하지 않고 중지 상태로 전환합니다. */
/* @name StopDashboardPromotionTargetSegment */
UPDATE promotion_target_segments
SET status = 'stopped'
WHERE project_id = :projectId
  AND promotion_id = :promotionId
  AND segment_id = :segmentId
RETURNING promotion_id AS "promotionId", segment_id AS "segmentId", status;

/* 목적: 목표 미달 세그먼트만 대상으로 next-loop 분석 요청을 생성합니다. */
/* @name InsertDashboardNextLoopAnalysis */
INSERT INTO promotion_analyses (
  analysis_id,
  project_id,
  campaign_id,
  promotion_id,
  focus_segment_ids_json,
  operator_instruction,
  status
)
VALUES (
  :analysisId,
  :projectId,
  :campaignId,
  :promotionId,
  :focusSegmentIdsJson,
  :operatorInstruction,
  'requested'
)
RETURNING
  analysis_id AS "analysisId",
  promotion_id AS "promotionId",
  focus_segment_ids_json AS "focusSegmentIdsJson",
  status;

/* 목적: 캠페인 프로모션 실험 지표 목록을 조회합니다. */
/* @name ListDashboardCampaignExperimentMetrics */
SELECT
  promotion_id AS "promotionId",
  promotion_run_id AS "promotionRunId",
  ad_experiment_id AS "adExperimentId",
  segment_id AS "segmentId",
  content_id AS "contentId",
  content_option_id AS "contentOptionId",
  metric,
  target_value::float8 AS "targetValue",
  actual_value::float8 AS "actualValue",
  numerator_count AS "numeratorCount",
  denominator_count AS "denominatorCount",
  sample_size AS "sampleSize",
  basis,
  status,
  feedback,
  next_loop_required AS "nextLoopRequired",
  result_json AS "resultJson",
  created_at AS "createdAt"
FROM promotion_evaluations
WHERE project_id = :projectId
  AND campaign_id = :campaignId
ORDER BY created_at DESC;

/* 목적: 프로모션 실험 지표 목록을 조회합니다. */
/* @name ListDashboardPromotionExperimentMetrics */
SELECT
  promotion_id AS "promotionId",
  promotion_run_id AS "promotionRunId",
  ad_experiment_id AS "adExperimentId",
  segment_id AS "segmentId",
  content_id AS "contentId",
  content_option_id AS "contentOptionId",
  metric,
  target_value::float8 AS "targetValue",
  actual_value::float8 AS "actualValue",
  numerator_count AS "numeratorCount",
  denominator_count AS "denominatorCount",
  sample_size AS "sampleSize",
  basis,
  status,
  feedback,
  next_loop_required AS "nextLoopRequired",
  result_json AS "resultJson",
  created_at AS "createdAt"
FROM promotion_evaluations
WHERE project_id = :projectId
  AND promotion_id = :promotionId
ORDER BY created_at DESC;

/* 목적: 특정 세그먼트의 실험 지표 목록을 조회합니다. */
/* @name ListDashboardSegmentExperimentMetrics */
SELECT
  promotion_id AS "promotionId",
  promotion_run_id AS "promotionRunId",
  ad_experiment_id AS "adExperimentId",
  segment_id AS "segmentId",
  content_id AS "contentId",
  content_option_id AS "contentOptionId",
  metric,
  target_value::float8 AS "targetValue",
  actual_value::float8 AS "actualValue",
  numerator_count AS "numeratorCount",
  denominator_count AS "denominatorCount",
  sample_size AS "sampleSize",
  basis,
  status,
  feedback,
  next_loop_required AS "nextLoopRequired",
  result_json AS "resultJson",
  created_at AS "createdAt"
FROM promotion_evaluations
WHERE project_id = :projectId
  AND promotion_id = :promotionId
  AND segment_id = :segmentId
ORDER BY created_at DESC;

/* 목적: 캠페인 단위 Email/SMS 발송 상태를 조회합니다. */
/* @name GetDashboardCampaignDeliveryStatus */
SELECT
  COALESCE(SUM(target_count), 0)::int AS "scheduledCount",
  COALESCE(SUM(sent_count), 0)::int AS "sentCount",
  COALESCE(SUM(sent_count), 0)::int AS "deliveredCount",
  0::int AS "openedCount",
  0::int AS "bouncedCount",
  COALESCE(SUM(failed_count), 0)::int AS "failedCount"
FROM ad_dispatch_jobs
WHERE project_id = :projectId
  AND campaign_id = :campaignId
  AND channel IN ('email', 'sms');

/* 목적: 프로모션 단위 Email/SMS 발송 상태를 조회합니다. */
/* @name GetDashboardPromotionDeliveryStatus */
SELECT
  COALESCE(SUM(target_count), 0)::int AS "scheduledCount",
  COALESCE(SUM(sent_count), 0)::int AS "sentCount",
  COALESCE(SUM(sent_count), 0)::int AS "deliveredCount",
  0::int AS "openedCount",
  0::int AS "bouncedCount",
  COALESCE(SUM(failed_count), 0)::int AS "failedCount"
FROM ad_dispatch_jobs
WHERE project_id = :projectId
  AND promotion_id = :promotionId
  AND channel IN ('email', 'sms');

/* 목적: 세그먼트 단위 Email/SMS 발송 상태를 조회합니다. */
/* @name GetDashboardSegmentDeliveryStatus */
SELECT
  COALESCE(SUM(adj.target_count), 0)::int AS "scheduledCount",
  COALESCE(SUM(adj.sent_count), 0)::int AS "sentCount",
  COALESCE(SUM(adj.sent_count), 0)::int AS "deliveredCount",
  0::int AS "openedCount",
  0::int AS "bouncedCount",
  COALESCE(SUM(adj.failed_count), 0)::int AS "failedCount"
FROM ad_dispatch_jobs adj
JOIN ad_experiments ae
  ON ae.ad_experiment_id = adj.ad_experiment_id
WHERE adj.project_id = :projectId
  AND adj.promotion_id = :promotionId
  AND ae.segment_id = :segmentId
  AND adj.channel IN ('email', 'sms');

/* 목적: 프로모션 안 세그먼트별 Email/SMS 발송 상태를 조회합니다. */
/* @name ListDashboardPromotionSegmentDeliverySummaries */
SELECT
  ae.segment_id AS "segmentId",
  COALESCE(SUM(adj.target_count), 0)::int AS "scheduledCount",
  COALESCE(SUM(adj.sent_count), 0)::int AS "sentCount",
  COALESCE(SUM(adj.sent_count), 0)::int AS "deliveredCount",
  COALESCE(SUM(adj.failed_count), 0)::int AS "failedCount"
FROM ad_dispatch_jobs adj
JOIN ad_experiments ae
  ON ae.ad_experiment_id = adj.ad_experiment_id
WHERE adj.project_id = :projectId
  AND adj.promotion_id = :promotionId
  AND adj.channel IN ('email', 'sms')
GROUP BY ae.segment_id
ORDER BY COALESCE(SUM(adj.sent_count), 0)::int DESC, ae.segment_id ASC;

/* 목적: 특정 세그먼트의 생성 콘텐츠 후보를 조회합니다. */
/* @name ListDashboardSegmentContentCandidates */
SELECT
  content_id AS "contentId",
  content_option_id AS "contentOptionId",
  promotion_id AS "promotionId",
  segment_id AS "segmentId",
  channel,
  title,
  body,
  cta,
  message,
  image_prompt AS "imagePrompt",
  landing_url AS "landingUrl",
  generation_prompt AS "generationPrompt",
  reason_summary AS "reasonSummary",
  data_evidence_json AS "dataEvidenceJson",
  message_strategy AS "messageStrategy",
  metadata_json AS "metadataJson",
  status,
  updated_at AS "updatedAt"
FROM content_candidates
WHERE project_id = :projectId
  AND promotion_id = :promotionId
  AND segment_id = :segmentId
ORDER BY updated_at DESC, created_at DESC;

/* 목적: 특정 세그먼트에서 생성된 광고 실험 상태를 조회합니다. */
/* @name ListDashboardSegmentAdExperiments */
SELECT
  ad_experiment_id AS "adExperimentId",
  promotion_run_id AS "promotionRunId",
  promotion_id AS "promotionId",
  segment_id AS "segmentId",
  content_id AS "contentId",
  content_option_id AS "contentOptionId",
  status
FROM ad_experiments
WHERE project_id = :projectId
  AND promotion_id = :promotionId
  AND segment_id = :segmentId
ORDER BY loop_count DESC, updated_at DESC, created_at DESC;

/* 목적: 콘텐츠 승인과 실험 생성을 위해 후보, 프로모션, 세그먼트 정보를 함께 조회합니다. */
/* @name GetDashboardContentCandidateForApproval */
SELECT
  cc.content_id AS "contentId",
  cc.content_option_id AS "contentOptionId",
  cc.generation_id AS "generationId",
  cc.analysis_id AS "analysisId",
  cc.project_id AS "projectId",
  cc.campaign_id AS "campaignId",
  cc.promotion_id AS "promotionId",
  cc.segment_id AS "segmentId",
  COALESCE(pts.segment_name, sd.segment_name) AS "segmentName",
  cc.channel,
  p.goal_metric AS "goalMetric",
  p.goal_target_value::float8 AS "goalTargetValue",
  p.goal_basis AS "goalBasis",
  cc.status AS "contentStatus"
FROM content_candidates cc
JOIN promotions p
  ON p.promotion_id = cc.promotion_id
JOIN segment_definitions sd
  ON sd.segment_id = cc.segment_id
JOIN promotion_target_segments pts
  ON pts.promotion_id = cc.promotion_id
 AND pts.segment_id = cc.segment_id
WHERE cc.project_id = :projectId
  AND cc.promotion_id = :promotionId
  AND cc.segment_id = :segmentId
  AND cc.content_id = :contentId
  AND p.status <> 'stopped'
  AND pts.status <> 'stopped'
  AND cc.status IN ('draft', 'approved', 'active');

/* 목적: 같은 생성 실행/세그먼트 안에서 승인 대상이 아닌 후보를 거절 상태로 전환합니다. */
/* @name RejectDashboardSiblingContentCandidates */
UPDATE content_candidates
SET status = 'rejected',
    updated_at = now()
WHERE project_id = :projectId
  AND generation_id = :generationId
  AND segment_id = :segmentId
  AND content_id <> :contentId
  AND status IN ('draft', 'approved', 'active')
RETURNING content_id AS "contentId";

/* 목적: 관리자가 선택한 콘텐츠 후보 1개를 승인 상태로 전환합니다. */
/* @name ApproveDashboardContentCandidate */
UPDATE content_candidates
SET status = 'approved',
    updated_at = now()
WHERE project_id = :projectId
  AND promotion_id = :promotionId
  AND segment_id = :segmentId
  AND content_id = :contentId
  AND status IN ('draft', 'approved', 'active')
RETURNING
  content_id AS "contentId",
  content_option_id AS "contentOptionId",
  status;

/* 목적: 관리자가 선택한 콘텐츠 후보 1개를 거절 상태로 전환합니다. */
/* @name RejectDashboardContentCandidate */
UPDATE content_candidates cc
SET status = 'rejected',
    updated_at = now()
FROM promotions p
JOIN promotion_target_segments pts
  ON pts.promotion_id = p.promotion_id
WHERE cc.project_id = :projectId
  AND cc.promotion_id = :promotionId
  AND cc.segment_id = :segmentId
  AND cc.content_id = :contentId
  AND p.promotion_id = cc.promotion_id
  AND pts.segment_id = cc.segment_id
  AND p.status <> 'stopped'
  AND pts.status <> 'stopped'
  AND cc.status IN ('draft', 'approved', 'active')
RETURNING
  cc.content_id AS "contentId",
  cc.promotion_id AS "promotionId",
  cc.segment_id AS "segmentId",
  cc.status,
  cc.updated_at AS "rejectedAt";

/* 목적: 생성 실행에 이미 연결된 프로모션 루프가 있는지 조회합니다. */
/* @name GetDashboardPromotionRunByGeneration */
SELECT
  promotion_run_id AS "promotionRunId",
  loop_count AS "loopCount",
  status
FROM promotion_runs
WHERE project_id = :projectId
  AND promotion_id = :promotionId
  AND generation_id = :generationId
ORDER BY loop_count DESC
LIMIT 1;

/* 목적: 새 프로모션 루프를 만들 때 사용할 다음 loop_count를 계산합니다. */
/* @name GetDashboardNextPromotionLoopCount */
SELECT COALESCE(MAX(loop_count), 0)::int + 1 AS "loopCount"
FROM promotion_runs
WHERE project_id = :projectId
  AND promotion_id = :promotionId;

/* 목적: 승인된 콘텐츠 후보를 묶을 프로모션 루프를 생성합니다. */
/* @name InsertDashboardPromotionRun */
INSERT INTO promotion_runs (
  promotion_run_id,
  project_id,
  campaign_id,
  promotion_id,
  analysis_id,
  generation_id,
  loop_count,
  status,
  goal_snapshot_json
)
VALUES (
  :promotionRunId,
  :projectId,
  :campaignId,
  :promotionId,
  :analysisId,
  :generationId,
  :loopCount,
  'approved',
  jsonb_build_object(
    'goal_metric', (:goalMetric)::text,
    'goal_target_value', (:goalTargetValue)::numeric,
    'goal_basis', (:goalBasis)::text
  )
)
RETURNING
  promotion_run_id AS "promotionRunId",
  loop_count AS "loopCount",
  status;

/* 목적: 세그먼트별 승인 콘텐츠 1개로 광고 실험 1개를 생성하거나 갱신합니다. */
/* @name UpsertDashboardAdExperimentFromApprovedContent */
INSERT INTO ad_experiments (
  ad_experiment_id,
  project_id,
  campaign_id,
  promotion_id,
  promotion_run_id,
  analysis_id,
  generation_id,
  segment_id,
  segment_name,
  content_id,
  content_option_id,
  channel,
  loop_count,
  status,
  goal_metric,
  goal_target_value,
  goal_basis
)
VALUES (
  :adExperimentId,
  :projectId,
  :campaignId,
  :promotionId,
  :promotionRunId,
  :analysisId,
  :generationId,
  :segmentId,
  :segmentName,
  :contentId,
  :contentOptionId,
  :channel,
  :loopCount,
  'approved',
  :goalMetric,
  :goalTargetValue,
  :goalBasis
)
ON CONFLICT (promotion_run_id, segment_id)
DO UPDATE SET
  content_id = EXCLUDED.content_id,
  content_option_id = EXCLUDED.content_option_id,
  channel = EXCLUDED.channel,
  status = 'approved',
  goal_metric = EXCLUDED.goal_metric,
  goal_target_value = EXCLUDED.goal_target_value,
  goal_basis = EXCLUDED.goal_basis,
  updated_at = now()
RETURNING
  ad_experiment_id AS "adExperimentId",
  promotion_run_id AS "promotionRunId",
  promotion_id AS "promotionId",
  segment_id AS "segmentId",
  content_id AS "contentId",
  content_option_id AS "contentOptionId",
  status;

/* 목적: 콘텐츠 승인 후 프로모션 타겟 세그먼트 상태를 승인됨으로 갱신합니다. */
/* @name MarkDashboardPromotionTargetSegmentApproved */
UPDATE promotion_target_segments
SET status = 'approved'
WHERE project_id = :projectId
  AND promotion_id = :promotionId
  AND segment_id = :segmentId
  AND status <> 'stopped'
RETURNING promotion_id AS "promotionId", segment_id AS "segmentId", status;

/* 목적: 프로젝트에 저장된 사용자 정의 세그먼트 목록을 조회합니다. */
/* @name ListDashboardSavedSegments */
SELECT
  segment_id AS "segmentId",
  project_id AS "projectId",
  segment_name AS "segmentName",
  source,
  query_preview_id AS "queryPreviewId",
  natural_language_query AS "naturalLanguageQuery",
  generated_sql AS "generatedSql",
  sample_size AS "sampleSize",
  total_eligible_user_count AS "totalEligibleUserCount",
  sample_ratio::float8 AS "sampleRatio",
  status
FROM segment_definitions
WHERE project_id = :projectId
  AND source = 'custom_chatkit'
  AND status = 'active'
ORDER BY updated_at DESC, created_at DESC;

/* 목적: 자연어 세그먼트 조회 preview 결과를 저장합니다. */
/* @name InsertDashboardSegmentQueryPreview */
INSERT INTO segment_query_previews (
  query_preview_id,
  project_id,
  natural_language_query,
  generated_sql,
  query_params_json,
  base_time_from,
  base_time_to,
  sample_size,
  total_eligible_user_count,
  sample_ratio,
  sample_size_status,
  result_columns_json,
  result_preview_json,
  status
)
VALUES (
  :queryPreviewId,
  :projectId,
  :naturalLanguageQuery,
  :generatedSql,
  :queryParamsJson,
  :baseTimeFrom,
  :baseTimeTo,
  :sampleSize,
  :totalEligibleUserCount,
  :sampleRatio,
  :sampleSizeStatus,
  :resultColumnsJson,
  :resultPreviewJson,
  'previewed'
)
RETURNING
  query_preview_id AS "queryPreviewId",
  project_id AS "projectId",
  natural_language_query AS "naturalLanguageQuery",
  generated_sql AS "generatedSql",
  sample_size AS "sampleSize",
  total_eligible_user_count AS "totalEligibleUserCount",
  sample_ratio::float8 AS "sampleRatio",
  sample_size_status AS "sampleSizeStatus",
  result_columns_json AS "resultColumnsJson",
  result_preview_json AS "resultPreviewJson",
  status;

/* 목적: 저장 가능한 세그먼트 preview를 조회합니다. */
/* @name GetDashboardSegmentQueryPreviewForSave */
SELECT
  query_preview_id AS "queryPreviewId",
  project_id AS "projectId",
  natural_language_query AS "naturalLanguageQuery",
  generated_sql AS "generatedSql",
  sample_size AS "sampleSize",
  total_eligible_user_count AS "totalEligibleUserCount",
  sample_ratio::float8 AS "sampleRatio",
  sample_size_status AS "sampleSizeStatus",
  status
FROM segment_query_previews
WHERE project_id = :projectId
  AND query_preview_id = :queryPreviewId;

/* 목적: 사용자 정의 세그먼트를 segment_definitions에 저장합니다. */
/* @name InsertDashboardCustomSegmentDefinition */
INSERT INTO segment_definitions (
  segment_id,
  project_id,
  segment_name,
  source,
  query_preview_id,
  natural_language_query,
  generated_sql,
  rule_json,
  profile_json,
  sample_size,
  total_eligible_user_count,
  sample_ratio,
  status
)
VALUES (
  :segmentId,
  :projectId,
  :segmentName,
  'custom_chatkit',
  :queryPreviewId,
  :naturalLanguageQuery,
  :generatedSql,
  '{}'::jsonb,
  '{}'::jsonb,
  :sampleSize,
  :totalEligibleUserCount,
  :sampleRatio,
  'active'
)
RETURNING
  segment_id AS "segmentId",
  project_id AS "projectId",
  segment_name AS "segmentName",
  source,
  query_preview_id AS "queryPreviewId",
  natural_language_query AS "naturalLanguageQuery",
  generated_sql AS "generatedSql",
  sample_size AS "sampleSize",
  total_eligible_user_count AS "totalEligibleUserCount",
  sample_ratio::float8 AS "sampleRatio",
  status;

/* 목적: 저장된 사용자 정의 세그먼트의 표시 이름과 상태를 수정합니다. */
/* @name UpdateDashboardSavedSegment */
UPDATE segment_definitions
SET
  segment_name = COALESCE(:segmentName, segment_name),
  status = COALESCE(:status, status),
  updated_at = now()
WHERE project_id = :projectId
  AND segment_id = :segmentId
  AND source = 'custom_chatkit'
  AND status <> 'archived'
RETURNING
  segment_id AS "segmentId",
  project_id AS "projectId",
  segment_name AS "segmentName",
  source,
  query_preview_id AS "queryPreviewId",
  natural_language_query AS "naturalLanguageQuery",
  generated_sql AS "generatedSql",
  sample_size AS "sampleSize",
  total_eligible_user_count AS "totalEligibleUserCount",
  sample_ratio::float8 AS "sampleRatio",
  status;

/* 목적: 저장된 사용자 정의 세그먼트를 FK 안전하게 보관 상태로 전환합니다. */
/* @name ArchiveDashboardSavedSegment */
UPDATE segment_definitions
SET status = 'archived',
    updated_at = now()
WHERE project_id = :projectId
  AND segment_id = :segmentId
  AND source = 'custom_chatkit'
  AND status <> 'archived'
RETURNING segment_id AS "segmentId", status;

/* 목적: 저장 완료된 preview 상태를 갱신합니다. */
/* @name MarkDashboardSegmentQueryPreviewSaved */
UPDATE segment_query_previews
SET status = 'saved'
WHERE project_id = :projectId
  AND query_preview_id = :queryPreviewId
RETURNING query_preview_id AS "queryPreviewId";

/* 목적: 한 프로젝트의 활성 퍼널 목록을 조회합니다. */
/* @name ListActiveFunnels */
SELECT
  funnel_id AS "funnelId",
  funnel_name AS "funnelName",
  domain_type AS "domainType",
  status,
  created_at AS "createdAt",
  updated_at AS "updatedAt"
FROM funnel_definitions
WHERE project_id = :projectId
  AND status = 'active'
ORDER BY updated_at DESC, created_at DESC;

/* 목적: 한 프로젝트의 활성 퍼널 하나를 조회합니다. */
/* @name GetActiveFunnelById */
SELECT
  funnel_id AS "funnelId",
  funnel_name AS "funnelName",
  domain_type AS "domainType",
  status,
  created_at AS "createdAt",
  updated_at AS "updatedAt"
FROM funnel_definitions
WHERE project_id = :projectId
  AND funnel_id = :funnelId
  AND status = 'active';

/* 목적: 한 프로젝트의 활성 퍼널 단계 목록을 조회합니다. */
/* @name ListActiveFunnelSteps */
SELECT
  fs.funnel_id AS "funnelId",
  fs.step_order AS "stepOrder",
  fs.step_name AS "stepName",
  fs.event_name AS "eventName"
FROM funnel_steps fs
JOIN funnel_definitions fd
  ON fd.funnel_id = fs.funnel_id
WHERE fd.project_id = :projectId
  AND fd.status = 'active'
ORDER BY fs.funnel_id ASC, fs.step_order ASC;

/* 목적: 한 프로젝트 안에서 특정 퍼널의 활성 단계를 조회합니다. */
/* @name ListActiveFunnelStepsByFunnelId */
SELECT
  fs.funnel_id AS "funnelId",
  fs.step_order AS "stepOrder",
  fs.step_name AS "stepName",
  fs.event_name AS "eventName"
FROM funnel_steps fs
JOIN funnel_definitions fd
  ON fd.funnel_id = fs.funnel_id
WHERE fd.project_id = :projectId
  AND fd.funnel_id = :funnelId
  AND fd.status = 'active'
ORDER BY fs.step_order ASC;

/* 목적: 퍼널 기본 정보를 생성합니다. */
/* @name InsertFunnelDefinition */
INSERT INTO funnel_definitions (funnel_id, project_id, funnel_name)
VALUES (:funnelId, :projectId, :funnelName)
RETURNING
  funnel_id AS "funnelId",
  funnel_name AS "funnelName",
  domain_type AS "domainType",
  status,
  created_at AS "createdAt",
  updated_at AS "updatedAt";

/* 목적: 퍼널 단계 하나를 생성합니다. */
/* @name InsertFunnelStep */
INSERT INTO funnel_steps (funnel_id, step_order, step_name, event_name)
VALUES (:funnelId, :stepOrder, :stepName, :eventName)
RETURNING
  funnel_id AS "funnelId",
  step_order AS "stepOrder",
  step_name AS "stepName",
  event_name AS "eventName";

/* 목적: 한 프로젝트 안에서 특정 퍼널의 모든 단계를 삭제합니다. */
/* @name DeleteFunnelSteps */
DELETE FROM funnel_steps
WHERE funnel_id IN (
  SELECT funnel_id
  FROM funnel_definitions
  WHERE project_id = :projectId
    AND funnel_id = :funnelId
);

/* 목적: 한 프로젝트 안에서 특정 퍼널 기본 정보를 삭제합니다. */
/* @name DeleteFunnelDefinition */
DELETE FROM funnel_definitions
WHERE project_id = :projectId
  AND funnel_id = :funnelId
RETURNING funnel_id AS "funnelId";
