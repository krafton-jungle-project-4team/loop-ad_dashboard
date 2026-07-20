/** Types generated for queries found in "src/features/dashboard/database/promotion-automation.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type NumberOrString = number | string;

/** 'ScheduleDashboardPromotionRunLaunch' parameters type */
export interface IScheduleDashboardPromotionRunLaunchParams {
  jobId?: string | null | void;
  projectId?: string | null | void;
  promotionRunId?: string | null | void;
}

/** 'ScheduleDashboardPromotionRunLaunch' return type */
export interface IScheduleDashboardPromotionRunLaunchResult {
  executionMode: string;
  jobId: string | null;
  jobScheduledAt: Date | null;
  jobStatus: string | null;
  loopCount: number;
  loopIntervalUnit: string;
  loopIntervalValue: number;
  maxLoopCount: number;
  promotionId: string;
  promotionRunId: string;
  scheduledEndAt: Date | null;
  scheduledStartAt: Date | null;
  scheduleExpired: boolean | null;
}

/** 'ScheduleDashboardPromotionRunLaunch' query type */
export interface IScheduleDashboardPromotionRunLaunchQuery {
  params: IScheduleDashboardPromotionRunLaunchParams;
  result: IScheduleDashboardPromotionRunLaunchResult;
}

const scheduleDashboardPromotionRunLaunchIR: any = {"usedParamSet":{"projectId":true,"promotionRunId":true,"jobId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":405,"b":414}]},{"name":"promotionRunId","required":false,"transform":{"type":"scalar"},"locs":[{"a":446,"b":460}]},{"name":"jobId","required":false,"transform":{"type":"scalar"},"locs":[{"a":668,"b":673}]}],"statement":"WITH run_config AS (\n  SELECT\n    pr.promotion_run_id,\n    pr.project_id,\n    pr.promotion_id,\n    pr.loop_count,\n    p.execution_mode,\n    p.scheduled_start_at,\n    p.scheduled_end_at,\n    p.loop_interval_unit,\n    p.loop_interval_value,\n    p.max_loop_count\n  FROM promotion_runs pr\n  JOIN promotions p\n    ON p.project_id = pr.project_id\n   AND p.promotion_id = pr.promotion_id\n  WHERE pr.project_id = :projectId\n    AND pr.promotion_run_id = :promotionRunId\n    AND p.status <> 'stopped'\n), inserted_job AS (\n  INSERT INTO promotion_automation_jobs (\n    job_id,\n    promotion_run_id,\n    job_type,\n    scheduled_at,\n    status,\n    metadata_json\n  )\n  SELECT\n    :jobId,\n    promotion_run_id,\n    'launch_run',\n    CASE\n      WHEN scheduled_start_at > now() THEN scheduled_start_at\n      ELSE now()\n    END,\n    'pending',\n    jsonb_build_object('source', 'assignment_ready')\n  FROM run_config\n  WHERE (execution_mode = 'automatic' OR scheduled_start_at > now())\n    AND (scheduled_end_at IS NULL OR scheduled_end_at > now())\n  ON CONFLICT (promotion_run_id, job_type) DO UPDATE\n  SET\n    scheduled_at = EXCLUDED.scheduled_at,\n    status = 'pending',\n    attempt_count = 0,\n    worker_id = NULL,\n    lease_token = NULL,\n    locked_at = NULL,\n    lease_expires_at = NULL,\n    completed_at = NULL,\n    last_error_code = NULL,\n    last_error_detail = NULL,\n    metadata_json = EXCLUDED.metadata_json,\n    updated_at = now()\n  WHERE promotion_automation_jobs.status IN ('pending', 'failed', 'cancelled')\n  RETURNING job_id, promotion_run_id, scheduled_at, status\n), launch_job AS (\n  SELECT job_id, promotion_run_id, scheduled_at, status\n  FROM inserted_job\n  UNION ALL\n  SELECT jobs.job_id, jobs.promotion_run_id, jobs.scheduled_at, jobs.status\n  FROM promotion_automation_jobs jobs\n  JOIN run_config rc\n    ON rc.promotion_run_id = jobs.promotion_run_id\n  WHERE jobs.job_type = 'launch_run'\n    AND NOT EXISTS (SELECT 1 FROM inserted_job)\n)\nSELECT\n  rc.promotion_run_id AS \"promotionRunId\",\n  rc.promotion_id AS \"promotionId\",\n  rc.loop_count AS \"loopCount\",\n  rc.execution_mode AS \"executionMode\",\n  rc.scheduled_start_at AS \"scheduledStartAt\",\n  rc.scheduled_end_at AS \"scheduledEndAt\",\n  rc.loop_interval_unit AS \"loopIntervalUnit\",\n  rc.loop_interval_value AS \"loopIntervalValue\",\n  rc.max_loop_count AS \"maxLoopCount\",\n  (rc.scheduled_end_at IS NOT NULL AND rc.scheduled_end_at <= now()) AS \"scheduleExpired\",\n  launch_job.job_id AS \"jobId\",\n  launch_job.scheduled_at AS \"jobScheduledAt\",\n  launch_job.status AS \"jobStatus\"\nFROM run_config rc\nLEFT JOIN launch_job\n  ON launch_job.promotion_run_id = rc.promotion_run_id                                                    "};

