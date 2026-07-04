/* eslint-disable @typescript-eslint/no-explicit-any */
/** Types generated for queries found in "src/features/ad-execution/database/ad-execution.sql" */
import { PreparedQuery } from "@pgtyped/runtime";

export type DateOrString = Date | string;

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

/** 'FindPromotionRun' parameters type */
export interface IFindPromotionRunParams {
  promotionRunId?: string | null | void;
}

/** 'FindPromotionRun' return type */
export interface IFindPromotionRunResult {
  analysisId: string;
  campaignId: string;
  createdAt: DateOrString;
  endedAt: DateOrString | null;
  generationId: string;
  loopCount: number;
  operatorInstruction: string | null;
  previousPromotionRunId: string | null;
  projectId: string;
  promotionId: string;
  promotionRunId: string;
  startedAt: DateOrString | null;
  status: string;
  summaryJson: Json;
  updatedAt: DateOrString;
}

/** 'FindPromotionRun' query type */
export interface IFindPromotionRunQuery {
  params: IFindPromotionRunParams;
  result: IFindPromotionRunResult;
}

const findPromotionRunStatement = `
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
WHERE promotion_run_id = :promotionRunId`;

export const findPromotionRun = new PreparedQuery<
  IFindPromotionRunParams,
  IFindPromotionRunResult
>(queryIR(findPromotionRunStatement, ["promotionRunId"]));

/** 'FindPromotion' parameters type */
export interface IFindPromotionParams {
  promotionId?: string | null | void;
}

/** 'FindPromotion' return type */
export interface IFindPromotionResult {
  campaignId: string;
  channel: string;
  createdAt: DateOrString;
  goalBasis: string;
  goalMetric: string;
  metadataJson: Json;
  name: string;
  projectId: string;
  promotionId: string;
  status: string;
  targetAudience: string;
  targetValue: string;
  updatedAt: DateOrString;
}

/** 'FindPromotion' query type */
export interface IFindPromotionQuery {
  params: IFindPromotionParams;
  result: IFindPromotionResult;
}

const findPromotionStatement = `
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
WHERE promotion_id = :promotionId`;

export const findPromotion = new PreparedQuery<IFindPromotionParams, IFindPromotionResult>(
  queryIR(findPromotionStatement, ["promotionId"])
);

/** 'FindAdExperiment' parameters type */
export interface IFindAdExperimentParams {
  adExperimentId?: string | null | void;
}

/** 'FindAdExperiment' return type */
export interface IFindAdExperimentResult {
  adExperimentId: string;
  analysisId: string;
  campaignId: string;
  channel: string;
  contentId: string;
  contentOptionId: string;
  createdAt: DateOrString;
  endedAt: DateOrString | null;
  generationId: string;
  goalBasis: string;
  goalMetric: string;
  goalTargetValue: string;
  loopCount: number;
  projectId: string;
  promotionId: string;
  promotionRunId: string;
  segmentId: string;
  segmentName: string | null;
  startedAt: DateOrString | null;
  status: string;
  updatedAt: DateOrString;
}

/** 'FindAdExperiment' query type */
export interface IFindAdExperimentQuery {
  params: IFindAdExperimentParams;
  result: IFindAdExperimentResult;
}

const findAdExperimentStatement = `
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
WHERE ad_experiment_id = :adExperimentId`;

export const findAdExperiment = new PreparedQuery<
  IFindAdExperimentParams,
  IFindAdExperimentResult
>(queryIR(findAdExperimentStatement, ["adExperimentId"]));

/** 'ListActiveAdServingAssignments' parameters type */
export interface IListActiveAdServingAssignmentsParams {
  promotionRunId?: string | null | void;
}

/** 'ListActiveAdServingAssignments' return type */
export interface IListActiveAdServingAssignmentsResult {
  adExperimentId: string | null;
  adExperimentStatus: string | null;
  body: string | null;
  campaignId: string | null;
  channel: string | null;
  contentId: string | null;
  contentOptionId: string | null;
  contentStatus: string | null;
  cta: string | null;
  fallback: boolean | null;
  imagePrompt: string | null;
  landingUrl: string | null;
  message: string | null;
  preheader: string | null;
  projectId: string | null;
  promotionId: string | null;
  promotionRunId: string | null;
  segmentId: string | null;
  similarityScore: string | null;
  subject: string | null;
  title: string | null;
  userId: string | null;
}

