/* 목적: 메인 대시보드에 표시할 캠페인 요약 목록을 조회합니다. */
/* @name ListDashboardCampaignSummaries */
SELECT
  c.campaign_id AS "campaignId",
  c.name AS "campaignName",
  c.objective,
  c.primary_metric AS "primaryMetric",
  c.status,
  c.start_date AS "startDate",
  c.end_date AS "endDate",
  COUNT(DISTINCT p.promotion_id)::int AS "promotionCount",
  COUNT(DISTINCT pts.segment_id)::int AS "segmentCount",
  COUNT(DISTINCT ae.ad_experiment_id)::int AS "adExperimentCount",
  MAX(pe.actual_value)::float8 AS "latestGoalAchievementRate",
  c.updated_at AS "updatedAt"
FROM campaigns c
LEFT JOIN promotions p
  ON p.campaign_id = c.campaign_id
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
  c.primary_metric AS "primaryMetric",
  c.status,
  c.start_date AS "startDate",
  c.end_date AS "endDate",
  COUNT(DISTINCT p.promotion_id)::int AS "promotionCount",
  COUNT(DISTINCT pts.segment_id)::int AS "segmentCount",
  COUNT(DISTINCT ae.ad_experiment_id)::int AS "adExperimentCount",
  MAX(pe.actual_value)::float8 AS "latestGoalAchievementRate",
  c.updated_at AS "updatedAt"
FROM campaigns c
LEFT JOIN promotions p
  ON p.campaign_id = c.campaign_id
LEFT JOIN promotion_target_segments pts
  ON pts.campaign_id = c.campaign_id
LEFT JOIN ad_experiments ae
  ON ae.campaign_id = c.campaign_id
LEFT JOIN promotion_evaluations pe
  ON pe.campaign_id = c.campaign_id
WHERE c.project_id = :projectId
  AND c.campaign_id = :campaignId
GROUP BY c.campaign_id;

/* 목적: 캠페인에 연결된 프로모션 요약 목록을 조회합니다. */
/* @name ListDashboardCampaignPromotions */
SELECT
  p.promotion_id AS "promotionId",
  p.channel,
  p.marketing_theme AS "marketingTheme",
  p.goal_metric AS "goalMetric",
  p.goal_target_value::float8 AS "goalTargetValue",
  p.goal_basis AS "goalBasis",
  p.status,
  COUNT(DISTINCT pts.segment_id)::int AS "targetSegmentCount",
  COUNT(DISTINCT ae.ad_experiment_id)::int AS "adExperimentCount",
  MAX(pe.actual_value)::float8 AS "latestActualValue",
  p.updated_at AS "updatedAt"
FROM promotions p
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

/* 목적: 캠페인 프로모션에 연결된 세그먼트 목록을 조회합니다. */
/* @name ListDashboardCampaignSegments */
SELECT
  promotion_id AS "promotionId",
  segment_id AS "segmentId",
  segment_name AS "segmentName",
  estimated_size AS "estimatedSize",
  priority,
  status
FROM promotion_target_segments
WHERE project_id = :projectId
  AND campaign_id = :campaignId
ORDER BY promotion_id ASC, created_at DESC;

/* 목적: 캠페인 프로모션 실험 지표 목록을 조회합니다. */
/* @name ListDashboardCampaignExperimentMetrics */
SELECT
  promotion_id AS "promotionId",
  ad_experiment_id AS "adExperimentId",
  segment_id AS "segmentId",
  metric,
  target_value::float8 AS "targetValue",
  actual_value::float8 AS "actualValue",
  numerator_count AS "numeratorCount",
  denominator_count AS "denominatorCount",
  sample_size AS "sampleSize",
  status,
  created_at AS "createdAt"
FROM promotion_evaluations
WHERE project_id = :projectId
  AND campaign_id = :campaignId
ORDER BY created_at DESC;

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
