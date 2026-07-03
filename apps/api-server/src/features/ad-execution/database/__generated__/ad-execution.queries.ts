/* eslint-disable @typescript-eslint/no-explicit-any */
/** Types generated for queries found in "src/features/ad-execution/database/ad-execution.sql" */
import { PreparedQuery } from "@pgtyped/runtime";

export type DateOrString = Date | string;

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

/** 'GetPromotionRunExecutionContext' parameters type */
export interface IGetPromotionRunExecutionContextParams {
  promotionRunId?: string | null | void;
}

/** 'GetPromotionRunExecutionContext' return type */
export interface IGetPromotionRunExecutionContextResult {
  campaignId: string;
  channel: string;
  projectId: string;
  promotionId: string;
  promotionRunId: string;
  promotionRunStatus: string;
}

/** 'GetPromotionRunExecutionContext' query type */
export interface IGetPromotionRunExecutionContextQuery {
  params: IGetPromotionRunExecutionContextParams;
  result: IGetPromotionRunExecutionContextResult;
}

const getPromotionRunExecutionContextIR: any = {
  usedParamSet: { promotionRunId: true },
  params: [
    {
      name: "promotionRunId",
      required: false,
      transform: { type: "scalar" },
      locs: [{ a: 319, b: 333 }]
    }
  ],
  statement:
    'SELECT\n  pr.promotion_run_id AS "promotionRunId",\n  pr.project_id AS "projectId",\n  pr.campaign_id AS "campaignId",\n  pr.promotion_id AS "promotionId",\n  pr.status AS "promotionRunStatus",\n  p.channel AS channel\nFROM promotion_runs pr\nJOIN promotions p\n  ON p.promotion_id = pr.promotion_id\nWHERE pr.promotion_run_id = :promotionRunId                                                                                  '
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   pr.promotion_run_id AS "promotionRunId",
 *   pr.project_id AS "projectId",
 *   pr.campaign_id AS "campaignId",
 *   pr.promotion_id AS "promotionId",
 *   pr.status AS "promotionRunStatus",
 *   p.channel AS channel
 * FROM promotion_runs pr
 * JOIN promotions p
 *   ON p.promotion_id = pr.promotion_id
 * WHERE pr.promotion_run_id = :promotionRunId
 * ```
 */
export const getPromotionRunExecutionContext = new PreparedQuery<
  IGetPromotionRunExecutionContextParams,
  IGetPromotionRunExecutionContextResult
>(getPromotionRunExecutionContextIR);

/** 'ListDispatchAssignments' parameters type */
export interface IListDispatchAssignmentsParams {
  promotionRunId?: string | null | void;
}

/** 'ListDispatchAssignments' return type */
export interface IListDispatchAssignmentsResult {
  adExperimentId: string | null;
  body: string | null;
  campaignId: string | null;
  channel: string | null;
  contentId: string | null;
  contentOptionId: string | null;
  cta: string | null;
  message: string | null;
  preheader: string | null;
  projectId: string | null;
  promotionId: string | null;
  promotionRunId: string | null;
  segmentId: string | null;
  subject: string | null;
  targetUrl: string | null;
  title: string | null;
  userId: string | null;
}

/** 'ListDispatchAssignments' query type */
export interface IListDispatchAssignmentsQuery {
  params: IListDispatchAssignmentsParams;
  result: IListDispatchAssignmentsResult;
}

const listDispatchAssignmentsIR: any = {
  usedParamSet: { promotionRunId: true },
  params: [
    {
      name: "promotionRunId",
      required: false,
      transform: { type: "scalar" },
      locs: [{ a: 619, b: 633 }]
    }
  ],
  statement:
    'SELECT\n  promotion_run_id AS "promotionRunId",\n  project_id AS "projectId",\n  campaign_id AS "campaignId",\n  promotion_id AS "promotionId",\n  user_id AS "userId",\n  segment_id AS "segmentId",\n  ad_experiment_id AS "adExperimentId",\n  content_id AS "contentId",\n  content_option_id AS "contentOptionId",\n  channel,\n  COALESCE(subject, \'\') AS subject,\n  COALESCE(preheader, \'\') AS preheader,\n  COALESCE(title, \'\') AS title,\n  COALESCE(body, \'\') AS body,\n  COALESCE(cta, \'\') AS cta,\n  COALESCE(message, \'\') AS message,\n  COALESCE(landing_url, \'\') AS "targetUrl"\nFROM active_ad_serving_assignments\nWHERE promotion_run_id = :promotionRunId\nORDER BY ad_experiment_id ASC, user_id ASC                                                                               '
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   promotion_run_id AS "promotionRunId",
 *   project_id AS "projectId",
 *   campaign_id AS "campaignId",
 *   promotion_id AS "promotionId",
 *   user_id AS "userId",
 *   segment_id AS "segmentId",
 *   ad_experiment_id AS "adExperimentId",
 *   content_id AS "contentId",
 *   content_option_id AS "contentOptionId",
 *   channel,
 *   COALESCE(subject, '') AS subject,
 *   COALESCE(preheader, '') AS preheader,
 *   COALESCE(title, '') AS title,
 *   COALESCE(body, '') AS body,
 *   COALESCE(cta, '') AS cta,
 *   COALESCE(message, '') AS message,
 *   COALESCE(landing_url, '') AS "targetUrl"
 * FROM active_ad_serving_assignments
 * WHERE promotion_run_id = :promotionRunId
 * ORDER BY ad_experiment_id ASC, user_id ASC
 * ```
 */
export const listDispatchAssignments = new PreparedQuery<
  IListDispatchAssignmentsParams,
  IListDispatchAssignmentsResult
>(listDispatchAssignmentsIR);

/** 'FindBannerAssignment' parameters type */
export interface IFindBannerAssignmentParams {
  projectId?: string | null | void;
  promotionRunId?: string | null | void;
  userId?: string | null | void;
}

/** 'FindBannerAssignment' return type */
export interface IFindBannerAssignmentResult {
  adExperimentId: string | null;
  body: string | null;
  campaignId: string | null;
  channel: string | null;
  contentId: string | null;
  contentOptionId: string | null;
  cta: string | null;
  projectId: string | null;
  promotionId: string | null;
  promotionRunId: string | null;
  segmentId: string | null;
  targetUrl: string | null;
  title: string | null;
  userId: string | null;
}

/** 'FindBannerAssignment' query type */
export interface IFindBannerAssignmentQuery {
  params: IFindBannerAssignmentParams;
  result: IFindBannerAssignmentResult;
}

const findBannerAssignmentIR: any = {
  usedParamSet: { projectId: true, promotionRunId: true, userId: true },
  params: [
    {
      name: "projectId",
      required: false,
      transform: { type: "scalar" },
      locs: [{ a: 501, b: 510 }]
    },
    {
      name: "promotionRunId",
      required: false,
      transform: { type: "scalar" },
      locs: [{ a: 537, b: 551 }]
    },
    { name: "userId", required: false, transform: { type: "scalar" }, locs: [{ a: 569, b: 575 }] }
  ],
  statement:
    'SELECT\n  promotion_run_id AS "promotionRunId",\n  project_id AS "projectId",\n  campaign_id AS "campaignId",\n  promotion_id AS "promotionId",\n  user_id AS "userId",\n  segment_id AS "segmentId",\n  ad_experiment_id AS "adExperimentId",\n  content_id AS "contentId",\n  content_option_id AS "contentOptionId",\n  channel,\n  COALESCE(title, \'\') AS title,\n  COALESCE(body, \'\') AS body,\n  COALESCE(cta, \'\') AS cta,\n  COALESCE(landing_url, \'\') AS "targetUrl"\nFROM active_ad_serving_assignments\nWHERE project_id = :projectId\n  AND promotion_run_id = :promotionRunId\n  AND user_id = :userId\n  AND channel = \'onsite_banner\'\nLIMIT 1                                                                  '
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   promotion_run_id AS "promotionRunId",
 *   project_id AS "projectId",
 *   campaign_id AS "campaignId",
 *   promotion_id AS "promotionId",
 *   user_id AS "userId",
 *   segment_id AS "segmentId",
 *   ad_experiment_id AS "adExperimentId",
 *   content_id AS "contentId",
 *   content_option_id AS "contentOptionId",
 *   channel,
 *   COALESCE(title, '') AS title,
 *   COALESCE(body, '') AS body,
 *   COALESCE(cta, '') AS cta,
 *   COALESCE(landing_url, '') AS "targetUrl"
 * FROM active_ad_serving_assignments
 * WHERE project_id = :projectId
 *   AND promotion_run_id = :promotionRunId
 *   AND user_id = :userId
 *   AND channel = 'onsite_banner'
 * LIMIT 1
 * ```
 */
export const findBannerAssignment = new PreparedQuery<
  IFindBannerAssignmentParams,
  IFindBannerAssignmentResult
>(findBannerAssignmentIR);

/** 'InsertDispatchJob' parameters type */
export interface IInsertDispatchJobParams {
  adExperimentId?: string | null | void;
  campaignId?: string | null | void;
  channel?: string | null | void;
  dispatchJobId?: string | null | void;
  metadataJson?: Json | null | void;
  projectId?: string | null | void;
  promotionId?: string | null | void;
  promotionRunId?: string | null | void;
  provider?: string | null | void;
  targetCount?: number | null | void;
}

/** 'InsertDispatchJob' return type */
export interface IInsertDispatchJobResult {
  dispatchJobId: string;
}

/** 'InsertDispatchJob' query type */
export interface IInsertDispatchJobQuery {
  params: IInsertDispatchJobParams;
  result: IInsertDispatchJobResult;
}

const insertDispatchJobIR: any = {
  usedParamSet: {
    dispatchJobId: true,
    projectId: true,
    campaignId: true,
    promotionId: true,
    promotionRunId: true,
    adExperimentId: true,
    channel: true,
    provider: true,
    targetCount: true,
    metadataJson: true
  },
  params: [
    {
      name: "dispatchJobId",
      required: false,
      transform: { type: "scalar" },
      locs: [{ a: 260, b: 273 }]
    },
    {
      name: "projectId",
      required: false,
      transform: { type: "scalar" },
      locs: [{ a: 278, b: 287 }]
    },
    {
      name: "campaignId",
      required: false,
      transform: { type: "scalar" },
      locs: [{ a: 292, b: 302 }]
    },
    {
      name: "promotionId",
      required: false,
      transform: { type: "scalar" },
      locs: [{ a: 307, b: 318 }]
    },
    {
      name: "promotionRunId",
      required: false,
      transform: { type: "scalar" },
      locs: [{ a: 323, b: 337 }]
    },
    {
      name: "adExperimentId",
      required: false,
      transform: { type: "scalar" },
      locs: [{ a: 342, b: 356 }]
    },
    { name: "channel", required: false, transform: { type: "scalar" }, locs: [{ a: 361, b: 368 }] },
    {
      name: "provider",
      required: false,
      transform: { type: "scalar" },
      locs: [{ a: 386, b: 394 }]
    },
    {
      name: "targetCount",
      required: false,
      transform: { type: "scalar" },
      locs: [{ a: 399, b: 410 }]
    },
    {
      name: "metadataJson",
      required: false,
      transform: { type: "scalar" },
      locs: [{ a: 425, b: 437 }]
    }
  ],
  statement:
    "INSERT INTO ad_dispatch_jobs (\n  ad_dispatch_job_id,\n  project_id,\n  campaign_id,\n  promotion_id,\n  promotion_run_id,\n  ad_experiment_id,\n  channel,\n  status,\n  provider,\n  target_count,\n  sent_count,\n  failed_count,\n  metadata_json,\n  started_at\n)\nVALUES (\n  :dispatchJobId,\n  :projectId,\n  :campaignId,\n  :promotionId,\n  :promotionRunId,\n  :adExperimentId,\n  :channel,\n  'running',\n  :provider,\n  :targetCount,\n  0,\n  0,\n  :metadataJson::jsonb,\n  now()\n)\nRETURNING\n  ad_dispatch_job_id AS \"dispatchJobId\"                                                                                    "
};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO ad_dispatch_jobs (
 *   ad_dispatch_job_id,
 *   project_id,
 *   campaign_id,
 *   promotion_id,
 *   promotion_run_id,
 *   ad_experiment_id,
 *   channel,
 *   status,
 *   provider,
 *   target_count,
 *   sent_count,
 *   failed_count,
 *   metadata_json,
 *   started_at
 * )
 * VALUES (
 *   :dispatchJobId,
 *   :projectId,
 *   :campaignId,
 *   :promotionId,
 *   :promotionRunId,
 *   :adExperimentId,
 *   :channel,
 *   'running',
 *   :provider,
 *   :targetCount,
 *   0,
 *   0,
 *   :metadataJson::jsonb,
 *   now()
 * )
 * RETURNING
 *   ad_dispatch_job_id AS "dispatchJobId"
 * ```
 */
export const insertDispatchJob = new PreparedQuery<
  IInsertDispatchJobParams,
  IInsertDispatchJobResult
>(insertDispatchJobIR);

/** 'UpdateDispatchJobResult' parameters type */
export interface IUpdateDispatchJobResultParams {
  dispatchedCount?: number | null | void;
  dispatchJobId?: string | null | void;
  failedCount?: number | null | void;
  metadataJson?: Json | null | void;
  status?: string | null | void;
}

/** 'UpdateDispatchJobResult' return type */
export interface IUpdateDispatchJobResultResult {
  dispatchJobId: string;
}

/** 'UpdateDispatchJobResult' query type */
export interface IUpdateDispatchJobResultQuery {
  params: IUpdateDispatchJobResultParams;
  result: IUpdateDispatchJobResultResult;
}

const updateDispatchJobResultIR: any = {
  usedParamSet: {
    status: true,
    dispatchedCount: true,
    failedCount: true,
    metadataJson: true,
    dispatchJobId: true
  },
  params: [
    { name: "status", required: false, transform: { type: "scalar" }, locs: [{ a: 39, b: 45 }] },
    {
      name: "dispatchedCount",
      required: false,
      transform: { type: "scalar" },
      locs: [{ a: 63, b: 78 }]
    },
    {
      name: "failedCount",
      required: false,
      transform: { type: "scalar" },
      locs: [{ a: 98, b: 109 }]
    },
    {
      name: "metadataJson",
      required: false,
      transform: { type: "scalar" },
      locs: [{ a: 130, b: 142 }]
    },
    {
      name: "dispatchJobId",
      required: false,
      transform: { type: "scalar" },
      locs: [{ a: 202, b: 215 }]
    }
  ],
  statement:
    'UPDATE ad_dispatch_jobs\nSET\n  status = :status,\n  sent_count = :dispatchedCount,\n  failed_count = :failedCount,\n  metadata_json = :metadataJson::jsonb,\n  completed_at = now()\nWHERE ad_dispatch_job_id = :dispatchJobId\nRETURNING\n  ad_dispatch_job_id AS "dispatchJobId"                                                                                '
};

/**
 * Query generated from SQL:
 * ```
 * UPDATE ad_dispatch_jobs
 * SET
 *   status = :status,
 *   sent_count = :dispatchedCount,
 *   failed_count = :failedCount,
 *   metadata_json = :metadataJson::jsonb,
 *   completed_at = now()
 * WHERE ad_dispatch_job_id = :dispatchJobId
 * RETURNING
 *   ad_dispatch_job_id AS "dispatchJobId"
 * ```
 */
export const updateDispatchJobResult = new PreparedQuery<
  IUpdateDispatchJobResultParams,
  IUpdateDispatchJobResultResult
>(updateDispatchJobResultIR);

/** 'InsertRedirectLink' parameters type */
export interface IInsertRedirectLinkParams {
  adExperimentId?: string | null | void;
  campaignId?: string | null | void;
  contentId?: string | null | void;
  contentOptionId?: string | null | void;
  expiresAt?: DateOrString | null | void;
  projectId?: string | null | void;
  promotionId?: string | null | void;
  promotionRunId?: string | null | void;
  redirectId?: string | null | void;
  segmentId?: string | null | void;
  targetUrl?: string | null | void;
  userId?: string | null | void;
}

/** 'InsertRedirectLink' return type */
export interface IInsertRedirectLinkResult {
  redirectId: string;
}

/** 'InsertRedirectLink' query type */
export interface IInsertRedirectLinkQuery {
  params: IInsertRedirectLinkParams;
  result: IInsertRedirectLinkResult;
}

const insertRedirectLinkIR: any = {
  usedParamSet: {
    redirectId: true,
    projectId: true,
    campaignId: true,
    promotionId: true,
    promotionRunId: true,
    adExperimentId: true,
    segmentId: true,
    userId: true,
    contentId: true,
    contentOptionId: true,
    targetUrl: true,
    expiresAt: true
  },
  params: [
    {
      name: "redirectId",
      required: false,
      transform: { type: "scalar" },
      locs: [{ a: 229, b: 239 }]
    },
    {
      name: "projectId",
      required: false,
      transform: { type: "scalar" },
      locs: [{ a: 244, b: 253 }]
    },
    {
      name: "campaignId",
      required: false,
      transform: { type: "scalar" },
      locs: [{ a: 258, b: 268 }]
    },
    {
      name: "promotionId",
      required: false,
      transform: { type: "scalar" },
      locs: [{ a: 273, b: 284 }]
    },
    {
      name: "promotionRunId",
      required: false,
      transform: { type: "scalar" },
      locs: [{ a: 289, b: 303 }]
    },
    {
      name: "adExperimentId",
      required: false,
      transform: { type: "scalar" },
      locs: [{ a: 308, b: 322 }]
    },
    {
      name: "segmentId",
      required: false,
      transform: { type: "scalar" },
      locs: [{ a: 327, b: 336 }]
    },
    { name: "userId", required: false, transform: { type: "scalar" }, locs: [{ a: 341, b: 347 }] },
    {
      name: "contentId",
      required: false,
      transform: { type: "scalar" },
      locs: [{ a: 352, b: 361 }]
    },
    {
      name: "contentOptionId",
      required: false,
      transform: { type: "scalar" },
      locs: [{ a: 366, b: 381 }]
    },
    {
      name: "targetUrl",
      required: false,
      transform: { type: "scalar" },
      locs: [{ a: 386, b: 395 }]
    },
    {
      name: "expiresAt",
      required: false,
      transform: { type: "scalar" },
      locs: [{ a: 400, b: 409 }]
    }
  ],
  statement:
    'INSERT INTO redirect_links (\n  redirect_id,\n  project_id,\n  campaign_id,\n  promotion_id,\n  promotion_run_id,\n  ad_experiment_id,\n  segment_id,\n  user_id,\n  content_id,\n  content_option_id,\n  target_url,\n  expires_at\n)\nVALUES (\n  :redirectId,\n  :projectId,\n  :campaignId,\n  :promotionId,\n  :promotionRunId,\n  :adExperimentId,\n  :segmentId,\n  :userId,\n  :contentId,\n  :contentOptionId,\n  :targetUrl,\n  :expiresAt::timestamptz\n)\nRETURNING\n  redirect_id AS "redirectId"                                                                           '
};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO redirect_links (
 *   redirect_id,
 *   project_id,
 *   campaign_id,
 *   promotion_id,
 *   promotion_run_id,
 *   ad_experiment_id,
 *   segment_id,
 *   user_id,
 *   content_id,
 *   content_option_id,
 *   target_url,
 *   expires_at
 * )
 * VALUES (
 *   :redirectId,
 *   :projectId,
 *   :campaignId,
 *   :promotionId,
 *   :promotionRunId,
 *   :adExperimentId,
 *   :segmentId,
 *   :userId,
 *   :contentId,
 *   :contentOptionId,
 *   :targetUrl,
 *   :expiresAt::timestamptz
 * )
 * RETURNING
 *   redirect_id AS "redirectId"
 * ```
 */
export const insertRedirectLink = new PreparedQuery<
  IInsertRedirectLinkParams,
  IInsertRedirectLinkResult
>(insertRedirectLinkIR);

/** 'FindRedirectLink' parameters type */
export interface IFindRedirectLinkParams {
  redirectId?: string | null | void;
}

/** 'FindRedirectLink' return type */
export interface IFindRedirectLinkResult {
  adExperimentId: string;
  campaignId: string;
  contentId: string;
  contentOptionId: string;
  expiresAt: Date | null;
  projectId: string;
  promotionChannel: string | null;
  promotionId: string;
  promotionRunId: string;
  redirectId: string;
  segmentId: string;
  targetUrl: string;
  userId: string;
}

/** 'FindRedirectLink' query type */
export interface IFindRedirectLinkQuery {
  params: IFindRedirectLinkParams;
  result: IFindRedirectLinkResult;
}

const findRedirectLinkIR: any = {
  usedParamSet: { redirectId: true },
  params: [
    {
      name: "redirectId",
      required: false,
      transform: { type: "scalar" },
      locs: [{ a: 670, b: 680 }]
    }
  ],
  statement:
    'SELECT\n  rl.redirect_id AS "redirectId",\n  rl.project_id AS "projectId",\n  rl.campaign_id AS "campaignId",\n  rl.promotion_id AS "promotionId",\n  rl.promotion_run_id AS "promotionRunId",\n  rl.ad_experiment_id AS "adExperimentId",\n  rl.segment_id AS "segmentId",\n  rl.user_id AS "userId",\n  rl.content_id AS "contentId",\n  rl.content_option_id AS "contentOptionId",\n  rl.target_url AS "targetUrl",\n  rl.expires_at AS "expiresAt",\n  COALESCE(ae.channel, p.channel, \'\') AS "promotionChannel"\nFROM redirect_links rl\nLEFT JOIN ad_experiments ae\n  ON ae.ad_experiment_id = rl.ad_experiment_id\nLEFT JOIN promotions p\n  ON p.promotion_id = rl.promotion_id\nWHERE rl.redirect_id = :redirectId\nLIMIT 1'
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   rl.redirect_id AS "redirectId",
 *   rl.project_id AS "projectId",
 *   rl.campaign_id AS "campaignId",
 *   rl.promotion_id AS "promotionId",
 *   rl.promotion_run_id AS "promotionRunId",
 *   rl.ad_experiment_id AS "adExperimentId",
 *   rl.segment_id AS "segmentId",
 *   rl.user_id AS "userId",
 *   rl.content_id AS "contentId",
 *   rl.content_option_id AS "contentOptionId",
 *   rl.target_url AS "targetUrl",
 *   rl.expires_at AS "expiresAt",
 *   COALESCE(ae.channel, p.channel, '') AS "promotionChannel"
 * FROM redirect_links rl
 * LEFT JOIN ad_experiments ae
 *   ON ae.ad_experiment_id = rl.ad_experiment_id
 * LEFT JOIN promotions p
 *   ON p.promotion_id = rl.promotion_id
 * WHERE rl.redirect_id = :redirectId
 * LIMIT 1
 * ```
 */
export const findRedirectLink = new PreparedQuery<IFindRedirectLinkParams, IFindRedirectLinkResult>(
  findRedirectLinkIR
);