/** 'ListActiveAdServingAssignments' query type */
export interface IListActiveAdServingAssignmentsQuery {
  params: IListActiveAdServingAssignmentsParams;
  result: IListActiveAdServingAssignmentsResult;
}

const listActiveAdServingAssignmentsStatement = `
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
ORDER BY ad_experiment_id ASC, user_id ASC`;

export const listActiveAdServingAssignments = new PreparedQuery<
  IListActiveAdServingAssignmentsParams,
  IListActiveAdServingAssignmentsResult
>(queryIR(listActiveAdServingAssignmentsStatement, ["promotionRunId"]));

/** 'FindActiveBannerAssignment' parameters type */
export interface IFindActiveBannerAssignmentParams {
  projectId?: string | null | void;
  promotionRunId?: string | null | void;
  userId?: string | null | void;
}

/** 'FindActiveBannerAssignment' return type */
export type IFindActiveBannerAssignmentResult = IListActiveAdServingAssignmentsResult;

/** 'FindActiveBannerAssignment' query type */
export interface IFindActiveBannerAssignmentQuery {
  params: IFindActiveBannerAssignmentParams;
  result: IFindActiveBannerAssignmentResult;
}

const findActiveBannerAssignmentStatement = `
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
LIMIT 1`;

export const findActiveBannerAssignment = new PreparedQuery<
  IFindActiveBannerAssignmentParams,
  IFindActiveBannerAssignmentResult
>(queryIR(findActiveBannerAssignmentStatement, ["projectId", "promotionRunId", "userId"]));

/** 'FindDemoDispatchRecipient' parameters type */
export interface IFindDemoDispatchRecipientParams {
  userId?: string | null | void;
}

/** 'FindDemoDispatchRecipient' return type */
export interface IFindDemoDispatchRecipientResult {
  email: string | null;
  emailOptedIn: boolean;
  phoneNumber: string | null;
  smsOptedIn: boolean;
  userId: string;
}

/** 'FindDemoDispatchRecipient' query type */
export interface IFindDemoDispatchRecipientQuery {
  params: IFindDemoDispatchRecipientParams;
  result: IFindDemoDispatchRecipientResult;
}

const findDemoDispatchRecipientStatement = `
SELECT
  user_id AS "userId",
  email,
  phone_number AS "phoneNumber",
  COALESCE(email_opted_in, false) AS "emailOptedIn",
  COALESCE(sms_opted_in, false) AS "smsOptedIn"
FROM demo_recipients
WHERE user_id = :userId
LIMIT 1`;

export const findDemoDispatchRecipient = new PreparedQuery<
  IFindDemoDispatchRecipientParams,
  IFindDemoDispatchRecipientResult
>(queryIR(findDemoDispatchRecipientStatement, ["userId"]));