/**
 * Query generated from SQL:
 * ```
 * WITH run_config AS (
 *   SELECT
 *     pr.promotion_run_id,
 *     pr.project_id,
 *     pr.promotion_id,
 *     pr.loop_count,
 *     p.execution_mode,
 *     p.scheduled_start_at,
 *     p.scheduled_end_at,
 *     p.loop_interval_unit,
 *     p.loop_interval_value,
 *     p.max_loop_count
 *   FROM promotion_runs pr
 *   JOIN promotions p
 *     ON p.project_id = pr.project_id
 *    AND p.promotion_id = pr.promotion_id
 *   WHERE pr.project_id = :projectId
 *     AND pr.promotion_run_id = :promotionRunId
 *     AND p.status <> 'stopped'
 * ), inserted_job AS (
 *   INSERT INTO promotion_automation_jobs (
 *     job_id,
 *     promotion_run_id,
 *     job_type,
 *     scheduled_at,
 *     status,
 *     metadata_json
 *   )
 *   SELECT
 *     :jobId,
 *     promotion_run_id,
 *     'launch_run',
 *     CASE
 *       WHEN scheduled_start_at > now() THEN scheduled_start_at
 *       ELSE now()
 *     END,
 *     'pending',
 *     jsonb_build_object('source', 'assignment_ready')
 *   FROM run_config
 *   WHERE (execution_mode = 'automatic' OR scheduled_start_at > now())
 *     AND (scheduled_end_at IS NULL OR scheduled_end_at > now())
 *   ON CONFLICT (promotion_run_id, job_type) DO UPDATE
 *   SET
 *     scheduled_at = EXCLUDED.scheduled_at,
 *     status = 'pending',
 *     attempt_count = 0,
 *     worker_id = NULL,
 *     lease_token = NULL,
 *     locked_at = NULL,
 *     lease_expires_at = NULL,
 *     completed_at = NULL,
 *     last_error_code = NULL,
 *     last_error_detail = NULL,
 *     metadata_json = EXCLUDED.metadata_json,
 *     updated_at = now()
 *   WHERE promotion_automation_jobs.status IN ('pending', 'failed', 'cancelled')
 *   RETURNING job_id, promotion_run_id, scheduled_at, status
 * ), launch_job AS (
 *   SELECT job_id, promotion_run_id, scheduled_at, status
 *   FROM inserted_job
 *   UNION ALL
 *   SELECT jobs.job_id, jobs.promotion_run_id, jobs.scheduled_at, jobs.status
 *   FROM promotion_automation_jobs jobs
 *   JOIN run_config rc
 *     ON rc.promotion_run_id = jobs.promotion_run_id
 *   WHERE jobs.job_type = 'launch_run'
 *     AND NOT EXISTS (SELECT 1 FROM inserted_job)
 * )
 * SELECT
 *   rc.promotion_run_id AS "promotionRunId",
 *   rc.promotion_id AS "promotionId",
 *   rc.loop_count AS "loopCount",
 *   rc.execution_mode AS "executionMode",
 *   rc.scheduled_start_at AS "scheduledStartAt",
 *   rc.scheduled_end_at AS "scheduledEndAt",
 *   rc.loop_interval_unit AS "loopIntervalUnit",
 *   rc.loop_interval_value AS "loopIntervalValue",
 *   rc.max_loop_count AS "maxLoopCount",
 *   (rc.scheduled_end_at IS NOT NULL AND rc.scheduled_end_at <= now()) AS "scheduleExpired",
 *   launch_job.job_id AS "jobId",
 *   launch_job.scheduled_at AS "jobScheduledAt",
 *   launch_job.status AS "jobStatus"
 * FROM run_config rc
 * LEFT JOIN launch_job
 *   ON launch_job.promotion_run_id = rc.promotion_run_id                                                    
 * ```
 */
export const scheduleDashboardPromotionRunLaunch = new PreparedQuery<IScheduleDashboardPromotionRunLaunchParams,IScheduleDashboardPromotionRunLaunchResult>(scheduleDashboardPromotionRunLaunchIR);


/** 'ScheduleDashboardPromotionRunEvaluation' parameters type */
export interface IScheduleDashboardPromotionRunEvaluationParams {
  jobId?: string | null | void;
  promotionRunId?: string | null | void;
}

/** 'ScheduleDashboardPromotionRunEvaluation' return type */
export interface IScheduleDashboardPromotionRunEvaluationResult {
  jobId: string;
  scheduledAt: Date;
  status: string;
}

/** 'ScheduleDashboardPromotionRunEvaluation' query type */
export interface IScheduleDashboardPromotionRunEvaluationQuery {
  params: IScheduleDashboardPromotionRunEvaluationParams;
  result: IScheduleDashboardPromotionRunEvaluationResult;
}

