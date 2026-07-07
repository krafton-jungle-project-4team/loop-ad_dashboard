/** Types generated for queries found in "src/features/ad-execution/database/ad-execution.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

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
  createdAt: Date;
  endedAt: Date | null;
  generationId: string;
  goalSnapshotJson: Json;
  loopCount: number;
  projectId: string;
  promotionId: string;
  promotionRunId: string;
  startedAt: Date | null;
  status: string;
  updatedAt: Date;
}

/** 'FindPromotionRun' query type */
export interface IFindPromotionRunQuery {
  params: IFindPromotionRunParams;
  result: IFindPromotionRunResult;
}

const findPromotionRunIR: any = {"usedParamSet":{"promotionRunId":true},"params":[{"name":"promotionRunId","required":false,"transform":{"type":"scalar"},"locs":[{"a":445,"b":459}]}],"statement":"SELECT\n  promotion_run_id AS \"promotionRunId\",\n  project_id AS \"projectId\",\n  campaign_id AS \"campaignId\",\n  promotion_id AS \"promotionId\",\n  analysis_id AS \"analysisId\",\n  generation_id AS \"generationId\",\n  loop_count AS \"loopCount\",\n  status,\n  goal_snapshot_json AS \"goalSnapshotJson\",\n  started_at AS \"startedAt\",\n  ended_at AS \"endedAt\",\n  created_at AS \"createdAt\",\n  updated_at AS \"updatedAt\"\nFROM promotion_runs\nWHERE promotion_run_id = :promotionRunId                                                        "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   promotion_run_id AS "promotionRunId",
 *   project_id AS "projectId",
 *   campaign_id AS "campaignId",
 *   promotion_id AS "promotionId",
 *   analysis_id AS "analysisId",
 *   generation_id AS "generationId",
 *   loop_count AS "loopCount",
 *   status,
 *   goal_snapshot_json AS "goalSnapshotJson",
 *   started_at AS "startedAt",
 *   ended_at AS "endedAt",
 *   created_at AS "createdAt",
 *   updated_at AS "updatedAt"
 * FROM promotion_runs
 * WHERE promotion_run_id = :promotionRunId                                                        
 * ```
 */
export const findPromotionRun = new PreparedQuery<IFindPromotionRunParams,IFindPromotionRunResult>(findPromotionRunIR);


/** 'FindPromotion' parameters type */
export interface IFindPromotionParams {
  promotionId?: string | null | void;
}

/** 'FindPromotion' return type */
export interface IFindPromotionResult {
  campaignId: string;
  channel: string;
  createdAt: Date;
  goalBasis: string;
  goalMetric: string;
  goalTargetValue: string;
  marketingTheme: string;
  metadataJson: Json;
  projectId: string;
  promotionId: string;
  status: string;
  targetAudience: string;
  updatedAt: Date;
}

/** 'FindPromotion' query type */
export interface IFindPromotionQuery {
  params: IFindPromotionParams;
  result: IFindPromotionResult;
}

const findPromotionIR: any = {"usedParamSet":{"promotionId":true},"params":[{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":430,"b":441}]}],"statement":"SELECT\n  promotion_id AS \"promotionId\",\n  project_id AS \"projectId\",\n  campaign_id AS \"campaignId\",\n  marketing_theme AS \"marketingTheme\",\n  channel,\n  target_audience AS \"targetAudience\",\n  goal_metric AS \"goalMetric\",\n  goal_target_value AS \"goalTargetValue\",\n  goal_basis AS \"goalBasis\",\n  status,\n  metadata_json AS \"metadataJson\",\n  created_at AS \"createdAt\",\n  updated_at AS \"updatedAt\"\nFROM promotions\nWHERE promotion_id = :promotionId                                                            "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   promotion_id AS "promotionId",
 *   project_id AS "projectId",
 *   campaign_id AS "campaignId",
 *   marketing_theme AS "marketingTheme",
 *   channel,
 *   target_audience AS "targetAudience",
 *   goal_metric AS "goalMetric",
 *   goal_target_value AS "goalTargetValue",
 *   goal_basis AS "goalBasis",
 *   status,
 *   metadata_json AS "metadataJson",
 *   created_at AS "createdAt",
 *   updated_at AS "updatedAt"
 * FROM promotions
 * WHERE promotion_id = :promotionId                                                            
 * ```
 */
export const findPromotion = new PreparedQuery<IFindPromotionParams,IFindPromotionResult>(findPromotionIR);


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
  createdAt: Date;
  endedAt: Date | null;
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
  startedAt: Date | null;
  status: string;
  updatedAt: Date;
}

