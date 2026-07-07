/* 목적: 활성 프로젝트 목록을 조회합니다. */
/* @name ListDashboardProjects */
SELECT
  project_id AS "projectId",
  project_name AS "projectName",
  domain,
  write_key AS "writeKey",
  industry,
  status,
  created_at AS "createdAt",
  updated_at AS "updatedAt"
FROM projects
WHERE status <> 'archived'
ORDER BY updated_at DESC, created_at DESC;

/* 목적: 대시보드에서 새 프로젝트를 생성합니다. */
/* @name InsertDashboardProject */
INSERT INTO projects (
  project_id,
  project_name,
  domain,
  write_key,
  industry,
  status
)
VALUES (
  :projectId,
  :projectName,
  :domain,
  :writeKey,
  :industry,
  :status
)
ON CONFLICT (project_id) DO UPDATE
SET
  project_name = EXCLUDED.project_name,
  domain = EXCLUDED.domain,
  write_key = EXCLUDED.write_key,
  industry = EXCLUDED.industry,
  status = 'active',
  updated_at = now()
RETURNING
  project_id AS "projectId",
  project_name AS "projectName",
  domain,
  write_key AS "writeKey",
  industry,
  status,
  created_at AS "createdAt",
  updated_at AS "updatedAt";

/* 목적: FK가 연결된 프로젝트를 물리 삭제하지 않고 보관 상태로 전환합니다. */
/* @name ArchiveDashboardProject */
UPDATE projects
SET status = 'archived',
    updated_at = now()
WHERE project_id = :projectId
  AND status <> 'archived'
RETURNING project_id AS "projectId", status;

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
  CAST(MAX(pe.actual_value) AS float8) AS "latestGoalAchievementRate",
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
  CAST(MAX(pe.actual_value) AS float8) AS "latestGoalAchievementRate",
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
  CAST(p.goal_target_value AS float8) AS "goalTargetValue",
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
  CAST(MAX(pe.actual_value) AS float8) AS "latestActualValue",
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
  AND p.status <> 'stopped'
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
  CAST(p.goal_target_value AS float8) AS "goalTargetValue",
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
  CAST(MAX(pe.actual_value) AS float8) AS "latestActualValue",
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
WITH stopped_promotion AS (
  UPDATE promotions
  SET status = 'stopped',
      updated_at = now()
  WHERE project_id = :projectId
    AND promotion_id = :promotionId
  RETURNING promotion_id, status
),
stopped_segments AS (
  UPDATE promotion_target_segments
  SET status = 'stopped'
  WHERE project_id = :projectId
    AND promotion_id = :promotionId
    AND status <> 'stopped'
  RETURNING segment_id
),
archived_segment_definitions AS (
  UPDATE segment_definitions
  SET status = 'archived',
      updated_at = now()
  WHERE project_id = :projectId
    AND promotion_id = :promotionId
    AND source IN ('custom_chatkit', 'manual_rule')
    AND status = 'active'
  RETURNING segment_id
),
dismissed_suggestions AS (
  UPDATE promotion_segment_suggestions
  SET status = 'dismissed',
      decided_at = COALESCE(decided_at, now()),
      updated_at = now()
  WHERE project_id = :projectId
    AND promotion_id = :promotionId
    AND status IN ('suggested', 'accepted')
  RETURNING suggestion_id
),
archived_content_candidates AS (
  UPDATE content_candidates
  SET status = 'archived',
      updated_at = now()
  WHERE project_id = :projectId
    AND promotion_id = :promotionId
    AND status IN ('draft', 'approved', 'active')
  RETURNING content_id
),
cancelled_dispatch_jobs AS (
  UPDATE ad_dispatch_jobs
  SET status = 'cancelled',
      completed_at = COALESCE(completed_at, now())
  WHERE project_id = :projectId
    AND promotion_id = :promotionId
    AND status IN ('queued', 'scheduled', 'running')
  RETURNING ad_dispatch_job_id
),
stopped_runs AS (
  UPDATE promotion_runs
  SET status = 'stopped',
      ended_at = COALESCE(ended_at, now()),
      updated_at = now()
  WHERE project_id = :projectId
    AND promotion_id = :promotionId
    AND status <> 'stopped'
  RETURNING promotion_run_id
),
stopped_experiments AS (
  UPDATE ad_experiments
  SET status = 'stopped',
      ended_at = COALESCE(ended_at, now()),
      updated_at = now()
  WHERE project_id = :projectId
    AND promotion_id = :promotionId
    AND status <> 'stopped'
  RETURNING ad_experiment_id
)
SELECT promotion_id AS "promotionId", status
FROM stopped_promotion;

