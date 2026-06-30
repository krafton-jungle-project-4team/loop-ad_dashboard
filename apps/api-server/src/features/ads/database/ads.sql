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
  mapping_id::text AS "mappingId",
  priority,
  traffic_weight::float8 AS "trafficWeight",
  COALESCE(experiment_id::text, '') AS "experimentId",
  COALESCE(experiment_variant_id::text, '') AS "variantId",
  generated_content_id::text AS "creativeId",
  content_type AS "contentType",
  title,
  COALESCE(body, '') AS body,
  COALESCE(cta_label, '') AS "ctaLabel",
  COALESCE(image_url, '') AS "imageUrl",
  COALESCE(landing_url, '') AS "landingUrl",
  COALESCE(action_id::text, '') AS "actionId"
FROM active_ad_serving_rules
WHERE project_id = :projectDbId::bigint
  AND segment_id = :segmentDbId::bigint
  AND placement_key = :placementKey
ORDER BY priority DESC, mapping_id ASC;
