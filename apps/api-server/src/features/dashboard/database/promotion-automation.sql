/* 목적: 종료일이 지난 캠페인을 완료하고 진행 중인 모든 하위 실행을 함께 종료합니다. */
/* @name CompleteExpiredDashboardCampaigns */
WITH expired_campaign_candidates AS (
  SELECT project_id, campaign_id
  FROM campaigns
  WHERE status NOT IN ('completed', 'stopped')
    AND end_date IS NOT NULL
    AND (end_date + 1)::timestamp AT TIME ZONE 'Asia/Seoul' <= now()
  ORDER BY end_date, campaign_id
  FOR UPDATE SKIP LOCKED
  LIMIT (:campaignLimit)::int
), completed_campaigns AS (
  UPDATE campaigns campaign
  SET status = 'completed',
      updated_at = now()
  FROM expired_campaign_candidates expired
  WHERE campaign.project_id = expired.project_id
    AND campaign.campaign_id = expired.campaign_id
  RETURNING campaign.project_id, campaign.campaign_id
), stopped_promotions AS (
  UPDATE promotions promotion
  SET status = 'stopped',
      updated_at = now()
  FROM completed_campaigns campaign
  WHERE promotion.project_id = campaign.project_id
    AND promotion.campaign_id = campaign.campaign_id
    AND promotion.status <> 'stopped'
  RETURNING promotion.project_id, promotion.campaign_id
), stopped_segments AS (
  UPDATE promotion_target_segments segment
  SET status = 'stopped'
  FROM completed_campaigns campaign
  WHERE segment.project_id = campaign.project_id
    AND segment.campaign_id = campaign.campaign_id
    AND segment.status <> 'stopped'
  RETURNING segment.project_id, segment.campaign_id
), failed_generation_runs AS (
  UPDATE generation_runs generation
  SET status = 'failed',
      started_at = COALESCE(generation.started_at, now()),
      finished_at = now(),
      next_retry_at = NULL,
      last_error_code = 'generation_invalidated_by_campaign_end',
      last_error_message = 'campaign ended',
      worker_id = NULL,
      lease_token = NULL,
      heartbeat_at = NULL,
      lease_expires_at = NULL,
      updated_at = now()
  FROM completed_campaigns campaign
  WHERE generation.project_id = campaign.project_id
    AND generation.campaign_id = campaign.campaign_id
    AND generation.status IN ('requested', 'running')
  RETURNING generation.project_id, generation.campaign_id
), cancelled_dispatch_jobs AS (
  UPDATE ad_dispatch_jobs dispatch
  SET status = 'cancelled',
      completed_at = COALESCE(dispatch.completed_at, now())
  FROM completed_campaigns campaign
  WHERE dispatch.project_id = campaign.project_id
    AND dispatch.campaign_id = campaign.campaign_id
    AND dispatch.status IN ('queued', 'scheduled', 'running')
  RETURNING dispatch.project_id, dispatch.campaign_id
), stopped_runs AS (
  UPDATE promotion_runs promotion_run
  SET status = 'stopped',
      ended_at = COALESCE(promotion_run.ended_at, now()),
      updated_at = now()
  FROM completed_campaigns campaign
  WHERE promotion_run.project_id = campaign.project_id
    AND promotion_run.campaign_id = campaign.campaign_id
    AND promotion_run.status <> 'stopped'
  RETURNING promotion_run.project_id, promotion_run.campaign_id, promotion_run.promotion_run_id
), cancelled_automation_jobs AS (
  UPDATE promotion_automation_jobs job
  SET status = 'cancelled',
      worker_id = NULL,
      lease_token = NULL,
      locked_at = NULL,
      lease_expires_at = NULL,
      updated_at = now()
  WHERE job.promotion_run_id IN (
      SELECT promotion_run.promotion_run_id
      FROM promotion_runs promotion_run
      JOIN completed_campaigns campaign
        ON campaign.project_id = promotion_run.project_id
       AND campaign.campaign_id = promotion_run.campaign_id
    )
    AND job.status IN ('pending', 'running')
  RETURNING job.promotion_run_id
), stopped_experiments AS (
  UPDATE ad_experiments experiment
  SET status = 'stopped',
      ended_at = COALESCE(experiment.ended_at, now()),
      updated_at = now()
  FROM completed_campaigns campaign
  WHERE experiment.project_id = campaign.project_id
    AND experiment.campaign_id = campaign.campaign_id
    AND experiment.status <> 'stopped'
  RETURNING experiment.project_id, experiment.campaign_id
)
SELECT
  campaign.project_id AS "projectId",
  campaign.campaign_id AS "campaignId",
  (
    SELECT count(*)::int
    FROM stopped_promotions promotion
    WHERE promotion.project_id = campaign.project_id
      AND promotion.campaign_id = campaign.campaign_id
  ) AS "stoppedPromotionCount",
  (
    SELECT count(*)::int
    FROM stopped_segments segment
    WHERE segment.project_id = campaign.project_id
      AND segment.campaign_id = campaign.campaign_id
  ) AS "stoppedSegmentCount",
  (
    SELECT count(*)::int
    FROM failed_generation_runs generation
    WHERE generation.project_id = campaign.project_id
      AND generation.campaign_id = campaign.campaign_id
  ) AS "failedGenerationRunCount",
  (
    SELECT count(*)::int
    FROM cancelled_dispatch_jobs dispatch
    WHERE dispatch.project_id = campaign.project_id
      AND dispatch.campaign_id = campaign.campaign_id
  ) AS "cancelledDispatchJobCount",
  (
    SELECT count(*)::int
    FROM stopped_runs promotion_run
    WHERE promotion_run.project_id = campaign.project_id
      AND promotion_run.campaign_id = campaign.campaign_id
  ) AS "stoppedPromotionRunCount",
  (
    SELECT count(*)::int
    FROM cancelled_automation_jobs job
    JOIN promotion_runs promotion_run
      ON promotion_run.promotion_run_id = job.promotion_run_id
    WHERE promotion_run.project_id = campaign.project_id
      AND promotion_run.campaign_id = campaign.campaign_id
  ) AS "cancelledAutomationJobCount",
  (
    SELECT count(*)::int
    FROM stopped_experiments experiment
    WHERE experiment.project_id = campaign.project_id
      AND experiment.campaign_id = campaign.campaign_id
  ) AS "stoppedExperimentCount"