/* 목적: 캠페인 프로모션에 연결된 세그먼트 목록을 조회합니다. */
/* @name ListDashboardCampaignSegments */
SELECT
  pts.analysis_id AS "analysisId",
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
  CAST(sd.sample_ratio AS float8) AS "sampleRatio",
  p.goal_metric AS "goalMetric",
  CAST(MAX(pe.actual_value) AS float8) AS "latestActualValue",
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
LEFT JOIN segment_definitions sd
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
  AND pts.status <> 'stopped'
GROUP BY
  pts.analysis_id,
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
  pts.analysis_id AS "analysisId",
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
  CAST(sd.sample_ratio AS float8) AS "sampleRatio",
  p.goal_metric AS "goalMetric",
  CAST(MAX(pe.actual_value) AS float8) AS "latestActualValue",
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
LEFT JOIN segment_definitions sd
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
  AND pts.status <> 'stopped'
GROUP BY
  pts.analysis_id,
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
  pts.analysis_id AS "analysisId",
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
  CAST(sd.sample_ratio AS float8) AS "sampleRatio",
  p.goal_metric AS "goalMetric",
  CAST(MAX(pe.actual_value) AS float8) AS "latestActualValue",
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
LEFT JOIN segment_definitions sd
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
  AND pts.status <> 'stopped'

GROUP BY
  pts.analysis_id,
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
ORDER BY pts.created_at DESC
LIMIT 1;

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

/* 목적: 프로모션에 종속된 사용자 추가 세그먼트 후보를 조회합니다. */
/* @name ListDashboardPromotionScopedSegmentDefinitions */
SELECT
  segment_id AS "segmentId",
  campaign_id AS "campaignId",
  promotion_id AS "promotionId",
  segment_name AS "segmentName",
  source,
  query_preview_id AS "queryPreviewId",
  natural_language_query AS "naturalLanguageQuery",
  generated_sql AS "generatedSql",
  rule_json AS "ruleJson",
  profile_json AS "profileJson",
  sample_size AS "sampleSize",
  total_eligible_user_count AS "totalEligibleUserCount",
  CAST(sample_ratio AS float8) AS "sampleRatio",
  status
FROM segment_definitions
WHERE project_id = :projectId
  AND promotion_id = :promotionId
  AND source IN ('custom_chatkit', 'manual_rule')
  AND status = 'active'
ORDER BY created_at DESC;

/* 목적: 프로모션에 종속된 사용자 추가 세그먼트 후보를 보관 처리합니다. */
/* @name ArchiveDashboardPromotionScopedSegmentDefinition */
UPDATE segment_definitions
SET status = 'archived',
    updated_at = now()
WHERE project_id = :projectId
  AND promotion_id = :promotionId
  AND segment_id = :segmentId
  AND source IN ('custom_chatkit', 'manual_rule')
  AND status = 'active'
RETURNING promotion_id AS "promotionId", segment_id AS "segmentId", status;

