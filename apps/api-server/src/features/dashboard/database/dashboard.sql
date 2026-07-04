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
  p.offer_type AS "offerType",
  p.landing_url AS "landingUrl",
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
  AND p.promotion_id = :promotionId
GROUP BY p.promotion_id;

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
  pts.priority,
  pts.status
FROM promotion_target_segments pts
JOIN segment_definitions sd
  ON sd.segment_id = pts.segment_id
WHERE pts.project_id = :projectId
  AND pts.campaign_id = :campaignId
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
  pts.priority,
  pts.status
FROM promotion_target_segments pts
JOIN segment_definitions sd
  ON sd.segment_id = pts.segment_id
WHERE pts.project_id = :projectId
  AND pts.promotion_id = :promotionId
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
  pts.priority,
  pts.status
FROM promotion_target_segments pts
JOIN segment_definitions sd
  ON sd.segment_id = pts.segment_id
WHERE pts.project_id = :projectId
  AND pts.promotion_id = :promotionId
  AND pts.segment_id = :segmentId;

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