FROM completed_campaigns campaign
ORDER BY campaign.campaign_id;

/* 목적: 배정이 끝난 실행을 자동 또는 미래 시작 작업으로 등록하고 현재 실행 정책을 반환합니다. */
/* @name ScheduleDashboardPromotionRunLaunch */
WITH run_config AS (
  SELECT
    pr.promotion_run_id,
    pr.project_id,
    pr.promotion_id,
    pr.loop_count,
    p.execution_mode,
    GREATEST(
      p.scheduled_start_at,
      c.start_date::timestamp AT TIME ZONE 'Asia/Seoul'
    ) AS scheduled_start_at,
    LEAST(
      p.scheduled_end_at,
      (c.end_date + 1)::timestamp AT TIME ZONE 'Asia/Seoul'
    ) AS scheduled_end_at,
    p.loop_interval_unit,
    p.loop_interval_value,
    p.max_loop_count,
    c.status AS campaign_status
  FROM promotion_runs pr
  JOIN promotions p
    ON p.project_id = pr.project_id
   AND p.promotion_id = pr.promotion_id
  JOIN campaigns c
    ON c.project_id = pr.project_id
   AND c.campaign_id = pr.campaign_id
  WHERE pr.project_id = :projectId
    AND pr.promotion_run_id = :promotionRunId
    AND p.status <> 'stopped'
), inserted_job AS (
  INSERT INTO promotion_automation_jobs (
    job_id,
    promotion_run_id,
    job_type,
    scheduled_at,
    status,
    metadata_json
  )
  SELECT
    :jobId,
    promotion_run_id,
    'launch_run',
    CASE
      WHEN scheduled_start_at > now() THEN scheduled_start_at
      ELSE now()
    END,
    'pending',
    jsonb_build_object('source', 'assignment_ready')
  FROM run_config
  WHERE campaign_status NOT IN ('completed', 'stopped')
    AND (execution_mode = 'automatic' OR scheduled_start_at > now())
    AND (scheduled_end_at IS NULL OR scheduled_end_at > now())
  ON CONFLICT (promotion_run_id, job_type) DO UPDATE
  SET
    scheduled_at = EXCLUDED.scheduled_at,
    status = 'pending',
    attempt_count = 0,
    worker_id = NULL,
    lease_token = NULL,
    locked_at = NULL,
    lease_expires_at = NULL,
    completed_at = NULL,
    last_error_code = NULL,
    last_error_detail = NULL,
    metadata_json = EXCLUDED.metadata_json,
    updated_at = now()
  WHERE promotion_automation_jobs.status IN ('pending', 'failed', 'cancelled')
  RETURNING job_id, promotion_run_id, scheduled_at, status
), launch_job AS (
  SELECT job_id, promotion_run_id, scheduled_at, status
  FROM inserted_job
  UNION ALL
  SELECT jobs.job_id, jobs.promotion_run_id, jobs.scheduled_at, jobs.status
  FROM promotion_automation_jobs jobs
  JOIN run_config rc
    ON rc.promotion_run_id = jobs.promotion_run_id
  WHERE jobs.job_type = 'launch_run'
    AND NOT EXISTS (SELECT 1 FROM inserted_job)
)
SELECT
  rc.promotion_run_id AS "promotionRunId",
  rc.promotion_id AS "promotionId",
  rc.loop_count AS "loopCount",
  rc.execution_mode AS "executionMode",
  rc.scheduled_start_at AS "scheduledStartAt",
  rc.scheduled_end_at AS "scheduledEndAt",
  rc.loop_interval_unit AS "loopIntervalUnit",
  rc.loop_interval_value AS "loopIntervalValue",
  rc.max_loop_count AS "maxLoopCount",
  (
    rc.campaign_status IN ('completed', 'stopped')
    OR (rc.scheduled_end_at IS NOT NULL AND rc.scheduled_end_at <= now())
  ) AS "scheduleExpired",
  launch_job.job_id AS "jobId",
  launch_job.scheduled_at AS "jobScheduledAt",
  launch_job.status AS "jobStatus"