/* 목적: ChatKit/SQL preview로 만든 세그먼트를 프로모션 종속 후보로 저장합니다. */
/* @name InsertDashboardPromotionCustomSegmentDefinition */
INSERT INTO segment_definitions (
  segment_id,
  project_id,
  campaign_id,
  promotion_id,
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
SELECT
  :segmentId,
  sqp.project_id,
  :campaignId,
  :promotionId,
  :segmentName,
  'custom_chatkit',
  sqp.query_preview_id,
  sqp.natural_language_query,
  sqp.generated_sql,
  '{}'::jsonb,
  '{}'::jsonb,
  sqp.sample_size,
  sqp.total_eligible_user_count,
  sqp.sample_ratio,
  'active'
FROM segment_query_previews sqp
WHERE sqp.project_id = :projectId
  AND sqp.query_preview_id = :queryPreviewId
  AND sqp.sample_size_status = 'valid'
  AND sqp.status = 'previewed'
RETURNING
  segment_id AS "segmentId",
  campaign_id AS "campaignId",
  promotion_id AS "promotionId",
  segment_name AS "segmentName",
  source,
  query_preview_id AS "queryPreviewId",
  natural_language_query AS "naturalLanguageQuery",
  generated_sql AS "generatedSql",
  rule_json AS "ruleJson",
  profile_json AS "profileJson",
  sample_size AS "sampleSize",
  total_eligible_user_count AS "totalEligibleUserCount",
  CAST(sample_ratio AS float8) AS "sampleRatio",
  status;

/* 목적: 수동 rule 세그먼트를 프로모션 종속 후보로 저장합니다. */
/* @name InsertDashboardPromotionManualSegmentDefinition */
INSERT INTO segment_definitions (
  segment_id,
  project_id,
  campaign_id,
  promotion_id,
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
  :campaignId,
  :promotionId,
  :segmentName,
  'manual_rule',
  NULL,
  :naturalLanguageQuery,
  NULL,
  :ruleJson,
  :profileJson,
  :sampleSize,
  :totalEligibleUserCount,
  :sampleRatio,
  'active'
)
RETURNING
  segment_id AS "segmentId",
  campaign_id AS "campaignId",
  promotion_id AS "promotionId",
  segment_name AS "segmentName",
  source,
  query_preview_id AS "queryPreviewId",
  natural_language_query AS "naturalLanguageQuery",
  generated_sql AS "generatedSql",
  rule_json AS "ruleJson",
  profile_json AS "profileJson",
  sample_size AS "sampleSize",
  total_eligible_user_count AS "totalEligibleUserCount",
  CAST(sample_ratio AS float8) AS "sampleRatio",
  status;

/* 목적: AI가 제안한 프로모션 세그먼트 후보를 확정 전 상태로 조회합니다. */
/* @name ListDashboardPromotionSegmentSuggestions */
SELECT
  pss.suggestion_id AS "suggestionId",
  pss.analysis_id AS "analysisId",
  pss.campaign_id AS "campaignId",
  pss.promotion_id AS "promotionId",
  pss.segment_id AS "segmentId",
  pss.suggested_rank AS "suggestedRank",
  pss.suggestion_source AS "suggestionSource",
  pss.status AS "suggestionStatus",
  pss.score_json AS "scoreJson",
  pss.reason_json AS "reasonJson",
  pss.metadata_json AS "metadataJson",
  sd.segment_name AS "segmentName",
  sd.source AS "segmentSource",
  sd.rule_json AS "ruleJson",
  sd.profile_json AS "profileJson",
  sd.sample_size AS "sampleSize",
  CAST(sd.sample_ratio AS float8) AS "sampleRatio",
  pss.created_at AS "createdAt",
  pss.updated_at AS "updatedAt",
  pss.decided_at AS "decidedAt"
FROM promotion_segment_suggestions pss
JOIN segment_definitions sd
  ON sd.segment_id = pss.segment_id
WHERE pss.project_id = :projectId
  AND pss.promotion_id = :promotionId
  AND (:analysisId::varchar IS NULL OR pss.analysis_id = :analysisId)
ORDER BY pss.analysis_id DESC, pss.suggested_rank ASC, pss.created_at ASC;

/* 목적: 추천 세그먼트 후보를 확정 대상으로 표시하거나 후보 row를 삭제합니다. */
/* @name DecideDashboardPromotionSegmentSuggestion */
WITH accepted AS (
  UPDATE promotion_segment_suggestions
  SET status = :status,
      decided_at = now(),
      updated_at = now()
  WHERE project_id = :projectId
    AND promotion_id = :promotionId
    AND suggestion_id = :suggestionId
    AND :status = 'accepted'
    AND status IN ('suggested', 'accepted', 'dismissed')
  RETURNING *, status AS result_status
),
deleted AS (
  DELETE FROM promotion_segment_suggestions
  WHERE project_id = :projectId
    AND promotion_id = :promotionId
    AND suggestion_id = :suggestionId
    AND :status = 'dismissed'
    AND status IN ('suggested', 'accepted', 'dismissed')
  RETURNING *, 'dismissed'::varchar AS result_status
),
decided AS (
  SELECT * FROM accepted
  UNION ALL
  SELECT * FROM deleted
)
SELECT
  d.suggestion_id AS "suggestionId",
  d.analysis_id AS "analysisId",
  d.campaign_id AS "campaignId",
  d.promotion_id AS "promotionId",
  d.segment_id AS "segmentId",
  d.suggested_rank AS "suggestedRank",
  d.suggestion_source AS "suggestionSource",
  d.result_status AS "suggestionStatus",
  d.score_json AS "scoreJson",
  d.reason_json AS "reasonJson",
  d.metadata_json AS "metadataJson",
  sd.segment_name AS "segmentName",
  sd.source AS "segmentSource",
  sd.rule_json AS "ruleJson",
  sd.profile_json AS "profileJson",
  sd.sample_size AS "sampleSize",
  CAST(sd.sample_ratio AS float8) AS "sampleRatio",
  d.created_at AS "createdAt",
  d.updated_at AS "updatedAt",
  d.decided_at AS "decidedAt"
FROM decided d
JOIN segment_definitions sd
  ON sd.segment_id = d.segment_id;

/* 목적: 수락된 추천 후보와 사용자 추가 후보를 프로모션의 최종 타겟 세그먼트로 확정합니다. */
/* @name ConfirmDashboardPromotionSegmentSuggestions */
WITH accepted_suggestions AS (
  SELECT
    pss.analysis_id,
    pss.project_id,
    pss.campaign_id,
    pss.promotion_id,
    sd.segment_id,
    sd.segment_name,
    sd.rule_json,
    sd.profile_json,
    sd.sample_size,
    pss.suggestion_id,
    jsonb_build_object(
      'source', sd.source,
      'suggestion_id', pss.suggestion_id,
      'score', pss.score_json,
      'reason', pss.reason_json,
      'display_copy', pss.metadata_json->'display_copy',
      'sample_size', sd.sample_size,
      'sample_ratio', sd.sample_ratio
    ) AS data_evidence_json
  FROM promotion_segment_suggestions pss
  JOIN segment_definitions sd
    ON sd.segment_id = pss.segment_id
  WHERE pss.project_id = :projectId
    AND pss.promotion_id = :promotionId
    AND pss.status = 'accepted'
),
manual_segments AS (
  SELECT
    (:manualAnalysisId)::varchar AS analysis_id,
    sd.project_id,
    sd.campaign_id,
    sd.promotion_id,
    sd.segment_id,
    sd.segment_name,
    sd.rule_json,
    sd.profile_json,
    sd.sample_size,
    NULL::varchar AS suggestion_id,
    jsonb_build_object(
      'source', sd.source,
      'query_preview_id', sd.query_preview_id,
      'sample_size', sd.sample_size,
      'sample_ratio', sd.sample_ratio
    ) AS data_evidence_json
  FROM segment_definitions sd
  WHERE sd.project_id = :projectId
    AND sd.promotion_id = :promotionId
    AND sd.source IN ('custom_chatkit', 'manual_rule')
    AND sd.status = 'active'
),
confirmed AS (
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
    status,
    suggestion_id,
    confirmed_by,
    confirmed_at
  )
  SELECT
    selected.analysis_id,
    selected.project_id,
    selected.campaign_id,
    selected.promotion_id,
    selected.segment_id,
    selected.segment_name,
    selected.rule_json,
    selected.profile_json,
    '{}'::jsonb,
    selected.data_evidence_json,
    selected.sample_size,
    NULL,
    'planned',
    selected.suggestion_id,
    :confirmedBy,
    now()
  FROM (
    SELECT * FROM accepted_suggestions
    UNION ALL
    SELECT * FROM manual_segments
  ) selected
  ON CONFLICT (analysis_id, segment_id) DO UPDATE
  SET
    suggestion_id = EXCLUDED.suggestion_id,
    confirmed_by = EXCLUDED.confirmed_by,
    confirmed_at = EXCLUDED.confirmed_at,
    status = CASE
      WHEN promotion_target_segments.status = 'stopped' THEN 'planned'
      ELSE promotion_target_segments.status
    END
  RETURNING promotion_id AS "promotionId", segment_id AS "segmentId", suggestion_id AS "suggestionId"
),
updated AS (
  UPDATE promotion_segment_suggestions pss
  SET status = 'confirmed',
      decided_at = COALESCE(pss.decided_at, now()),
      updated_at = now()
  WHERE pss.project_id = :projectId
    AND pss.promotion_id = :promotionId
    AND EXISTS (
      SELECT 1
      FROM confirmed c
      WHERE c."suggestionId" = pss.suggestion_id
    )
  RETURNING pss.suggestion_id
)
SELECT
  (:promotionId)::varchar AS "promotionId",
  COUNT(*)::int AS "confirmedSegmentCount"