const scheduleDashboardPromotionRunEvaluationIR: any = {"usedParamSet":{"promotionRunId":true,"jobId":true},"params":[{"name":"promotionRunId","required":false,"transform":{"type":"scalar"},"locs":[{"a":505,"b":519}]},{"name":"jobId","required":false,"transform":{"type":"scalar"},"locs":[{"a":688,"b":693}]}],"statement":"WITH run_config AS (\n  SELECT\n    pr.promotion_run_id,\n    p.execution_mode,\n    p.scheduled_end_at,\n    p.loop_interval_unit,\n    p.loop_interval_value,\n    CASE\n      WHEN p.loop_interval_unit = 'hour'\n        THEN now() + p.loop_interval_value * interval '1 hour'\n      ELSE now() + p.loop_interval_value * interval '1 day'\n    END AS interval_due_at\n  FROM promotion_runs pr\n  JOIN promotions p\n    ON p.project_id = pr.project_id\n   AND p.promotion_id = pr.promotion_id\n  WHERE pr.promotion_run_id = :promotionRunId\n    AND p.status <> 'stopped'\n)\nINSERT INTO promotion_automation_jobs (\n  job_id,\n  promotion_run_id,\n  job_type,\n  scheduled_at,\n  status,\n  metadata_json\n)\nSELECT\n  :jobId,\n  promotion_run_id,\n  'evaluate_run',\n  CASE\n    WHEN scheduled_end_at IS NOT NULL AND scheduled_end_at < interval_due_at\n      THEN scheduled_end_at\n    ELSE interval_due_at\n  END,\n  'pending',\n  jsonb_build_object('source', 'automatic_loop_interval')\nFROM run_config\nWHERE execution_mode = 'automatic'\n  AND (scheduled_end_at IS NULL OR scheduled_end_at > now())\nON CONFLICT (promotion_run_id, job_type) DO NOTHING\nRETURNING job_id AS \"jobId\", scheduled_at AS \"scheduledAt\", status                                                       "};

/**
 * Query generated from SQL:
 * ```
 * WITH run_config AS (
 *   SELECT
 *     pr.promotion_run_id,
 *     p.execution_mode,
 *     p.scheduled_end_at,
 *     p.loop_interval_unit,
 *     p.loop_interval_value,
 *     CASE
 *       WHEN p.loop_interval_unit = 'hour'
 *         THEN now() + p.loop_interval_value * interval '1 hour'
 *       ELSE now() + p.loop_interval_value * interval '1 day'
 *     END AS interval_due_at
 *   FROM promotion_runs pr
 *   JOIN promotions p
 *     ON p.project_id = pr.project_id
 *    AND p.promotion_id = pr.promotion_id
 *   WHERE pr.promotion_run_id = :promotionRunId
 *     AND p.status <> 'stopped'
 * )
 * INSERT INTO promotion_automation_jobs (
 *   job_id,
 *   promotion_run_id,
 *   job_type,
 *   scheduled_at,
 *   status,
 *   metadata_json
 * )
 * SELECT
 *   :jobId,
 *   promotion_run_id,
 *   'evaluate_run',
 *   CASE
 *     WHEN scheduled_end_at IS NOT NULL AND scheduled_end_at < interval_due_at
 *       THEN scheduled_end_at
 *     ELSE interval_due_at
 *   END,
 *   'pending',
 *   jsonb_build_object('source', 'automatic_loop_interval')
 * FROM run_config
 * WHERE execution_mode = 'automatic'
 *   AND (scheduled_end_at IS NULL OR scheduled_end_at > now())
 * ON CONFLICT (promotion_run_id, job_type) DO NOTHING
 * RETURNING job_id AS "jobId", scheduled_at AS "scheduledAt", status                                                       
 * ```
 */
export const scheduleDashboardPromotionRunEvaluation = new PreparedQuery<IScheduleDashboardPromotionRunEvaluationParams,IScheduleDashboardPromotionRunEvaluationResult>(scheduleDashboardPromotionRunEvaluationIR);


/** 'CancelPendingDashboardPromotionRunEvaluation' parameters type */
export interface ICancelPendingDashboardPromotionRunEvaluationParams {
  promotionRunId?: string | null | void;
}

/** 'CancelPendingDashboardPromotionRunEvaluation' return type */
export interface ICancelPendingDashboardPromotionRunEvaluationResult {
  jobId: string;
  status: string;
}

/** 'CancelPendingDashboardPromotionRunEvaluation' query type */
export interface ICancelPendingDashboardPromotionRunEvaluationQuery {
  params: ICancelPendingDashboardPromotionRunEvaluationParams;
  result: ICancelPendingDashboardPromotionRunEvaluationResult;
}

const cancelPendingDashboardPromotionRunEvaluationIR: any = {"usedParamSet":{"promotionRunId":true},"params":[{"name":"promotionRunId","required":false,"transform":{"type":"scalar"},"locs":[{"a":107,"b":121}]}],"statement":"UPDATE promotion_automation_jobs\nSET\n  status = 'cancelled',\n  updated_at = now()\nWHERE promotion_run_id = :promotionRunId\n  AND job_type = 'evaluate_run'\n  AND status = 'pending'\nRETURNING job_id AS \"jobId\", status                                                        "};

/**
 * Query generated from SQL:
 * ```
 * UPDATE promotion_automation_jobs
 * SET
 *   status = 'cancelled',
 *   updated_at = now()
 * WHERE promotion_run_id = :promotionRunId
 *   AND job_type = 'evaluate_run'
 *   AND status = 'pending'
 * RETURNING job_id AS "jobId", status                                                        
 * ```
 */