FROM run_config rc
LEFT JOIN launch_job
  ON launch_job.promotion_run_id = rc.promotion_run_id;

/* 목적: 실행 작업 처리 뒤 자동 평가 작업을 프로모션 반복 간격에 맞춰 등록합니다. */
/* @name ScheduleDashboardPromotionRunEvaluation */
WITH run_config AS (
  SELECT
    pr.promotion_run_id,
    p.execution_mode,
    LEAST(
      p.scheduled_end_at,
      (c.end_date + 1)::timestamp AT TIME ZONE 'Asia/Seoul'
    ) AS scheduled_end_at,
    p.loop_interval_unit,
    p.loop_interval_value,
    CASE
      WHEN p.loop_interval_unit = 'hour'
        THEN now() + p.loop_interval_value * interval '1 hour'
      ELSE now() + p.loop_interval_value * interval '1 day'
    END AS interval_due_at
  FROM promotion_runs pr
  JOIN promotions p
    ON p.project_id = pr.project_id
   AND p.promotion_id = pr.promotion_id
  JOIN campaigns c
    ON c.project_id = pr.project_id
   AND c.campaign_id = pr.campaign_id
  WHERE pr.promotion_run_id = :promotionRunId
    AND p.status <> 'stopped'
    AND c.status NOT IN ('completed', 'stopped')
)
INSERT INTO promotion_automation_jobs (
  job_id,
  promotion_run_id,
  job_type,
  scheduled_at,
  status,
  metadata_json
)
SELECT
  :jobId,
  promotion_run_id,
  'evaluate_run',
  CASE
    WHEN scheduled_end_at IS NOT NULL AND scheduled_end_at < interval_due_at
      THEN scheduled_end_at
    ELSE interval_due_at
  END,
  'pending',
  jsonb_build_object('source', 'automatic_loop_interval')