FROM confirmed;

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

/* 목적: 프로모션 세그먼트와 하위 실험 실행 단위를 물리 삭제합니다. */
/* @name StopDashboardPromotionTargetSegment */
WITH target_segment AS (
  SELECT project_id, promotion_id, segment_id
  FROM promotion_target_segments
  WHERE project_id = :projectId
    AND promotion_id = :promotionId
    AND segment_id = :segmentId
),
deleted_dispatch_jobs AS (
  DELETE FROM ad_dispatch_jobs adj
  USING target_segment target
  WHERE adj.project_id = target.project_id
    AND adj.promotion_id = target.promotion_id
    AND adj.ad_experiment_id IN (
      SELECT ae.ad_experiment_id
      FROM ad_experiments ae
      WHERE ae.project_id = target.project_id
        AND ae.promotion_id = target.promotion_id
        AND ae.segment_id = target.segment_id
    )
  RETURNING adj.ad_dispatch_job_id
),
deleted_promotion_evaluations AS (
  DELETE FROM promotion_evaluations pe
  USING target_segment target,
        (SELECT count(*) FROM deleted_dispatch_jobs) dependency
  WHERE pe.project_id = target.project_id
    AND pe.promotion_id = target.promotion_id
    AND pe.segment_id = target.segment_id
  RETURNING pe.promotion_run_id
),
deleted_ad_experiments AS (
  DELETE FROM ad_experiments ae
  USING target_segment target,
        (SELECT count(*) FROM deleted_promotion_evaluations) dependency
  WHERE ae.project_id = target.project_id
    AND ae.promotion_id = target.promotion_id
    AND ae.segment_id = target.segment_id
  RETURNING ae.ad_experiment_id
),
deleted_content_candidates AS (
  DELETE FROM content_candidates cc
  USING target_segment target,
        (SELECT count(*) FROM deleted_ad_experiments) dependency
  WHERE cc.project_id = target.project_id
    AND cc.promotion_id = target.promotion_id
    AND cc.segment_id = target.segment_id
  RETURNING cc.content_id
),
deleted_target_segment AS (
  DELETE FROM promotion_target_segments pts
  USING target_segment target,
        (SELECT count(*) FROM deleted_content_candidates) dependency
  WHERE pts.project_id = target.project_id
    AND pts.promotion_id = target.promotion_id
    AND pts.segment_id = target.segment_id
  RETURNING pts.promotion_id, pts.segment_id, 'stopped'::text AS status
)
SELECT promotion_id AS "promotionId", segment_id AS "segmentId", status
FROM deleted_target_segment;

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