export const cancelPendingDashboardPromotionRunEvaluation = new PreparedQuery<ICancelPendingDashboardPromotionRunEvaluationParams,ICancelPendingDashboardPromotionRunEvaluationResult>(cancelPendingDashboardPromotionRunEvaluationIR);


/** 'SyncPendingDashboardPromotionAutomationJobs' parameters type */
export interface ISyncPendingDashboardPromotionAutomationJobsParams {
  projectId?: string | null | void;
  promotionId?: string | null | void;
}

/** 'SyncPendingDashboardPromotionAutomationJobs' return type */
export interface ISyncPendingDashboardPromotionAutomationJobsResult {
  jobId: string;
  jobType: string;
  scheduledAt: Date;
  status: string;
}

/** 'SyncPendingDashboardPromotionAutomationJobs' query type */
export interface ISyncPendingDashboardPromotionAutomationJobsQuery {
  params: ISyncPendingDashboardPromotionAutomationJobsParams;
  result: ISyncPendingDashboardPromotionAutomationJobsResult;
}

const syncPendingDashboardPromotionAutomationJobsIR: any = {"usedParamSet":{"projectId":true,"promotionId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":257,"b":266},{"a":1767,"b":1776}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":293,"b":304}]}],"statement":"WITH promotion_config AS (\n  SELECT\n    p.promotion_id,\n    p.execution_mode,\n    p.scheduled_start_at,\n    p.scheduled_end_at,\n    p.loop_interval_unit,\n    p.loop_interval_value,\n    p.status AS promotion_status\n  FROM promotions p\n  WHERE p.project_id = :projectId\n    AND p.promotion_id = :promotionId\n)\nUPDATE promotion_automation_jobs jobs\nSET\n  status = CASE\n    WHEN config.promotion_status = 'stopped'\n      OR (config.scheduled_end_at IS NOT NULL AND config.scheduled_end_at <= now())\n      OR (\n        jobs.job_type = 'launch_run'\n        AND config.execution_mode = 'manual'\n        AND (\n          config.scheduled_start_at IS NULL\n          OR config.scheduled_start_at <= now()\n        )\n      )\n      OR (\n        jobs.job_type = 'evaluate_run'\n        AND config.execution_mode <> 'automatic'\n      )\n      THEN 'cancelled'\n    ELSE 'pending'\n  END,\n  scheduled_at = CASE\n    WHEN jobs.job_type = 'launch_run'\n      THEN GREATEST(COALESCE(config.scheduled_start_at, now()), now())\n    WHEN config.scheduled_end_at IS NOT NULL\n      AND config.scheduled_end_at < CASE\n        WHEN config.loop_interval_unit = 'hour'\n          THEN jobs.created_at + config.loop_interval_value * interval '1 hour'\n        ELSE jobs.created_at + config.loop_interval_value * interval '1 day'\n      END\n      THEN config.scheduled_end_at\n    WHEN config.loop_interval_unit = 'hour'\n      THEN jobs.created_at + config.loop_interval_value * interval '1 hour'\n    ELSE jobs.created_at + config.loop_interval_value * interval '1 day'\n  END,\n  updated_at = now()\nFROM promotion_runs promotion_run\nJOIN promotion_config config\n  ON config.promotion_id = promotion_run.promotion_id\nWHERE jobs.promotion_run_id = promotion_run.promotion_run_id\n  AND promotion_run.project_id = :projectId\n  AND (\n    jobs.status = 'pending'\n    OR (\n      jobs.status = 'cancelled'\n      AND jobs.job_type = 'launch_run'\n    )\n  )\nRETURNING\n  jobs.job_id AS \"jobId\",\n  jobs.job_type AS \"jobType\",\n  jobs.scheduled_at AS \"scheduledAt\",\n  jobs.status                                                                  "};

/**
 * Query generated from SQL:
 * ```
 * WITH promotion_config AS (
 *   SELECT
 *     p.promotion_id,
 *     p.execution_mode,
 *     p.scheduled_start_at,
 *     p.scheduled_end_at,
 *     p.loop_interval_unit,
 *     p.loop_interval_value,
 *     p.status AS promotion_status
 *   FROM promotions p
 *   WHERE p.project_id = :projectId
 *     AND p.promotion_id = :promotionId
 * )
 * UPDATE promotion_automation_jobs jobs
 * SET
 *   status = CASE
 *     WHEN config.promotion_status = 'stopped'
 *       OR (config.scheduled_end_at IS NOT NULL AND config.scheduled_end_at <= now())
 *       OR (
 *         jobs.job_type = 'launch_run'
 *         AND config.execution_mode = 'manual'
 *         AND (
 *           config.scheduled_start_at IS NULL
 *           OR config.scheduled_start_at <= now()
 *         )
 *       )
 *       OR (
 *         jobs.job_type = 'evaluate_run'
 *         AND config.execution_mode <> 'automatic'
 *       )
 *       THEN 'cancelled'
 *     ELSE 'pending'
 *   END,
 *   scheduled_at = CASE
 *     WHEN jobs.job_type = 'launch_run'
 *       THEN GREATEST(COALESCE(config.scheduled_start_at, now()), now())
 *     WHEN config.scheduled_end_at IS NOT NULL
 *       AND config.scheduled_end_at < CASE
 *         WHEN config.loop_interval_unit = 'hour'
 *           THEN jobs.created_at + config.loop_interval_value * interval '1 hour'
 *         ELSE jobs.created_at + config.loop_interval_value * interval '1 day'
 *       END
 *       THEN config.scheduled_end_at
 *     WHEN config.loop_interval_unit = 'hour'
 *       THEN jobs.created_at + config.loop_interval_value * interval '1 hour'
 *     ELSE jobs.created_at + config.loop_interval_value * interval '1 day'
 *   END,
 *   updated_at = now()
 * FROM promotion_runs promotion_run
 * JOIN promotion_config config
 *   ON config.promotion_id = promotion_run.promotion_id
 * WHERE jobs.promotion_run_id = promotion_run.promotion_run_id
 *   AND promotion_run.project_id = :projectId
 *   AND (
 *     jobs.status = 'pending'
 *     OR (
 *       jobs.status = 'cancelled'
 *       AND jobs.job_type = 'launch_run'
 *     )
 *   )
 * RETURNING
 *   jobs.job_id AS "jobId",
 *   jobs.job_type AS "jobType",
 *   jobs.scheduled_at AS "scheduledAt",
 *   jobs.status                                                                  
 * ```
 */
