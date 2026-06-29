/* Purpose: List recommendation result rows for dashboard recommendation and content views. */
/* @name ListRecommendationRows */
SELECT
  rr.id::text AS "recommendationId",
  rr.segment_hash AS "segmentId",
  rr.summary_message AS title,
  COALESCE(ra.rationale, rr.root_causes_json::text) AS reason,
  rr.status,
  rr.created_at AS "createdAt",
  ra.action_id AS "actionId",
  ra.action_type AS "actionType",
  COALESCE(ra.title, ac.title, ra.action_id) AS "actionName",
  COALESCE(ra.description, ac.description, '') AS description,
  adc.id::text AS "contentId",
  adc.image_url AS "contentUrl",
  adc.created_at AS "contentCreatedAt"
FROM recommendation_results rr
LEFT JOIN recommendation_actions ra
  ON ra.recommendation_result_id = rr.id
LEFT JOIN action_catalog ac
  ON ac.action_id = ra.action_id
LEFT JOIN segment_ad_mappings sam
  ON sam.recommendation_action_id = ra.id
LEFT JOIN ad_creatives adc
  ON adc.id = sam.creative_id
WHERE rr.project_id = :projectId
  AND (:recommendationResultId::text IS NULL OR rr.id::text = :recommendationResultId)
ORDER BY rr.created_at DESC, ra.created_at ASC;

/* Purpose: Read one experiment for dashboard experiment detail and performance views. */
/* @name GetExperiment */
SELECT
  e.id::text AS "experimentId",
  e.project_id AS "projectId",
  e.segment_hash AS "segmentId",
  e.segment_hash AS "segmentHash",
  e.recommendation_result_id::text AS "recommendationId",
  e.recommendation_action_id::text AS "recommendationActionId",
  e.bandit_policy_id::text AS "banditPolicyId",
  e.bandit_arm_id::text AS "banditArmId",
  e.action_id AS "actionId",
  e.action_type AS "actionType",
  e.status,
  e.primary_metric AS "goalMetric",
  e.started_at AS "startedAt",
  e.ended_at AS "endedAt",
  e.created_at AS "createdAt"
FROM experiments e
WHERE e.project_id = :projectId
  AND e.id::text = :experimentId;

/* Purpose: List action probability rows for a bandit policy. */
/* @name ListExperimentActionProbabilities */
WITH arm_scores AS (
  SELECT
    ba.action_id AS "actionId",
    COALESCE(ac.title, ba.action_id) AS "actionName",
    ba.alpha / NULLIF(ba.alpha + ba.beta, 0) AS score,
    ba.impressions,
    0::bigint AS clicks,
    ba.conversions AS purchases,
    ba.updated_at AS "updatedAt"
  FROM bandit_arms ba
  LEFT JOIN action_catalog ac
    ON ac.action_id = ba.action_id
  WHERE ba.bandit_policy_id::text = :banditPolicyId
    AND ba.status = 'active'
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