/* 목적: 프로모션 상세에서 분석 요청과 결과 상태를 최신순으로 조회합니다. */
/* @name ListDashboardPromotionAnalyses */
SELECT
  analysis_id AS "analysisId",
  promotion_id AS "promotionId",
  focus_segment_ids_json AS "focusSegmentIdsJson",
  operator_instruction AS "operatorInstruction",
  input_snapshot_json AS "inputSnapshotJson",
  profile_summary_json AS "profileSummaryJson",
  output_json AS "outputJson",
  status,
  created_at AS "createdAt",
  updated_at AS "updatedAt"
FROM promotion_analyses
WHERE project_id = :projectId
  AND promotion_id = :promotionId

ORDER BY updated_at DESC, created_at DESC;

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
  CAST(target_value AS float8) AS "targetValue",
  CAST(actual_value AS float8) AS "actualValue",
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
  CAST(target_value AS float8) AS "targetValue",
  CAST(actual_value AS float8) AS "actualValue",
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
  CAST(target_value AS float8) AS "targetValue",
  CAST(actual_value AS float8) AS "actualValue",
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

/* 목적: 캠페인에서 생성된 광고 후보를 조회합니다. */
/* @name ListDashboardCampaignContentCandidates */
SELECT
  content_id AS "contentId",
  content_option_id AS "contentOptionId",
  generation_id AS "generationId",
  analysis_id AS "analysisId",
  promotion_id AS "promotionId",
  segment_id AS "segmentId",
  channel,
  subject,
  preheader,
  title,
  body,
  cta,
  message,
  image_prompt AS "imagePrompt",
  image_url AS "imageUrl",
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
  AND campaign_id = :campaignId