export const syncPendingDashboardPromotionAutomationJobs = new PreparedQuery<ISyncPendingDashboardPromotionAutomationJobsParams,ISyncPendingDashboardPromotionAutomationJobsResult>(syncPendingDashboardPromotionAutomationJobsIR);


/** 'ClaimDashboardPromotionAutomationJobs' parameters type */
export interface IClaimDashboardPromotionAutomationJobsParams {
  claimLimit?: NumberOrString | null | void;
  leaseSeconds?: number | null | void;
  leaseToken?: string | null | void;
  workerId?: string | null | void;
}

/** 'ClaimDashboardPromotionAutomationJobs' return type */
export interface IClaimDashboardPromotionAutomationJobsResult {
  attemptCount: number;
  campaignId: string;
  executionMode: string;
  jobId: string;
  jobType: string;
  leaseToken: string | null;
  loopCount: number;
  loopIntervalUnit: string;
  loopIntervalValue: number;
  maxLoopCount: number;
  projectId: string;
  promotionId: string;
  promotionRunId: string;
  promotionRunStatus: string;
  promotionStatus: string;
  scheduledAt: Date;
  scheduledEndAt: Date | null;
  scheduledStartAt: Date | null;
}

/** 'ClaimDashboardPromotionAutomationJobs' query type */
export interface IClaimDashboardPromotionAutomationJobsQuery {
  params: IClaimDashboardPromotionAutomationJobsParams;
  result: IClaimDashboardPromotionAutomationJobsResult;
}

const claimDashboardPromotionAutomationJobsIR: any = {"usedParamSet":{"claimLimit":true,"workerId":true,"leaseToken":true,"leaseSeconds":true},"params":[{"name":"claimLimit","required":false,"transform":{"type":"scalar"},"locs":[{"a":292,"b":302}]},{"name":"workerId","required":false,"transform":{"type":"scalar"},"locs":[{"a":450,"b":458}]},{"name":"leaseToken","required":false,"transform":{"type":"scalar"},"locs":[{"a":480,"b":490}]},{"name":"leaseSeconds","required":false,"transform":{"type":"scalar"},"locs":[{"a":555,"b":567}]}],"statement":"WITH candidates AS (\n  SELECT job_id\n  FROM promotion_automation_jobs\n  WHERE (\n      status = 'pending'\n      AND scheduled_at <= now()\n    ) OR (\n      status = 'running'\n      AND lease_expires_at <= now()\n    )\n  ORDER BY scheduled_at, created_at, job_id\n  FOR UPDATE SKIP LOCKED\n  LIMIT :claimLimit\n), claimed AS (\n  UPDATE promotion_automation_jobs jobs\n  SET\n    status = 'running',\n    attempt_count = jobs.attempt_count + 1,\n    worker_id = :workerId,\n    lease_token = (:leaseToken)::uuid,\n    locked_at = now(),\n    lease_expires_at = now() + (:leaseSeconds)::int * interval '1 second',\n    last_error_code = NULL,\n    last_error_detail = NULL,\n    updated_at = now()\n  FROM candidates\n  WHERE jobs.job_id = candidates.job_id\n  RETURNING jobs.*\n)\nSELECT\n  claimed.job_id AS \"jobId\",\n  claimed.promotion_run_id AS \"promotionRunId\",\n  claimed.job_type AS \"jobType\",\n  claimed.scheduled_at AS \"scheduledAt\",\n  claimed.attempt_count AS \"attemptCount\",\n  claimed.lease_token::text AS \"leaseToken\",\n  pr.project_id AS \"projectId\",\n  pr.campaign_id AS \"campaignId\",\n  pr.promotion_id AS \"promotionId\",\n  pr.loop_count AS \"loopCount\",\n  pr.status AS \"promotionRunStatus\",\n  p.execution_mode AS \"executionMode\",\n  p.scheduled_start_at AS \"scheduledStartAt\",\n  p.scheduled_end_at AS \"scheduledEndAt\",\n  p.loop_interval_unit AS \"loopIntervalUnit\",\n  p.loop_interval_value AS \"loopIntervalValue\",\n  p.max_loop_count AS \"maxLoopCount\",\n  p.status AS \"promotionStatus\"\nFROM claimed\nJOIN promotion_runs pr\n  ON pr.promotion_run_id = claimed.promotion_run_id\nJOIN promotions p\n  ON p.project_id = pr.project_id\n AND p.promotion_id = pr.promotion_id\nORDER BY claimed.scheduled_at, claimed.job_id                                              "};