FROM run_config
WHERE execution_mode = 'automatic'
  AND (scheduled_end_at IS NULL OR scheduled_end_at > now())
ON CONFLICT (promotion_run_id, job_type) DO NOTHING
RETURNING job_id AS "jobId", scheduled_at AS "scheduledAt", status;

/* 목적: 사용자가 평가를 먼저 실행하면 아직 대기 중인 동일 자동 평가 작업을 취소합니다. */
/* @name CancelPendingDashboardPromotionRunEvaluation */
UPDATE promotion_automation_jobs
SET
  status = 'cancelled',
  updated_at = now()
WHERE promotion_run_id = :promotionRunId
  AND job_type = 'evaluate_run'
  AND status = 'pending'
RETURNING job_id AS "jobId", status;

/* 목적: 프로모션 일정 또는 실행 모드 변경을 아직 시작하지 않은 자동화 작업에 반영합니다. */
/* @name SyncPendingDashboardPromotionAutomationJobs */
WITH promotion_config AS (
  SELECT
    p.promotion_id,
    p.execution_mode,
    GREATEST(
      p.scheduled_start_at,
      c.start_date::timestamp AT TIME ZONE 'Asia/Seoul'
    ) AS scheduled_start_at,
    LEAST(
      p.scheduled_end_at,
      (c.end_date + 1)::timestamp AT TIME ZONE 'Asia/Seoul'
    ) AS scheduled_end_at,
    p.loop_interval_unit,
    p.loop_interval_value,
    p.status AS promotion_status,
    c.status AS campaign_status
  FROM promotions p
  JOIN campaigns c
    ON c.project_id = p.project_id
   AND c.campaign_id = p.campaign_id
  WHERE p.project_id = :projectId
    AND p.promotion_id = :promotionId
)
UPDATE promotion_automation_jobs jobs
SET
  status = CASE
    WHEN config.promotion_status = 'stopped'
      OR config.campaign_status IN ('completed', 'stopped')
      OR (config.scheduled_end_at IS NOT NULL AND config.scheduled_end_at <= now())
      OR (
        jobs.job_type = 'launch_run'
        AND config.execution_mode = 'manual'
        AND (
          config.scheduled_start_at IS NULL
          OR config.scheduled_start_at <= now()
        )
      )
      OR (
        jobs.job_type = 'evaluate_run'
        AND config.execution_mode <> 'automatic'
      )
      THEN 'cancelled'
    ELSE 'pending'
  END,
  scheduled_at = CASE
    WHEN jobs.job_type = 'launch_run'
      THEN GREATEST(COALESCE(config.scheduled_start_at, now()), now())
    WHEN config.scheduled_end_at IS NOT NULL
      AND config.scheduled_end_at < CASE
        WHEN config.loop_interval_unit = 'hour'
          THEN jobs.created_at + config.loop_interval_value * interval '1 hour'
        ELSE jobs.created_at + config.loop_interval_value * interval '1 day'
      END
      THEN config.scheduled_end_at
    WHEN config.loop_interval_unit = 'hour'
      THEN jobs.created_at + config.loop_interval_value * interval '1 hour'
    ELSE jobs.created_at + config.loop_interval_value * interval '1 day'
  END,
  updated_at = now()
FROM promotion_runs promotion_run
JOIN promotion_config config
  ON config.promotion_id = promotion_run.promotion_id
WHERE jobs.promotion_run_id = promotion_run.promotion_run_id
  AND promotion_run.project_id = :projectId
  AND (
    jobs.status = 'pending'
    OR (
      jobs.status = 'cancelled'
      AND jobs.job_type = 'launch_run'
    )
  )
RETURNING
  jobs.job_id AS "jobId",
  jobs.job_type AS "jobType",
  jobs.scheduled_at AS "scheduledAt",
  jobs.status;

