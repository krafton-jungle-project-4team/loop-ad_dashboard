/* Purpose: List recommendation result rows for dashboard recommendation and content views. */
/* @name ListRecommendationRows */
SELECT
  rr.id::text AS "recommendationId",
  s.segment_key AS "segmentId",
  rr.summary AS title,
  COALESCE(rc.description, rr.recommendation_json::text) AS reason,
  rr.status,
  rr.created_at AS "createdAt",
  ra.action_key AS "actionId",
  COALESCE(ac.default_channel, 'banner') AS "actionType",
  COALESCE(ra.title, ac.name, ra.action_key) AS "actionName",
  COALESCE(ra.description, ac.description, '') AS description,
  gc.id::text AS "contentId",
  COALESCE(gc.image_url, gc.landing_url) AS "contentUrl",
  gc.created_at AS "contentCreatedAt"
FROM recommendation_results rr
JOIN projects p
  ON p.id = rr.project_id
JOIN segments s
  ON s.id = rr.segment_id
LEFT JOIN recommendation_actions ra
  ON ra.recommendation_result_id = rr.id
LEFT JOIN action_catalog ac
  ON ac.id = ra.action_catalog_id
LEFT JOIN root_cause_candidates rc
  ON rc.id = rr.primary_root_cause_id
LEFT JOIN LATERAL (
  SELECT c.*
  FROM generated_contents c
  WHERE c.recommendation_action_id = ra.id
  ORDER BY
    CASE WHEN c.variant_key <> 'control' THEN 0 ELSE 1 END,
    c.created_at DESC
  LIMIT 1
) gc ON true
WHERE p.project_key = :projectId
  AND (:recommendationResultId::text IS NULL OR rr.id::text = :recommendationResultId)
ORDER BY rr.created_at DESC, ra.created_at ASC;

/* Purpose: Read recommendation context rows for AI analysis, recommendation, and generation views. */
/* @name ListRecommendationContexts */
SELECT
  rr.id::text AS recommendation_result_id,
  s.segment_key AS segment_key,
  s.rule_json AS segment_json,
  rr.status,
  COALESCE(
    jsonb_build_object(
      'expected_conversion_rate', sa.expected_value,
      'target_conversion_rate', sa.target_value,
      'severity', sa.severity,
      'hypothesis', sa.evidence_json ->> 'hypothesis'
    ),
    '{}'::jsonb
  ) AS anomaly_json,
  COALESCE(
    jsonb_build_object(
      'title', rc.title,
      'description', rc.description
    ),
    '{}'::jsonb
  ) AS root_causes_json,
  rr.summary AS summary_message,
  rr.created_at,
  ra.action_key AS action_id,
  COALESCE(ac.default_channel, 'banner') AS action_type,
  COALESCE(ra.title, ac.name, ra.action_key) AS action_title,
  COALESCE(ra.description, ac.description, '') AS action_description,
  COALESCE(rc.description, rr.summary, '') AS action_rationale,
  ra.status AS action_status,
  gc.traffic_weight AS sampled_value,
  gc.id::text AS creative_id,
  CASE WHEN gc.image_url IS NOT NULL THEN 'image' ELSE 'copy' END AS creative_type,
  gc.title AS creative_title,
  gc.body AS creative_message,
  gc.image_url,
  gc.landing_url,
  gc.generation_status AS creative_status,
  gc.created_at AS creative_created_at
FROM recommendation_results rr
JOIN projects p
  ON p.id = rr.project_id
JOIN segments s
  ON s.id = rr.segment_id
LEFT JOIN segment_anomalies sa
  ON sa.id = rr.anomaly_id
LEFT JOIN root_cause_candidates rc
  ON rc.id = rr.primary_root_cause_id
LEFT JOIN recommendation_actions ra
  ON ra.recommendation_result_id = rr.id
LEFT JOIN action_catalog ac
  ON ac.id = ra.action_catalog_id
LEFT JOIN LATERAL (
  SELECT
    c.*,
    COALESCE(ev.traffic_weight, 1.0) AS traffic_weight
  FROM generated_contents c
  LEFT JOIN experiment_variants ev
    ON ev.generated_content_id = c.id
  WHERE c.recommendation_action_id = ra.id
  ORDER BY
    CASE WHEN c.variant_key <> 'control' THEN 0 ELSE 1 END,
    c.created_at DESC
  LIMIT 1
) gc ON true
WHERE p.project_key = :projectId
ORDER BY rr.created_at DESC, ra.priority ASC, ra.created_at ASC;

/* Purpose: Read one experiment for dashboard experiment detail and performance views. */
/* @name GetExperiment */
SELECT
  e.id::text AS "experimentId",
  p.project_key AS "projectId",
  s.segment_key AS "segmentId",
  s.segment_key AS "segmentKey",
  rr.id::text AS "recommendationId",
  e.recommendation_action_id::text AS "recommendationActionId",
  e.id::text AS "banditPolicyId",
  NULL::text AS "banditArmId",
  ra.action_key AS "actionId",
  COALESCE(ac.default_channel, 'banner') AS "actionType",
  e.status,
  e.objective_metric AS "goalMetric",
  e.start_date::timestamptz AS "startedAt",
  e.end_date::timestamptz AS "endedAt",
  e.created_at AS "createdAt"
FROM experiments e
JOIN projects p
  ON p.id = e.project_id
JOIN segments s
  ON s.id = e.segment_id
LEFT JOIN recommendation_actions ra
  ON ra.id = e.recommendation_action_id
LEFT JOIN recommendation_results rr
  ON rr.id = ra.recommendation_result_id
LEFT JOIN action_catalog ac
  ON ac.id = ra.action_catalog_id
WHERE p.project_key = :projectId
  AND e.id::text = :experimentId;

/* Purpose: List action probability rows for a bandit policy. */
/* @name ListExperimentActionProbabilities */
WITH arm_scores AS (
  SELECT
    ev.variant_key AS "actionId",
    ev.name AS "actionName",
    ev.alpha / NULLIF(ev.alpha + ev.beta, 0) AS score,
    ev.impression_count AS impressions,
    ev.click_count AS clicks,
    ev.conversion_count AS purchases,
    ev.updated_at AS "updatedAt"
  FROM experiment_variants ev
  WHERE ev.experiment_id::text = :banditPolicyId
    AND ev.status = 'active'
)
SELECT
  "actionId",
  "actionName",
  CASE
    WHEN SUM(score) OVER () > 0 THEN score / SUM(score) OVER ()
    ELSE 0
  END AS probability,
  impressions,
  clicks,
  purchases,
  "updatedAt"
FROM arm_scores
ORDER BY probability DESC, "actionId" ASC;