/**
 * Query generated from SQL:
 * ```
 * WITH candidates AS (
 *   SELECT job_id
 *   FROM promotion_automation_jobs
 *   WHERE (
 *       status = 'pending'
 *       AND scheduled_at <= now()
 *     ) OR (
 *       status = 'running'
 *       AND lease_expires_at <= now()
 *     )
 *   ORDER BY scheduled_at, created_at, job_id
 *   FOR UPDATE SKIP LOCKED
 *   LIMIT :claimLimit
 * ), claimed AS (
 *   UPDATE promotion_automation_jobs jobs
 *   SET
 *     status = 'running',
 *     attempt_count = jobs.attempt_count + 1,
 *     worker_id = :workerId,
 *     lease_token = (:leaseToken)::uuid,
 *     locked_at = now(),
 *     lease_expires_at = now() + (:leaseSeconds)::int * interval '1 second',
 *     last_error_code = NULL,
 *     last_error_detail = NULL,
 *     updated_at = now()
 *   FROM candidates
 *   WHERE jobs.job_id = candidates.job_id
 *   RETURNING jobs.*
 * )
 * SELECT
 *   claimed.job_id AS "jobId",
 *   claimed.promotion_run_id AS "promotionRunId",
 *   claimed.job_type AS "jobType",
 *   claimed.scheduled_at AS "scheduledAt",
 *   claimed.attempt_count AS "attemptCount",
 *   claimed.lease_token::text AS "leaseToken",
 *   pr.project_id AS "projectId",
 *   pr.campaign_id AS "campaignId",
 *   pr.promotion_id AS "promotionId",
 *   pr.loop_count AS "loopCount",
 *   pr.status AS "promotionRunStatus",
 *   p.execution_mode AS "executionMode",
 *   p.scheduled_start_at AS "scheduledStartAt",
 *   p.scheduled_end_at AS "scheduledEndAt",
 *   p.loop_interval_unit AS "loopIntervalUnit",
 *   p.loop_interval_value AS "loopIntervalValue",
 *   p.max_loop_count AS "maxLoopCount",
 *   p.status AS "promotionStatus"
 * FROM claimed
 * JOIN promotion_runs pr
 *   ON pr.promotion_run_id = claimed.promotion_run_id
 * JOIN promotions p
 *   ON p.project_id = pr.project_id
 *  AND p.promotion_id = pr.promotion_id
 * ORDER BY claimed.scheduled_at, claimed.job_id                                              
 * ```
 */
export const claimDashboardPromotionAutomationJobs = new PreparedQuery<IClaimDashboardPromotionAutomationJobsParams,IClaimDashboardPromotionAutomationJobsResult>(claimDashboardPromotionAutomationJobsIR);


/** 'CompleteDashboardPromotionAutomationJob' parameters type */
export interface ICompleteDashboardPromotionAutomationJobParams {
  jobId?: string | null | void;
  leaseToken?: string | null | void;
}

/** 'CompleteDashboardPromotionAutomationJob' return type */
export interface ICompleteDashboardPromotionAutomationJobResult {
  jobId: string;
  status: string;
}

/** 'CompleteDashboardPromotionAutomationJob' query type */
export interface ICompleteDashboardPromotionAutomationJobQuery {
  params: ICompleteDashboardPromotionAutomationJobParams;
  result: ICompleteDashboardPromotionAutomationJobResult;
}

const completeDashboardPromotionAutomationJobIR: any = {"usedParamSet":{"jobId":true,"leaseToken":true},"params":[{"name":"jobId","required":false,"transform":{"type":"scalar"},"locs":[{"a":210,"b":215}]},{"name":"leaseToken","required":false,"transform":{"type":"scalar"},"locs":[{"a":263,"b":273}]}],"statement":"UPDATE promotion_automation_jobs\nSET\n  status = 'completed',\n  completed_at = now(),\n  worker_id = NULL,\n  lease_token = NULL,\n  locked_at = NULL,\n  lease_expires_at = NULL,\n  updated_at = now()\nWHERE job_id = :jobId\n  AND status = 'running'\n  AND lease_token = (:leaseToken)::uuid\nRETURNING job_id AS \"jobId\", status                                                  "};

/**
 * Query generated from SQL:
 * ```
 * UPDATE promotion_automation_jobs
 * SET
 *   status = 'completed',
 *   completed_at = now(),
 *   worker_id = NULL,
 *   lease_token = NULL,
 *   locked_at = NULL,
 *   lease_expires_at = NULL,
 *   updated_at = now()
 * WHERE job_id = :jobId
 *   AND status = 'running'
 *   AND lease_token = (:leaseToken)::uuid
 * RETURNING job_id AS "jobId", status                                                  
 * ```
 */
export const completeDashboardPromotionAutomationJob = new PreparedQuery<ICompleteDashboardPromotionAutomationJobParams,ICompleteDashboardPromotionAutomationJobResult>(completeDashboardPromotionAutomationJobIR);