/** 'FindAdExperiment' query type */
export interface IFindAdExperimentQuery {
  params: IFindAdExperimentParams;
  result: IFindAdExperimentResult;
}

const findAdExperimentIR: any = {"usedParamSet":{"adExperimentId":true},"params":[{"name":"adExperimentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":687,"b":701}]}],"statement":"SELECT\n  ad_experiment_id AS \"adExperimentId\",\n  project_id AS \"projectId\",\n  campaign_id AS \"campaignId\",\n  promotion_id AS \"promotionId\",\n  promotion_run_id AS \"promotionRunId\",\n  analysis_id AS \"analysisId\",\n  generation_id AS \"generationId\",\n  segment_id AS \"segmentId\",\n  segment_name AS \"segmentName\",\n  content_id AS \"contentId\",\n  content_option_id AS \"contentOptionId\",\n  channel,\n  loop_count AS \"loopCount\",\n  status,\n  goal_metric AS \"goalMetric\",\n  goal_target_value AS \"goalTargetValue\",\n  goal_basis AS \"goalBasis\",\n  started_at AS \"startedAt\",\n  ended_at AS \"endedAt\",\n  created_at AS \"createdAt\",\n  updated_at AS \"updatedAt\"\nFROM ad_experiments\nWHERE ad_experiment_id = :adExperimentId                                                                                  "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   ad_experiment_id AS "adExperimentId",
 *   project_id AS "projectId",
 *   campaign_id AS "campaignId",
 *   promotion_id AS "promotionId",
 *   promotion_run_id AS "promotionRunId",
 *   analysis_id AS "analysisId",
 *   generation_id AS "generationId",
 *   segment_id AS "segmentId",
 *   segment_name AS "segmentName",
 *   content_id AS "contentId",
 *   content_option_id AS "contentOptionId",
 *   channel,
 *   loop_count AS "loopCount",
 *   status,
 *   goal_metric AS "goalMetric",
 *   goal_target_value AS "goalTargetValue",
 *   goal_basis AS "goalBasis",
 *   started_at AS "startedAt",
 *   ended_at AS "endedAt",
 *   created_at AS "createdAt",
 *   updated_at AS "updatedAt"
 * FROM ad_experiments
 * WHERE ad_experiment_id = :adExperimentId                                                                                  
 * ```
 */
export const findAdExperiment = new PreparedQuery<IFindAdExperimentParams,IFindAdExperimentResult>(findAdExperimentIR);


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

const listActiveAdServingAssignmentsIR: any = {"usedParamSet":{"promotionRunId":true},"params":[{"name":"promotionRunId","required":false,"transform":{"type":"scalar"},"locs":[{"a":820,"b":834}]}],"statement":"SELECT\n  aas.promotion_run_id AS \"promotionRunId\",\n  aas.user_id AS \"userId\",\n  aas.segment_id AS \"segmentId\",\n  aas.ad_experiment_id AS \"adExperimentId\",\n  aas.content_id AS \"contentId\",\n  aas.content_option_id AS \"contentOptionId\",\n  aas.fallback,\n  aas.similarity_score AS \"similarityScore\",\n  aas.project_id AS \"projectId\",\n  aas.campaign_id AS \"campaignId\",\n  aas.promotion_id AS \"promotionId\",\n  aas.channel,\n  aas.subject,\n  aas.preheader,\n  aas.title,\n  aas.body,\n  aas.cta,\n  aas.message,\n  aas.image_prompt AS \"imagePrompt\",\n  p.landing_url AS \"landingUrl\",\n  aas.content_status AS \"contentStatus\",\n  aas.ad_experiment_status AS \"adExperimentStatus\"\nFROM active_ad_serving_assignments aas\nJOIN promotions p\n  ON p.project_id = aas.project_id\n AND p.promotion_id = aas.promotion_id\nWHERE aas.promotion_run_id = :promotionRunId\n\nORDER BY aas.ad_experiment_id ASC, aas.user_id ASC                                                                               "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   aas.promotion_run_id AS "promotionRunId",
 *   aas.user_id AS "userId",
 *   aas.segment_id AS "segmentId",
 *   aas.ad_experiment_id AS "adExperimentId",
 *   aas.content_id AS "contentId",
 *   aas.content_option_id AS "contentOptionId",
 *   aas.fallback,
 *   aas.similarity_score AS "similarityScore",
 *   aas.project_id AS "projectId",
 *   aas.campaign_id AS "campaignId",
 *   aas.promotion_id AS "promotionId",
 *   aas.channel,
 *   aas.subject,
 *   aas.preheader,
 *   aas.title,
 *   aas.body,
 *   aas.cta,
 *   aas.message,
 *   aas.image_prompt AS "imagePrompt",
 *   p.landing_url AS "landingUrl",
 *   aas.content_status AS "contentStatus",
 *   aas.ad_experiment_status AS "adExperimentStatus"
 * FROM active_ad_serving_assignments aas
 * JOIN promotions p
 *   ON p.project_id = aas.project_id
 *  AND p.promotion_id = aas.promotion_id
 * WHERE aas.promotion_run_id = :promotionRunId
 * 
 * ORDER BY aas.ad_experiment_id ASC, aas.user_id ASC                                                                               
 * ```
 */
