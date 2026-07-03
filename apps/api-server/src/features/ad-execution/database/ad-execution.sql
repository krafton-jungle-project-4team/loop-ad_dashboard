/* Purpose: Read promotion run and promotion channel before hot-path execution. */
/* @name GetPromotionRunExecutionContext */
SELECT
  pr.promotion_run_id AS "promotionRunId",
  pr.project_id AS "projectId",
  pr.campaign_id AS "campaignId",
  pr.promotion_id AS "promotionId",
  pr.status AS "promotionRunStatus",
  p.channel AS channel
FROM promotion_runs pr
JOIN promotions p
  ON p.promotion_id = pr.promotion_id
WHERE pr.promotion_run_id = :promotionRunId;

/* Purpose: Read precomputed active assignments for one promotion_run dispatch. */
/* @name ListDispatchAssignments */
SELECT
  promotion_run_id AS "promotionRunId",
  project_id AS "projectId",
  campaign_id AS "campaignId",
  promotion_id AS "promotionId",
  user_id AS "userId",
  segment_id AS "segmentId",
  ad_experiment_id AS "adExperimentId",
  content_id AS "contentId",
  content_option_id AS "contentOptionId",
  channel,
  COALESCE(subject, '') AS subject,
  COALESCE(preheader, '') AS preheader,
  COALESCE(title, '') AS title,
  COALESCE(body, '') AS body,
  COALESCE(cta, '') AS cta,
  COALESCE(message, '') AS message,
  COALESCE(landing_url, '') AS "targetUrl"
FROM active_ad_serving_assignments
WHERE promotion_run_id = :promotionRunId
ORDER BY ad_experiment_id ASC, user_id ASC;

/* Purpose: Resolve one already assigned onsite banner content for one user. */
/* @name FindBannerAssignment */
SELECT
  promotion_run_id AS "promotionRunId",
  project_id AS "projectId",
  campaign_id AS "campaignId",
  promotion_id AS "promotionId",
  user_id AS "userId",
  segment_id AS "segmentId",
  ad_experiment_id AS "adExperimentId",
  content_id AS "contentId",
  content_option_id AS "contentOptionId",
  channel,
  COALESCE(title, '') AS title,
  COALESCE(body, '') AS body,
  COALESCE(cta, '') AS cta,
  COALESCE(landing_url, '') AS "targetUrl"
FROM active_ad_serving_assignments
WHERE project_id = :projectId
  AND promotion_run_id = :promotionRunId
  AND user_id = :userId
  AND channel = 'onsite_banner'
LIMIT 1;

/* Purpose: Create one dispatch job for an ad_experiment group. */
/* @name InsertDispatchJob */
INSERT INTO ad_dispatch_jobs (
  ad_dispatch_job_id,
  project_id,
  campaign_id,
  promotion_id,
  promotion_run_id,
  ad_experiment_id,
  channel,
  status,
  provider,
  target_count,
  sent_count,
  failed_count,
  metadata_json,
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
  :provider,
  :targetCount,
  0,
  0,
  :metadataJson::jsonb,
  now()
)
RETURNING
  ad_dispatch_job_id AS "dispatchJobId";

/* Purpose: Finish one dispatch job without hiding provider or resolver failures. */
/* @name UpdateDispatchJobResult */
UPDATE ad_dispatch_jobs
SET
  status = :status,
  sent_count = :dispatchedCount,
  failed_count = :failedCount,
  metadata_json = :metadataJson::jsonb,
  completed_at = now()
WHERE ad_dispatch_job_id = :dispatchJobId
RETURNING
  ad_dispatch_job_id AS "dispatchJobId";

/* Purpose: Create a redirect token carrying final ad-execution contract ids. */
/* @name InsertRedirectLink */
INSERT INTO redirect_links (
  redirect_id,
  project_id,
  campaign_id,
  promotion_id,
  promotion_run_id,
  ad_experiment_id,
  segment_id,
  user_id,
  content_id,
  content_option_id,
  target_url,
  expires_at
)
VALUES (
  :redirectId,
  :projectId,
  :campaignId,
  :promotionId,
  :promotionRunId,
  :adExperimentId,
  :segmentId,
  :userId,
  :contentId,
  :contentOptionId,
  :targetUrl,
  :expiresAt::timestamptz
)
RETURNING
  redirect_id AS "redirectId";

/* Purpose: Restore redirect context for campaign_redirect_click events. */
/* @name FindRedirectLink */
SELECT
  rl.redirect_id AS "redirectId",
  rl.project_id AS "projectId",
  rl.campaign_id AS "campaignId",
  rl.promotion_id AS "promotionId",
  rl.promotion_run_id AS "promotionRunId",
  rl.ad_experiment_id AS "adExperimentId",
  rl.segment_id AS "segmentId",
  rl.user_id AS "userId",
  rl.content_id AS "contentId",
  rl.content_option_id AS "contentOptionId",
  rl.target_url AS "targetUrl",
  rl.expires_at AS "expiresAt",
  COALESCE(ae.channel, p.channel, '') AS "promotionChannel"
FROM redirect_links rl
LEFT JOIN ad_experiments ae
  ON ae.ad_experiment_id = rl.ad_experiment_id
LEFT JOIN promotions p
  ON p.promotion_id = rl.promotion_id
WHERE rl.redirect_id = :redirectId
LIMIT 1;
