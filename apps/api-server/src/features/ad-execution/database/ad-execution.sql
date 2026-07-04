/* Purpose: Read one promotion_run entity before hot-path execution. */
/* @name FindPromotionRun */
SELECT
  promotion_run_id AS "promotionRunId",
  project_id AS "projectId",
  campaign_id AS "campaignId",
  promotion_id AS "promotionId",
  analysis_id AS "analysisId",
  generation_id AS "generationId",
  previous_promotion_run_id AS "previousPromotionRunId",
  loop_count AS "loopCount",
  operator_instruction AS "operatorInstruction",
  status,
  summary_json AS "summaryJson",
  started_at AS "startedAt",
  ended_at AS "endedAt",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
FROM promotion_runs
WHERE promotion_run_id = :promotionRunId;

/* Purpose: Read one promotion entity by primary key. */
/* @name FindPromotion */
SELECT
  promotion_id AS "promotionId",
  project_id AS "projectId",
  campaign_id AS "campaignId",
  name,
  channel,
  target_audience AS "targetAudience",
  goal_metric AS "goalMetric",
  target_value AS "targetValue",
  goal_basis AS "goalBasis",
  status,
  metadata_json AS "metadataJson",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
FROM promotions
WHERE promotion_id = :promotionId;

/* Purpose: Read one ad_experiment entity by primary key. */
/* @name FindAdExperiment */
SELECT
  ad_experiment_id AS "adExperimentId",
  project_id AS "projectId",
  campaign_id AS "campaignId",
  promotion_id AS "promotionId",
  promotion_run_id AS "promotionRunId",
  analysis_id AS "analysisId",
  generation_id AS "generationId",
  segment_id AS "segmentId",
  segment_name AS "segmentName",
  content_id AS "contentId",
  content_option_id AS "contentOptionId",
  channel,
  loop_count AS "loopCount",
  status,
  goal_metric AS "goalMetric",
  goal_target_value AS "goalTargetValue",
  goal_basis AS "goalBasis",
  started_at AS "startedAt",
  ended_at AS "endedAt",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
FROM ad_experiments
WHERE ad_experiment_id = :adExperimentId;

/* Purpose: Read precomputed active assignments for one promotion_run dispatch. */
/* @name ListActiveAdServingAssignments */
SELECT
  promotion_run_id AS "promotionRunId",
  user_id AS "userId",
  segment_id AS "segmentId",
  ad_experiment_id AS "adExperimentId",
  content_id AS "contentId",
  content_option_id AS "contentOptionId",
  fallback,
  similarity_score AS "similarityScore",
  project_id AS "projectId",
  campaign_id AS "campaignId",
  promotion_id AS "promotionId",
  channel,
  subject,
  preheader,
  title,
  body,
  cta,
  message,
  image_prompt AS "imagePrompt",
  landing_url AS "landingUrl",
  content_status AS "contentStatus",
  ad_experiment_status AS "adExperimentStatus"
FROM active_ad_serving_assignments
WHERE promotion_run_id = :promotionRunId
ORDER BY ad_experiment_id ASC, user_id ASC;

/* Purpose: Resolve one already assigned onsite banner content for one user. */
/* @name FindActiveBannerAssignment */
SELECT
  promotion_run_id AS "promotionRunId",
  user_id AS "userId",
  segment_id AS "segmentId",
  ad_experiment_id AS "adExperimentId",
  content_id AS "contentId",
  content_option_id AS "contentOptionId",
  fallback,
  similarity_score AS "similarityScore",
  project_id AS "projectId",
  campaign_id AS "campaignId",
  promotion_id AS "promotionId",
  channel,
  subject,
  preheader,
  title,
  body,
  cta,
  message,
  image_prompt AS "imagePrompt",
  landing_url AS "landingUrl",
  content_status AS "contentStatus",
  ad_experiment_status AS "adExperimentStatus"
FROM active_ad_serving_assignments
WHERE project_id = :projectId
  AND promotion_run_id = :promotionRunId
  AND user_id = :userId
  AND channel = 'onsite_banner'
LIMIT 1;

/* Purpose: Create one dispatch job for an ad_experiment group. */
/* @name InsertDispatchJob */
INSERT INTO ad_dispatch_jobs (
  dispatch_job_id,
  project_id,
  campaign_id,
  promotion_id,
  promotion_run_id,
  ad_experiment_id,
  channel,
  status,
  target_count,
  dispatched_count,
  failed_count,
  request_json,
  started_at
)
VALUES (
  :dispatchJobId,
  :projectId,
  :campaignId,
  :promotionId,
  :promotionRunId,
  :adExperimentId,
  :channel,
  'running',
  :targetCount,
  0,
  0,
  :requestJson::jsonb,
  now()
)
RETURNING
  dispatch_job_id AS "dispatchJobId";

/* Purpose: Finish one dispatch job without hiding provider failures. */
/* @name UpdateDispatchJobResult */
UPDATE ad_dispatch_jobs
SET
  status = :status,
  dispatched_count = :dispatchedCount,
  failed_count = :failedCount,
  result_json = :resultJson::jsonb,
  finished_at = now()
WHERE dispatch_job_id = :dispatchJobId
RETURNING
  dispatch_job_id AS "dispatchJobId";

/* Purpose: Create a redirect token carrying final ad-execution contract ids. */
/* @name InsertRedirectLink */
INSERT INTO redirect_links (
  redirect_link_id,
  project_id,
  campaign_id,
  promotion_id,
  promotion_run_id,
  ad_experiment_id,
  segment_id,
  user_id,
  content_id,
  content_option_id,
  redirect_token,
  destination_url,
  status,
  metadata_json,
  expires_at
)
VALUES (
  :redirectLinkId,
  :projectId,
  :campaignId,
  :promotionId,
  :promotionRunId,
  :adExperimentId,
  :segmentId,
  :userId,
  :contentId,
  :contentOptionId,
  :redirectToken,
  :destinationUrl,
  'active',
  :metadataJson::jsonb,
  :expiresAt::timestamptz
)
RETURNING
  redirect_token AS "redirectId";

/* Purpose: Restore redirect link entity by public redirect token. */
/* @name FindRedirectLinkByToken */
SELECT
  redirect_link_id AS "redirectLinkId",
  project_id AS "projectId",
  campaign_id AS "campaignId",
  promotion_id AS "promotionId",
  promotion_run_id AS "promotionRunId",
  ad_experiment_id AS "adExperimentId",
  segment_id AS "segmentId",
  user_id AS "userId",
  content_id AS "contentId",
  content_option_id AS "contentOptionId",
  redirect_token AS "redirectToken",
  destination_url AS "destinationUrl",
  status,
  metadata_json AS "metadataJson",
  expires_at AS "expiresAt",
  clicked_at AS "clickedAt",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
FROM redirect_links
WHERE redirect_token = :redirectId
LIMIT 1;