export const listActiveAdServingAssignments = new PreparedQuery<IListActiveAdServingAssignmentsParams,IListActiveAdServingAssignmentsResult>(listActiveAdServingAssignmentsIR);


/** 'FindActiveBannerAssignment' parameters type */
export interface IFindActiveBannerAssignmentParams {
  projectId?: string | null | void;
  promotionRunId?: string | null | void;
  userId?: string | null | void;
}

/** 'FindActiveBannerAssignment' return type */
export interface IFindActiveBannerAssignmentResult {
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

/** 'FindActiveBannerAssignment' query type */
export interface IFindActiveBannerAssignmentQuery {
  params: IFindActiveBannerAssignmentParams;
  result: IFindActiveBannerAssignmentResult;
}

const findActiveBannerAssignmentIR: any = {"usedParamSet":{"projectId":true,"promotionRunId":true,"userId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":814,"b":823}]},{"name":"promotionRunId","required":false,"transform":{"type":"scalar"},"locs":[{"a":854,"b":868}]},{"name":"userId","required":false,"transform":{"type":"scalar"},"locs":[{"a":890,"b":896}]}],"statement":"SELECT\n  aas.promotion_run_id AS \"promotionRunId\",\n  aas.user_id AS \"userId\",\n  aas.segment_id AS \"segmentId\",\n  aas.ad_experiment_id AS \"adExperimentId\",\n  aas.content_id AS \"contentId\",\n  aas.content_option_id AS \"contentOptionId\",\n  aas.fallback,\n  aas.similarity_score AS \"similarityScore\",\n  aas.project_id AS \"projectId\",\n  aas.campaign_id AS \"campaignId\",\n  aas.promotion_id AS \"promotionId\",\n  aas.channel,\n  aas.subject,\n  aas.preheader,\n  aas.title,\n  aas.body,\n  aas.cta,\n  aas.message,\n  aas.image_prompt AS \"imagePrompt\",\n  p.landing_url AS \"landingUrl\",\n  aas.content_status AS \"contentStatus\",\n  aas.ad_experiment_status AS \"adExperimentStatus\"\nFROM active_ad_serving_assignments aas\nJOIN promotions p\n  ON p.project_id = aas.project_id\n AND p.promotion_id = aas.promotion_id\nWHERE aas.project_id = :projectId\n  AND aas.promotion_run_id = :promotionRunId\n  AND aas.user_id = :userId\n  AND aas.channel = 'onsite_banner'\nLIMIT 1                                                                  "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   aas.promotion_run_id AS "promotionRunId",
 *   aas.user_id AS "userId",
 *   aas.segment_id AS "segmentId",
 *   aas.ad_experiment_id AS "adExperimentId",
 *   aas.content_id AS "contentId",
 *   aas.content_option_id AS "contentOptionId",
 *   aas.fallback,
 *   aas.similarity_score AS "similarityScore",
 *   aas.project_id AS "projectId",
 *   aas.campaign_id AS "campaignId",
 *   aas.promotion_id AS "promotionId",
 *   aas.channel,
 *   aas.subject,
 *   aas.preheader,
 *   aas.title,
 *   aas.body,
 *   aas.cta,
 *   aas.message,
 *   aas.image_prompt AS "imagePrompt",
 *   p.landing_url AS "landingUrl",
 *   aas.content_status AS "contentStatus",
 *   aas.ad_experiment_status AS "adExperimentStatus"
 * FROM active_ad_serving_assignments aas
 * JOIN promotions p
 *   ON p.project_id = aas.project_id
 *  AND p.promotion_id = aas.promotion_id
 * WHERE aas.project_id = :projectId
 *   AND aas.promotion_run_id = :promotionRunId
 *   AND aas.user_id = :userId
 *   AND aas.channel = 'onsite_banner'
 * LIMIT 1                                                                  
 * ```
 */
export const findActiveBannerAssignment = new PreparedQuery<IFindActiveBannerAssignmentParams,IFindActiveBannerAssignmentResult>(findActiveBannerAssignmentIR);


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

const insertDispatchJobIR: any = {"usedParamSet":{"dispatchJobId":true,"projectId":true,"campaignId":true,"promotionId":true,"promotionRunId":true,"adExperimentId":true,"channel":true,"provider":true,"targetCount":true,"metadataJson":true},"params":[{"name":"dispatchJobId","required":false,"transform":{"type":"scalar"},"locs":[{"a":260,"b":273}]},{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":278,"b":287}]},{"name":"campaignId","required":false,"transform":{"type":"scalar"},"locs":[{"a":292,"b":302}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":307,"b":318}]},{"name":"promotionRunId","required":false,"transform":{"type":"scalar"},"locs":[{"a":323,"b":337}]},{"name":"adExperimentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":342,"b":356}]},{"name":"channel","required":false,"transform":{"type":"scalar"},"locs":[{"a":361,"b":368}]},{"name":"provider","required":false,"transform":{"type":"scalar"},"locs":[{"a":386,"b":394}]},{"name":"targetCount","required":false,"transform":{"type":"scalar"},"locs":[{"a":399,"b":410}]},{"name":"metadataJson","required":false,"transform":{"type":"scalar"},"locs":[{"a":425,"b":437}]}],"statement":"INSERT INTO ad_dispatch_jobs (\n  ad_dispatch_job_id,\n  project_id,\n  campaign_id,\n  promotion_id,\n  promotion_run_id,\n  ad_experiment_id,\n  channel,\n  status,\n  provider,\n  target_count,\n  sent_count,\n  failed_count,\n  metadata_json,\n  started_at\n)\nVALUES (\n  :dispatchJobId,\n  :projectId,\n  :campaignId,\n  :promotionId,\n  :promotionRunId,\n  :adExperimentId,\n  :channel,\n  'running',\n  :provider,\n  :targetCount,\n  0,\n  0,\n  :metadataJson::jsonb,\n  now()\n)\nRETURNING\n  ad_dispatch_job_id AS \"dispatchJobId\"                                                                        "};

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
export const insertDispatchJob = new PreparedQuery<IInsertDispatchJobParams,IInsertDispatchJobResult>(insertDispatchJobIR);


/** 'UpdateDispatchJobResult' parameters type */
export interface IUpdateDispatchJobResultParams {
  dispatchJobId?: string | null | void;
  failedCount?: number | null | void;
  resultJson?: Json | null | void;
  sentCount?: number | null | void;
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

const updateDispatchJobResultIR: any = {"usedParamSet":{"status":true,"sentCount":true,"failedCount":true,"resultJson":true,"dispatchJobId":true},"params":[{"name":"status","required":false,"transform":{"type":"scalar"},"locs":[{"a":39,"b":45}]},{"name":"sentCount","required":false,"transform":{"type":"scalar"},"locs":[{"a":63,"b":72}]},{"name":"failedCount","required":false,"transform":{"type":"scalar"},"locs":[{"a":92,"b":103}]},{"name":"resultJson","required":false,"transform":{"type":"scalar"},"locs":[{"a":170,"b":180}]},{"name":"dispatchJobId","required":false,"transform":{"type":"scalar"},"locs":[{"a":241,"b":254}]}],"statement":"UPDATE ad_dispatch_jobs\nSET\n  status = :status,\n  sent_count = :sentCount,\n  failed_count = :failedCount,\n  metadata_json = metadata_json || jsonb_build_object('result', :resultJson::jsonb),\n  completed_at = now()\nWHERE ad_dispatch_job_id = :dispatchJobId\n\nRETURNING\n  ad_dispatch_job_id AS \"dispatchJobId\"                                                                                "};

/**
 * Query generated from SQL:
 * ```
 * UPDATE ad_dispatch_jobs
 * SET
 *   status = :status,
 *   sent_count = :sentCount,
 *   failed_count = :failedCount,
 *   metadata_json = metadata_json || jsonb_build_object('result', :resultJson::jsonb),
 *   completed_at = now()
 * WHERE ad_dispatch_job_id = :dispatchJobId
 * 
 * RETURNING
 *   ad_dispatch_job_id AS "dispatchJobId"                                                                                
 * ```
 */
export const updateDispatchJobResult = new PreparedQuery<IUpdateDispatchJobResultParams,IUpdateDispatchJobResultResult>(updateDispatchJobResultIR);


/** 'InsertRedirectLink' parameters type */
export interface IInsertRedirectLinkParams {
  adExperimentId?: string | null | void;
  campaignId?: string | null | void;
  contentId?: string | null | void;
  contentOptionId?: string | null | void;
  destinationUrl?: string | null | void;
  expiresAt?: DateOrString | null | void;
  projectId?: string | null | void;
  promotionId?: string | null | void;
  promotionRunId?: string | null | void;
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

const insertRedirectLinkIR: any = {"usedParamSet":{"redirectToken":true,"projectId":true,"campaignId":true,"promotionId":true,"promotionRunId":true,"adExperimentId":true,"segmentId":true,"userId":true,"contentId":true,"contentOptionId":true,"destinationUrl":true,"expiresAt":true},"params":[{"name":"redirectToken","required":false,"transform":{"type":"scalar"},"locs":[{"a":229,"b":242}]},{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":247,"b":256}]},{"name":"campaignId","required":false,"transform":{"type":"scalar"},"locs":[{"a":261,"b":271}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":276,"b":287}]},{"name":"promotionRunId","required":false,"transform":{"type":"scalar"},"locs":[{"a":292,"b":306}]},{"name":"adExperimentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":311,"b":325}]},{"name":"segmentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":330,"b":339}]},{"name":"userId","required":false,"transform":{"type":"scalar"},"locs":[{"a":344,"b":350}]},{"name":"contentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":355,"b":364}]},{"name":"contentOptionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":369,"b":384}]},{"name":"destinationUrl","required":false,"transform":{"type":"scalar"},"locs":[{"a":389,"b":403}]},{"name":"expiresAt","required":false,"transform":{"type":"scalar"},"locs":[{"a":408,"b":417}]}],"statement":"INSERT INTO redirect_links (\n  redirect_id,\n  project_id,\n  campaign_id,\n  promotion_id,\n  promotion_run_id,\n  ad_experiment_id,\n  segment_id,\n  user_id,\n  content_id,\n  content_option_id,\n  target_url,\n  expires_at\n)\nVALUES (\n  :redirectToken,\n  :projectId,\n  :campaignId,\n  :promotionId,\n  :promotionRunId,\n  :adExperimentId,\n  :segmentId,\n  :userId,\n  :contentId,\n  :contentOptionId,\n  :destinationUrl,\n  :expiresAt::timestamptz\n)\nRETURNING\n  redirect_id AS \"redirectId\"                                                                     "};

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
 *   :redirectToken,
 *   :projectId,
 *   :campaignId,
 *   :promotionId,
 *   :promotionRunId,
 *   :adExperimentId,
 *   :segmentId,
 *   :userId,
 *   :contentId,
 *   :contentOptionId,
 *   :destinationUrl,
 *   :expiresAt::timestamptz
 * )
 * RETURNING
 *   redirect_id AS "redirectId"                                                                     
 * ```
 */