/** 'FailDashboardPromotionAutomationJob' parameters type */
export interface IFailDashboardPromotionAutomationJobParams {
  errorCode?: string | null | void;
  errorDetail?: string | null | void;
  jobId?: string | null | void;
  leaseToken?: string | null | void;
  maxAttempts?: number | null | void;
  retryDelaySeconds?: number | null | void;
}

/** 'FailDashboardPromotionAutomationJob' return type */
export interface IFailDashboardPromotionAutomationJobResult {
  attemptCount: number;
  jobId: string;
  status: string;
}

/** 'FailDashboardPromotionAutomationJob' query type */
export interface IFailDashboardPromotionAutomationJobQuery {
  params: IFailDashboardPromotionAutomationJobParams;
  result: IFailDashboardPromotionAutomationJobResult;
}

const failDashboardPromotionAutomationJobIR: any = {"usedParamSet":{"maxAttempts":true,"retryDelaySeconds":true,"errorCode":true,"errorDetail":true,"jobId":true,"leaseToken":true},"params":[{"name":"maxAttempts","required":false,"transform":{"type":"scalar"},"locs":[{"a":74,"b":85},{"a":168,"b":179}]},{"name":"retryDelaySeconds","required":false,"transform":{"type":"scalar"},"locs":[{"a":201,"b":218}]},{"name":"errorCode","required":false,"transform":{"type":"scalar"},"locs":[{"a":297,"b":306}]},{"name":"errorDetail","required":false,"transform":{"type":"scalar"},"locs":[{"a":331,"b":342}]},{"name":"jobId","required":false,"transform":{"type":"scalar"},"locs":[{"a":470,"b":475}]},{"name":"leaseToken","required":false,"transform":{"type":"scalar"},"locs":[{"a":523,"b":533}]}],"statement":"UPDATE promotion_automation_jobs\nSET\n  status = CASE WHEN attempt_count < :maxAttempts THEN 'pending' ELSE 'failed' END,\n  scheduled_at = CASE\n    WHEN attempt_count < :maxAttempts\n      THEN now() + (:retryDelaySeconds)::int * interval '1 second'\n    ELSE scheduled_at\n  END,\n  last_error_code = :errorCode,\n  last_error_detail = :errorDetail,\n  worker_id = NULL,\n  lease_token = NULL,\n  locked_at = NULL,\n  lease_expires_at = NULL,\n  updated_at = now()\nWHERE job_id = :jobId\n  AND status = 'running'\n  AND lease_token = (:leaseToken)::uuid\nRETURNING job_id AS \"jobId\", status, attempt_count AS \"attemptCount\"                                                               "};

/**
 * Query generated from SQL:
 * ```
 * UPDATE promotion_automation_jobs
 * SET
 *   status = CASE WHEN attempt_count < :maxAttempts THEN 'pending' ELSE 'failed' END,
 *   scheduled_at = CASE
 *     WHEN attempt_count < :maxAttempts
 *       THEN now() + (:retryDelaySeconds)::int * interval '1 second'
 *     ELSE scheduled_at
 *   END,
 *   last_error_code = :errorCode,
 *   last_error_detail = :errorDetail,
 *   worker_id = NULL,
 *   lease_token = NULL,
 *   locked_at = NULL,
 *   lease_expires_at = NULL,
 *   updated_at = now()
 * WHERE job_id = :jobId
 *   AND status = 'running'
 *   AND lease_token = (:leaseToken)::uuid
 * RETURNING job_id AS "jobId", status, attempt_count AS "attemptCount"                                                               
 * ```
 */
export const failDashboardPromotionAutomationJob = new PreparedQuery<IFailDashboardPromotionAutomationJobParams,IFailDashboardPromotionAutomationJobResult>(failDashboardPromotionAutomationJobIR);


/** 'ListDashboardPromotionRunLaunchExperiments' parameters type */
export interface IListDashboardPromotionRunLaunchExperimentsParams {
  projectId?: string | null | void;
  promotionRunId?: string | null | void;
}

/** 'ListDashboardPromotionRunLaunchExperiments' return type */
export interface IListDashboardPromotionRunLaunchExperimentsResult {
  adExperimentId: string;
  channel: string;
  isFallback: boolean | null;
  promotionId: string;
  segmentId: string;
  status: string;
}

/** 'ListDashboardPromotionRunLaunchExperiments' query type */
export interface IListDashboardPromotionRunLaunchExperimentsQuery {
  params: IListDashboardPromotionRunLaunchExperimentsParams;
  result: IListDashboardPromotionRunLaunchExperimentsResult;
}