/** 'InsertDispatchJob' parameters type */
export interface IInsertDispatchJobParams {
  adExperimentId?: string | null | void;
  campaignId?: string | null | void;
  channel?: string | null | void;
  dispatchJobId?: string | null | void;
  projectId?: string | null | void;
  promotionId?: string | null | void;
  promotionRunId?: string | null | void;
  requestJson?: Json | null | void;
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

const insertDispatchJobStatement = `
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
  dispatch_job_id AS "dispatchJobId"`;

export const insertDispatchJob = new PreparedQuery<
  IInsertDispatchJobParams,
  IInsertDispatchJobResult
>(
  queryIR(insertDispatchJobStatement, [
    "dispatchJobId",
    "projectId",
    "campaignId",
    "promotionId",
    "promotionRunId",
    "adExperimentId",
    "channel",
    "targetCount",
    "requestJson"
  ])
);

/** 'UpdateDispatchJobResult' parameters type */
export interface IUpdateDispatchJobResultParams {
  dispatchedCount?: number | null | void;
  dispatchJobId?: string | null | void;
  failedCount?: number | null | void;
  resultJson?: Json | null | void;
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

const updateDispatchJobResultStatement = `
UPDATE ad_dispatch_jobs
SET
  status = :status,
  dispatched_count = :dispatchedCount,
  failed_count = :failedCount,
  result_json = :resultJson::jsonb,
  finished_at = now()
WHERE dispatch_job_id = :dispatchJobId
RETURNING
  dispatch_job_id AS "dispatchJobId"`;

export const updateDispatchJobResult = new PreparedQuery<
  IUpdateDispatchJobResultParams,
  IUpdateDispatchJobResultResult
>(
  queryIR(updateDispatchJobResultStatement, [
    "status",
    "dispatchedCount",
    "failedCount",
    "resultJson",
    "dispatchJobId"
  ])
);

/** 'InsertRedirectLink' parameters type */
export interface IInsertRedirectLinkParams {
  adExperimentId?: string | null | void;
  campaignId?: string | null | void;
  contentId?: string | null | void;
  contentOptionId?: string | null | void;
  destinationUrl?: string | null | void;
  expiresAt?: DateOrString | null | void;
  metadataJson?: Json | null | void;
  projectId?: string | null | void;
  promotionId?: string | null | void;
  promotionRunId?: string | null | void;
  redirectLinkId?: string | null | void;
  redirectToken?: string | null | void;
  segmentId?: string | null | void;
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

const insertRedirectLinkStatement = `
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
  redirect_token AS "redirectId"`;

export const insertRedirectLink = new PreparedQuery<
  IInsertRedirectLinkParams,
  IInsertRedirectLinkResult
>(
  queryIR(insertRedirectLinkStatement, [
    "redirectLinkId",
    "projectId",
    "campaignId",
    "promotionId",
    "promotionRunId",
    "adExperimentId",
    "segmentId",
    "userId",
    "contentId",
    "contentOptionId",
    "redirectToken",
    "destinationUrl",
    "metadataJson",
    "expiresAt"
  ])
);

/** 'FindRedirectLinkByToken' parameters type */
export interface IFindRedirectLinkByTokenParams {
  redirectId?: string | null | void;
}

/** 'FindRedirectLinkByToken' return type */
export interface IFindRedirectLinkByTokenResult {
  adExperimentId: string | null;
  campaignId: string;
  clickedAt: DateOrString | null;
  contentId: string | null;
  contentOptionId: string | null;
  createdAt: DateOrString;
  destinationUrl: string;
  expiresAt: DateOrString | null;
  metadataJson: Json;
  projectId: string;
  promotionId: string;
  promotionRunId: string;
  redirectLinkId: string;
  redirectToken: string;
  segmentId: string | null;
  status: string;
  updatedAt: DateOrString;
  userId: string | null;
}

/** 'FindRedirectLinkByToken' query type */
export interface IFindRedirectLinkByTokenQuery {
  params: IFindRedirectLinkByTokenParams;
  result: IFindRedirectLinkByTokenResult;
}

const findRedirectLinkByTokenStatement = `
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
LIMIT 1`;

export const findRedirectLinkByToken = new PreparedQuery<
  IFindRedirectLinkByTokenParams,
  IFindRedirectLinkByTokenResult
>(queryIR(findRedirectLinkByTokenStatement, ["redirectId"]));

function queryIR(statement: string, paramNames: readonly string[]): any {
  return {
    usedParamSet: Object.fromEntries(paramNames.map((name) => [name, true])),
    params: paramNames.map((name) => ({
      name,
      required: false,
      transform: { type: "scalar" },
      locs: findParamLocs(statement, name)
    })),
    statement
  };
}

function findParamLocs(statement: string, name: string) {
  const token = `:${name}`;
  const locs: Array<{ a: number; b: number }> = [];
  let index = statement.indexOf(token);

  while (index !== -1) {
    locs.push({ a: index, b: index + token.length - 1 });
    index = statement.indexOf(token, index + token.length);
  }

  return locs;
}