export const insertRedirectLink = new PreparedQuery<IInsertRedirectLinkParams,IInsertRedirectLinkResult>(insertRedirectLinkIR);


/** 'FindRedirectLinkByToken' parameters type */
export interface IFindRedirectLinkByTokenParams {
  redirectId?: string | null | void;
}

/** 'FindRedirectLinkByToken' return type */
export interface IFindRedirectLinkByTokenResult {
  adExperimentId: string;
  campaignId: string;
  clickedAt: Date | null;
  contentId: string;
  contentOptionId: string;
  createdAt: Date;
  destinationUrl: string | null;
  expiresAt: Date | null;
  metadataJson: Json | null;
  projectId: string;
  promotionId: string;
  promotionRunId: string;
  redirectLinkId: string;
  redirectToken: string;
  segmentId: string;
  status: string | null;
  updatedAt: Date;
  userId: string;
}

/** 'FindRedirectLinkByToken' query type */
export interface IFindRedirectLinkByTokenQuery {
  params: IFindRedirectLinkByTokenParams;
  result: IFindRedirectLinkByTokenResult;
}

const findRedirectLinkByTokenIR: any = {"usedParamSet":{"redirectId":true},"params":[{"name":"redirectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":764,"b":774}]}],"statement":"SELECT\n  rl.redirect_id AS \"redirectLinkId\",\n  rl.project_id AS \"projectId\",\n  rl.campaign_id AS \"campaignId\",\n  rl.promotion_id AS \"promotionId\",\n  rl.promotion_run_id AS \"promotionRunId\",\n  rl.ad_experiment_id AS \"adExperimentId\",\n  rl.segment_id AS \"segmentId\",\n  rl.user_id AS \"userId\",\n  rl.content_id AS \"contentId\",\n  rl.content_option_id AS \"contentOptionId\",\n  rl.redirect_id AS \"redirectToken\",\n  p.landing_url AS \"destinationUrl\",\n  'active' AS status,\n  '{}'::jsonb AS \"metadataJson\",\n  rl.expires_at AS \"expiresAt\",\n  NULL::timestamptz AS \"clickedAt\",\n  rl.created_at AS \"createdAt\",\n  rl.created_at AS \"updatedAt\"\nFROM redirect_links rl\nJOIN promotions p\n  ON p.project_id = rl.project_id\n AND p.promotion_id = rl.promotion_id\nWHERE rl.redirect_id = :redirectId\n\n LIMIT 1"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   rl.redirect_id AS "redirectLinkId",
 *   rl.project_id AS "projectId",
 *   rl.campaign_id AS "campaignId",
 *   rl.promotion_id AS "promotionId",
 *   rl.promotion_run_id AS "promotionRunId",
 *   rl.ad_experiment_id AS "adExperimentId",
 *   rl.segment_id AS "segmentId",
 *   rl.user_id AS "userId",
 *   rl.content_id AS "contentId",
 *   rl.content_option_id AS "contentOptionId",
 *   rl.redirect_id AS "redirectToken",
 *   p.landing_url AS "destinationUrl",
 *   'active' AS status,
 *   '{}'::jsonb AS "metadataJson",
 *   rl.expires_at AS "expiresAt",
 *   NULL::timestamptz AS "clickedAt",
 *   rl.created_at AS "createdAt",
 *   rl.created_at AS "updatedAt"
 * FROM redirect_links rl
 * JOIN promotions p
 *   ON p.project_id = rl.project_id
 *  AND p.promotion_id = rl.promotion_id
 * WHERE rl.redirect_id = :redirectId
 * 
 *  LIMIT 1
 * ```
 */
export const findRedirectLinkByToken = new PreparedQuery<IFindRedirectLinkByTokenParams,IFindRedirectLinkByTokenResult>(findRedirectLinkByTokenIR);