ORDER BY updated_at DESC, created_at DESC;

/* 목적: 특정 세그먼트의 생성 콘텐츠 후보를 조회합니다. */
/* @name ListDashboardSegmentContentCandidates */
SELECT
  content_id AS "contentId",
  content_option_id AS "contentOptionId",
  generation_id AS "generationId",
  analysis_id AS "analysisId",
  promotion_id AS "promotionId",
  segment_id AS "segmentId",
  channel,
  subject,
  preheader,
  title,
  body,
  cta,
  message,
  image_prompt AS "imagePrompt",
  image_url AS "imageUrl",
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

/* 목적: 동일 analysis/proposition의 기존 광고 생성 결과를 조회합니다. */
/* @name GetDashboardPromotionGenerationResult */
SELECT
  gr.generation_id AS "generationId",
  gr.promotion_id AS "promotionId",
  gr.status,
  COUNT(cc.content_id)::int AS "contentCandidateCount"
FROM generation_runs gr
LEFT JOIN content_candidates cc
  ON cc.project_id = gr.project_id
 AND cc.generation_id = gr.generation_id
WHERE gr.project_id = :projectId
  AND gr.promotion_id = :promotionId
  AND gr.analysis_id = :analysisId

GROUP BY gr.generation_id, gr.promotion_id, gr.status, gr.updated_at, gr.created_at
ORDER BY gr.updated_at DESC, gr.created_at DESC
LIMIT 1;

/* 목적: 캠페인에서 생성된 광고 실험 상태를 조회합니다. */
/* @name ListDashboardCampaignAdExperiments */
SELECT
  ae.ad_experiment_id AS "adExperimentId",
  ae.promotion_run_id AS "promotionRunId",
  ae.promotion_id AS "promotionId",
  ae.segment_id AS "segmentId",
  ae.content_id AS "contentId",
  ae.content_option_id AS "contentOptionId",
  ae.channel,
  ae.loop_count AS "loopCount",
  ae.goal_metric AS "goalMetric",
  CAST(ae.goal_target_value AS float8) AS "goalTargetValue",
  ae.goal_basis AS "goalBasis",
  ae.status,
  COUNT(usa.user_id)::int AS "assignmentCount"
FROM ad_experiments ae
LEFT JOIN user_segment_assignments usa
  ON usa.project_id = ae.project_id
 AND usa.promotion_run_id = ae.promotion_run_id
 AND usa.ad_experiment_id = ae.ad_experiment_id
WHERE ae.project_id = :projectId
  AND ae.campaign_id = :campaignId
GROUP BY
  ae.ad_experiment_id,
  ae.promotion_run_id,
  ae.promotion_id,
  ae.segment_id,
  ae.content_id,
  ae.content_option_id,
  ae.channel,
  ae.loop_count,
  ae.goal_metric,
  ae.goal_target_value,
  ae.goal_basis,
  ae.status,
  ae.updated_at,
  ae.created_at
ORDER BY ae.loop_count DESC, ae.updated_at DESC, ae.created_at DESC;

