/* Purpose: Resolve a public project key to the internal project id used by contract DB tables. */
/* @name GetAdProject */
SELECT
  id::text AS "projectDbId",
  project_key AS "projectId"
FROM projects
WHERE project_key = :projectId;

/* Purpose: Read the latest primary segment for a user in a project. */
/* @name GetLatestPrimarySegment */
SELECT
  segment_id::text AS "segmentDbId"
FROM latest_user_primary_segments
WHERE project_id = :projectDbId::bigint
  AND external_user_id = :userId
LIMIT 1;

/* Purpose: Read the active default segment used when a user has no primary segment. */
/* @name GetDefaultSegment */
SELECT
  id::text AS "segmentDbId"
FROM segments
WHERE project_id = :projectDbId::bigint
  AND is_default = true
  AND status = 'active'
ORDER BY created_at ASC
LIMIT 1;

/* Purpose: List active serving candidates for one segment and placement. */
/* @name ListAdServingCandidates */
SELECT
  m.id::text AS "mappingId",
  m.placement_key AS "placementKey",
  m.priority,
  m.traffic_weight::float8 AS "trafficWeight",
  COALESCE(e.id::text, '') AS "experimentId",
  COALESCE(ev.id::text, '') AS "variantId",
  c.id::text AS "creativeId",
  c.content_type AS "contentType",
  c.title,
  COALESCE(c.body, '') AS body,
  COALESCE(c.cta_label, '') AS "ctaLabel",
  COALESCE(c.image_url, '') AS "imageUrl",
  COALESCE(c.landing_url, '') AS "landingUrl",
  COALESCE(ra.id::text, '') AS "actionId"
FROM segment_ad_mappings m
LEFT JOIN experiment_variants ev
  ON ev.id = m.experiment_variant_id
LEFT JOIN experiments e
  ON e.id = COALESCE(m.experiment_id, ev.experiment_id)
JOIN generated_contents c
  ON c.id = COALESCE(m.generated_content_id, ev.generated_content_id)
LEFT JOIN recommendation_actions ra
  ON ra.id = COALESCE(e.recommendation_action_id, c.recommendation_action_id)
WHERE m.project_id = :projectDbId::bigint
  AND m.segment_id = :segmentDbId::bigint
  AND m.placement_key = :placementKey
  AND m.is_active = true
  AND now() >= m.valid_from
  AND (m.valid_until IS NULL OR now() < m.valid_until)
  AND c.generation_status IN ('generated', 'approved')
ORDER BY m.priority DESC, m.id ASC;