/* 목적: 여러 API 인스턴스가 같은 작업을 중복 처리하지 않도록 만료 lease를 포함해 작업을 선점합니다. */
/* @name ClaimDashboardPromotionAutomationJobs */
WITH candidates AS (
  SELECT job.job_id
  FROM promotion_automation_jobs job
  JOIN promotion_runs promotion_run
    ON promotion_run.promotion_run_id = job.promotion_run_id
  JOIN promotions promotion
    ON promotion.project_id = promotion_run.project_id
   AND promotion.promotion_id = promotion_run.promotion_id
  JOIN campaigns campaign
    ON campaign.project_id = promotion_run.project_id
   AND campaign.campaign_id = promotion_run.campaign_id
  WHERE (
      (
        job.status = 'pending'
        AND job.scheduled_at <= now()
      ) OR (
        job.status = 'running'
        AND job.lease_expires_at <= now()
      )
    )
    AND promotion.status <> 'stopped'
    AND campaign.status NOT IN ('completed', 'stopped')
    AND (
      job.job_type <> 'launch_run'
      OR GREATEST(
        promotion.scheduled_start_at,
        campaign.start_date::timestamp AT TIME ZONE 'Asia/Seoul'
      ) IS NULL
      OR GREATEST(
        promotion.scheduled_start_at,
        campaign.start_date::timestamp AT TIME ZONE 'Asia/Seoul'
      ) <= now()
    )
    AND (
      LEAST(
        promotion.scheduled_end_at,
        (campaign.end_date + 1)::timestamp AT TIME ZONE 'Asia/Seoul'
      ) IS NULL
      OR LEAST(
        promotion.scheduled_end_at,
        (campaign.end_date + 1)::timestamp AT TIME ZONE 'Asia/Seoul'
      ) > now()
    )
  ORDER BY job.scheduled_at, job.created_at, job.job_id
  FOR UPDATE OF job SKIP LOCKED
  LIMIT :claimLimit
), claimed AS (
  UPDATE promotion_automation_jobs jobs
  SET
    status = 'running',
    attempt_count = jobs.attempt_count + 1,
    worker_id = :workerId,
    lease_token = (:leaseToken)::uuid,
    locked_at = now(),
    lease_expires_at = now() + (:leaseSeconds)::int * interval '1 second',
    last_error_code = NULL,
    last_error_detail = NULL,
    updated_at = now()
  FROM candidates
  WHERE jobs.job_id = candidates.job_id
  RETURNING jobs.*
)
SELECT
  claimed.job_id AS "jobId",
  claimed.promotion_run_id AS "promotionRunId",
  claimed.job_type AS "jobType",
  claimed.scheduled_at AS "scheduledAt",
  claimed.attempt_count AS "attemptCount",
  claimed.lease_token::text AS "leaseToken",
  pr.project_id AS "projectId",
  pr.campaign_id AS "campaignId",
  pr.promotion_id AS "promotionId",
  pr.loop_count AS "loopCount",
  pr.status AS "promotionRunStatus",
  p.execution_mode AS "executionMode",
  GREATEST(
    p.scheduled_start_at,
    c.start_date::timestamp AT TIME ZONE 'Asia/Seoul'
  ) AS "scheduledStartAt",
  LEAST(
    p.scheduled_end_at,
    (c.end_date + 1)::timestamp AT TIME ZONE 'Asia/Seoul'
  ) AS "scheduledEndAt",
  p.loop_interval_unit AS "loopIntervalUnit",
  p.loop_interval_value AS "loopIntervalValue",
  p.max_loop_count AS "maxLoopCount",
  p.status AS "promotionStatus"
FROM claimed
JOIN promotion_runs pr
  ON pr.promotion_run_id = claimed.promotion_run_id
JOIN promotions p
  ON p.project_id = pr.project_id
 AND p.promotion_id = pr.promotion_id
JOIN campaigns c
  ON c.project_id = pr.project_id
 AND c.campaign_id = pr.campaign_id
ORDER BY claimed.scheduled_at, claimed.job_id;