const listDashboardPromotionRunLaunchExperimentsIR: any = {"usedParamSet":{"projectId":true,"promotionRunId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":245,"b":254}]},{"name":"promotionRunId","required":false,"transform":{"type":"scalar"},"locs":[{"a":284,"b":298}]}],"statement":"SELECT\n  ae.ad_experiment_id AS \"adExperimentId\",\n  ae.promotion_id AS \"promotionId\",\n  ae.segment_id AS \"segmentId\",\n  ae.channel,\n  ae.status,\n  (ae.segment_id = 'seg_existing_all') AS \"isFallback\"\nFROM ad_experiments ae\nWHERE ae.project_id = :projectId\n  AND ae.promotion_run_id = :promotionRunId\n  AND (\n    ae.segment_id <> 'seg_existing_all'\n    OR EXISTS (\n      SELECT 1\n      FROM user_segment_assignments usa\n      WHERE usa.project_id = ae.project_id\n        AND usa.promotion_run_id = ae.promotion_run_id\n        AND usa.ad_experiment_id = ae.ad_experiment_id\n        AND usa.fallback = true\n    )\n  )\nORDER BY (ae.segment_id = 'seg_existing_all'), ae.ad_experiment_id                                                    "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   ae.ad_experiment_id AS "adExperimentId",
 *   ae.promotion_id AS "promotionId",
 *   ae.segment_id AS "segmentId",
 *   ae.channel,
 *   ae.status,
 *   (ae.segment_id = 'seg_existing_all') AS "isFallback"
 * FROM ad_experiments ae
 * WHERE ae.project_id = :projectId
 *   AND ae.promotion_run_id = :promotionRunId
 *   AND (
 *     ae.segment_id <> 'seg_existing_all'
 *     OR EXISTS (
 *       SELECT 1
 *       FROM user_segment_assignments usa
 *       WHERE usa.project_id = ae.project_id
 *         AND usa.promotion_run_id = ae.promotion_run_id
 *         AND usa.ad_experiment_id = ae.ad_experiment_id
 *         AND usa.fallback = true
 *     )
 *   )
 * ORDER BY (ae.segment_id = 'seg_existing_all'), ae.ad_experiment_id                                                    
 * ```
 */
export const listDashboardPromotionRunLaunchExperiments = new PreparedQuery<IListDashboardPromotionRunLaunchExperimentsParams,IListDashboardPromotionRunLaunchExperimentsResult>(listDashboardPromotionRunLaunchExperimentsIR);


/** 'GetDashboardPromotionRunAutomationConfig' parameters type */
export interface IGetDashboardPromotionRunAutomationConfigParams {
  projectId?: string | null | void;
  promotionRunId?: string | null | void;
}

/** 'GetDashboardPromotionRunAutomationConfig' return type */
export interface IGetDashboardPromotionRunAutomationConfigResult {
  executionMode: string;
  loopCount: number;
  loopIntervalUnit: string;
  loopIntervalValue: number;
  maxLoopCount: number;
  projectId: string;
  promotionId: string;
  promotionRunId: string;
  promotionRunStatus: string;
  promotionStatus: string;
  scheduledEndAt: Date | null;
  scheduledStartAt: Date | null;
}

/** 'GetDashboardPromotionRunAutomationConfig' query type */
export interface IGetDashboardPromotionRunAutomationConfigQuery {
  params: IGetDashboardPromotionRunAutomationConfigParams;
  result: IGetDashboardPromotionRunAutomationConfigResult;
}

const getDashboardPromotionRunAutomationConfigIR: any = {"usedParamSet":{"projectId":true,"promotionRunId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":613,"b":622}]},{"name":"promotionRunId","required":false,"transform":{"type":"scalar"},"locs":[{"a":652,"b":666}]}],"statement":"SELECT\n  pr.promotion_run_id AS \"promotionRunId\",\n  pr.project_id AS \"projectId\",\n  pr.promotion_id AS \"promotionId\",\n  pr.loop_count AS \"loopCount\",\n  pr.status AS \"promotionRunStatus\",\n  p.execution_mode AS \"executionMode\",\n  p.scheduled_start_at AS \"scheduledStartAt\",\n  p.scheduled_end_at AS \"scheduledEndAt\",\n  p.loop_interval_unit AS \"loopIntervalUnit\",\n  p.loop_interval_value AS \"loopIntervalValue\",\n  p.max_loop_count AS \"maxLoopCount\",\n  p.status AS \"promotionStatus\"\nFROM promotion_runs pr\nJOIN promotions p\n  ON p.project_id = pr.project_id\n AND p.promotion_id = pr.promotion_id\nWHERE pr.project_id = :projectId\n  AND pr.promotion_run_id = :promotionRunId"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   pr.promotion_run_id AS "promotionRunId",
 *   pr.project_id AS "projectId",
 *   pr.promotion_id AS "promotionId",
 *   pr.loop_count AS "loopCount",
 *   pr.status AS "promotionRunStatus",
 *   p.execution_mode AS "executionMode",
 *   p.scheduled_start_at AS "scheduledStartAt",
 *   p.scheduled_end_at AS "scheduledEndAt",
 *   p.loop_interval_unit AS "loopIntervalUnit",
 *   p.loop_interval_value AS "loopIntervalValue",
 *   p.max_loop_count AS "maxLoopCount",
 *   p.status AS "promotionStatus"
 * FROM promotion_runs pr
 * JOIN promotions p
 *   ON p.project_id = pr.project_id
 *  AND p.promotion_id = pr.promotion_id
 * WHERE pr.project_id = :projectId
 *   AND pr.promotion_run_id = :promotionRunId
 * ```
 */
export const getDashboardPromotionRunAutomationConfig = new PreparedQuery<IGetDashboardPromotionRunAutomationConfigParams,IGetDashboardPromotionRunAutomationConfigResult>(getDashboardPromotionRunAutomationConfigIR);