/* 목적: 특정 세그먼트에서 생성된 광고 실험 상태를 조회합니다. */
/* @name ListDashboardSegmentAdExperiments */
SELECT
  ae.ad_experiment_id AS "adExperimentId",
  ae.promotion_run_id AS "promotionRunId",
  ae.promotion_id AS "promotionId",
  ae.segment_id AS "segmentId",
  ae.content_id AS "contentId",
  ae.content_option_id AS "contentOptionId",
  ae.channel,
  ae.loop_count AS "loopCount",
  ae.goal_metric AS "goalMetric",
  CAST(ae.goal_target_value AS float8) AS "goalTargetValue",
  ae.goal_basis AS "goalBasis",
  ae.status,
  COUNT(usa.user_id)::int AS "assignmentCount"
FROM ad_experiments ae
LEFT JOIN user_segment_assignments usa
  ON usa.project_id = ae.project_id
 AND usa.promotion_run_id = ae.promotion_run_id
 AND usa.ad_experiment_id = ae.ad_experiment_id
WHERE ae.project_id = :projectId
  AND ae.promotion_id = :promotionId
  AND ae.segment_id = :segmentId
GROUP BY
  ae.ad_experiment_id,
  ae.promotion_run_id,
  ae.promotion_id,
  ae.segment_id,
  ae.content_id,
  ae.content_option_id,
  ae.channel,
  ae.loop_count,
  ae.goal_metric,
  ae.goal_target_value,
  ae.goal_basis,
  ae.status,
  ae.updated_at,
  ae.created_at

ORDER BY ae.loop_count DESC, ae.updated_at DESC, ae.created_at DESC;

/* 목적: 관리자가 승인/계획 상태 광고 실험을 명시적으로 실행 시작 상태로 전환합니다. */
/* @name StartDashboardAdExperiment */
UPDATE ad_experiments
SET status = 'running',
    started_at = COALESCE(started_at, now()),
    updated_at = now()
WHERE project_id = :projectId
  AND promotion_id = :promotionId
  AND ad_experiment_id = :adExperimentId
  AND status IN ('planned', 'approved', 'running')
RETURNING
  ad_experiment_id AS "adExperimentId",
  promotion_run_id AS "promotionRunId",
  promotion_id AS "promotionId",
  segment_id AS "segmentId",
  content_id AS "contentId",
  content_option_id AS "contentOptionId",
  channel,
  loop_count AS "loopCount",
  goal_metric AS "goalMetric",
  CAST(goal_target_value AS float8) AS "goalTargetValue",
  goal_basis AS "goalBasis",
  status;

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
  CAST(p.goal_target_value AS float8) AS "goalTargetValue",
  p.goal_basis AS "goalBasis",
  cc.status AS "contentStatus"
FROM content_candidates cc
JOIN promotions p
  ON p.project_id = cc.project_id
 AND p.campaign_id = cc.campaign_id
 AND p.promotion_id = cc.promotion_id
LEFT JOIN segment_definitions sd
  ON sd.project_id = cc.project_id
 AND sd.segment_id = cc.segment_id
JOIN promotion_target_segments pts
  ON pts.project_id = cc.project_id
 AND pts.campaign_id = cc.campaign_id
 AND pts.promotion_id = cc.promotion_id
 AND pts.segment_id = cc.segment_id
 AND pts.analysis_id = cc.analysis_id
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
  ON pts.project_id = p.project_id
 AND pts.campaign_id = p.campaign_id
 AND pts.promotion_id = p.promotion_id
WHERE cc.project_id = :projectId
  AND cc.promotion_id = :promotionId
  AND cc.segment_id = :segmentId
  AND cc.content_id = :contentId
  AND p.project_id = cc.project_id
  AND p.campaign_id = cc.campaign_id
  AND p.promotion_id = cc.promotion_id
  AND pts.analysis_id = cc.analysis_id
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
  CAST(sample_ratio AS float8) AS "sampleRatio",
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
  CAST(sample_ratio AS float8) AS "sampleRatio",
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
  CAST(sample_ratio AS float8) AS "sampleRatio",
  status;

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