/* 목적: lease 소유자가 처리한 자동화 작업을 완료 상태로 전환합니다. */
/* @name CompleteDashboardPromotionAutomationJob */
UPDATE promotion_automation_jobs
SET
  status = 'completed',
  completed_at = now(),
  worker_id = NULL,
  lease_token = NULL,
  locked_at = NULL,
  lease_expires_at = NULL,
  updated_at = now()
WHERE job_id = :jobId
  AND status = 'running'
  AND lease_token = (:leaseToken)::uuid
RETURNING job_id AS "jobId", status;

/* 목적: 실패한 작업은 제한 횟수까지 지연 재시도하고 이후 영구 실패로 남깁니다. */
/* @name FailDashboardPromotionAutomationJob */
UPDATE promotion_automation_jobs
SET
  status = CASE WHEN attempt_count < :maxAttempts THEN 'pending' ELSE 'failed' END,
  scheduled_at = CASE
    WHEN attempt_count < :maxAttempts
      THEN now() + (:retryDelaySeconds)::int * interval '1 second'
    ELSE scheduled_at
  END,
  last_error_code = :errorCode,
  last_error_detail = :errorDetail,
  worker_id = NULL,
  lease_token = NULL,
  locked_at = NULL,
  lease_expires_at = NULL,
  updated_at = now()
WHERE job_id = :jobId
  AND status = 'running'
  AND lease_token = (:leaseToken)::uuid
RETURNING job_id AS "jobId", status, attempt_count AS "attemptCount";

/* 목적: 실행에 포함된 일반 실험과 실제 fallback 배정이 있는 fallback 실험을 조회합니다. */
/* @name ListDashboardPromotionRunLaunchExperiments */
SELECT
  ae.ad_experiment_id AS "adExperimentId",
  ae.promotion_id AS "promotionId",
  ae.segment_id AS "segmentId",
  ae.channel,
  ae.status,
  (ae.segment_id = 'seg_existing_all') AS "isFallback"
FROM ad_experiments ae
WHERE ae.project_id = :projectId
  AND ae.promotion_run_id = :promotionRunId
  AND (
    ae.segment_id <> 'seg_existing_all'
    OR EXISTS (
      SELECT 1
      FROM user_segment_assignments usa
      WHERE usa.project_id = ae.project_id
        AND usa.promotion_run_id = ae.promotion_run_id
        AND usa.ad_experiment_id = ae.ad_experiment_id
        AND usa.fallback = true
    )
  )
ORDER BY (ae.segment_id = 'seg_existing_all'), ae.ad_experiment_id;

/* 목적: 수동 평가에서도 프로모션 자동 반복 정책과 최대 횟수를 동일하게 적용합니다. */
/* @name GetDashboardPromotionRunAutomationConfig */
SELECT
  pr.promotion_run_id AS "promotionRunId",
  pr.project_id AS "projectId",
  pr.promotion_id AS "promotionId",
  pr.loop_count AS "loopCount",
  pr.status AS "promotionRunStatus",
  p.execution_mode AS "executionMode",
  GREATEST(
    p.scheduled_start_at,
    c.start_date::timestamp AT TIME ZONE 'Asia/Seoul'
  ) AS "scheduledStartAt",
  LEAST(
    p.scheduled_end_at,
    (c.end_date + 1)::timestamp AT TIME ZONE 'Asia/Seoul'
  ) AS "scheduledEndAt",
  p.loop_interval_unit AS "loopIntervalUnit",
  p.loop_interval_value AS "loopIntervalValue",
  p.max_loop_count AS "maxLoopCount",
  CASE
    WHEN c.status IN ('completed', 'stopped') THEN 'stopped'
    ELSE p.status
  END AS "promotionStatus"
FROM promotion_runs pr
JOIN promotions p
  ON p.project_id = pr.project_id
 AND p.promotion_id = pr.promotion_id
JOIN campaigns c
  ON c.project_id = pr.project_id
 AND c.campaign_id = pr.campaign_id
WHERE pr.project_id = :projectId
  AND pr.promotion_run_id = :promotionRunId;
