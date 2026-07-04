/** Types generated for queries found in "src/features/dashboard/database/dashboard.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type DateOrString = Date | string;

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export type NumberOrString = number | string;

/** 'ListDashboardCampaignSummaries' parameters type */
export interface IListDashboardCampaignSummariesParams {
  projectId?: string | null | void;
}

/** 'ListDashboardCampaignSummaries' return type */
export interface IListDashboardCampaignSummariesResult {
  adExperimentCount: number | null;
  campaignId: string;
  campaignName: string;
  currentLoopCount: number | null;
  endDate: Date | null;
  latestGoalAchievementRate: number | null;
  maxLoopCount: number | null;
  nextAction: string | null;
  objective: string | null;
  primaryMetric: string | null;
  promotionCount: number | null;
  segmentCount: number | null;
  startDate: Date | null;
  status: string;
  targetAudience: string;
  updatedAt: Date;
}

/** 'ListDashboardCampaignSummaries' query type */
export interface IListDashboardCampaignSummariesQuery {
  params: IListDashboardCampaignSummariesParams;
  result: IListDashboardCampaignSummariesResult;
}

const listDashboardCampaignSummariesIR: any = {"usedParamSet":{"projectId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1385,"b":1394}]}],"statement":"SELECT\n  c.campaign_id AS \"campaignId\",\n  c.name AS \"campaignName\",\n  c.objective,\n  c.target_audience AS \"targetAudience\",\n  c.primary_metric AS \"primaryMetric\",\n  c.status,\n  c.start_date AS \"startDate\",\n  c.end_date AS \"endDate\",\n  COALESCE(MAX(p.max_loop_count), 0)::int AS \"maxLoopCount\",\n  COALESCE(MAX(pr.loop_count), 0)::int AS \"currentLoopCount\",\n  COUNT(DISTINCT p.promotion_id)::int AS \"promotionCount\",\n  COUNT(DISTINCT pts.segment_id)::int AS \"segmentCount\",\n  COUNT(DISTINCT ae.ad_experiment_id)::int AS \"adExperimentCount\",\n  MAX(pe.actual_value)::float8 AS \"latestGoalAchievementRate\",\n  CASE\n    WHEN c.status = 'draft' THEN 'campaign_start'\n    WHEN COUNT(DISTINCT p.promotion_id) = 0 THEN 'create_promotion'\n    WHEN COUNT(DISTINCT pts.segment_id) = 0 THEN 'attach_segment'\n    WHEN COUNT(DISTINCT ae.ad_experiment_id) = 0 THEN 'approve_content'\n    WHEN COUNT(*) FILTER (WHERE pe.next_loop_required) > 0 THEN 'next_loop'\n    ELSE 'monitor'\n  END AS \"nextAction\",\n  c.updated_at AS \"updatedAt\"\nFROM campaigns c\nLEFT JOIN promotions p\n  ON p.campaign_id = c.campaign_id\nLEFT JOIN promotion_runs pr\n  ON pr.campaign_id = c.campaign_id\nLEFT JOIN promotion_target_segments pts\n  ON pts.campaign_id = c.campaign_id\nLEFT JOIN ad_experiments ae\n  ON ae.campaign_id = c.campaign_id\nLEFT JOIN promotion_evaluations pe\n  ON pe.campaign_id = c.campaign_id\nWHERE c.project_id = :projectId\nGROUP BY c.campaign_id\nORDER BY c.updated_at DESC, c.created_at DESC                                      "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   c.campaign_id AS "campaignId",
 *   c.name AS "campaignName",
 *   c.objective,
 *   c.target_audience AS "targetAudience",
 *   c.primary_metric AS "primaryMetric",
 *   c.status,
 *   c.start_date AS "startDate",
 *   c.end_date AS "endDate",
 *   COALESCE(MAX(p.max_loop_count), 0)::int AS "maxLoopCount",
 *   COALESCE(MAX(pr.loop_count), 0)::int AS "currentLoopCount",
 *   COUNT(DISTINCT p.promotion_id)::int AS "promotionCount",
 *   COUNT(DISTINCT pts.segment_id)::int AS "segmentCount",
 *   COUNT(DISTINCT ae.ad_experiment_id)::int AS "adExperimentCount",
 *   MAX(pe.actual_value)::float8 AS "latestGoalAchievementRate",
 *   CASE
 *     WHEN c.status = 'draft' THEN 'campaign_start'
 *     WHEN COUNT(DISTINCT p.promotion_id) = 0 THEN 'create_promotion'
 *     WHEN COUNT(DISTINCT pts.segment_id) = 0 THEN 'attach_segment'
 *     WHEN COUNT(DISTINCT ae.ad_experiment_id) = 0 THEN 'approve_content'
 *     WHEN COUNT(*) FILTER (WHERE pe.next_loop_required) > 0 THEN 'next_loop'
 *     ELSE 'monitor'
 *   END AS "nextAction",
 *   c.updated_at AS "updatedAt"
 * FROM campaigns c
 * LEFT JOIN promotions p
 *   ON p.campaign_id = c.campaign_id
 * LEFT JOIN promotion_runs pr
 *   ON pr.campaign_id = c.campaign_id
 * LEFT JOIN promotion_target_segments pts
 *   ON pts.campaign_id = c.campaign_id
 * LEFT JOIN ad_experiments ae
 *   ON ae.campaign_id = c.campaign_id
 * LEFT JOIN promotion_evaluations pe
 *   ON pe.campaign_id = c.campaign_id
 * WHERE c.project_id = :projectId
 * GROUP BY c.campaign_id
 * ORDER BY c.updated_at DESC, c.created_at DESC                                      
 * ```
 */
export const listDashboardCampaignSummaries = new PreparedQuery<IListDashboardCampaignSummariesParams,IListDashboardCampaignSummariesResult>(listDashboardCampaignSummariesIR);


/** 'GetDashboardCampaignSummary' parameters type */
export interface IGetDashboardCampaignSummaryParams {
  campaignId?: string | null | void;
  projectId?: string | null | void;
}

/** 'GetDashboardCampaignSummary' return type */
export interface IGetDashboardCampaignSummaryResult {
  adExperimentCount: number | null;
  campaignId: string;
  campaignName: string;
  currentLoopCount: number | null;
  endDate: Date | null;
  latestGoalAchievementRate: number | null;
  maxLoopCount: number | null;
  nextAction: string | null;
  objective: string | null;
  primaryMetric: string | null;
  promotionCount: number | null;
  segmentCount: number | null;
  startDate: Date | null;
  status: string;
  targetAudience: string;
  updatedAt: Date;
}

/** 'GetDashboardCampaignSummary' query type */
export interface IGetDashboardCampaignSummaryQuery {
  params: IGetDashboardCampaignSummaryParams;
  result: IGetDashboardCampaignSummaryResult;
}

const getDashboardCampaignSummaryIR: any = {"usedParamSet":{"projectId":true,"campaignId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1385,"b":1394}]},{"name":"campaignId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1418,"b":1428}]}],"statement":"SELECT\n  c.campaign_id AS \"campaignId\",\n  c.name AS \"campaignName\",\n  c.objective,\n  c.target_audience AS \"targetAudience\",\n  c.primary_metric AS \"primaryMetric\",\n  c.status,\n  c.start_date AS \"startDate\",\n  c.end_date AS \"endDate\",\n  COALESCE(MAX(p.max_loop_count), 0)::int AS \"maxLoopCount\",\n  COALESCE(MAX(pr.loop_count), 0)::int AS \"currentLoopCount\",\n  COUNT(DISTINCT p.promotion_id)::int AS \"promotionCount\",\n  COUNT(DISTINCT pts.segment_id)::int AS \"segmentCount\",\n  COUNT(DISTINCT ae.ad_experiment_id)::int AS \"adExperimentCount\",\n  MAX(pe.actual_value)::float8 AS \"latestGoalAchievementRate\",\n  CASE\n    WHEN c.status = 'draft' THEN 'campaign_start'\n    WHEN COUNT(DISTINCT p.promotion_id) = 0 THEN 'create_promotion'\n    WHEN COUNT(DISTINCT pts.segment_id) = 0 THEN 'attach_segment'\n    WHEN COUNT(DISTINCT ae.ad_experiment_id) = 0 THEN 'approve_content'\n    WHEN COUNT(*) FILTER (WHERE pe.next_loop_required) > 0 THEN 'next_loop'\n    ELSE 'monitor'\n  END AS \"nextAction\",\n  c.updated_at AS \"updatedAt\"\nFROM campaigns c\nLEFT JOIN promotions p\n  ON p.campaign_id = c.campaign_id\nLEFT JOIN promotion_runs pr\n  ON pr.campaign_id = c.campaign_id\nLEFT JOIN promotion_target_segments pts\n  ON pts.campaign_id = c.campaign_id\nLEFT JOIN ad_experiments ae\n  ON ae.campaign_id = c.campaign_id\nLEFT JOIN promotion_evaluations pe\n  ON pe.campaign_id = c.campaign_id\nWHERE c.project_id = :projectId\n  AND c.campaign_id = :campaignId\nGROUP BY c.campaign_id                              "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   c.campaign_id AS "campaignId",
 *   c.name AS "campaignName",
 *   c.objective,
 *   c.target_audience AS "targetAudience",
 *   c.primary_metric AS "primaryMetric",
 *   c.status,
 *   c.start_date AS "startDate",
 *   c.end_date AS "endDate",
 *   COALESCE(MAX(p.max_loop_count), 0)::int AS "maxLoopCount",
 *   COALESCE(MAX(pr.loop_count), 0)::int AS "currentLoopCount",
 *   COUNT(DISTINCT p.promotion_id)::int AS "promotionCount",
 *   COUNT(DISTINCT pts.segment_id)::int AS "segmentCount",
 *   COUNT(DISTINCT ae.ad_experiment_id)::int AS "adExperimentCount",
 *   MAX(pe.actual_value)::float8 AS "latestGoalAchievementRate",
 *   CASE
 *     WHEN c.status = 'draft' THEN 'campaign_start'
 *     WHEN COUNT(DISTINCT p.promotion_id) = 0 THEN 'create_promotion'
 *     WHEN COUNT(DISTINCT pts.segment_id) = 0 THEN 'attach_segment'
 *     WHEN COUNT(DISTINCT ae.ad_experiment_id) = 0 THEN 'approve_content'
 *     WHEN COUNT(*) FILTER (WHERE pe.next_loop_required) > 0 THEN 'next_loop'
 *     ELSE 'monitor'
 *   END AS "nextAction",
 *   c.updated_at AS "updatedAt"
 * FROM campaigns c
 * LEFT JOIN promotions p
 *   ON p.campaign_id = c.campaign_id
 * LEFT JOIN promotion_runs pr
 *   ON pr.campaign_id = c.campaign_id
 * LEFT JOIN promotion_target_segments pts
 *   ON pts.campaign_id = c.campaign_id
 * LEFT JOIN ad_experiments ae
 *   ON ae.campaign_id = c.campaign_id
 * LEFT JOIN promotion_evaluations pe
 *   ON pe.campaign_id = c.campaign_id
 * WHERE c.project_id = :projectId
 *   AND c.campaign_id = :campaignId
 * GROUP BY c.campaign_id                              
 * ```
 */
export const getDashboardCampaignSummary = new PreparedQuery<IGetDashboardCampaignSummaryParams,IGetDashboardCampaignSummaryResult>(getDashboardCampaignSummaryIR);


/** 'InsertDashboardCampaign' parameters type */
export interface IInsertDashboardCampaignParams {
  campaignId?: string | null | void;
  campaignName?: string | null | void;
  endDate?: DateOrString | null | void;
  objective?: string | null | void;
  primaryMetric?: string | null | void;
  projectId?: string | null | void;
  startDate?: DateOrString | null | void;
  status?: string | null | void;
  targetAudience?: string | null | void;
}

/** 'InsertDashboardCampaign' return type */
export interface IInsertDashboardCampaignResult {
  campaignId: string;
}

/** 'InsertDashboardCampaign' query type */
export interface IInsertDashboardCampaignQuery {
  params: IInsertDashboardCampaignParams;
  result: IInsertDashboardCampaignResult;
}

const insertDashboardCampaignIR: any = {"usedParamSet":{"campaignId":true,"projectId":true,"campaignName":true,"objective":true,"targetAudience":true,"startDate":true,"endDate":true,"primaryMetric":true,"status":true},"params":[{"name":"campaignId","required":false,"transform":{"type":"scalar"},"locs":[{"a":159,"b":169}]},{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":174,"b":183}]},{"name":"campaignName","required":false,"transform":{"type":"scalar"},"locs":[{"a":188,"b":200}]},{"name":"objective","required":false,"transform":{"type":"scalar"},"locs":[{"a":205,"b":214}]},{"name":"targetAudience","required":false,"transform":{"type":"scalar"},"locs":[{"a":219,"b":233}]},{"name":"startDate","required":false,"transform":{"type":"scalar"},"locs":[{"a":238,"b":247}]},{"name":"endDate","required":false,"transform":{"type":"scalar"},"locs":[{"a":252,"b":259}]},{"name":"primaryMetric","required":false,"transform":{"type":"scalar"},"locs":[{"a":264,"b":277}]},{"name":"status","required":false,"transform":{"type":"scalar"},"locs":[{"a":282,"b":288}]}],"statement":"INSERT INTO campaigns (\n  campaign_id,\n  project_id,\n  name,\n  objective,\n  target_audience,\n  start_date,\n  end_date,\n  primary_metric,\n  status\n)\nVALUES (\n  :campaignId,\n  :projectId,\n  :campaignName,\n  :objective,\n  :targetAudience,\n  :startDate,\n  :endDate,\n  :primaryMetric,\n  :status\n)\nRETURNING campaign_id AS \"campaignId\"                                  "};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO campaigns (
 *   campaign_id,
 *   project_id,
 *   name,
 *   objective,
 *   target_audience,
 *   start_date,
 *   end_date,
 *   primary_metric,
 *   status
 * )
 * VALUES (
 *   :campaignId,
 *   :projectId,
 *   :campaignName,
 *   :objective,
 *   :targetAudience,
 *   :startDate,
 *   :endDate,
 *   :primaryMetric,
 *   :status
 * )
 * RETURNING campaign_id AS "campaignId"                                  
 * ```
 */
export const insertDashboardCampaign = new PreparedQuery<IInsertDashboardCampaignParams,IInsertDashboardCampaignResult>(insertDashboardCampaignIR);


/** 'UpdateDashboardCampaign' parameters type */
export interface IUpdateDashboardCampaignParams {
  campaignId?: string | null | void;
  campaignName?: string | null | void;
  endDate?: DateOrString | null | void;
  endDateIsSet?: boolean | null | void;
  objective?: string | null | void;
  objectiveIsSet?: boolean | null | void;
  primaryMetric?: string | null | void;
  primaryMetricIsSet?: boolean | null | void;
  projectId?: string | null | void;
  startDate?: DateOrString | null | void;
  startDateIsSet?: boolean | null | void;
  status?: string | null | void;
  targetAudience?: string | null | void;
}

/** 'UpdateDashboardCampaign' return type */
export interface IUpdateDashboardCampaignResult {
  campaignId: string;
}

/** 'UpdateDashboardCampaign' query type */
export interface IUpdateDashboardCampaignQuery {
  params: IUpdateDashboardCampaignParams;
  result: IUpdateDashboardCampaignResult;
}

const updateDashboardCampaignIR: any = {"usedParamSet":{"campaignName":true,"objectiveIsSet":true,"objective":true,"targetAudience":true,"startDateIsSet":true,"startDate":true,"endDateIsSet":true,"endDate":true,"primaryMetricIsSet":true,"primaryMetric":true,"status":true,"projectId":true,"campaignId":true},"params":[{"name":"campaignName","required":false,"transform":{"type":"scalar"},"locs":[{"a":39,"b":51}]},{"name":"objectiveIsSet","required":false,"transform":{"type":"scalar"},"locs":[{"a":85,"b":99}]},{"name":"objective","required":false,"transform":{"type":"scalar"},"locs":[{"a":106,"b":115}]},{"name":"targetAudience","required":false,"transform":{"type":"scalar"},"locs":[{"a":166,"b":180}]},{"name":"startDateIsSet","required":false,"transform":{"type":"scalar"},"locs":[{"a":226,"b":240}]},{"name":"startDate","required":false,"transform":{"type":"scalar"},"locs":[{"a":247,"b":256}]},{"name":"endDateIsSet","required":false,"transform":{"type":"scalar"},"locs":[{"a":302,"b":314}]},{"name":"endDate","required":false,"transform":{"type":"scalar"},"locs":[{"a":321,"b":328}]},{"name":"primaryMetricIsSet","required":false,"transform":{"type":"scalar"},"locs":[{"a":378,"b":396}]},{"name":"primaryMetric","required":false,"transform":{"type":"scalar"},"locs":[{"a":403,"b":416}]},{"name":"status","required":false,"transform":{"type":"scalar"},"locs":[{"a":463,"b":469}]},{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":521,"b":530}]},{"name":"campaignId","required":false,"transform":{"type":"scalar"},"locs":[{"a":552,"b":562}]}],"statement":"UPDATE campaigns\nSET\n  name = COALESCE(:campaignName, name),\n  objective = CASE WHEN :objectiveIsSet THEN :objective ELSE objective END,\n  target_audience = COALESCE(:targetAudience, target_audience),\n  start_date = CASE WHEN :startDateIsSet THEN :startDate ELSE start_date END,\n  end_date = CASE WHEN :endDateIsSet THEN :endDate ELSE end_date END,\n  primary_metric = CASE WHEN :primaryMetricIsSet THEN :primaryMetric ELSE primary_metric END,\n  status = COALESCE(:status, status),\n  updated_at = now()\nWHERE project_id = :projectId\n  AND campaign_id = :campaignId\n  AND status <> 'stopped'\nRETURNING campaign_id AS \"campaignId\"                                               "};

/**
 * Query generated from SQL:
 * ```
 * UPDATE campaigns
 * SET
 *   name = COALESCE(:campaignName, name),
 *   objective = CASE WHEN :objectiveIsSet THEN :objective ELSE objective END,
 *   target_audience = COALESCE(:targetAudience, target_audience),
 *   start_date = CASE WHEN :startDateIsSet THEN :startDate ELSE start_date END,
 *   end_date = CASE WHEN :endDateIsSet THEN :endDate ELSE end_date END,
 *   primary_metric = CASE WHEN :primaryMetricIsSet THEN :primaryMetric ELSE primary_metric END,
 *   status = COALESCE(:status, status),
 *   updated_at = now()
 * WHERE project_id = :projectId
 *   AND campaign_id = :campaignId
 *   AND status <> 'stopped'
 * RETURNING campaign_id AS "campaignId"                                               
 * ```
 */
export const updateDashboardCampaign = new PreparedQuery<IUpdateDashboardCampaignParams,IUpdateDashboardCampaignResult>(updateDashboardCampaignIR);


/** 'StopDashboardCampaign' parameters type */
export interface IStopDashboardCampaignParams {
  campaignId?: string | null | void;
  projectId?: string | null | void;
}

/** 'StopDashboardCampaign' return type */
export interface IStopDashboardCampaignResult {
  campaignId: string;
  status: string;
}

/** 'StopDashboardCampaign' query type */
export interface IStopDashboardCampaignQuery {
  params: IStopDashboardCampaignParams;
  result: IStopDashboardCampaignResult;
}

const stopDashboardCampaignIR: any = {"usedParamSet":{"projectId":true,"campaignId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":83,"b":92}]},{"name":"campaignId","required":false,"transform":{"type":"scalar"},"locs":[{"a":114,"b":124}]}],"statement":"UPDATE campaigns\nSET status = 'stopped',\n    updated_at = now()\nWHERE project_id = :projectId\n  AND campaign_id = :campaignId\nRETURNING campaign_id AS \"campaignId\", status                                     "};

/**
 * Query generated from SQL:
 * ```
 * UPDATE campaigns
 * SET status = 'stopped',
 *     updated_at = now()
 * WHERE project_id = :projectId
 *   AND campaign_id = :campaignId
 * RETURNING campaign_id AS "campaignId", status                                     
 * ```
 */
export const stopDashboardCampaign = new PreparedQuery<IStopDashboardCampaignParams,IStopDashboardCampaignResult>(stopDashboardCampaignIR);


/** 'ListDashboardCampaignPromotions' parameters type */
export interface IListDashboardCampaignPromotionsParams {
  campaignId?: string | null | void;
  projectId?: string | null | void;
}

/** 'ListDashboardCampaignPromotions' return type */
export interface IListDashboardCampaignPromotionsResult {
  adExperimentCount: number | null;
  channel: string;
  currentLoopCount: number | null;
  goalBasis: string;
  goalMetric: string;
  goalTargetValue: number | null;
  landingType: string | null;
  landingUrl: string | null;
  latestActualValue: number | null;
  marketingTheme: string;
  maxLoopCount: number;
  messageBrief: string | null;
  minSampleSize: number;
  nextAction: string | null;
  offerType: string | null;
  promotionId: string;
  status: string;
  targetAudience: string;
  targetSegmentCount: number | null;
  updatedAt: Date;
}

/** 'ListDashboardCampaignPromotions' query type */
export interface IListDashboardCampaignPromotionsQuery {
  params: IListDashboardCampaignPromotionsParams;
  result: IListDashboardCampaignPromotionsResult;
}

const listDashboardCampaignPromotionsIR: any = {"usedParamSet":{"projectId":true,"campaignId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1391,"b":1400}]},{"name":"campaignId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1424,"b":1434}]}],"statement":"SELECT\n  p.promotion_id AS \"promotionId\",\n  p.channel,\n  p.marketing_theme AS \"marketingTheme\",\n  p.target_audience AS \"targetAudience\",\n  p.goal_metric AS \"goalMetric\",\n  p.goal_target_value::float8 AS \"goalTargetValue\",\n  p.goal_basis AS \"goalBasis\",\n  p.min_sample_size AS \"minSampleSize\",\n  p.max_loop_count AS \"maxLoopCount\",\n  COALESCE(MAX(pr.loop_count), 0)::int AS \"currentLoopCount\",\n  p.message_brief AS \"messageBrief\",\n  p.offer_type AS \"offerType\",\n  p.landing_url AS \"landingUrl\",\n  p.landing_type AS \"landingType\",\n  p.status,\n  COUNT(DISTINCT pts.segment_id)::int AS \"targetSegmentCount\",\n  COUNT(DISTINCT ae.ad_experiment_id)::int AS \"adExperimentCount\",\n  MAX(pe.actual_value)::float8 AS \"latestActualValue\",\n  CASE\n    WHEN p.status = 'draft' THEN 'complete_plan'\n    WHEN COUNT(DISTINCT pts.segment_id) = 0 THEN 'attach_segment'\n    WHEN COUNT(DISTINCT ae.ad_experiment_id) = 0 THEN 'approve_content'\n    WHEN COUNT(*) FILTER (WHERE pe.next_loop_required) > 0 THEN 'next_loop'\n    ELSE 'monitor'\n  END AS \"nextAction\",\n  p.updated_at AS \"updatedAt\"\nFROM promotions p\nLEFT JOIN promotion_runs pr\n  ON pr.promotion_id = p.promotion_id\nLEFT JOIN promotion_target_segments pts\n  ON pts.promotion_id = p.promotion_id\nLEFT JOIN ad_experiments ae\n  ON ae.promotion_id = p.promotion_id\nLEFT JOIN promotion_evaluations pe\n  ON pe.promotion_id = p.promotion_id\nWHERE p.project_id = :projectId\n  AND p.campaign_id = :campaignId\nGROUP BY p.promotion_id\nORDER BY p.updated_at DESC, p.created_at DESC                                       "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   p.promotion_id AS "promotionId",
 *   p.channel,
 *   p.marketing_theme AS "marketingTheme",
 *   p.target_audience AS "targetAudience",
 *   p.goal_metric AS "goalMetric",
 *   p.goal_target_value::float8 AS "goalTargetValue",
 *   p.goal_basis AS "goalBasis",
 *   p.min_sample_size AS "minSampleSize",
 *   p.max_loop_count AS "maxLoopCount",
 *   COALESCE(MAX(pr.loop_count), 0)::int AS "currentLoopCount",
 *   p.message_brief AS "messageBrief",
 *   p.offer_type AS "offerType",
 *   p.landing_url AS "landingUrl",
 *   p.landing_type AS "landingType",
 *   p.status,
 *   COUNT(DISTINCT pts.segment_id)::int AS "targetSegmentCount",
 *   COUNT(DISTINCT ae.ad_experiment_id)::int AS "adExperimentCount",
 *   MAX(pe.actual_value)::float8 AS "latestActualValue",
 *   CASE
 *     WHEN p.status = 'draft' THEN 'complete_plan'
 *     WHEN COUNT(DISTINCT pts.segment_id) = 0 THEN 'attach_segment'
 *     WHEN COUNT(DISTINCT ae.ad_experiment_id) = 0 THEN 'approve_content'
 *     WHEN COUNT(*) FILTER (WHERE pe.next_loop_required) > 0 THEN 'next_loop'
 *     ELSE 'monitor'
 *   END AS "nextAction",
 *   p.updated_at AS "updatedAt"
 * FROM promotions p
 * LEFT JOIN promotion_runs pr
 *   ON pr.promotion_id = p.promotion_id
 * LEFT JOIN promotion_target_segments pts
 *   ON pts.promotion_id = p.promotion_id
 * LEFT JOIN ad_experiments ae
 *   ON ae.promotion_id = p.promotion_id
 * LEFT JOIN promotion_evaluations pe
 *   ON pe.promotion_id = p.promotion_id
 * WHERE p.project_id = :projectId
 *   AND p.campaign_id = :campaignId
 * GROUP BY p.promotion_id
 * ORDER BY p.updated_at DESC, p.created_at DESC                                       
 * ```
 */
export const listDashboardCampaignPromotions = new PreparedQuery<IListDashboardCampaignPromotionsParams,IListDashboardCampaignPromotionsResult>(listDashboardCampaignPromotionsIR);


/** 'GetDashboardPromotionSummary' parameters type */
export interface IGetDashboardPromotionSummaryParams {
  projectId?: string | null | void;
  promotionId?: string | null | void;
}

/** 'GetDashboardPromotionSummary' return type */
export interface IGetDashboardPromotionSummaryResult {
  adExperimentCount: number | null;
  campaignId: string;
  channel: string;
  currentLoopCount: number | null;
  goalBasis: string;
  goalMetric: string;
  goalTargetValue: number | null;
  landingType: string | null;
  landingUrl: string | null;
  latestActualValue: number | null;
  marketingTheme: string;
  maxLoopCount: number;
  messageBrief: string | null;
  minSampleSize: number;
  nextAction: string | null;
  offerType: string | null;
  promotionId: string;
  status: string;
  targetAudience: string;
  targetSegmentCount: number | null;
  updatedAt: Date;
}

/** 'GetDashboardPromotionSummary' query type */
export interface IGetDashboardPromotionSummaryQuery {
  params: IGetDashboardPromotionSummaryParams;
  result: IGetDashboardPromotionSummaryResult;
}

const getDashboardPromotionSummaryIR: any = {"usedParamSet":{"projectId":true,"promotionId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1424,"b":1433}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1458,"b":1469}]}],"statement":"SELECT\n  p.promotion_id AS \"promotionId\",\n  p.campaign_id AS \"campaignId\",\n  p.channel,\n  p.marketing_theme AS \"marketingTheme\",\n  p.target_audience AS \"targetAudience\",\n  p.goal_metric AS \"goalMetric\",\n  p.goal_target_value::float8 AS \"goalTargetValue\",\n  p.goal_basis AS \"goalBasis\",\n  p.min_sample_size AS \"minSampleSize\",\n  p.max_loop_count AS \"maxLoopCount\",\n  COALESCE(MAX(pr.loop_count), 0)::int AS \"currentLoopCount\",\n  p.message_brief AS \"messageBrief\",\n  p.offer_type AS \"offerType\",\n  p.landing_url AS \"landingUrl\",\n  p.landing_type AS \"landingType\",\n  p.status,\n  COUNT(DISTINCT pts.segment_id)::int AS \"targetSegmentCount\",\n  COUNT(DISTINCT ae.ad_experiment_id)::int AS \"adExperimentCount\",\n  MAX(pe.actual_value)::float8 AS \"latestActualValue\",\n  CASE\n    WHEN p.status = 'draft' THEN 'complete_plan'\n    WHEN COUNT(DISTINCT pts.segment_id) = 0 THEN 'attach_segment'\n    WHEN COUNT(DISTINCT ae.ad_experiment_id) = 0 THEN 'approve_content'\n    WHEN COUNT(*) FILTER (WHERE pe.next_loop_required) > 0 THEN 'next_loop'\n    ELSE 'monitor'\n  END AS \"nextAction\",\n  p.updated_at AS \"updatedAt\"\nFROM promotions p\nLEFT JOIN promotion_runs pr\n  ON pr.promotion_id = p.promotion_id\nLEFT JOIN promotion_target_segments pts\n  ON pts.promotion_id = p.promotion_id\nLEFT JOIN ad_experiments ae\n  ON ae.promotion_id = p.promotion_id\nLEFT JOIN promotion_evaluations pe\n  ON pe.promotion_id = p.promotion_id\nWHERE p.project_id = :projectId\n  AND p.promotion_id = :promotionId\nGROUP BY p.promotion_id                             "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   p.promotion_id AS "promotionId",
 *   p.campaign_id AS "campaignId",
 *   p.channel,
 *   p.marketing_theme AS "marketingTheme",
 *   p.target_audience AS "targetAudience",
 *   p.goal_metric AS "goalMetric",
 *   p.goal_target_value::float8 AS "goalTargetValue",
 *   p.goal_basis AS "goalBasis",
 *   p.min_sample_size AS "minSampleSize",
 *   p.max_loop_count AS "maxLoopCount",
 *   COALESCE(MAX(pr.loop_count), 0)::int AS "currentLoopCount",
 *   p.message_brief AS "messageBrief",
 *   p.offer_type AS "offerType",
 *   p.landing_url AS "landingUrl",
 *   p.landing_type AS "landingType",
 *   p.status,
 *   COUNT(DISTINCT pts.segment_id)::int AS "targetSegmentCount",
 *   COUNT(DISTINCT ae.ad_experiment_id)::int AS "adExperimentCount",
 *   MAX(pe.actual_value)::float8 AS "latestActualValue",
 *   CASE
 *     WHEN p.status = 'draft' THEN 'complete_plan'
 *     WHEN COUNT(DISTINCT pts.segment_id) = 0 THEN 'attach_segment'
 *     WHEN COUNT(DISTINCT ae.ad_experiment_id) = 0 THEN 'approve_content'
 *     WHEN COUNT(*) FILTER (WHERE pe.next_loop_required) > 0 THEN 'next_loop'
 *     ELSE 'monitor'
 *   END AS "nextAction",
 *   p.updated_at AS "updatedAt"
 * FROM promotions p
 * LEFT JOIN promotion_runs pr
 *   ON pr.promotion_id = p.promotion_id
 * LEFT JOIN promotion_target_segments pts
 *   ON pts.promotion_id = p.promotion_id
 * LEFT JOIN ad_experiments ae
 *   ON ae.promotion_id = p.promotion_id
 * LEFT JOIN promotion_evaluations pe
 *   ON pe.promotion_id = p.promotion_id
 * WHERE p.project_id = :projectId
 *   AND p.promotion_id = :promotionId
 * GROUP BY p.promotion_id                             
 * ```
 */
export const getDashboardPromotionSummary = new PreparedQuery<IGetDashboardPromotionSummaryParams,IGetDashboardPromotionSummaryResult>(getDashboardPromotionSummaryIR);


/** 'InsertDashboardPromotion' parameters type */
export interface IInsertDashboardPromotionParams {
  campaignId?: string | null | void;
  channel?: string | null | void;
  goalBasis?: string | null | void;
  goalMetric?: string | null | void;
  goalTargetValue?: NumberOrString | null | void;
  landingType?: string | null | void;
  landingUrl?: string | null | void;
  marketingTheme?: string | null | void;
  maxLoopCount?: number | null | void;
  messageBrief?: string | null | void;
  minSampleSize?: number | null | void;
  offerType?: string | null | void;
  projectId?: string | null | void;
  promotionId?: string | null | void;
  status?: string | null | void;
  targetAudience?: string | null | void;
}

/** 'InsertDashboardPromotion' return type */
export interface IInsertDashboardPromotionResult {
  promotionId: string;
}

/** 'InsertDashboardPromotion' query type */
export interface IInsertDashboardPromotionQuery {
  params: IInsertDashboardPromotionParams;
  result: IInsertDashboardPromotionResult;
}

const insertDashboardPromotionIR: any = {"usedParamSet":{"promotionId":true,"channel":true,"marketingTheme":true,"targetAudience":true,"goalMetric":true,"goalTargetValue":true,"goalBasis":true,"minSampleSize":true,"maxLoopCount":true,"messageBrief":true,"offerType":true,"landingUrl":true,"landingType":true,"status":true,"projectId":true,"campaignId":true},"params":[{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":288,"b":299}]},{"name":"channel","required":false,"transform":{"type":"scalar"},"locs":[{"a":337,"b":344}]},{"name":"marketingTheme","required":false,"transform":{"type":"scalar"},"locs":[{"a":349,"b":363}]},{"name":"targetAudience","required":false,"transform":{"type":"scalar"},"locs":[{"a":368,"b":382}]},{"name":"goalMetric","required":false,"transform":{"type":"scalar"},"locs":[{"a":387,"b":397}]},{"name":"goalTargetValue","required":false,"transform":{"type":"scalar"},"locs":[{"a":402,"b":417}]},{"name":"goalBasis","required":false,"transform":{"type":"scalar"},"locs":[{"a":422,"b":431}]},{"name":"minSampleSize","required":false,"transform":{"type":"scalar"},"locs":[{"a":436,"b":449}]},{"name":"maxLoopCount","required":false,"transform":{"type":"scalar"},"locs":[{"a":454,"b":466}]},{"name":"messageBrief","required":false,"transform":{"type":"scalar"},"locs":[{"a":471,"b":483}]},{"name":"offerType","required":false,"transform":{"type":"scalar"},"locs":[{"a":488,"b":497}]},{"name":"landingUrl","required":false,"transform":{"type":"scalar"},"locs":[{"a":502,"b":512}]},{"name":"landingType","required":false,"transform":{"type":"scalar"},"locs":[{"a":517,"b":528}]},{"name":"status","required":false,"transform":{"type":"scalar"},"locs":[{"a":533,"b":539}]},{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":579,"b":588}]},{"name":"campaignId","required":false,"transform":{"type":"scalar"},"locs":[{"a":612,"b":622}]}],"statement":"INSERT INTO promotions (\n  promotion_id,\n  project_id,\n  campaign_id,\n  channel,\n  marketing_theme,\n  target_audience,\n  goal_metric,\n  goal_target_value,\n  goal_basis,\n  min_sample_size,\n  max_loop_count,\n  message_brief,\n  offer_type,\n  landing_url,\n  landing_type,\n  status\n)\nSELECT\n  :promotionId,\n  c.project_id,\n  c.campaign_id,\n  :channel,\n  :marketingTheme,\n  :targetAudience,\n  :goalMetric,\n  :goalTargetValue,\n  :goalBasis,\n  :minSampleSize,\n  :maxLoopCount,\n  :messageBrief,\n  :offerType,\n  :landingUrl,\n  :landingType,\n  :status\nFROM campaigns c\nWHERE c.project_id = :projectId\n  AND c.campaign_id = :campaignId\n  AND c.status <> 'stopped'\nRETURNING promotion_id AS \"promotionId\"                            "};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO promotions (
 *   promotion_id,
 *   project_id,
 *   campaign_id,
 *   channel,
 *   marketing_theme,
 *   target_audience,
 *   goal_metric,
 *   goal_target_value,
 *   goal_basis,
 *   min_sample_size,
 *   max_loop_count,
 *   message_brief,
 *   offer_type,
 *   landing_url,
 *   landing_type,
 *   status
 * )
 * SELECT
 *   :promotionId,
 *   c.project_id,
 *   c.campaign_id,
 *   :channel,
 *   :marketingTheme,
 *   :targetAudience,
 *   :goalMetric,
 *   :goalTargetValue,
 *   :goalBasis,
 *   :minSampleSize,
 *   :maxLoopCount,
 *   :messageBrief,
 *   :offerType,
 *   :landingUrl,
 *   :landingType,
 *   :status
 * FROM campaigns c
 * WHERE c.project_id = :projectId
 *   AND c.campaign_id = :campaignId
 *   AND c.status <> 'stopped'
 * RETURNING promotion_id AS "promotionId"                            
 * ```
 */
export const insertDashboardPromotion = new PreparedQuery<IInsertDashboardPromotionParams,IInsertDashboardPromotionResult>(insertDashboardPromotionIR);


/** 'UpdateDashboardPromotion' parameters type */
export interface IUpdateDashboardPromotionParams {
  channel?: string | null | void;
  goalBasis?: string | null | void;
  goalMetric?: string | null | void;
  goalTargetValue?: NumberOrString | null | void;
  landingType?: string | null | void;
  landingTypeIsSet?: boolean | null | void;
  landingUrl?: string | null | void;
  landingUrlIsSet?: boolean | null | void;
  marketingTheme?: string | null | void;
  maxLoopCount?: number | null | void;
  messageBrief?: string | null | void;
  messageBriefIsSet?: boolean | null | void;
  minSampleSize?: number | null | void;
  offerType?: string | null | void;
  offerTypeIsSet?: boolean | null | void;
  projectId?: string | null | void;
  promotionId?: string | null | void;
  status?: string | null | void;
  targetAudience?: string | null | void;
}

/** 'UpdateDashboardPromotion' return type */
export interface IUpdateDashboardPromotionResult {
  promotionId: string;
}

/** 'UpdateDashboardPromotion' query type */
export interface IUpdateDashboardPromotionQuery {
  params: IUpdateDashboardPromotionParams;
  result: IUpdateDashboardPromotionResult;
}

const updateDashboardPromotionIR: any = {"usedParamSet":{"channel":true,"marketingTheme":true,"targetAudience":true,"goalMetric":true,"goalTargetValue":true,"goalBasis":true,"minSampleSize":true,"maxLoopCount":true,"messageBriefIsSet":true,"messageBrief":true,"offerTypeIsSet":true,"offerType":true,"landingUrlIsSet":true,"landingUrl":true,"landingTypeIsSet":true,"landingType":true,"status":true,"projectId":true,"promotionId":true},"params":[{"name":"channel","required":false,"transform":{"type":"scalar"},"locs":[{"a":43,"b":50}]},{"name":"marketingTheme","required":false,"transform":{"type":"scalar"},"locs":[{"a":92,"b":106}]},{"name":"targetAudience","required":false,"transform":{"type":"scalar"},"locs":[{"a":156,"b":170}]},{"name":"goalMetric","required":false,"transform":{"type":"scalar"},"locs":[{"a":216,"b":226}]},{"name":"goalTargetValue","required":false,"transform":{"type":"scalar"},"locs":[{"a":274,"b":289}]},{"name":"goalBasis","required":false,"transform":{"type":"scalar"},"locs":[{"a":336,"b":345}]},{"name":"minSampleSize","required":false,"transform":{"type":"scalar"},"locs":[{"a":390,"b":403}]},{"name":"maxLoopCount","required":false,"transform":{"type":"scalar"},"locs":[{"a":452,"b":464}]},{"name":"messageBriefIsSet","required":false,"transform":{"type":"scalar"},"locs":[{"a":512,"b":529}]},{"name":"messageBrief","required":false,"transform":{"type":"scalar"},"locs":[{"a":536,"b":548}]},{"name":"offerTypeIsSet","required":false,"transform":{"type":"scalar"},"locs":[{"a":599,"b":613}]},{"name":"offerType","required":false,"transform":{"type":"scalar"},"locs":[{"a":620,"b":629}]},{"name":"landingUrlIsSet","required":false,"transform":{"type":"scalar"},"locs":[{"a":678,"b":693}]},{"name":"landingUrl","required":false,"transform":{"type":"scalar"},"locs":[{"a":700,"b":710}]},{"name":"landingTypeIsSet","required":false,"transform":{"type":"scalar"},"locs":[{"a":761,"b":777}]},{"name":"landingType","required":false,"transform":{"type":"scalar"},"locs":[{"a":784,"b":795}]},{"name":"status","required":false,"transform":{"type":"scalar"},"locs":[{"a":840,"b":846}]},{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":898,"b":907}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":930,"b":941}]}],"statement":"UPDATE promotions\nSET\n  channel = COALESCE(:channel, channel),\n  marketing_theme = COALESCE(:marketingTheme, marketing_theme),\n  target_audience = COALESCE(:targetAudience, target_audience),\n  goal_metric = COALESCE(:goalMetric, goal_metric),\n  goal_target_value = COALESCE(:goalTargetValue, goal_target_value),\n  goal_basis = COALESCE(:goalBasis, goal_basis),\n  min_sample_size = COALESCE(:minSampleSize, min_sample_size),\n  max_loop_count = COALESCE(:maxLoopCount, max_loop_count),\n  message_brief = CASE WHEN :messageBriefIsSet THEN :messageBrief ELSE message_brief END,\n  offer_type = CASE WHEN :offerTypeIsSet THEN :offerType ELSE offer_type END,\n  landing_url = CASE WHEN :landingUrlIsSet THEN :landingUrl ELSE landing_url END,\n  landing_type = CASE WHEN :landingTypeIsSet THEN :landingType ELSE landing_type END,\n  status = COALESCE(:status, status),\n  updated_at = now()\nWHERE project_id = :projectId\n  AND promotion_id = :promotionId\n  AND status <> 'stopped'\nRETURNING promotion_id AS \"promotionId\"                                                "};

/**
 * Query generated from SQL:
 * ```
 * UPDATE promotions
 * SET
 *   channel = COALESCE(:channel, channel),
 *   marketing_theme = COALESCE(:marketingTheme, marketing_theme),
 *   target_audience = COALESCE(:targetAudience, target_audience),
 *   goal_metric = COALESCE(:goalMetric, goal_metric),
 *   goal_target_value = COALESCE(:goalTargetValue, goal_target_value),
 *   goal_basis = COALESCE(:goalBasis, goal_basis),
 *   min_sample_size = COALESCE(:minSampleSize, min_sample_size),
 *   max_loop_count = COALESCE(:maxLoopCount, max_loop_count),
 *   message_brief = CASE WHEN :messageBriefIsSet THEN :messageBrief ELSE message_brief END,
 *   offer_type = CASE WHEN :offerTypeIsSet THEN :offerType ELSE offer_type END,
 *   landing_url = CASE WHEN :landingUrlIsSet THEN :landingUrl ELSE landing_url END,
 *   landing_type = CASE WHEN :landingTypeIsSet THEN :landingType ELSE landing_type END,
 *   status = COALESCE(:status, status),
 *   updated_at = now()
 * WHERE project_id = :projectId
 *   AND promotion_id = :promotionId
 *   AND status <> 'stopped'
 * RETURNING promotion_id AS "promotionId"                                                
 * ```
 */
export const updateDashboardPromotion = new PreparedQuery<IUpdateDashboardPromotionParams,IUpdateDashboardPromotionResult>(updateDashboardPromotionIR);


/** 'StopDashboardPromotion' parameters type */
export interface IStopDashboardPromotionParams {
  projectId?: string | null | void;
  promotionId?: string | null | void;
}

/** 'StopDashboardPromotion' return type */
export interface IStopDashboardPromotionResult {
  promotionId: string;
  status: string;
}

/** 'StopDashboardPromotion' query type */
export interface IStopDashboardPromotionQuery {
  params: IStopDashboardPromotionParams;
  result: IStopDashboardPromotionResult;
}

const stopDashboardPromotionIR: any = {"usedParamSet":{"projectId":true,"promotionId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":84,"b":93}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":116,"b":127}]}],"statement":"UPDATE promotions\nSET status = 'stopped',\n    updated_at = now()\nWHERE project_id = :projectId\n  AND promotion_id = :promotionId\nRETURNING promotion_id AS \"promotionId\", status                                       "};

/**
 * Query generated from SQL:
 * ```
 * UPDATE promotions
 * SET status = 'stopped',
 *     updated_at = now()
 * WHERE project_id = :projectId
 *   AND promotion_id = :promotionId
 * RETURNING promotion_id AS "promotionId", status                                       
 * ```
 */
export const stopDashboardPromotion = new PreparedQuery<IStopDashboardPromotionParams,IStopDashboardPromotionResult>(stopDashboardPromotionIR);


/** 'ListDashboardCampaignSegments' parameters type */
export interface IListDashboardCampaignSegmentsParams {
  campaignId?: string | null | void;
  projectId?: string | null | void;
}

/** 'ListDashboardCampaignSegments' return type */
export interface IListDashboardCampaignSegmentsResult {
  adExperimentId: string | null;
  contentBriefJson: Json;
  dataEvidenceJson: Json;
  estimatedSize: number;
  goalMetric: string;
  latestActualValue: number | null;
  naturalLanguageQuery: string | null;
  nextAction: string | null;
  priority: string | null;
  profileJson: Json;
  promotionId: string;
  ruleJson: Json;
  sampleRatio: number | null;
  sampleSize: number;
  segmentId: string;
  segmentName: string;
  source: string;
  status: string;
  totalEligibleUserCount: number;
}

/** 'ListDashboardCampaignSegments' query type */
export interface IListDashboardCampaignSegmentsQuery {
  params: IListDashboardCampaignSegmentsParams;
  result: IListDashboardCampaignSegmentsResult;
}

const listDashboardCampaignSegmentsIR: any = {"usedParamSet":{"projectId":true,"campaignId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1425,"b":1434}]},{"name":"campaignId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1460,"b":1470}]}],"statement":"SELECT\n  pts.promotion_id AS \"promotionId\",\n  pts.segment_id AS \"segmentId\",\n  pts.segment_name AS \"segmentName\",\n  sd.source,\n  sd.natural_language_query AS \"naturalLanguageQuery\",\n  pts.rule_json AS \"ruleJson\",\n  pts.profile_json AS \"profileJson\",\n  pts.content_brief_json AS \"contentBriefJson\",\n  pts.data_evidence_json AS \"dataEvidenceJson\",\n  pts.estimated_size AS \"estimatedSize\",\n  sd.sample_size AS \"sampleSize\",\n  sd.total_eligible_user_count AS \"totalEligibleUserCount\",\n  sd.sample_ratio::float8 AS \"sampleRatio\",\n  p.goal_metric AS \"goalMetric\",\n  MAX(pe.actual_value)::float8 AS \"latestActualValue\",\n  MAX(ae.ad_experiment_id) AS \"adExperimentId\",\n  CASE\n    WHEN pts.status = 'planned' THEN 'create_content'\n    WHEN COUNT(DISTINCT ae.ad_experiment_id) = 0 THEN 'approve_content'\n    WHEN COUNT(*) FILTER (WHERE pe.status = 'insufficient_data') > 0 THEN 'review_sample'\n    WHEN COUNT(*) FILTER (WHERE pe.next_loop_required) > 0 THEN 'next_loop'\n    ELSE 'monitor'\n  END AS \"nextAction\",\n  pts.priority,\n  pts.status\nFROM promotion_target_segments pts\nJOIN segment_definitions sd\n  ON sd.segment_id = pts.segment_id\nJOIN promotions p\n  ON p.promotion_id = pts.promotion_id\nLEFT JOIN ad_experiments ae\n  ON ae.promotion_id = pts.promotion_id\n AND ae.segment_id = pts.segment_id\nLEFT JOIN promotion_evaluations pe\n  ON pe.promotion_id = pts.promotion_id\n AND pe.segment_id = pts.segment_id\nWHERE pts.project_id = :projectId\n  AND pts.campaign_id = :campaignId\nGROUP BY\n  pts.promotion_id,\n  pts.segment_id,\n  pts.segment_name,\n  sd.source,\n  sd.natural_language_query,\n  pts.rule_json,\n  pts.profile_json,\n  pts.content_brief_json,\n  pts.data_evidence_json,\n  pts.estimated_size,\n  sd.sample_size,\n  sd.total_eligible_user_count,\n  sd.sample_ratio,\n  p.goal_metric,\n  pts.priority,\n  pts.status,\n  pts.created_at\nORDER BY pts.promotion_id ASC, pts.created_at DESC                                   "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   pts.promotion_id AS "promotionId",
 *   pts.segment_id AS "segmentId",
 *   pts.segment_name AS "segmentName",
 *   sd.source,
 *   sd.natural_language_query AS "naturalLanguageQuery",
 *   pts.rule_json AS "ruleJson",
 *   pts.profile_json AS "profileJson",
 *   pts.content_brief_json AS "contentBriefJson",
 *   pts.data_evidence_json AS "dataEvidenceJson",
 *   pts.estimated_size AS "estimatedSize",
 *   sd.sample_size AS "sampleSize",
 *   sd.total_eligible_user_count AS "totalEligibleUserCount",
 *   sd.sample_ratio::float8 AS "sampleRatio",
 *   p.goal_metric AS "goalMetric",
 *   MAX(pe.actual_value)::float8 AS "latestActualValue",
 *   MAX(ae.ad_experiment_id) AS "adExperimentId",
 *   CASE
 *     WHEN pts.status = 'planned' THEN 'create_content'
 *     WHEN COUNT(DISTINCT ae.ad_experiment_id) = 0 THEN 'approve_content'
 *     WHEN COUNT(*) FILTER (WHERE pe.status = 'insufficient_data') > 0 THEN 'review_sample'
 *     WHEN COUNT(*) FILTER (WHERE pe.next_loop_required) > 0 THEN 'next_loop'
 *     ELSE 'monitor'
 *   END AS "nextAction",
 *   pts.priority,
 *   pts.status
 * FROM promotion_target_segments pts
 * JOIN segment_definitions sd
 *   ON sd.segment_id = pts.segment_id
 * JOIN promotions p
 *   ON p.promotion_id = pts.promotion_id
 * LEFT JOIN ad_experiments ae
 *   ON ae.promotion_id = pts.promotion_id
 *  AND ae.segment_id = pts.segment_id
 * LEFT JOIN promotion_evaluations pe
 *   ON pe.promotion_id = pts.promotion_id
 *  AND pe.segment_id = pts.segment_id
 * WHERE pts.project_id = :projectId
 *   AND pts.campaign_id = :campaignId
 * GROUP BY
 *   pts.promotion_id,
 *   pts.segment_id,
 *   pts.segment_name,
 *   sd.source,
 *   sd.natural_language_query,
 *   pts.rule_json,
 *   pts.profile_json,
 *   pts.content_brief_json,
 *   pts.data_evidence_json,
 *   pts.estimated_size,
 *   sd.sample_size,
 *   sd.total_eligible_user_count,
 *   sd.sample_ratio,
 *   p.goal_metric,
 *   pts.priority,
 *   pts.status,
 *   pts.created_at
 * ORDER BY pts.promotion_id ASC, pts.created_at DESC                                   
 * ```
 */
export const listDashboardCampaignSegments = new PreparedQuery<IListDashboardCampaignSegmentsParams,IListDashboardCampaignSegmentsResult>(listDashboardCampaignSegmentsIR);


/** 'ListDashboardPromotionSegments' parameters type */
export interface IListDashboardPromotionSegmentsParams {
  projectId?: string | null | void;
  promotionId?: string | null | void;
}

/** 'ListDashboardPromotionSegments' return type */
export interface IListDashboardPromotionSegmentsResult {
  adExperimentId: string | null;
  contentBriefJson: Json;
  dataEvidenceJson: Json;
  estimatedSize: number;
  goalMetric: string;
  latestActualValue: number | null;
  naturalLanguageQuery: string | null;
  nextAction: string | null;
  priority: string | null;
  profileJson: Json;
  promotionId: string;
  ruleJson: Json;
  sampleRatio: number | null;
  sampleSize: number;
  segmentId: string;
  segmentName: string;
  source: string;
  status: string;
  totalEligibleUserCount: number;
}

/** 'ListDashboardPromotionSegments' query type */
export interface IListDashboardPromotionSegmentsQuery {
  params: IListDashboardPromotionSegmentsParams;
  result: IListDashboardPromotionSegmentsResult;
}

const listDashboardPromotionSegmentsIR: any = {"usedParamSet":{"projectId":true,"promotionId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1425,"b":1434}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1461,"b":1472}]}],"statement":"SELECT\n  pts.promotion_id AS \"promotionId\",\n  pts.segment_id AS \"segmentId\",\n  pts.segment_name AS \"segmentName\",\n  sd.source,\n  sd.natural_language_query AS \"naturalLanguageQuery\",\n  pts.rule_json AS \"ruleJson\",\n  pts.profile_json AS \"profileJson\",\n  pts.content_brief_json AS \"contentBriefJson\",\n  pts.data_evidence_json AS \"dataEvidenceJson\",\n  pts.estimated_size AS \"estimatedSize\",\n  sd.sample_size AS \"sampleSize\",\n  sd.total_eligible_user_count AS \"totalEligibleUserCount\",\n  sd.sample_ratio::float8 AS \"sampleRatio\",\n  p.goal_metric AS \"goalMetric\",\n  MAX(pe.actual_value)::float8 AS \"latestActualValue\",\n  MAX(ae.ad_experiment_id) AS \"adExperimentId\",\n  CASE\n    WHEN pts.status = 'planned' THEN 'create_content'\n    WHEN COUNT(DISTINCT ae.ad_experiment_id) = 0 THEN 'approve_content'\n    WHEN COUNT(*) FILTER (WHERE pe.status = 'insufficient_data') > 0 THEN 'review_sample'\n    WHEN COUNT(*) FILTER (WHERE pe.next_loop_required) > 0 THEN 'next_loop'\n    ELSE 'monitor'\n  END AS \"nextAction\",\n  pts.priority,\n  pts.status\nFROM promotion_target_segments pts\nJOIN segment_definitions sd\n  ON sd.segment_id = pts.segment_id\nJOIN promotions p\n  ON p.promotion_id = pts.promotion_id\nLEFT JOIN ad_experiments ae\n  ON ae.promotion_id = pts.promotion_id\n AND ae.segment_id = pts.segment_id\nLEFT JOIN promotion_evaluations pe\n  ON pe.promotion_id = pts.promotion_id\n AND pe.segment_id = pts.segment_id\nWHERE pts.project_id = :projectId\n  AND pts.promotion_id = :promotionId\nGROUP BY\n  pts.promotion_id,\n  pts.segment_id,\n  pts.segment_name,\n  sd.source,\n  sd.natural_language_query,\n  pts.rule_json,\n  pts.profile_json,\n  pts.content_brief_json,\n  pts.data_evidence_json,\n  pts.estimated_size,\n  sd.sample_size,\n  sd.total_eligible_user_count,\n  sd.sample_ratio,\n  p.goal_metric,\n  pts.priority,\n  pts.status,\n  pts.created_at\nORDER BY pts.created_at DESC                                    "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   pts.promotion_id AS "promotionId",
 *   pts.segment_id AS "segmentId",
 *   pts.segment_name AS "segmentName",
 *   sd.source,
 *   sd.natural_language_query AS "naturalLanguageQuery",
 *   pts.rule_json AS "ruleJson",
 *   pts.profile_json AS "profileJson",
 *   pts.content_brief_json AS "contentBriefJson",
 *   pts.data_evidence_json AS "dataEvidenceJson",
 *   pts.estimated_size AS "estimatedSize",
 *   sd.sample_size AS "sampleSize",
 *   sd.total_eligible_user_count AS "totalEligibleUserCount",
 *   sd.sample_ratio::float8 AS "sampleRatio",
 *   p.goal_metric AS "goalMetric",
 *   MAX(pe.actual_value)::float8 AS "latestActualValue",
 *   MAX(ae.ad_experiment_id) AS "adExperimentId",
 *   CASE
 *     WHEN pts.status = 'planned' THEN 'create_content'
 *     WHEN COUNT(DISTINCT ae.ad_experiment_id) = 0 THEN 'approve_content'
 *     WHEN COUNT(*) FILTER (WHERE pe.status = 'insufficient_data') > 0 THEN 'review_sample'
 *     WHEN COUNT(*) FILTER (WHERE pe.next_loop_required) > 0 THEN 'next_loop'
 *     ELSE 'monitor'
 *   END AS "nextAction",
 *   pts.priority,
 *   pts.status
 * FROM promotion_target_segments pts
 * JOIN segment_definitions sd
 *   ON sd.segment_id = pts.segment_id
 * JOIN promotions p
 *   ON p.promotion_id = pts.promotion_id
 * LEFT JOIN ad_experiments ae
 *   ON ae.promotion_id = pts.promotion_id
 *  AND ae.segment_id = pts.segment_id
 * LEFT JOIN promotion_evaluations pe
 *   ON pe.promotion_id = pts.promotion_id
 *  AND pe.segment_id = pts.segment_id
 * WHERE pts.project_id = :projectId
 *   AND pts.promotion_id = :promotionId
 * GROUP BY
 *   pts.promotion_id,
 *   pts.segment_id,
 *   pts.segment_name,
 *   sd.source,
 *   sd.natural_language_query,
 *   pts.rule_json,
 *   pts.profile_json,
 *   pts.content_brief_json,
 *   pts.data_evidence_json,
 *   pts.estimated_size,
 *   sd.sample_size,
 *   sd.total_eligible_user_count,
 *   sd.sample_ratio,
 *   p.goal_metric,
 *   pts.priority,
 *   pts.status,
 *   pts.created_at
 * ORDER BY pts.created_at DESC                                    
 * ```
 */
export const listDashboardPromotionSegments = new PreparedQuery<IListDashboardPromotionSegmentsParams,IListDashboardPromotionSegmentsResult>(listDashboardPromotionSegmentsIR);


/** 'GetDashboardPromotionSegment' parameters type */
export interface IGetDashboardPromotionSegmentParams {
  projectId?: string | null | void;
  promotionId?: string | null | void;
  segmentId?: string | null | void;
}

/** 'GetDashboardPromotionSegment' return type */
export interface IGetDashboardPromotionSegmentResult {
  adExperimentId: string | null;
  contentBriefJson: Json;
  dataEvidenceJson: Json;
  estimatedSize: number;
  goalMetric: string;
  latestActualValue: number | null;
  naturalLanguageQuery: string | null;
  nextAction: string | null;
  priority: string | null;
  profileJson: Json;
  promotionId: string;
  ruleJson: Json;
  sampleRatio: number | null;
  sampleSize: number;
  segmentId: string;
  segmentName: string;
  source: string;
  status: string;
  totalEligibleUserCount: number;
}

/** 'GetDashboardPromotionSegment' query type */
export interface IGetDashboardPromotionSegmentQuery {
  params: IGetDashboardPromotionSegmentParams;
  result: IGetDashboardPromotionSegmentResult;
}

const getDashboardPromotionSegmentIR: any = {"usedParamSet":{"projectId":true,"promotionId":true,"segmentId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1425,"b":1434}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1461,"b":1472}]},{"name":"segmentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1497,"b":1506}]}],"statement":"SELECT\n  pts.promotion_id AS \"promotionId\",\n  pts.segment_id AS \"segmentId\",\n  pts.segment_name AS \"segmentName\",\n  sd.source,\n  sd.natural_language_query AS \"naturalLanguageQuery\",\n  pts.rule_json AS \"ruleJson\",\n  pts.profile_json AS \"profileJson\",\n  pts.content_brief_json AS \"contentBriefJson\",\n  pts.data_evidence_json AS \"dataEvidenceJson\",\n  pts.estimated_size AS \"estimatedSize\",\n  sd.sample_size AS \"sampleSize\",\n  sd.total_eligible_user_count AS \"totalEligibleUserCount\",\n  sd.sample_ratio::float8 AS \"sampleRatio\",\n  p.goal_metric AS \"goalMetric\",\n  MAX(pe.actual_value)::float8 AS \"latestActualValue\",\n  MAX(ae.ad_experiment_id) AS \"adExperimentId\",\n  CASE\n    WHEN pts.status = 'planned' THEN 'create_content'\n    WHEN COUNT(DISTINCT ae.ad_experiment_id) = 0 THEN 'approve_content'\n    WHEN COUNT(*) FILTER (WHERE pe.status = 'insufficient_data') > 0 THEN 'review_sample'\n    WHEN COUNT(*) FILTER (WHERE pe.next_loop_required) > 0 THEN 'next_loop'\n    ELSE 'monitor'\n  END AS \"nextAction\",\n  pts.priority,\n  pts.status\nFROM promotion_target_segments pts\nJOIN segment_definitions sd\n  ON sd.segment_id = pts.segment_id\nJOIN promotions p\n  ON p.promotion_id = pts.promotion_id\nLEFT JOIN ad_experiments ae\n  ON ae.promotion_id = pts.promotion_id\n AND ae.segment_id = pts.segment_id\nLEFT JOIN promotion_evaluations pe\n  ON pe.promotion_id = pts.promotion_id\n AND pe.segment_id = pts.segment_id\nWHERE pts.project_id = :projectId\n  AND pts.promotion_id = :promotionId\n  AND pts.segment_id = :segmentId\nGROUP BY\n  pts.promotion_id,\n  pts.segment_id,\n  pts.segment_name,\n  sd.source,\n  sd.natural_language_query,\n  pts.rule_json,\n  pts.profile_json,\n  pts.content_brief_json,\n  pts.data_evidence_json,\n  pts.estimated_size,\n  sd.sample_size,\n  sd.total_eligible_user_count,\n  sd.sample_ratio,\n  p.goal_metric,\n  pts.priority,\n  pts.status,\n  pts.created_at                                              "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   pts.promotion_id AS "promotionId",
 *   pts.segment_id AS "segmentId",
 *   pts.segment_name AS "segmentName",
 *   sd.source,
 *   sd.natural_language_query AS "naturalLanguageQuery",
 *   pts.rule_json AS "ruleJson",
 *   pts.profile_json AS "profileJson",
 *   pts.content_brief_json AS "contentBriefJson",
 *   pts.data_evidence_json AS "dataEvidenceJson",
 *   pts.estimated_size AS "estimatedSize",
 *   sd.sample_size AS "sampleSize",
 *   sd.total_eligible_user_count AS "totalEligibleUserCount",
 *   sd.sample_ratio::float8 AS "sampleRatio",
 *   p.goal_metric AS "goalMetric",
 *   MAX(pe.actual_value)::float8 AS "latestActualValue",
 *   MAX(ae.ad_experiment_id) AS "adExperimentId",
 *   CASE
 *     WHEN pts.status = 'planned' THEN 'create_content'
 *     WHEN COUNT(DISTINCT ae.ad_experiment_id) = 0 THEN 'approve_content'
 *     WHEN COUNT(*) FILTER (WHERE pe.status = 'insufficient_data') > 0 THEN 'review_sample'
 *     WHEN COUNT(*) FILTER (WHERE pe.next_loop_required) > 0 THEN 'next_loop'
 *     ELSE 'monitor'
 *   END AS "nextAction",
 *   pts.priority,
 *   pts.status
 * FROM promotion_target_segments pts
 * JOIN segment_definitions sd
 *   ON sd.segment_id = pts.segment_id
 * JOIN promotions p
 *   ON p.promotion_id = pts.promotion_id
 * LEFT JOIN ad_experiments ae
 *   ON ae.promotion_id = pts.promotion_id
 *  AND ae.segment_id = pts.segment_id
 * LEFT JOIN promotion_evaluations pe
 *   ON pe.promotion_id = pts.promotion_id
 *  AND pe.segment_id = pts.segment_id
 * WHERE pts.project_id = :projectId
 *   AND pts.promotion_id = :promotionId
 *   AND pts.segment_id = :segmentId
 * GROUP BY
 *   pts.promotion_id,
 *   pts.segment_id,
 *   pts.segment_name,
 *   sd.source,
 *   sd.natural_language_query,
 *   pts.rule_json,
 *   pts.profile_json,
 *   pts.content_brief_json,
 *   pts.data_evidence_json,
 *   pts.estimated_size,
 *   sd.sample_size,
 *   sd.total_eligible_user_count,
 *   sd.sample_ratio,
 *   p.goal_metric,
 *   pts.priority,
 *   pts.status,
 *   pts.created_at                                              
 * ```
 */
export const getDashboardPromotionSegment = new PreparedQuery<IGetDashboardPromotionSegmentParams,IGetDashboardPromotionSegmentResult>(getDashboardPromotionSegmentIR);


/** 'InsertDashboardManualPromotionAnalysis' parameters type */
export interface IInsertDashboardManualPromotionAnalysisParams {
  analysisId?: string | null | void;
  campaignId?: string | null | void;
  projectId?: string | null | void;
  promotionId?: string | null | void;
}

/** 'InsertDashboardManualPromotionAnalysis' return type */
export interface IInsertDashboardManualPromotionAnalysisResult {
  analysisId: string;
}

/** 'InsertDashboardManualPromotionAnalysis' query type */
export interface IInsertDashboardManualPromotionAnalysisQuery {
  params: IInsertDashboardManualPromotionAnalysisParams;
  result: IInsertDashboardManualPromotionAnalysisResult;
}

const insertDashboardManualPromotionAnalysisIR: any = {"usedParamSet":{"analysisId":true,"projectId":true,"campaignId":true,"promotionId":true},"params":[{"name":"analysisId","required":false,"transform":{"type":"scalar"},"locs":[{"a":139,"b":149}]},{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":154,"b":163}]},{"name":"campaignId","required":false,"transform":{"type":"scalar"},"locs":[{"a":168,"b":178}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":183,"b":194}]}],"statement":"INSERT INTO promotion_analyses (\n  analysis_id,\n  project_id,\n  campaign_id,\n  promotion_id,\n  operator_instruction,\n  status\n)\nVALUES (\n  :analysisId,\n  :projectId,\n  :campaignId,\n  :promotionId,\n  'dashboard_manual_segment_attach',\n  'completed'\n)\nRETURNING analysis_id AS \"analysisId\"                                        "};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO promotion_analyses (
 *   analysis_id,
 *   project_id,
 *   campaign_id,
 *   promotion_id,
 *   operator_instruction,
 *   status
 * )
 * VALUES (
 *   :analysisId,
 *   :projectId,
 *   :campaignId,
 *   :promotionId,
 *   'dashboard_manual_segment_attach',
 *   'completed'
 * )
 * RETURNING analysis_id AS "analysisId"                                        
 * ```
 */
export const insertDashboardManualPromotionAnalysis = new PreparedQuery<IInsertDashboardManualPromotionAnalysisParams,IInsertDashboardManualPromotionAnalysisResult>(insertDashboardManualPromotionAnalysisIR);


/** 'InsertDashboardPromotionTargetSegment' parameters type */
export interface IInsertDashboardPromotionTargetSegmentParams {
  analysisId?: string | null | void;
  campaignId?: string | null | void;
  priority?: string | null | void;
  projectId?: string | null | void;
  promotionId?: string | null | void;
  segmentId?: string | null | void;
  segmentName?: string | null | void;
  status?: string | null | void;
}

/** 'InsertDashboardPromotionTargetSegment' return type */
export interface IInsertDashboardPromotionTargetSegmentResult {
  promotionId: string;
  segmentId: string;
}

/** 'InsertDashboardPromotionTargetSegment' query type */
export interface IInsertDashboardPromotionTargetSegmentQuery {
  params: IInsertDashboardPromotionTargetSegmentParams;
  result: IInsertDashboardPromotionTargetSegmentResult;
}

const insertDashboardPromotionTargetSegmentIR: any = {"usedParamSet":{"analysisId":true,"campaignId":true,"promotionId":true,"segmentName":true,"priority":true,"status":true,"projectId":true,"segmentId":true},"params":[{"name":"analysisId","required":false,"transform":{"type":"scalar"},"locs":[{"a":254,"b":264}]},{"name":"campaignId","required":false,"transform":{"type":"scalar"},"locs":[{"a":297,"b":307},{"a":932,"b":942}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":323,"b":334},{"a":1039,"b":1050},{"a":1253,"b":1264}]},{"name":"segmentName","required":false,"transform":{"type":"scalar"},"locs":[{"a":375,"b":386}]},{"name":"priority","required":false,"transform":{"type":"scalar"},"locs":[{"a":645,"b":653}]},{"name":"status","required":false,"transform":{"type":"scalar"},"locs":[{"a":658,"b":664}]},{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":716,"b":725},{"a":895,"b":904},{"a":1001,"b":1010},{"a":1204,"b":1213}]},{"name":"segmentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":749,"b":758},{"a":1302,"b":1311}]}],"statement":"INSERT INTO promotion_target_segments (\n  analysis_id,\n  project_id,\n  campaign_id,\n  promotion_id,\n  segment_id,\n  segment_name,\n  rule_json,\n  profile_json,\n  content_brief_json,\n  data_evidence_json,\n  estimated_size,\n  priority,\n  status\n)\nSELECT\n  (:analysisId)::varchar,\n  sd.project_id,\n  (:campaignId)::varchar,\n  (:promotionId)::varchar,\n  sd.segment_id,\n  COALESCE(:segmentName, sd.segment_name),\n  sd.rule_json,\n  sd.profile_json,\n  '{}'::jsonb,\n  jsonb_build_object(\n    'source', sd.source,\n    'query_preview_id', sd.query_preview_id,\n    'sample_size', sd.sample_size,\n    'sample_ratio', sd.sample_ratio\n  ),\n  sd.sample_size,\n  :priority,\n  :status\nFROM segment_definitions sd\nWHERE sd.project_id = :projectId\n  AND sd.segment_id = :segmentId\n  AND EXISTS (\n    SELECT 1\n    FROM campaigns c\n    JOIN promotions p\n      ON p.campaign_id = c.campaign_id\n    WHERE c.project_id = :projectId\n      AND c.campaign_id = :campaignId\n      AND c.status <> 'stopped'\n      AND p.project_id = :projectId\n      AND p.promotion_id = :promotionId\n      AND p.status <> 'stopped'\n  )\n  AND NOT EXISTS (\n    SELECT 1\n    FROM promotion_target_segments existing_pts\n    WHERE existing_pts.project_id = :projectId\n      AND existing_pts.promotion_id = :promotionId\n      AND existing_pts.segment_id = :segmentId\n      AND existing_pts.status <> 'stopped'\n  )\nRETURNING promotion_id AS \"promotionId\", segment_id AS \"segmentId\"                                      "};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO promotion_target_segments (
 *   analysis_id,
 *   project_id,
 *   campaign_id,
 *   promotion_id,
 *   segment_id,
 *   segment_name,
 *   rule_json,
 *   profile_json,
 *   content_brief_json,
 *   data_evidence_json,
 *   estimated_size,
 *   priority,
 *   status
 * )
 * SELECT
 *   (:analysisId)::varchar,
 *   sd.project_id,
 *   (:campaignId)::varchar,
 *   (:promotionId)::varchar,
 *   sd.segment_id,
 *   COALESCE(:segmentName, sd.segment_name),
 *   sd.rule_json,
 *   sd.profile_json,
 *   '{}'::jsonb,
 *   jsonb_build_object(
 *     'source', sd.source,
 *     'query_preview_id', sd.query_preview_id,
 *     'sample_size', sd.sample_size,
 *     'sample_ratio', sd.sample_ratio
 *   ),
 *   sd.sample_size,
 *   :priority,
 *   :status
 * FROM segment_definitions sd
 * WHERE sd.project_id = :projectId
 *   AND sd.segment_id = :segmentId
 *   AND EXISTS (
 *     SELECT 1
 *     FROM campaigns c
 *     JOIN promotions p
 *       ON p.campaign_id = c.campaign_id
 *     WHERE c.project_id = :projectId
 *       AND c.campaign_id = :campaignId
 *       AND c.status <> 'stopped'
 *       AND p.project_id = :projectId
 *       AND p.promotion_id = :promotionId
 *       AND p.status <> 'stopped'
 *   )
 *   AND NOT EXISTS (
 *     SELECT 1
 *     FROM promotion_target_segments existing_pts
 *     WHERE existing_pts.project_id = :projectId
 *       AND existing_pts.promotion_id = :promotionId
 *       AND existing_pts.segment_id = :segmentId
 *       AND existing_pts.status <> 'stopped'
 *   )
 * RETURNING promotion_id AS "promotionId", segment_id AS "segmentId"                                      
 * ```
 */
export const insertDashboardPromotionTargetSegment = new PreparedQuery<IInsertDashboardPromotionTargetSegmentParams,IInsertDashboardPromotionTargetSegmentResult>(insertDashboardPromotionTargetSegmentIR);


/** 'UpdateDashboardPromotionTargetSegment' parameters type */
export interface IUpdateDashboardPromotionTargetSegmentParams {
  priority?: string | null | void;
  priorityIsSet?: boolean | null | void;
  projectId?: string | null | void;
  promotionId?: string | null | void;
  segmentId?: string | null | void;
  segmentName?: string | null | void;
  status?: string | null | void;
}

/** 'UpdateDashboardPromotionTargetSegment' return type */
export interface IUpdateDashboardPromotionTargetSegmentResult {
  promotionId: string;
  segmentId: string;
}

/** 'UpdateDashboardPromotionTargetSegment' query type */
export interface IUpdateDashboardPromotionTargetSegmentQuery {
  params: IUpdateDashboardPromotionTargetSegmentParams;
  result: IUpdateDashboardPromotionTargetSegmentResult;
}

const updateDashboardPromotionTargetSegmentIR: any = {"usedParamSet":{"segmentName":true,"priorityIsSet":true,"priority":true,"status":true,"projectId":true,"promotionId":true,"segmentId":true},"params":[{"name":"segmentName","required":false,"transform":{"type":"scalar"},"locs":[{"a":63,"b":74}]},{"name":"priorityIsSet","required":false,"transform":{"type":"scalar"},"locs":[{"a":115,"b":128}]},{"name":"priority","required":false,"transform":{"type":"scalar"},"locs":[{"a":135,"b":143}]},{"name":"status","required":false,"transform":{"type":"scalar"},"locs":[{"a":184,"b":190}]},{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":220,"b":229}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":252,"b":263}]},{"name":"segmentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":284,"b":293}]}],"statement":"UPDATE promotion_target_segments\nSET\n  segment_name = COALESCE(:segmentName, segment_name),\n  priority = CASE WHEN :priorityIsSet THEN :priority ELSE priority END,\n  status = COALESCE(:status, status)\nWHERE project_id = :projectId\n  AND promotion_id = :promotionId\n  AND segment_id = :segmentId\n  AND status <> 'stopped'\nRETURNING promotion_id AS \"promotionId\", segment_id AS \"segmentId\"                                             "};

/**
 * Query generated from SQL:
 * ```
 * UPDATE promotion_target_segments
 * SET
 *   segment_name = COALESCE(:segmentName, segment_name),
 *   priority = CASE WHEN :priorityIsSet THEN :priority ELSE priority END,
 *   status = COALESCE(:status, status)
 * WHERE project_id = :projectId
 *   AND promotion_id = :promotionId
 *   AND segment_id = :segmentId
 *   AND status <> 'stopped'
 * RETURNING promotion_id AS "promotionId", segment_id AS "segmentId"                                             
 * ```
 */
export const updateDashboardPromotionTargetSegment = new PreparedQuery<IUpdateDashboardPromotionTargetSegmentParams,IUpdateDashboardPromotionTargetSegmentResult>(updateDashboardPromotionTargetSegmentIR);


/** 'StopDashboardPromotionTargetSegment' parameters type */
export interface IStopDashboardPromotionTargetSegmentParams {
  projectId?: string | null | void;
  promotionId?: string | null | void;
  segmentId?: string | null | void;
}

/** 'StopDashboardPromotionTargetSegment' return type */
export interface IStopDashboardPromotionTargetSegmentResult {
  promotionId: string;
  segmentId: string;
  status: string;
}

/** 'StopDashboardPromotionTargetSegment' query type */
export interface IStopDashboardPromotionTargetSegmentQuery {
  params: IStopDashboardPromotionTargetSegmentParams;
  result: IStopDashboardPromotionTargetSegmentResult;
}

const stopDashboardPromotionTargetSegmentIR: any = {"usedParamSet":{"projectId":true,"promotionId":true,"segmentId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":75,"b":84}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":107,"b":118}]},{"name":"segmentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":139,"b":148}]}],"statement":"UPDATE promotion_target_segments\nSET status = 'stopped'\nWHERE project_id = :projectId\n  AND promotion_id = :promotionId\n  AND segment_id = :segmentId\nRETURNING promotion_id AS \"promotionId\", segment_id AS \"segmentId\", status                                                  "};

/**
 * Query generated from SQL:
 * ```
 * UPDATE promotion_target_segments
 * SET status = 'stopped'
 * WHERE project_id = :projectId
 *   AND promotion_id = :promotionId
 *   AND segment_id = :segmentId
 * RETURNING promotion_id AS "promotionId", segment_id AS "segmentId", status                                                  
 * ```
 */
export const stopDashboardPromotionTargetSegment = new PreparedQuery<IStopDashboardPromotionTargetSegmentParams,IStopDashboardPromotionTargetSegmentResult>(stopDashboardPromotionTargetSegmentIR);


/** 'InsertDashboardNextLoopAnalysis' parameters type */
export interface IInsertDashboardNextLoopAnalysisParams {
  analysisId?: string | null | void;
  campaignId?: string | null | void;
  focusSegmentIdsJson?: Json | null | void;
  operatorInstruction?: string | null | void;
  projectId?: string | null | void;
  promotionId?: string | null | void;
}

/** 'InsertDashboardNextLoopAnalysis' return type */
export interface IInsertDashboardNextLoopAnalysisResult {
  analysisId: string;
  focusSegmentIdsJson: Json | null;
  promotionId: string;
  status: string;
}

/** 'InsertDashboardNextLoopAnalysis' query type */
export interface IInsertDashboardNextLoopAnalysisQuery {
  params: IInsertDashboardNextLoopAnalysisParams;
  result: IInsertDashboardNextLoopAnalysisResult;
}

const insertDashboardNextLoopAnalysisIR: any = {"usedParamSet":{"analysisId":true,"projectId":true,"campaignId":true,"promotionId":true,"focusSegmentIdsJson":true,"operatorInstruction":true},"params":[{"name":"analysisId","required":false,"transform":{"type":"scalar"},"locs":[{"a":165,"b":175}]},{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":180,"b":189}]},{"name":"campaignId","required":false,"transform":{"type":"scalar"},"locs":[{"a":194,"b":204}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":209,"b":220}]},{"name":"focusSegmentIdsJson","required":false,"transform":{"type":"scalar"},"locs":[{"a":225,"b":244}]},{"name":"operatorInstruction","required":false,"transform":{"type":"scalar"},"locs":[{"a":249,"b":268}]}],"statement":"INSERT INTO promotion_analyses (\n  analysis_id,\n  project_id,\n  campaign_id,\n  promotion_id,\n  focus_segment_ids_json,\n  operator_instruction,\n  status\n)\nVALUES (\n  :analysisId,\n  :projectId,\n  :campaignId,\n  :promotionId,\n  :focusSegmentIdsJson,\n  :operatorInstruction,\n  'requested'\n)\nRETURNING\n  analysis_id AS \"analysisId\",\n  promotion_id AS \"promotionId\",\n  focus_segment_ids_json AS \"focusSegmentIdsJson\",\n  status                                              "};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO promotion_analyses (
 *   analysis_id,
 *   project_id,
 *   campaign_id,
 *   promotion_id,
 *   focus_segment_ids_json,
 *   operator_instruction,
 *   status
 * )
 * VALUES (
 *   :analysisId,
 *   :projectId,
 *   :campaignId,
 *   :promotionId,
 *   :focusSegmentIdsJson,
 *   :operatorInstruction,
 *   'requested'
 * )
 * RETURNING
 *   analysis_id AS "analysisId",
 *   promotion_id AS "promotionId",
 *   focus_segment_ids_json AS "focusSegmentIdsJson",
 *   status                                              
 * ```
 */
export const insertDashboardNextLoopAnalysis = new PreparedQuery<IInsertDashboardNextLoopAnalysisParams,IInsertDashboardNextLoopAnalysisResult>(insertDashboardNextLoopAnalysisIR);


/** 'ListDashboardPromotionAnalyses' parameters type */
export interface IListDashboardPromotionAnalysesParams {
  projectId?: string | null | void;
  promotionId?: string | null | void;
}

/** 'ListDashboardPromotionAnalyses' return type */
export interface IListDashboardPromotionAnalysesResult {
  analysisId: string;
  createdAt: Date;
  focusSegmentIdsJson: Json | null;
  inputSnapshotJson: Json;
  operatorInstruction: string | null;
  outputJson: Json | null;
  profileSummaryJson: Json;
  promotionId: string;
  status: string;
  updatedAt: Date;
}

/** 'ListDashboardPromotionAnalyses' query type */
export interface IListDashboardPromotionAnalysesQuery {
  params: IListDashboardPromotionAnalysesParams;
  result: IListDashboardPromotionAnalysesResult;
}

const listDashboardPromotionAnalysesIR: any = {"usedParamSet":{"projectId":true,"promotionId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":406,"b":415}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":438,"b":449}]}],"statement":"SELECT\n  analysis_id AS \"analysisId\",\n  promotion_id AS \"promotionId\",\n  focus_segment_ids_json AS \"focusSegmentIdsJson\",\n  operator_instruction AS \"operatorInstruction\",\n  input_snapshot_json AS \"inputSnapshotJson\",\n  profile_summary_json AS \"profileSummaryJson\",\n  output_json AS \"outputJson\",\n  status,\n  created_at AS \"createdAt\",\n  updated_at AS \"updatedAt\"\nFROM promotion_analyses\nWHERE project_id = :projectId\n  AND promotion_id = :promotionId\nORDER BY updated_at DESC, created_at DESC                                   "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   analysis_id AS "analysisId",
 *   promotion_id AS "promotionId",
 *   focus_segment_ids_json AS "focusSegmentIdsJson",
 *   operator_instruction AS "operatorInstruction",
 *   input_snapshot_json AS "inputSnapshotJson",
 *   profile_summary_json AS "profileSummaryJson",
 *   output_json AS "outputJson",
 *   status,
 *   created_at AS "createdAt",
 *   updated_at AS "updatedAt"
 * FROM promotion_analyses
 * WHERE project_id = :projectId
 *   AND promotion_id = :promotionId
 * ORDER BY updated_at DESC, created_at DESC                                   
 * ```
 */
export const listDashboardPromotionAnalyses = new PreparedQuery<IListDashboardPromotionAnalysesParams,IListDashboardPromotionAnalysesResult>(listDashboardPromotionAnalysesIR);


/** 'ListDashboardCampaignExperimentMetrics' parameters type */
export interface IListDashboardCampaignExperimentMetricsParams {
  campaignId?: string | null | void;
  projectId?: string | null | void;
}

/** 'ListDashboardCampaignExperimentMetrics' return type */
export interface IListDashboardCampaignExperimentMetricsResult {
  actualValue: number | null;
  adExperimentId: string | null;
  basis: string;
  contentId: string | null;
  contentOptionId: string | null;
  createdAt: Date;
  denominatorCount: number;
  feedback: string | null;
  metric: string;
  nextLoopRequired: boolean;
  numeratorCount: number;
  promotionId: string;
  promotionRunId: string;
  resultJson: Json;
  sampleSize: number;
  segmentId: string | null;
  status: string;
  targetValue: number | null;
}

/** 'ListDashboardCampaignExperimentMetrics' query type */
export interface IListDashboardCampaignExperimentMetricsQuery {
  params: IListDashboardCampaignExperimentMetricsParams;
  result: IListDashboardCampaignExperimentMetricsResult;
}

const listDashboardCampaignExperimentMetricsIR: any = {"usedParamSet":{"projectId":true,"campaignId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":605,"b":614}]},{"name":"campaignId","required":false,"transform":{"type":"scalar"},"locs":[{"a":636,"b":646}]}],"statement":"SELECT\n  promotion_id AS \"promotionId\",\n  promotion_run_id AS \"promotionRunId\",\n  ad_experiment_id AS \"adExperimentId\",\n  segment_id AS \"segmentId\",\n  content_id AS \"contentId\",\n  content_option_id AS \"contentOptionId\",\n  metric,\n  target_value::float8 AS \"targetValue\",\n  actual_value::float8 AS \"actualValue\",\n  numerator_count AS \"numeratorCount\",\n  denominator_count AS \"denominatorCount\",\n  sample_size AS \"sampleSize\",\n  basis,\n  status,\n  feedback,\n  next_loop_required AS \"nextLoopRequired\",\n  result_json AS \"resultJson\",\n  created_at AS \"createdAt\"\nFROM promotion_evaluations\nWHERE project_id = :projectId\n  AND campaign_id = :campaignId\nORDER BY created_at DESC                               "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   promotion_id AS "promotionId",
 *   promotion_run_id AS "promotionRunId",
 *   ad_experiment_id AS "adExperimentId",
 *   segment_id AS "segmentId",
 *   content_id AS "contentId",
 *   content_option_id AS "contentOptionId",
 *   metric,
 *   target_value::float8 AS "targetValue",
 *   actual_value::float8 AS "actualValue",
 *   numerator_count AS "numeratorCount",
 *   denominator_count AS "denominatorCount",
 *   sample_size AS "sampleSize",
 *   basis,
 *   status,
 *   feedback,
 *   next_loop_required AS "nextLoopRequired",
 *   result_json AS "resultJson",
 *   created_at AS "createdAt"
 * FROM promotion_evaluations
 * WHERE project_id = :projectId
 *   AND campaign_id = :campaignId
 * ORDER BY created_at DESC                               
 * ```
 */
export const listDashboardCampaignExperimentMetrics = new PreparedQuery<IListDashboardCampaignExperimentMetricsParams,IListDashboardCampaignExperimentMetricsResult>(listDashboardCampaignExperimentMetricsIR);


/** 'ListDashboardPromotionExperimentMetrics' parameters type */
export interface IListDashboardPromotionExperimentMetricsParams {
  projectId?: string | null | void;
  promotionId?: string | null | void;
}

/** 'ListDashboardPromotionExperimentMetrics' return type */
export interface IListDashboardPromotionExperimentMetricsResult {
  actualValue: number | null;
  adExperimentId: string | null;
  basis: string;
  contentId: string | null;
  contentOptionId: string | null;
  createdAt: Date;
  denominatorCount: number;
  feedback: string | null;
  metric: string;
  nextLoopRequired: boolean;
  numeratorCount: number;
  promotionId: string;
  promotionRunId: string;
  resultJson: Json;
  sampleSize: number;
  segmentId: string | null;
  status: string;
  targetValue: number | null;
}

/** 'ListDashboardPromotionExperimentMetrics' query type */
export interface IListDashboardPromotionExperimentMetricsQuery {
  params: IListDashboardPromotionExperimentMetricsParams;
  result: IListDashboardPromotionExperimentMetricsResult;
}

const listDashboardPromotionExperimentMetricsIR: any = {"usedParamSet":{"projectId":true,"promotionId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":605,"b":614}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":637,"b":648}]}],"statement":"SELECT\n  promotion_id AS \"promotionId\",\n  promotion_run_id AS \"promotionRunId\",\n  ad_experiment_id AS \"adExperimentId\",\n  segment_id AS \"segmentId\",\n  content_id AS \"contentId\",\n  content_option_id AS \"contentOptionId\",\n  metric,\n  target_value::float8 AS \"targetValue\",\n  actual_value::float8 AS \"actualValue\",\n  numerator_count AS \"numeratorCount\",\n  denominator_count AS \"denominatorCount\",\n  sample_size AS \"sampleSize\",\n  basis,\n  status,\n  feedback,\n  next_loop_required AS \"nextLoopRequired\",\n  result_json AS \"resultJson\",\n  created_at AS \"createdAt\"\nFROM promotion_evaluations\nWHERE project_id = :projectId\n  AND promotion_id = :promotionId\nORDER BY created_at DESC                                   "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   promotion_id AS "promotionId",
 *   promotion_run_id AS "promotionRunId",
 *   ad_experiment_id AS "adExperimentId",
 *   segment_id AS "segmentId",
 *   content_id AS "contentId",
 *   content_option_id AS "contentOptionId",
 *   metric,
 *   target_value::float8 AS "targetValue",
 *   actual_value::float8 AS "actualValue",
 *   numerator_count AS "numeratorCount",
 *   denominator_count AS "denominatorCount",
 *   sample_size AS "sampleSize",
 *   basis,
 *   status,
 *   feedback,
 *   next_loop_required AS "nextLoopRequired",
 *   result_json AS "resultJson",
 *   created_at AS "createdAt"
 * FROM promotion_evaluations
 * WHERE project_id = :projectId
 *   AND promotion_id = :promotionId
 * ORDER BY created_at DESC                                   
 * ```
 */
export const listDashboardPromotionExperimentMetrics = new PreparedQuery<IListDashboardPromotionExperimentMetricsParams,IListDashboardPromotionExperimentMetricsResult>(listDashboardPromotionExperimentMetricsIR);


/** 'ListDashboardSegmentExperimentMetrics' parameters type */
export interface IListDashboardSegmentExperimentMetricsParams {
  projectId?: string | null | void;
  promotionId?: string | null | void;
  segmentId?: string | null | void;
}

/** 'ListDashboardSegmentExperimentMetrics' return type */
export interface IListDashboardSegmentExperimentMetricsResult {
  actualValue: number | null;
  adExperimentId: string | null;
  basis: string;
  contentId: string | null;
  contentOptionId: string | null;
  createdAt: Date;
  denominatorCount: number;
  feedback: string | null;
  metric: string;
  nextLoopRequired: boolean;
  numeratorCount: number;
  promotionId: string;
  promotionRunId: string;
  resultJson: Json;
  sampleSize: number;
  segmentId: string | null;
  status: string;
  targetValue: number | null;
}

/** 'ListDashboardSegmentExperimentMetrics' query type */
export interface IListDashboardSegmentExperimentMetricsQuery {
  params: IListDashboardSegmentExperimentMetricsParams;
  result: IListDashboardSegmentExperimentMetricsResult;
}

const listDashboardSegmentExperimentMetricsIR: any = {"usedParamSet":{"projectId":true,"promotionId":true,"segmentId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":605,"b":614}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":637,"b":648}]},{"name":"segmentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":669,"b":678}]}],"statement":"SELECT\n  promotion_id AS \"promotionId\",\n  promotion_run_id AS \"promotionRunId\",\n  ad_experiment_id AS \"adExperimentId\",\n  segment_id AS \"segmentId\",\n  content_id AS \"contentId\",\n  content_option_id AS \"contentOptionId\",\n  metric,\n  target_value::float8 AS \"targetValue\",\n  actual_value::float8 AS \"actualValue\",\n  numerator_count AS \"numeratorCount\",\n  denominator_count AS \"denominatorCount\",\n  sample_size AS \"sampleSize\",\n  basis,\n  status,\n  feedback,\n  next_loop_required AS \"nextLoopRequired\",\n  result_json AS \"resultJson\",\n  created_at AS \"createdAt\"\nFROM promotion_evaluations\nWHERE project_id = :projectId\n  AND promotion_id = :promotionId\n  AND segment_id = :segmentId\nORDER BY created_at DESC                                        "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   promotion_id AS "promotionId",
 *   promotion_run_id AS "promotionRunId",
 *   ad_experiment_id AS "adExperimentId",
 *   segment_id AS "segmentId",
 *   content_id AS "contentId",
 *   content_option_id AS "contentOptionId",
 *   metric,
 *   target_value::float8 AS "targetValue",
 *   actual_value::float8 AS "actualValue",
 *   numerator_count AS "numeratorCount",
 *   denominator_count AS "denominatorCount",
 *   sample_size AS "sampleSize",
 *   basis,
 *   status,
 *   feedback,
 *   next_loop_required AS "nextLoopRequired",
 *   result_json AS "resultJson",
 *   created_at AS "createdAt"
 * FROM promotion_evaluations
 * WHERE project_id = :projectId
 *   AND promotion_id = :promotionId
 *   AND segment_id = :segmentId
 * ORDER BY created_at DESC                                        
 * ```
 */
export const listDashboardSegmentExperimentMetrics = new PreparedQuery<IListDashboardSegmentExperimentMetricsParams,IListDashboardSegmentExperimentMetricsResult>(listDashboardSegmentExperimentMetricsIR);


/** 'GetDashboardCampaignDeliveryStatus' parameters type */
export interface IGetDashboardCampaignDeliveryStatusParams {
  campaignId?: string | null | void;
  projectId?: string | null | void;
}

/** 'GetDashboardCampaignDeliveryStatus' return type */
export interface IGetDashboardCampaignDeliveryStatusResult {
  bouncedCount: number | null;
  deliveredCount: number | null;
  failedCount: number | null;
  openedCount: number | null;
  scheduledCount: number | null;
  sentCount: number | null;
}

/** 'GetDashboardCampaignDeliveryStatus' query type */
export interface IGetDashboardCampaignDeliveryStatusQuery {
  params: IGetDashboardCampaignDeliveryStatusParams;
  result: IGetDashboardCampaignDeliveryStatusResult;
}

const getDashboardCampaignDeliveryStatusIR: any = {"usedParamSet":{"projectId":true,"campaignId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":326,"b":335}]},{"name":"campaignId","required":false,"transform":{"type":"scalar"},"locs":[{"a":357,"b":367}]}],"statement":"SELECT\n  COALESCE(SUM(target_count), 0)::int AS \"scheduledCount\",\n  COALESCE(SUM(sent_count), 0)::int AS \"sentCount\",\n  COALESCE(SUM(sent_count), 0)::int AS \"deliveredCount\",\n  0::int AS \"openedCount\",\n  0::int AS \"bouncedCount\",\n  COALESCE(SUM(failed_count), 0)::int AS \"failedCount\"\nFROM ad_dispatch_jobs\nWHERE project_id = :projectId\n  AND campaign_id = :campaignId\n  AND channel IN ('email', 'sms')                                         "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   COALESCE(SUM(target_count), 0)::int AS "scheduledCount",
 *   COALESCE(SUM(sent_count), 0)::int AS "sentCount",
 *   COALESCE(SUM(sent_count), 0)::int AS "deliveredCount",
 *   0::int AS "openedCount",
 *   0::int AS "bouncedCount",
 *   COALESCE(SUM(failed_count), 0)::int AS "failedCount"
 * FROM ad_dispatch_jobs
 * WHERE project_id = :projectId
 *   AND campaign_id = :campaignId
 *   AND channel IN ('email', 'sms')                                         
 * ```
 */
export const getDashboardCampaignDeliveryStatus = new PreparedQuery<IGetDashboardCampaignDeliveryStatusParams,IGetDashboardCampaignDeliveryStatusResult>(getDashboardCampaignDeliveryStatusIR);


/** 'GetDashboardPromotionDeliveryStatus' parameters type */
export interface IGetDashboardPromotionDeliveryStatusParams {
  projectId?: string | null | void;
  promotionId?: string | null | void;
}

/** 'GetDashboardPromotionDeliveryStatus' return type */
export interface IGetDashboardPromotionDeliveryStatusResult {
  bouncedCount: number | null;
  deliveredCount: number | null;
  failedCount: number | null;
  openedCount: number | null;
  scheduledCount: number | null;
  sentCount: number | null;
}

/** 'GetDashboardPromotionDeliveryStatus' query type */
export interface IGetDashboardPromotionDeliveryStatusQuery {
  params: IGetDashboardPromotionDeliveryStatusParams;
  result: IGetDashboardPromotionDeliveryStatusResult;
}

const getDashboardPromotionDeliveryStatusIR: any = {"usedParamSet":{"projectId":true,"promotionId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":326,"b":335}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":358,"b":369}]}],"statement":"SELECT\n  COALESCE(SUM(target_count), 0)::int AS \"scheduledCount\",\n  COALESCE(SUM(sent_count), 0)::int AS \"sentCount\",\n  COALESCE(SUM(sent_count), 0)::int AS \"deliveredCount\",\n  0::int AS \"openedCount\",\n  0::int AS \"bouncedCount\",\n  COALESCE(SUM(failed_count), 0)::int AS \"failedCount\"\nFROM ad_dispatch_jobs\nWHERE project_id = :projectId\n  AND promotion_id = :promotionId\n  AND channel IN ('email', 'sms')                                         "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   COALESCE(SUM(target_count), 0)::int AS "scheduledCount",
 *   COALESCE(SUM(sent_count), 0)::int AS "sentCount",
 *   COALESCE(SUM(sent_count), 0)::int AS "deliveredCount",
 *   0::int AS "openedCount",
 *   0::int AS "bouncedCount",
 *   COALESCE(SUM(failed_count), 0)::int AS "failedCount"
 * FROM ad_dispatch_jobs
 * WHERE project_id = :projectId
 *   AND promotion_id = :promotionId
 *   AND channel IN ('email', 'sms')                                         
 * ```
 */
export const getDashboardPromotionDeliveryStatus = new PreparedQuery<IGetDashboardPromotionDeliveryStatusParams,IGetDashboardPromotionDeliveryStatusResult>(getDashboardPromotionDeliveryStatusIR);


/** 'GetDashboardSegmentDeliveryStatus' parameters type */
export interface IGetDashboardSegmentDeliveryStatusParams {
  projectId?: string | null | void;
  promotionId?: string | null | void;
  segmentId?: string | null | void;
}

/** 'GetDashboardSegmentDeliveryStatus' return type */
export interface IGetDashboardSegmentDeliveryStatusResult {
  bouncedCount: number | null;
  deliveredCount: number | null;
  failedCount: number | null;
  openedCount: number | null;
  scheduledCount: number | null;
  sentCount: number | null;
}

/** 'GetDashboardSegmentDeliveryStatus' query type */
export interface IGetDashboardSegmentDeliveryStatusQuery {
  params: IGetDashboardSegmentDeliveryStatusParams;
  result: IGetDashboardSegmentDeliveryStatusResult;
}

const getDashboardSegmentDeliveryStatusIR: any = {"usedParamSet":{"projectId":true,"promotionId":true,"segmentId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":421,"b":430}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":457,"b":468}]},{"name":"segmentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":492,"b":501}]}],"statement":"SELECT\n  COALESCE(SUM(adj.target_count), 0)::int AS \"scheduledCount\",\n  COALESCE(SUM(adj.sent_count), 0)::int AS \"sentCount\",\n  COALESCE(SUM(adj.sent_count), 0)::int AS \"deliveredCount\",\n  0::int AS \"openedCount\",\n  0::int AS \"bouncedCount\",\n  COALESCE(SUM(adj.failed_count), 0)::int AS \"failedCount\"\nFROM ad_dispatch_jobs adj\nJOIN ad_experiments ae\n  ON ae.ad_experiment_id = adj.ad_experiment_id\nWHERE adj.project_id = :projectId\n  AND adj.promotion_id = :promotionId\n  AND ae.segment_id = :segmentId\n  AND adj.channel IN ('email', 'sms')                                              "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   COALESCE(SUM(adj.target_count), 0)::int AS "scheduledCount",
 *   COALESCE(SUM(adj.sent_count), 0)::int AS "sentCount",
 *   COALESCE(SUM(adj.sent_count), 0)::int AS "deliveredCount",
 *   0::int AS "openedCount",
 *   0::int AS "bouncedCount",
 *   COALESCE(SUM(adj.failed_count), 0)::int AS "failedCount"
 * FROM ad_dispatch_jobs adj
 * JOIN ad_experiments ae
 *   ON ae.ad_experiment_id = adj.ad_experiment_id
 * WHERE adj.project_id = :projectId
 *   AND adj.promotion_id = :promotionId
 *   AND ae.segment_id = :segmentId
 *   AND adj.channel IN ('email', 'sms')                                              
 * ```
 */
export const getDashboardSegmentDeliveryStatus = new PreparedQuery<IGetDashboardSegmentDeliveryStatusParams,IGetDashboardSegmentDeliveryStatusResult>(getDashboardSegmentDeliveryStatusIR);


/** 'ListDashboardPromotionSegmentDeliverySummaries' parameters type */
export interface IListDashboardPromotionSegmentDeliverySummariesParams {
  projectId?: string | null | void;
  promotionId?: string | null | void;
}

/** 'ListDashboardPromotionSegmentDeliverySummaries' return type */
export interface IListDashboardPromotionSegmentDeliverySummariesResult {
  deliveredCount: number | null;
  failedCount: number | null;
  scheduledCount: number | null;
  segmentId: string;
  sentCount: number | null;
}

/** 'ListDashboardPromotionSegmentDeliverySummaries' query type */
export interface IListDashboardPromotionSegmentDeliverySummariesQuery {
  params: IListDashboardPromotionSegmentDeliverySummariesParams;
  result: IListDashboardPromotionSegmentDeliverySummariesResult;
}

const listDashboardPromotionSegmentDeliverySummariesIR: any = {"usedParamSet":{"projectId":true,"promotionId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":398,"b":407}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":434,"b":445}]}],"statement":"SELECT\n  ae.segment_id AS \"segmentId\",\n  COALESCE(SUM(adj.target_count), 0)::int AS \"scheduledCount\",\n  COALESCE(SUM(adj.sent_count), 0)::int AS \"sentCount\",\n  COALESCE(SUM(adj.sent_count), 0)::int AS \"deliveredCount\",\n  COALESCE(SUM(adj.failed_count), 0)::int AS \"failedCount\"\nFROM ad_dispatch_jobs adj\nJOIN ad_experiments ae\n  ON ae.ad_experiment_id = adj.ad_experiment_id\nWHERE adj.project_id = :projectId\n  AND adj.promotion_id = :promotionId\n  AND adj.channel IN ('email', 'sms')\nGROUP BY ae.segment_id\nORDER BY COALESCE(SUM(adj.sent_count), 0)::int DESC, ae.segment_id ASC                                    "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   ae.segment_id AS "segmentId",
 *   COALESCE(SUM(adj.target_count), 0)::int AS "scheduledCount",
 *   COALESCE(SUM(adj.sent_count), 0)::int AS "sentCount",
 *   COALESCE(SUM(adj.sent_count), 0)::int AS "deliveredCount",
 *   COALESCE(SUM(adj.failed_count), 0)::int AS "failedCount"
 * FROM ad_dispatch_jobs adj
 * JOIN ad_experiments ae
 *   ON ae.ad_experiment_id = adj.ad_experiment_id
 * WHERE adj.project_id = :projectId
 *   AND adj.promotion_id = :promotionId
 *   AND adj.channel IN ('email', 'sms')
 * GROUP BY ae.segment_id
 * ORDER BY COALESCE(SUM(adj.sent_count), 0)::int DESC, ae.segment_id ASC                                    
 * ```
 */
export const listDashboardPromotionSegmentDeliverySummaries = new PreparedQuery<IListDashboardPromotionSegmentDeliverySummariesParams,IListDashboardPromotionSegmentDeliverySummariesResult>(listDashboardPromotionSegmentDeliverySummariesIR);


/** 'ListDashboardSegmentContentCandidates' parameters type */
export interface IListDashboardSegmentContentCandidatesParams {
  projectId?: string | null | void;
  promotionId?: string | null | void;
  segmentId?: string | null | void;
}

/** 'ListDashboardSegmentContentCandidates' return type */
export interface IListDashboardSegmentContentCandidatesResult {
  body: string | null;
  channel: string;
  contentId: string;
  contentOptionId: string;
  cta: string | null;
  dataEvidenceJson: Json;
  generationPrompt: string | null;
  imagePrompt: string | null;
  landingUrl: string | null;
  message: string | null;
  messageStrategy: string | null;
  metadataJson: Json;
  preheader: string | null;
  promotionId: string;
  reasonSummary: string | null;
  segmentId: string;
  status: string;
  subject: string | null;
  title: string | null;
  updatedAt: Date;
}

/** 'ListDashboardSegmentContentCandidates' query type */
export interface IListDashboardSegmentContentCandidatesQuery {
  params: IListDashboardSegmentContentCandidatesParams;
  result: IListDashboardSegmentContentCandidatesResult;
}

const listDashboardSegmentContentCandidatesIR: any = {"usedParamSet":{"projectId":true,"promotionId":true,"segmentId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":555,"b":564}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":587,"b":598}]},{"name":"segmentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":619,"b":628}]}],"statement":"SELECT\n  content_id AS \"contentId\",\n  content_option_id AS \"contentOptionId\",\n  promotion_id AS \"promotionId\",\n  segment_id AS \"segmentId\",\n  channel,\n  subject,\n  preheader,\n  title,\n  body,\n  cta,\n  message,\n  image_prompt AS \"imagePrompt\",\n  landing_url AS \"landingUrl\",\n  generation_prompt AS \"generationPrompt\",\n  reason_summary AS \"reasonSummary\",\n  data_evidence_json AS \"dataEvidenceJson\",\n  message_strategy AS \"messageStrategy\",\n  metadata_json AS \"metadataJson\",\n  status,\n  updated_at AS \"updatedAt\"\nFROM content_candidates\nWHERE project_id = :projectId\n  AND promotion_id = :promotionId\n  AND segment_id = :segmentId\nORDER BY updated_at DESC, created_at DESC                                        "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   content_id AS "contentId",
 *   content_option_id AS "contentOptionId",
 *   promotion_id AS "promotionId",
 *   segment_id AS "segmentId",
 *   channel,
 *   subject,
 *   preheader,
 *   title,
 *   body,
 *   cta,
 *   message,
 *   image_prompt AS "imagePrompt",
 *   landing_url AS "landingUrl",
 *   generation_prompt AS "generationPrompt",
 *   reason_summary AS "reasonSummary",
 *   data_evidence_json AS "dataEvidenceJson",
 *   message_strategy AS "messageStrategy",
 *   metadata_json AS "metadataJson",
 *   status,
 *   updated_at AS "updatedAt"
 * FROM content_candidates
 * WHERE project_id = :projectId
 *   AND promotion_id = :promotionId
 *   AND segment_id = :segmentId
 * ORDER BY updated_at DESC, created_at DESC                                        
 * ```
 */
export const listDashboardSegmentContentCandidates = new PreparedQuery<IListDashboardSegmentContentCandidatesParams,IListDashboardSegmentContentCandidatesResult>(listDashboardSegmentContentCandidatesIR);


/** 'ListDashboardSegmentAdExperiments' parameters type */
export interface IListDashboardSegmentAdExperimentsParams {
  projectId?: string | null | void;
  promotionId?: string | null | void;
  segmentId?: string | null | void;
}

/** 'ListDashboardSegmentAdExperiments' return type */
export interface IListDashboardSegmentAdExperimentsResult {
  adExperimentId: string;
  channel: string;
  contentId: string;
  contentOptionId: string;
  goalBasis: string;
  goalMetric: string;
  goalTargetValue: number | null;
  loopCount: number;
  promotionId: string;
  promotionRunId: string;
  segmentId: string;
  status: string;
}

/** 'ListDashboardSegmentAdExperiments' query type */
export interface IListDashboardSegmentAdExperimentsQuery {
  params: IListDashboardSegmentAdExperimentsParams;
  result: IListDashboardSegmentAdExperimentsResult;
}

const listDashboardSegmentAdExperimentsIR: any = {"usedParamSet":{"projectId":true,"promotionId":true,"segmentId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":418,"b":427}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":450,"b":461}]},{"name":"segmentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":482,"b":491}]}],"statement":"SELECT\n  ad_experiment_id AS \"adExperimentId\",\n  promotion_run_id AS \"promotionRunId\",\n  promotion_id AS \"promotionId\",\n  segment_id AS \"segmentId\",\n  content_id AS \"contentId\",\n  content_option_id AS \"contentOptionId\",\n  channel,\n  loop_count AS \"loopCount\",\n  goal_metric AS \"goalMetric\",\n  goal_target_value::float8 AS \"goalTargetValue\",\n  goal_basis AS \"goalBasis\",\n  status\nFROM ad_experiments\nWHERE project_id = :projectId\n  AND promotion_id = :promotionId\n  AND segment_id = :segmentId\nORDER BY loop_count DESC, updated_at DESC, created_at DESC                                                        "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   ad_experiment_id AS "adExperimentId",
 *   promotion_run_id AS "promotionRunId",
 *   promotion_id AS "promotionId",
 *   segment_id AS "segmentId",
 *   content_id AS "contentId",
 *   content_option_id AS "contentOptionId",
 *   channel,
 *   loop_count AS "loopCount",
 *   goal_metric AS "goalMetric",
 *   goal_target_value::float8 AS "goalTargetValue",
 *   goal_basis AS "goalBasis",
 *   status
 * FROM ad_experiments
 * WHERE project_id = :projectId
 *   AND promotion_id = :promotionId
 *   AND segment_id = :segmentId
 * ORDER BY loop_count DESC, updated_at DESC, created_at DESC                                                        
 * ```
 */
export const listDashboardSegmentAdExperiments = new PreparedQuery<IListDashboardSegmentAdExperimentsParams,IListDashboardSegmentAdExperimentsResult>(listDashboardSegmentAdExperimentsIR);


/** 'GetDashboardContentCandidateForApproval' parameters type */
export interface IGetDashboardContentCandidateForApprovalParams {
  contentId?: string | null | void;
  projectId?: string | null | void;
  promotionId?: string | null | void;
  segmentId?: string | null | void;
}

/** 'GetDashboardContentCandidateForApproval' return type */
export interface IGetDashboardContentCandidateForApprovalResult {
  analysisId: string;
  campaignId: string;
  channel: string;
  contentId: string;
  contentOptionId: string;
  contentStatus: string;
  generationId: string;
  goalBasis: string;
  goalMetric: string;
  goalTargetValue: number | null;
  projectId: string;
  promotionId: string;
  segmentId: string;
  segmentName: string | null;
}

/** 'GetDashboardContentCandidateForApproval' query type */
export interface IGetDashboardContentCandidateForApprovalQuery {
  params: IGetDashboardContentCandidateForApprovalParams;
  result: IGetDashboardContentCandidateForApprovalResult;
}

const getDashboardContentCandidateForApprovalIR: any = {"usedParamSet":{"projectId":true,"promotionId":true,"segmentId":true,"contentId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":794,"b":803}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":829,"b":840}]},{"name":"segmentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":864,"b":873}]},{"name":"contentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":897,"b":906}]}],"statement":"SELECT\n  cc.content_id AS \"contentId\",\n  cc.content_option_id AS \"contentOptionId\",\n  cc.generation_id AS \"generationId\",\n  cc.analysis_id AS \"analysisId\",\n  cc.project_id AS \"projectId\",\n  cc.campaign_id AS \"campaignId\",\n  cc.promotion_id AS \"promotionId\",\n  cc.segment_id AS \"segmentId\",\n  COALESCE(pts.segment_name, sd.segment_name) AS \"segmentName\",\n  cc.channel,\n  p.goal_metric AS \"goalMetric\",\n  p.goal_target_value::float8 AS \"goalTargetValue\",\n  p.goal_basis AS \"goalBasis\",\n  cc.status AS \"contentStatus\"\nFROM content_candidates cc\nJOIN promotions p\n  ON p.promotion_id = cc.promotion_id\nJOIN segment_definitions sd\n  ON sd.segment_id = cc.segment_id\nJOIN promotion_target_segments pts\n  ON pts.promotion_id = cc.promotion_id\n AND pts.segment_id = cc.segment_id\nWHERE cc.project_id = :projectId\n  AND cc.promotion_id = :promotionId\n  AND cc.segment_id = :segmentId\n  AND cc.content_id = :contentId\n  AND p.status <> 'stopped'\n  AND pts.status <> 'stopped'\n  AND cc.status IN ('draft', 'approved', 'active')                                                       "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   cc.content_id AS "contentId",
 *   cc.content_option_id AS "contentOptionId",
 *   cc.generation_id AS "generationId",
 *   cc.analysis_id AS "analysisId",
 *   cc.project_id AS "projectId",
 *   cc.campaign_id AS "campaignId",
 *   cc.promotion_id AS "promotionId",
 *   cc.segment_id AS "segmentId",
 *   COALESCE(pts.segment_name, sd.segment_name) AS "segmentName",
 *   cc.channel,
 *   p.goal_metric AS "goalMetric",
 *   p.goal_target_value::float8 AS "goalTargetValue",
 *   p.goal_basis AS "goalBasis",
 *   cc.status AS "contentStatus"
 * FROM content_candidates cc
 * JOIN promotions p
 *   ON p.promotion_id = cc.promotion_id
 * JOIN segment_definitions sd
 *   ON sd.segment_id = cc.segment_id
 * JOIN promotion_target_segments pts
 *   ON pts.promotion_id = cc.promotion_id
 *  AND pts.segment_id = cc.segment_id
 * WHERE cc.project_id = :projectId
 *   AND cc.promotion_id = :promotionId
 *   AND cc.segment_id = :segmentId
 *   AND cc.content_id = :contentId
 *   AND p.status <> 'stopped'
 *   AND pts.status <> 'stopped'
 *   AND cc.status IN ('draft', 'approved', 'active')                                                       
 * ```
 */
export const getDashboardContentCandidateForApproval = new PreparedQuery<IGetDashboardContentCandidateForApprovalParams,IGetDashboardContentCandidateForApprovalResult>(getDashboardContentCandidateForApprovalIR);


/** 'RejectDashboardSiblingContentCandidates' parameters type */
export interface IRejectDashboardSiblingContentCandidatesParams {
  contentId?: string | null | void;
  generationId?: string | null | void;
  projectId?: string | null | void;
  segmentId?: string | null | void;
}

/** 'RejectDashboardSiblingContentCandidates' return type */
export interface IRejectDashboardSiblingContentCandidatesResult {
  contentId: string;
}

/** 'RejectDashboardSiblingContentCandidates' query type */
export interface IRejectDashboardSiblingContentCandidatesQuery {
  params: IRejectDashboardSiblingContentCandidatesParams;
  result: IRejectDashboardSiblingContentCandidatesResult;
}

const rejectDashboardSiblingContentCandidatesIR: any = {"usedParamSet":{"projectId":true,"generationId":true,"segmentId":true,"contentId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":93,"b":102}]},{"name":"generationId","required":false,"transform":{"type":"scalar"},"locs":[{"a":126,"b":138}]},{"name":"segmentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":159,"b":168}]},{"name":"contentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":190,"b":199}]}],"statement":"UPDATE content_candidates\nSET status = 'rejected',\n    updated_at = now()\nWHERE project_id = :projectId\n  AND generation_id = :generationId\n  AND segment_id = :segmentId\n  AND content_id <> :contentId\n  AND status IN ('draft', 'approved', 'active')\nRETURNING content_id AS \"contentId\"                                           "};

/**
 * Query generated from SQL:
 * ```
 * UPDATE content_candidates
 * SET status = 'rejected',
 *     updated_at = now()
 * WHERE project_id = :projectId
 *   AND generation_id = :generationId
 *   AND segment_id = :segmentId
 *   AND content_id <> :contentId
 *   AND status IN ('draft', 'approved', 'active')
 * RETURNING content_id AS "contentId"                                           
 * ```
 */
export const rejectDashboardSiblingContentCandidates = new PreparedQuery<IRejectDashboardSiblingContentCandidatesParams,IRejectDashboardSiblingContentCandidatesResult>(rejectDashboardSiblingContentCandidatesIR);


/** 'ApproveDashboardContentCandidate' parameters type */
export interface IApproveDashboardContentCandidateParams {
  contentId?: string | null | void;
  projectId?: string | null | void;
  promotionId?: string | null | void;
  segmentId?: string | null | void;
}

/** 'ApproveDashboardContentCandidate' return type */
export interface IApproveDashboardContentCandidateResult {
  contentId: string;
  contentOptionId: string;
  status: string;
}

/** 'ApproveDashboardContentCandidate' query type */
export interface IApproveDashboardContentCandidateQuery {
  params: IApproveDashboardContentCandidateParams;
  result: IApproveDashboardContentCandidateResult;
}

const approveDashboardContentCandidateIR: any = {"usedParamSet":{"projectId":true,"promotionId":true,"segmentId":true,"contentId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":93,"b":102}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":125,"b":136}]},{"name":"segmentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":157,"b":166}]},{"name":"contentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":187,"b":196}]}],"statement":"UPDATE content_candidates\nSET status = 'approved',\n    updated_at = now()\nWHERE project_id = :projectId\n  AND promotion_id = :promotionId\n  AND segment_id = :segmentId\n  AND content_id = :contentId\n  AND status IN ('draft', 'approved', 'active')\nRETURNING\n  content_id AS \"contentId\",\n  content_option_id AS \"contentOptionId\",\n  status                                           "};

/**
 * Query generated from SQL:
 * ```
 * UPDATE content_candidates
 * SET status = 'approved',
 *     updated_at = now()
 * WHERE project_id = :projectId
 *   AND promotion_id = :promotionId
 *   AND segment_id = :segmentId
 *   AND content_id = :contentId
 *   AND status IN ('draft', 'approved', 'active')
 * RETURNING
 *   content_id AS "contentId",
 *   content_option_id AS "contentOptionId",
 *   status                                           
 * ```
 */
export const approveDashboardContentCandidate = new PreparedQuery<IApproveDashboardContentCandidateParams,IApproveDashboardContentCandidateResult>(approveDashboardContentCandidateIR);


/** 'RejectDashboardContentCandidate' parameters type */
export interface IRejectDashboardContentCandidateParams {
  contentId?: string | null | void;
  projectId?: string | null | void;
  promotionId?: string | null | void;
  segmentId?: string | null | void;
}

/** 'RejectDashboardContentCandidate' return type */
export interface IRejectDashboardContentCandidateResult {
  contentId: string;
  promotionId: string;
  rejectedAt: Date;
  segmentId: string;
  status: string;
}

/** 'RejectDashboardContentCandidate' query type */
export interface IRejectDashboardContentCandidateQuery {
  params: IRejectDashboardContentCandidateParams;
  result: IRejectDashboardContentCandidateResult;
}

const rejectDashboardContentCandidateIR: any = {"usedParamSet":{"projectId":true,"promotionId":true,"segmentId":true,"contentId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":191,"b":200}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":226,"b":237}]},{"name":"segmentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":261,"b":270}]},{"name":"contentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":294,"b":303}]}],"statement":"UPDATE content_candidates cc\nSET status = 'rejected',\n    updated_at = now()\nFROM promotions p\nJOIN promotion_target_segments pts\n  ON pts.promotion_id = p.promotion_id\nWHERE cc.project_id = :projectId\n  AND cc.promotion_id = :promotionId\n  AND cc.segment_id = :segmentId\n  AND cc.content_id = :contentId\n  AND p.promotion_id = cc.promotion_id\n  AND pts.segment_id = cc.segment_id\n  AND p.status <> 'stopped'\n  AND pts.status <> 'stopped'\n  AND cc.status IN ('draft', 'approved', 'active')\nRETURNING\n  cc.content_id AS \"contentId\",\n  cc.promotion_id AS \"promotionId\",\n  cc.segment_id AS \"segmentId\",\n  cc.status,\n  cc.updated_at AS \"rejectedAt\"                                           "};

/**
 * Query generated from SQL:
 * ```
 * UPDATE content_candidates cc
 * SET status = 'rejected',
 *     updated_at = now()
 * FROM promotions p
 * JOIN promotion_target_segments pts
 *   ON pts.promotion_id = p.promotion_id
 * WHERE cc.project_id = :projectId
 *   AND cc.promotion_id = :promotionId
 *   AND cc.segment_id = :segmentId
 *   AND cc.content_id = :contentId
 *   AND p.promotion_id = cc.promotion_id
 *   AND pts.segment_id = cc.segment_id
 *   AND p.status <> 'stopped'
 *   AND pts.status <> 'stopped'
 *   AND cc.status IN ('draft', 'approved', 'active')
 * RETURNING
 *   cc.content_id AS "contentId",
 *   cc.promotion_id AS "promotionId",
 *   cc.segment_id AS "segmentId",
 *   cc.status,
 *   cc.updated_at AS "rejectedAt"                                           
 * ```
 */
export const rejectDashboardContentCandidate = new PreparedQuery<IRejectDashboardContentCandidateParams,IRejectDashboardContentCandidateResult>(rejectDashboardContentCandidateIR);


/** 'GetDashboardPromotionRunByGeneration' parameters type */
export interface IGetDashboardPromotionRunByGenerationParams {
  generationId?: string | null | void;
  projectId?: string | null | void;
  promotionId?: string | null | void;
}

/** 'GetDashboardPromotionRunByGeneration' return type */
export interface IGetDashboardPromotionRunByGenerationResult {
  loopCount: number;
  promotionRunId: string;
  status: string;
}

/** 'GetDashboardPromotionRunByGeneration' query type */
export interface IGetDashboardPromotionRunByGenerationQuery {
  params: IGetDashboardPromotionRunByGenerationParams;
  result: IGetDashboardPromotionRunByGenerationResult;
}

const getDashboardPromotionRunByGenerationIR: any = {"usedParamSet":{"projectId":true,"promotionId":true,"generationId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":124,"b":133}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":156,"b":167}]},{"name":"generationId","required":false,"transform":{"type":"scalar"},"locs":[{"a":191,"b":203}]}],"statement":"SELECT\n  promotion_run_id AS \"promotionRunId\",\n  loop_count AS \"loopCount\",\n  status\nFROM promotion_runs\nWHERE project_id = :projectId\n  AND promotion_id = :promotionId\n  AND generation_id = :generationId\nORDER BY loop_count DESC\nLIMIT 1                                                   "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   promotion_run_id AS "promotionRunId",
 *   loop_count AS "loopCount",
 *   status
 * FROM promotion_runs
 * WHERE project_id = :projectId
 *   AND promotion_id = :promotionId
 *   AND generation_id = :generationId
 * ORDER BY loop_count DESC
 * LIMIT 1                                                   
 * ```
 */
export const getDashboardPromotionRunByGeneration = new PreparedQuery<IGetDashboardPromotionRunByGenerationParams,IGetDashboardPromotionRunByGenerationResult>(getDashboardPromotionRunByGenerationIR);


/** 'GetDashboardNextPromotionLoopCount' parameters type */
export interface IGetDashboardNextPromotionLoopCountParams {
  projectId?: string | null | void;
  promotionId?: string | null | void;
}

/** 'GetDashboardNextPromotionLoopCount' return type */
export interface IGetDashboardNextPromotionLoopCountResult {
  loopCount: number | null;
}

/** 'GetDashboardNextPromotionLoopCount' query type */
export interface IGetDashboardNextPromotionLoopCountQuery {
  params: IGetDashboardNextPromotionLoopCountParams;
  result: IGetDashboardNextPromotionLoopCountResult;
}

const getDashboardNextPromotionLoopCountIR: any = {"usedParamSet":{"projectId":true,"promotionId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":99,"b":108}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":131,"b":142}]}],"statement":"SELECT COALESCE(MAX(loop_count), 0)::int + 1 AS \"loopCount\"\nFROM promotion_runs\nWHERE project_id = :projectId\n  AND promotion_id = :promotionId                                        "};

/**
 * Query generated from SQL:
 * ```
 * SELECT COALESCE(MAX(loop_count), 0)::int + 1 AS "loopCount"
 * FROM promotion_runs
 * WHERE project_id = :projectId
 *   AND promotion_id = :promotionId                                        
 * ```
 */
export const getDashboardNextPromotionLoopCount = new PreparedQuery<IGetDashboardNextPromotionLoopCountParams,IGetDashboardNextPromotionLoopCountResult>(getDashboardNextPromotionLoopCountIR);


/** 'InsertDashboardPromotionRun' parameters type */
export interface IInsertDashboardPromotionRunParams {
  analysisId?: string | null | void;
  campaignId?: string | null | void;
  generationId?: string | null | void;
  goalBasis?: string | null | void;
  goalMetric?: string | null | void;
  goalTargetValue?: NumberOrString | null | void;
  loopCount?: number | null | void;
  projectId?: string | null | void;
  promotionId?: string | null | void;
  promotionRunId?: string | null | void;
}

/** 'InsertDashboardPromotionRun' return type */
export interface IInsertDashboardPromotionRunResult {
  loopCount: number;
  promotionRunId: string;
  status: string;
}

/** 'InsertDashboardPromotionRun' query type */
export interface IInsertDashboardPromotionRunQuery {
  params: IInsertDashboardPromotionRunParams;
  result: IInsertDashboardPromotionRunResult;
}

const insertDashboardPromotionRunIR: any = {"usedParamSet":{"promotionRunId":true,"projectId":true,"campaignId":true,"promotionId":true,"analysisId":true,"generationId":true,"loopCount":true,"goalMetric":true,"goalTargetValue":true,"goalBasis":true},"params":[{"name":"promotionRunId","required":false,"transform":{"type":"scalar"},"locs":[{"a":184,"b":198}]},{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":203,"b":212}]},{"name":"campaignId","required":false,"transform":{"type":"scalar"},"locs":[{"a":217,"b":227}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":232,"b":243}]},{"name":"analysisId","required":false,"transform":{"type":"scalar"},"locs":[{"a":248,"b":258}]},{"name":"generationId","required":false,"transform":{"type":"scalar"},"locs":[{"a":263,"b":275}]},{"name":"loopCount","required":false,"transform":{"type":"scalar"},"locs":[{"a":280,"b":289}]},{"name":"goalMetric","required":false,"transform":{"type":"scalar"},"locs":[{"a":348,"b":358}]},{"name":"goalTargetValue","required":false,"transform":{"type":"scalar"},"locs":[{"a":394,"b":409}]},{"name":"goalBasis","required":false,"transform":{"type":"scalar"},"locs":[{"a":441,"b":450}]}],"statement":"INSERT INTO promotion_runs (\n  promotion_run_id,\n  project_id,\n  campaign_id,\n  promotion_id,\n  analysis_id,\n  generation_id,\n  loop_count,\n  status,\n  goal_snapshot_json\n)\nVALUES (\n  :promotionRunId,\n  :projectId,\n  :campaignId,\n  :promotionId,\n  :analysisId,\n  :generationId,\n  :loopCount,\n  'approved',\n  jsonb_build_object(\n    'goal_metric', (:goalMetric)::text,\n    'goal_target_value', (:goalTargetValue)::numeric,\n    'goal_basis', (:goalBasis)::text\n  )\n)\nRETURNING\n  promotion_run_id AS \"promotionRunId\",\n  loop_count AS \"loopCount\",\n  status                                                 "};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO promotion_runs (
 *   promotion_run_id,
 *   project_id,
 *   campaign_id,
 *   promotion_id,
 *   analysis_id,
 *   generation_id,
 *   loop_count,
 *   status,
 *   goal_snapshot_json
 * )
 * VALUES (
 *   :promotionRunId,
 *   :projectId,
 *   :campaignId,
 *   :promotionId,
 *   :analysisId,
 *   :generationId,
 *   :loopCount,
 *   'approved',
 *   jsonb_build_object(
 *     'goal_metric', (:goalMetric)::text,
 *     'goal_target_value', (:goalTargetValue)::numeric,
 *     'goal_basis', (:goalBasis)::text
 *   )
 * )
 * RETURNING
 *   promotion_run_id AS "promotionRunId",
 *   loop_count AS "loopCount",
 *   status                                                 
 * ```
 */
export const insertDashboardPromotionRun = new PreparedQuery<IInsertDashboardPromotionRunParams,IInsertDashboardPromotionRunResult>(insertDashboardPromotionRunIR);


/** 'UpsertDashboardAdExperimentFromApprovedContent' parameters type */
export interface IUpsertDashboardAdExperimentFromApprovedContentParams {
  adExperimentId?: string | null | void;
  analysisId?: string | null | void;
  campaignId?: string | null | void;
  channel?: string | null | void;
  contentId?: string | null | void;
  contentOptionId?: string | null | void;
  generationId?: string | null | void;
  goalBasis?: string | null | void;
  goalMetric?: string | null | void;
  goalTargetValue?: NumberOrString | null | void;
  loopCount?: number | null | void;
  projectId?: string | null | void;
  promotionId?: string | null | void;
  promotionRunId?: string | null | void;
  segmentId?: string | null | void;
  segmentName?: string | null | void;
}

/** 'UpsertDashboardAdExperimentFromApprovedContent' return type */
export interface IUpsertDashboardAdExperimentFromApprovedContentResult {
  adExperimentId: string;
  channel: string;
  contentId: string;
  contentOptionId: string;
  goalBasis: string;
  goalMetric: string;
  goalTargetValue: number | null;
  loopCount: number;
  promotionId: string;
  promotionRunId: string;
  segmentId: string;
  status: string;
}

/** 'UpsertDashboardAdExperimentFromApprovedContent' query type */
export interface IUpsertDashboardAdExperimentFromApprovedContentQuery {
  params: IUpsertDashboardAdExperimentFromApprovedContentParams;
  result: IUpsertDashboardAdExperimentFromApprovedContentResult;
}

const upsertDashboardAdExperimentFromApprovedContentIR: any = {"usedParamSet":{"adExperimentId":true,"projectId":true,"campaignId":true,"promotionId":true,"promotionRunId":true,"analysisId":true,"generationId":true,"segmentId":true,"segmentName":true,"contentId":true,"contentOptionId":true,"channel":true,"loopCount":true,"goalMetric":true,"goalTargetValue":true,"goalBasis":true},"params":[{"name":"adExperimentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":308,"b":322}]},{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":327,"b":336}]},{"name":"campaignId","required":false,"transform":{"type":"scalar"},"locs":[{"a":341,"b":351}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":356,"b":367}]},{"name":"promotionRunId","required":false,"transform":{"type":"scalar"},"locs":[{"a":372,"b":386}]},{"name":"analysisId","required":false,"transform":{"type":"scalar"},"locs":[{"a":391,"b":401}]},{"name":"generationId","required":false,"transform":{"type":"scalar"},"locs":[{"a":406,"b":418}]},{"name":"segmentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":423,"b":432}]},{"name":"segmentName","required":false,"transform":{"type":"scalar"},"locs":[{"a":437,"b":448}]},{"name":"contentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":453,"b":462}]},{"name":"contentOptionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":467,"b":482}]},{"name":"channel","required":false,"transform":{"type":"scalar"},"locs":[{"a":487,"b":494}]},{"name":"loopCount","required":false,"transform":{"type":"scalar"},"locs":[{"a":499,"b":508}]},{"name":"goalMetric","required":false,"transform":{"type":"scalar"},"locs":[{"a":527,"b":537}]},{"name":"goalTargetValue","required":false,"transform":{"type":"scalar"},"locs":[{"a":542,"b":557}]},{"name":"goalBasis","required":false,"transform":{"type":"scalar"},"locs":[{"a":562,"b":571}]}],"statement":"INSERT INTO ad_experiments (\n  ad_experiment_id,\n  project_id,\n  campaign_id,\n  promotion_id,\n  promotion_run_id,\n  analysis_id,\n  generation_id,\n  segment_id,\n  segment_name,\n  content_id,\n  content_option_id,\n  channel,\n  loop_count,\n  status,\n  goal_metric,\n  goal_target_value,\n  goal_basis\n)\nVALUES (\n  :adExperimentId,\n  :projectId,\n  :campaignId,\n  :promotionId,\n  :promotionRunId,\n  :analysisId,\n  :generationId,\n  :segmentId,\n  :segmentName,\n  :contentId,\n  :contentOptionId,\n  :channel,\n  :loopCount,\n  'approved',\n  :goalMetric,\n  :goalTargetValue,\n  :goalBasis\n)\nON CONFLICT (promotion_run_id, segment_id)\nDO UPDATE SET\n  content_id = EXCLUDED.content_id,\n  content_option_id = EXCLUDED.content_option_id,\n  channel = EXCLUDED.channel,\n  status = 'approved',\n  goal_metric = EXCLUDED.goal_metric,\n  goal_target_value = EXCLUDED.goal_target_value,\n  goal_basis = EXCLUDED.goal_basis,\n  updated_at = now()\nRETURNING\n  ad_experiment_id AS \"adExperimentId\",\n  promotion_run_id AS \"promotionRunId\",\n  promotion_id AS \"promotionId\",\n  segment_id AS \"segmentId\",\n  content_id AS \"contentId\",\n  content_option_id AS \"contentOptionId\",\n  channel,\n  loop_count AS \"loopCount\",\n  goal_metric AS \"goalMetric\",\n  goal_target_value::float8 AS \"goalTargetValue\",\n  goal_basis AS \"goalBasis\",\n  status                                                "};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO ad_experiments (
 *   ad_experiment_id,
 *   project_id,
 *   campaign_id,
 *   promotion_id,
 *   promotion_run_id,
 *   analysis_id,
 *   generation_id,
 *   segment_id,
 *   segment_name,
 *   content_id,
 *   content_option_id,
 *   channel,
 *   loop_count,
 *   status,
 *   goal_metric,
 *   goal_target_value,
 *   goal_basis
 * )
 * VALUES (
 *   :adExperimentId,
 *   :projectId,
 *   :campaignId,
 *   :promotionId,
 *   :promotionRunId,
 *   :analysisId,
 *   :generationId,
 *   :segmentId,
 *   :segmentName,
 *   :contentId,
 *   :contentOptionId,
 *   :channel,
 *   :loopCount,
 *   'approved',
 *   :goalMetric,
 *   :goalTargetValue,
 *   :goalBasis
 * )
 * ON CONFLICT (promotion_run_id, segment_id)
 * DO UPDATE SET
 *   content_id = EXCLUDED.content_id,
 *   content_option_id = EXCLUDED.content_option_id,
 *   channel = EXCLUDED.channel,
 *   status = 'approved',
 *   goal_metric = EXCLUDED.goal_metric,
 *   goal_target_value = EXCLUDED.goal_target_value,
 *   goal_basis = EXCLUDED.goal_basis,
 *   updated_at = now()
 * RETURNING
 *   ad_experiment_id AS "adExperimentId",
 *   promotion_run_id AS "promotionRunId",
 *   promotion_id AS "promotionId",
 *   segment_id AS "segmentId",
 *   content_id AS "contentId",
 *   content_option_id AS "contentOptionId",
 *   channel,
 *   loop_count AS "loopCount",
 *   goal_metric AS "goalMetric",
 *   goal_target_value::float8 AS "goalTargetValue",
 *   goal_basis AS "goalBasis",
 *   status                                                
 * ```
 */
export const upsertDashboardAdExperimentFromApprovedContent = new PreparedQuery<IUpsertDashboardAdExperimentFromApprovedContentParams,IUpsertDashboardAdExperimentFromApprovedContentResult>(upsertDashboardAdExperimentFromApprovedContentIR);


/** 'MarkDashboardPromotionTargetSegmentApproved' parameters type */
export interface IMarkDashboardPromotionTargetSegmentApprovedParams {
  projectId?: string | null | void;
  promotionId?: string | null | void;
  segmentId?: string | null | void;
}

/** 'MarkDashboardPromotionTargetSegmentApproved' return type */
export interface IMarkDashboardPromotionTargetSegmentApprovedResult {
  promotionId: string;
  segmentId: string;
  status: string;
}

/** 'MarkDashboardPromotionTargetSegmentApproved' query type */
export interface IMarkDashboardPromotionTargetSegmentApprovedQuery {
  params: IMarkDashboardPromotionTargetSegmentApprovedParams;
  result: IMarkDashboardPromotionTargetSegmentApprovedResult;
}

const markDashboardPromotionTargetSegmentApprovedIR: any = {"usedParamSet":{"projectId":true,"promotionId":true,"segmentId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":76,"b":85}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":108,"b":119}]},{"name":"segmentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":140,"b":149}]}],"statement":"UPDATE promotion_target_segments\nSET status = 'approved'\nWHERE project_id = :projectId\n  AND promotion_id = :promotionId\n  AND segment_id = :segmentId\n  AND status <> 'stopped'\nRETURNING promotion_id AS \"promotionId\", segment_id AS \"segmentId\", status                                          "};

/**
 * Query generated from SQL:
 * ```
 * UPDATE promotion_target_segments
 * SET status = 'approved'
 * WHERE project_id = :projectId
 *   AND promotion_id = :promotionId
 *   AND segment_id = :segmentId
 *   AND status <> 'stopped'
 * RETURNING promotion_id AS "promotionId", segment_id AS "segmentId", status                                          
 * ```
 */
export const markDashboardPromotionTargetSegmentApproved = new PreparedQuery<IMarkDashboardPromotionTargetSegmentApprovedParams,IMarkDashboardPromotionTargetSegmentApprovedResult>(markDashboardPromotionTargetSegmentApprovedIR);


/** 'ListDashboardSavedSegments' parameters type */
export interface IListDashboardSavedSegmentsParams {
  projectId?: string | null | void;
}

/** 'ListDashboardSavedSegments' return type */
export interface IListDashboardSavedSegmentsResult {
  generatedSql: string | null;
  naturalLanguageQuery: string | null;
  projectId: string;
  queryPreviewId: string | null;
  sampleRatio: number | null;
  sampleSize: number;
  segmentId: string;
  segmentName: string;
  source: string;
  status: string;
  totalEligibleUserCount: number;
}

/** 'ListDashboardSavedSegments' query type */
export interface IListDashboardSavedSegmentsQuery {
  params: IListDashboardSavedSegmentsParams;
  result: IListDashboardSavedSegmentsResult;
}

const listDashboardSavedSegmentsIR: any = {"usedParamSet":{"projectId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":417,"b":426}]}],"statement":"SELECT\n  segment_id AS \"segmentId\",\n  project_id AS \"projectId\",\n  segment_name AS \"segmentName\",\n  source,\n  query_preview_id AS \"queryPreviewId\",\n  natural_language_query AS \"naturalLanguageQuery\",\n  generated_sql AS \"generatedSql\",\n  sample_size AS \"sampleSize\",\n  total_eligible_user_count AS \"totalEligibleUserCount\",\n  sample_ratio::float8 AS \"sampleRatio\",\n  status\nFROM segment_definitions\nWHERE project_id = :projectId\n  AND source = 'custom_chatkit'\n  AND status = 'active'\nORDER BY updated_at DESC, created_at DESC                                        "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   segment_id AS "segmentId",
 *   project_id AS "projectId",
 *   segment_name AS "segmentName",
 *   source,
 *   query_preview_id AS "queryPreviewId",
 *   natural_language_query AS "naturalLanguageQuery",
 *   generated_sql AS "generatedSql",
 *   sample_size AS "sampleSize",
 *   total_eligible_user_count AS "totalEligibleUserCount",
 *   sample_ratio::float8 AS "sampleRatio",
 *   status
 * FROM segment_definitions
 * WHERE project_id = :projectId
 *   AND source = 'custom_chatkit'
 *   AND status = 'active'
 * ORDER BY updated_at DESC, created_at DESC                                        
 * ```
 */
export const listDashboardSavedSegments = new PreparedQuery<IListDashboardSavedSegmentsParams,IListDashboardSavedSegmentsResult>(listDashboardSavedSegmentsIR);


/** 'InsertDashboardSegmentQueryPreview' parameters type */
export interface IInsertDashboardSegmentQueryPreviewParams {
  baseTimeFrom?: DateOrString | null | void;
  baseTimeTo?: DateOrString | null | void;
  generatedSql?: string | null | void;
  naturalLanguageQuery?: string | null | void;
  projectId?: string | null | void;
  queryParamsJson?: Json | null | void;
  queryPreviewId?: string | null | void;
  resultColumnsJson?: Json | null | void;
  resultPreviewJson?: Json | null | void;
  sampleRatio?: NumberOrString | null | void;
  sampleSize?: number | null | void;
  sampleSizeStatus?: string | null | void;
  totalEligibleUserCount?: number | null | void;
}

/** 'InsertDashboardSegmentQueryPreview' return type */
export interface IInsertDashboardSegmentQueryPreviewResult {
  generatedSql: string;
  naturalLanguageQuery: string;
  projectId: string;
  queryPreviewId: string;
  resultColumnsJson: Json;
  resultPreviewJson: Json;
  sampleRatio: number | null;
  sampleSize: number;
  sampleSizeStatus: string;
  status: string;
  totalEligibleUserCount: number;
}

/** 'InsertDashboardSegmentQueryPreview' query type */
export interface IInsertDashboardSegmentQueryPreviewQuery {
  params: IInsertDashboardSegmentQueryPreviewParams;
  result: IInsertDashboardSegmentQueryPreviewResult;
}

const insertDashboardSegmentQueryPreviewIR: any = {"usedParamSet":{"queryPreviewId":true,"projectId":true,"naturalLanguageQuery":true,"generatedSql":true,"queryParamsJson":true,"baseTimeFrom":true,"baseTimeTo":true,"sampleSize":true,"totalEligibleUserCount":true,"sampleRatio":true,"sampleSizeStatus":true,"resultColumnsJson":true,"resultPreviewJson":true},"params":[{"name":"queryPreviewId","required":false,"transform":{"type":"scalar"},"locs":[{"a":319,"b":333}]},{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":338,"b":347}]},{"name":"naturalLanguageQuery","required":false,"transform":{"type":"scalar"},"locs":[{"a":352,"b":372}]},{"name":"generatedSql","required":false,"transform":{"type":"scalar"},"locs":[{"a":377,"b":389}]},{"name":"queryParamsJson","required":false,"transform":{"type":"scalar"},"locs":[{"a":394,"b":409}]},{"name":"baseTimeFrom","required":false,"transform":{"type":"scalar"},"locs":[{"a":414,"b":426}]},{"name":"baseTimeTo","required":false,"transform":{"type":"scalar"},"locs":[{"a":431,"b":441}]},{"name":"sampleSize","required":false,"transform":{"type":"scalar"},"locs":[{"a":446,"b":456}]},{"name":"totalEligibleUserCount","required":false,"transform":{"type":"scalar"},"locs":[{"a":461,"b":483}]},{"name":"sampleRatio","required":false,"transform":{"type":"scalar"},"locs":[{"a":488,"b":499}]},{"name":"sampleSizeStatus","required":false,"transform":{"type":"scalar"},"locs":[{"a":504,"b":520}]},{"name":"resultColumnsJson","required":false,"transform":{"type":"scalar"},"locs":[{"a":525,"b":542}]},{"name":"resultPreviewJson","required":false,"transform":{"type":"scalar"},"locs":[{"a":547,"b":564}]}],"statement":"INSERT INTO segment_query_previews (\n  query_preview_id,\n  project_id,\n  natural_language_query,\n  generated_sql,\n  query_params_json,\n  base_time_from,\n  base_time_to,\n  sample_size,\n  total_eligible_user_count,\n  sample_ratio,\n  sample_size_status,\n  result_columns_json,\n  result_preview_json,\n  status\n)\nVALUES (\n  :queryPreviewId,\n  :projectId,\n  :naturalLanguageQuery,\n  :generatedSql,\n  :queryParamsJson,\n  :baseTimeFrom,\n  :baseTimeTo,\n  :sampleSize,\n  :totalEligibleUserCount,\n  :sampleRatio,\n  :sampleSizeStatus,\n  :resultColumnsJson,\n  :resultPreviewJson,\n  'previewed'\n)\nRETURNING\n  query_preview_id AS \"queryPreviewId\",\n  project_id AS \"projectId\",\n  natural_language_query AS \"naturalLanguageQuery\",\n  generated_sql AS \"generatedSql\",\n  sample_size AS \"sampleSize\",\n  total_eligible_user_count AS \"totalEligibleUserCount\",\n  sample_ratio::float8 AS \"sampleRatio\",\n  sample_size_status AS \"sampleSizeStatus\",\n  result_columns_json AS \"resultColumnsJson\",\n  result_preview_json AS \"resultPreviewJson\",\n  status                                     "};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO segment_query_previews (
 *   query_preview_id,
 *   project_id,
 *   natural_language_query,
 *   generated_sql,
 *   query_params_json,
 *   base_time_from,
 *   base_time_to,
 *   sample_size,
 *   total_eligible_user_count,
 *   sample_ratio,
 *   sample_size_status,
 *   result_columns_json,
 *   result_preview_json,
 *   status
 * )
 * VALUES (
 *   :queryPreviewId,
 *   :projectId,
 *   :naturalLanguageQuery,
 *   :generatedSql,
 *   :queryParamsJson,
 *   :baseTimeFrom,
 *   :baseTimeTo,
 *   :sampleSize,
 *   :totalEligibleUserCount,
 *   :sampleRatio,
 *   :sampleSizeStatus,
 *   :resultColumnsJson,
 *   :resultPreviewJson,
 *   'previewed'
 * )
 * RETURNING
 *   query_preview_id AS "queryPreviewId",
 *   project_id AS "projectId",
 *   natural_language_query AS "naturalLanguageQuery",
 *   generated_sql AS "generatedSql",
 *   sample_size AS "sampleSize",
 *   total_eligible_user_count AS "totalEligibleUserCount",
 *   sample_ratio::float8 AS "sampleRatio",
 *   sample_size_status AS "sampleSizeStatus",
 *   result_columns_json AS "resultColumnsJson",
 *   result_preview_json AS "resultPreviewJson",
 *   status                                     
 * ```
 */
export const insertDashboardSegmentQueryPreview = new PreparedQuery<IInsertDashboardSegmentQueryPreviewParams,IInsertDashboardSegmentQueryPreviewResult>(insertDashboardSegmentQueryPreviewIR);


/** 'GetDashboardSegmentQueryPreviewForSave' parameters type */
export interface IGetDashboardSegmentQueryPreviewForSaveParams {
  projectId?: string | null | void;
  queryPreviewId?: string | null | void;
}

/** 'GetDashboardSegmentQueryPreviewForSave' return type */
export interface IGetDashboardSegmentQueryPreviewForSaveResult {
  generatedSql: string;
  naturalLanguageQuery: string;
  projectId: string;
  queryPreviewId: string;
  sampleRatio: number | null;
  sampleSize: number;
  sampleSizeStatus: string;
  status: string;
  totalEligibleUserCount: number;
}

/** 'GetDashboardSegmentQueryPreviewForSave' query type */
export interface IGetDashboardSegmentQueryPreviewForSaveQuery {
  params: IGetDashboardSegmentQueryPreviewForSaveParams;
  result: IGetDashboardSegmentQueryPreviewForSaveResult;
}

const getDashboardSegmentQueryPreviewForSaveIR: any = {"usedParamSet":{"projectId":true,"queryPreviewId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":392,"b":401}]},{"name":"queryPreviewId","required":false,"transform":{"type":"scalar"},"locs":[{"a":428,"b":442}]}],"statement":"SELECT\n  query_preview_id AS \"queryPreviewId\",\n  project_id AS \"projectId\",\n  natural_language_query AS \"naturalLanguageQuery\",\n  generated_sql AS \"generatedSql\",\n  sample_size AS \"sampleSize\",\n  total_eligible_user_count AS \"totalEligibleUserCount\",\n  sample_ratio::float8 AS \"sampleRatio\",\n  sample_size_status AS \"sampleSizeStatus\",\n  status\nFROM segment_query_previews\nWHERE project_id = :projectId\n  AND query_preview_id = :queryPreviewId                                                  "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   query_preview_id AS "queryPreviewId",
 *   project_id AS "projectId",
 *   natural_language_query AS "naturalLanguageQuery",
 *   generated_sql AS "generatedSql",
 *   sample_size AS "sampleSize",
 *   total_eligible_user_count AS "totalEligibleUserCount",
 *   sample_ratio::float8 AS "sampleRatio",
 *   sample_size_status AS "sampleSizeStatus",
 *   status
 * FROM segment_query_previews
 * WHERE project_id = :projectId
 *   AND query_preview_id = :queryPreviewId                                                  
 * ```
 */
export const getDashboardSegmentQueryPreviewForSave = new PreparedQuery<IGetDashboardSegmentQueryPreviewForSaveParams,IGetDashboardSegmentQueryPreviewForSaveResult>(getDashboardSegmentQueryPreviewForSaveIR);


/** 'InsertDashboardCustomSegmentDefinition' parameters type */
export interface IInsertDashboardCustomSegmentDefinitionParams {
  generatedSql?: string | null | void;
  naturalLanguageQuery?: string | null | void;
  projectId?: string | null | void;
  queryPreviewId?: string | null | void;
  sampleRatio?: NumberOrString | null | void;
  sampleSize?: number | null | void;
  segmentId?: string | null | void;
  segmentName?: string | null | void;
  totalEligibleUserCount?: number | null | void;
}

/** 'InsertDashboardCustomSegmentDefinition' return type */
export interface IInsertDashboardCustomSegmentDefinitionResult {
  generatedSql: string | null;
  naturalLanguageQuery: string | null;
  projectId: string;
  queryPreviewId: string | null;
  sampleRatio: number | null;
  sampleSize: number;
  segmentId: string;
  segmentName: string;
  source: string;
  status: string;
  totalEligibleUserCount: number;
}

/** 'InsertDashboardCustomSegmentDefinition' query type */
export interface IInsertDashboardCustomSegmentDefinitionQuery {
  params: IInsertDashboardCustomSegmentDefinitionParams;
  result: IInsertDashboardCustomSegmentDefinitionResult;
}

const insertDashboardCustomSegmentDefinitionIR: any = {"usedParamSet":{"segmentId":true,"projectId":true,"segmentName":true,"queryPreviewId":true,"naturalLanguageQuery":true,"generatedSql":true,"sampleSize":true,"totalEligibleUserCount":true,"sampleRatio":true},"params":[{"name":"segmentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":262,"b":271}]},{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":276,"b":285}]},{"name":"segmentName","required":false,"transform":{"type":"scalar"},"locs":[{"a":290,"b":301}]},{"name":"queryPreviewId","required":false,"transform":{"type":"scalar"},"locs":[{"a":326,"b":340}]},{"name":"naturalLanguageQuery","required":false,"transform":{"type":"scalar"},"locs":[{"a":345,"b":365}]},{"name":"generatedSql","required":false,"transform":{"type":"scalar"},"locs":[{"a":370,"b":382}]},{"name":"sampleSize","required":false,"transform":{"type":"scalar"},"locs":[{"a":417,"b":427}]},{"name":"totalEligibleUserCount","required":false,"transform":{"type":"scalar"},"locs":[{"a":432,"b":454}]},{"name":"sampleRatio","required":false,"transform":{"type":"scalar"},"locs":[{"a":459,"b":470}]}],"statement":"INSERT INTO segment_definitions (\n  segment_id,\n  project_id,\n  segment_name,\n  source,\n  query_preview_id,\n  natural_language_query,\n  generated_sql,\n  rule_json,\n  profile_json,\n  sample_size,\n  total_eligible_user_count,\n  sample_ratio,\n  status\n)\nVALUES (\n  :segmentId,\n  :projectId,\n  :segmentName,\n  'custom_chatkit',\n  :queryPreviewId,\n  :naturalLanguageQuery,\n  :generatedSql,\n  '{}'::jsonb,\n  '{}'::jsonb,\n  :sampleSize,\n  :totalEligibleUserCount,\n  :sampleRatio,\n  'active'\n)\nRETURNING\n  segment_id AS \"segmentId\",\n  project_id AS \"projectId\",\n  segment_name AS \"segmentName\",\n  source,\n  query_preview_id AS \"queryPreviewId\",\n  natural_language_query AS \"naturalLanguageQuery\",\n  generated_sql AS \"generatedSql\",\n  sample_size AS \"sampleSize\",\n  total_eligible_user_count AS \"totalEligibleUserCount\",\n  sample_ratio::float8 AS \"sampleRatio\",\n  status                                            "};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO segment_definitions (
 *   segment_id,
 *   project_id,
 *   segment_name,
 *   source,
 *   query_preview_id,
 *   natural_language_query,
 *   generated_sql,
 *   rule_json,
 *   profile_json,
 *   sample_size,
 *   total_eligible_user_count,
 *   sample_ratio,
 *   status
 * )
 * VALUES (
 *   :segmentId,
 *   :projectId,
 *   :segmentName,
 *   'custom_chatkit',
 *   :queryPreviewId,
 *   :naturalLanguageQuery,
 *   :generatedSql,
 *   '{}'::jsonb,
 *   '{}'::jsonb,
 *   :sampleSize,
 *   :totalEligibleUserCount,
 *   :sampleRatio,
 *   'active'
 * )
 * RETURNING
 *   segment_id AS "segmentId",
 *   project_id AS "projectId",
 *   segment_name AS "segmentName",
 *   source,
 *   query_preview_id AS "queryPreviewId",
 *   natural_language_query AS "naturalLanguageQuery",
 *   generated_sql AS "generatedSql",
 *   sample_size AS "sampleSize",
 *   total_eligible_user_count AS "totalEligibleUserCount",
 *   sample_ratio::float8 AS "sampleRatio",
 *   status                                            
 * ```
 */
export const insertDashboardCustomSegmentDefinition = new PreparedQuery<IInsertDashboardCustomSegmentDefinitionParams,IInsertDashboardCustomSegmentDefinitionResult>(insertDashboardCustomSegmentDefinitionIR);


/** 'UpdateDashboardSavedSegment' parameters type */
export interface IUpdateDashboardSavedSegmentParams {
  projectId?: string | null | void;
  segmentId?: string | null | void;
  segmentName?: string | null | void;
  status?: string | null | void;
}

/** 'UpdateDashboardSavedSegment' return type */
export interface IUpdateDashboardSavedSegmentResult {
  generatedSql: string | null;
  naturalLanguageQuery: string | null;
  projectId: string;
  queryPreviewId: string | null;
  sampleRatio: number | null;
  sampleSize: number;
  segmentId: string;
  segmentName: string;
  source: string;
  status: string;
  totalEligibleUserCount: number;
}

/** 'UpdateDashboardSavedSegment' query type */
export interface IUpdateDashboardSavedSegmentQuery {
  params: IUpdateDashboardSavedSegmentParams;
  result: IUpdateDashboardSavedSegmentResult;
}

const updateDashboardSavedSegmentIR: any = {"usedParamSet":{"segmentName":true,"status":true,"projectId":true,"segmentId":true},"params":[{"name":"segmentName","required":false,"transform":{"type":"scalar"},"locs":[{"a":57,"b":68}]},{"name":"status","required":false,"transform":{"type":"scalar"},"locs":[{"a":106,"b":112}]},{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":164,"b":173}]},{"name":"segmentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":194,"b":203}]}],"statement":"UPDATE segment_definitions\nSET\n  segment_name = COALESCE(:segmentName, segment_name),\n  status = COALESCE(:status, status),\n  updated_at = now()\nWHERE project_id = :projectId\n  AND segment_id = :segmentId\n  AND source = 'custom_chatkit'\n  AND status <> 'archived'\nRETURNING\n  segment_id AS \"segmentId\",\n  project_id AS \"projectId\",\n  segment_name AS \"segmentName\",\n  source,\n  query_preview_id AS \"queryPreviewId\",\n  natural_language_query AS \"naturalLanguageQuery\",\n  generated_sql AS \"generatedSql\",\n  sample_size AS \"sampleSize\",\n  total_eligible_user_count AS \"totalEligibleUserCount\",\n  sample_ratio::float8 AS \"sampleRatio\",\n  status                                                "};

/**
 * Query generated from SQL:
 * ```
 * UPDATE segment_definitions
 * SET
 *   segment_name = COALESCE(:segmentName, segment_name),
 *   status = COALESCE(:status, status),
 *   updated_at = now()
 * WHERE project_id = :projectId
 *   AND segment_id = :segmentId
 *   AND source = 'custom_chatkit'
 *   AND status <> 'archived'
 * RETURNING
 *   segment_id AS "segmentId",
 *   project_id AS "projectId",
 *   segment_name AS "segmentName",
 *   source,
 *   query_preview_id AS "queryPreviewId",
 *   natural_language_query AS "naturalLanguageQuery",
 *   generated_sql AS "generatedSql",
 *   sample_size AS "sampleSize",
 *   total_eligible_user_count AS "totalEligibleUserCount",
 *   sample_ratio::float8 AS "sampleRatio",
 *   status                                                
 * ```
 */
export const updateDashboardSavedSegment = new PreparedQuery<IUpdateDashboardSavedSegmentParams,IUpdateDashboardSavedSegmentResult>(updateDashboardSavedSegmentIR);


/** 'ArchiveDashboardSavedSegment' parameters type */
export interface IArchiveDashboardSavedSegmentParams {
  projectId?: string | null | void;
  segmentId?: string | null | void;
}

/** 'ArchiveDashboardSavedSegment' return type */
export interface IArchiveDashboardSavedSegmentResult {
  segmentId: string;
  status: string;
}

/** 'ArchiveDashboardSavedSegment' query type */
export interface IArchiveDashboardSavedSegmentQuery {
  params: IArchiveDashboardSavedSegmentParams;
  result: IArchiveDashboardSavedSegmentResult;
}

const archiveDashboardSavedSegmentIR: any = {"usedParamSet":{"projectId":true,"segmentId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":94,"b":103}]},{"name":"segmentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":124,"b":133}]}],"statement":"UPDATE segment_definitions\nSET status = 'archived',\n    updated_at = now()\nWHERE project_id = :projectId\n  AND segment_id = :segmentId\n  AND source = 'custom_chatkit'\n  AND status <> 'archived'\nRETURNING segment_id AS \"segmentId\", status                                   "};

/**
 * Query generated from SQL:
 * ```
 * UPDATE segment_definitions
 * SET status = 'archived',
 *     updated_at = now()
 * WHERE project_id = :projectId
 *   AND segment_id = :segmentId
 *   AND source = 'custom_chatkit'
 *   AND status <> 'archived'
 * RETURNING segment_id AS "segmentId", status                                   
 * ```
 */
export const archiveDashboardSavedSegment = new PreparedQuery<IArchiveDashboardSavedSegmentParams,IArchiveDashboardSavedSegmentResult>(archiveDashboardSavedSegmentIR);


/** 'MarkDashboardSegmentQueryPreviewSaved' parameters type */
export interface IMarkDashboardSegmentQueryPreviewSavedParams {
  projectId?: string | null | void;
  queryPreviewId?: string | null | void;
}

/** 'MarkDashboardSegmentQueryPreviewSaved' return type */
export interface IMarkDashboardSegmentQueryPreviewSavedResult {
  queryPreviewId: string;
}

/** 'MarkDashboardSegmentQueryPreviewSaved' query type */
export interface IMarkDashboardSegmentQueryPreviewSavedQuery {
  params: IMarkDashboardSegmentQueryPreviewSavedParams;
  result: IMarkDashboardSegmentQueryPreviewSavedResult;
}

const markDashboardSegmentQueryPreviewSavedIR: any = {"usedParamSet":{"projectId":true,"queryPreviewId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":70,"b":79}]},{"name":"queryPreviewId","required":false,"transform":{"type":"scalar"},"locs":[{"a":106,"b":120}]}],"statement":"UPDATE segment_query_previews\nSET status = 'saved'\nWHERE project_id = :projectId\n  AND query_preview_id = :queryPreviewId\nRETURNING query_preview_id AS \"queryPreviewId\"                                  "};

/**
 * Query generated from SQL:
 * ```
 * UPDATE segment_query_previews
 * SET status = 'saved'
 * WHERE project_id = :projectId
 *   AND query_preview_id = :queryPreviewId
 * RETURNING query_preview_id AS "queryPreviewId"                                  
 * ```
 */
export const markDashboardSegmentQueryPreviewSaved = new PreparedQuery<IMarkDashboardSegmentQueryPreviewSavedParams,IMarkDashboardSegmentQueryPreviewSavedResult>(markDashboardSegmentQueryPreviewSavedIR);


/** 'ListActiveFunnels' parameters type */
export interface IListActiveFunnelsParams {
  projectId?: string | null | void;
}

/** 'ListActiveFunnels' return type */
export interface IListActiveFunnelsResult {
  createdAt: Date;
  domainType: string;
  funnelId: string;
  funnelName: string;
  status: string;
  updatedAt: Date;
}

/** 'ListActiveFunnels' query type */
export interface IListActiveFunnelsQuery {
  params: IListActiveFunnelsParams;
  result: IListActiveFunnelsResult;
}

const listActiveFunnelsIR: any = {"usedParamSet":{"projectId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":206,"b":215}]}],"statement":"SELECT\n  funnel_id AS \"funnelId\",\n  funnel_name AS \"funnelName\",\n  domain_type AS \"domainType\",\n  status,\n  created_at AS \"createdAt\",\n  updated_at AS \"updatedAt\"\nFROM funnel_definitions\nWHERE project_id = :projectId\n  AND status = 'active'\nORDER BY updated_at DESC, created_at DESC                                  "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   funnel_id AS "funnelId",
 *   funnel_name AS "funnelName",
 *   domain_type AS "domainType",
 *   status,
 *   created_at AS "createdAt",
 *   updated_at AS "updatedAt"
 * FROM funnel_definitions
 * WHERE project_id = :projectId
 *   AND status = 'active'
 * ORDER BY updated_at DESC, created_at DESC                                  
 * ```
 */
export const listActiveFunnels = new PreparedQuery<IListActiveFunnelsParams,IListActiveFunnelsResult>(listActiveFunnelsIR);


/** 'GetActiveFunnelById' parameters type */
export interface IGetActiveFunnelByIdParams {
  funnelId?: string | null | void;
  projectId?: string | null | void;
}

/** 'GetActiveFunnelById' return type */
export interface IGetActiveFunnelByIdResult {
  createdAt: Date;
  domainType: string;
  funnelId: string;
  funnelName: string;
  status: string;
  updatedAt: Date;
}

/** 'GetActiveFunnelById' query type */
export interface IGetActiveFunnelByIdQuery {
  params: IGetActiveFunnelByIdParams;
  result: IGetActiveFunnelByIdResult;
}

const getActiveFunnelByIdIR: any = {"usedParamSet":{"projectId":true,"funnelId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":206,"b":215}]},{"name":"funnelId","required":false,"transform":{"type":"scalar"},"locs":[{"a":235,"b":243}]}],"statement":"SELECT\n  funnel_id AS \"funnelId\",\n  funnel_name AS \"funnelName\",\n  domain_type AS \"domainType\",\n  status,\n  created_at AS \"createdAt\",\n  updated_at AS \"updatedAt\"\nFROM funnel_definitions\nWHERE project_id = :projectId\n  AND funnel_id = :funnelId\n  AND status = 'active'                                     "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   funnel_id AS "funnelId",
 *   funnel_name AS "funnelName",
 *   domain_type AS "domainType",
 *   status,
 *   created_at AS "createdAt",
 *   updated_at AS "updatedAt"
 * FROM funnel_definitions
 * WHERE project_id = :projectId
 *   AND funnel_id = :funnelId
 *   AND status = 'active'                                     
 * ```
 */
export const getActiveFunnelById = new PreparedQuery<IGetActiveFunnelByIdParams,IGetActiveFunnelByIdResult>(getActiveFunnelByIdIR);


/** 'ListActiveFunnelSteps' parameters type */
export interface IListActiveFunnelStepsParams {
  projectId?: string | null | void;
}

/** 'ListActiveFunnelSteps' return type */
export interface IListActiveFunnelStepsResult {
  eventName: string;
  funnelId: string;
  stepName: string;
  stepOrder: number;
}

/** 'ListActiveFunnelSteps' query type */
export interface IListActiveFunnelStepsQuery {
  params: IListActiveFunnelStepsParams;
  result: IListActiveFunnelStepsResult;
}

const listActiveFunnelStepsIR: any = {"usedParamSet":{"projectId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":233,"b":242}]}],"statement":"SELECT\n  fs.funnel_id AS \"funnelId\",\n  fs.step_order AS \"stepOrder\",\n  fs.step_name AS \"stepName\",\n  fs.event_name AS \"eventName\"\nFROM funnel_steps fs\nJOIN funnel_definitions fd\n  ON fd.funnel_id = fs.funnel_id\nWHERE fd.project_id = :projectId\n  AND fd.status = 'active'\nORDER BY fs.funnel_id ASC, fs.step_order ASC                                         "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   fs.funnel_id AS "funnelId",
 *   fs.step_order AS "stepOrder",
 *   fs.step_name AS "stepName",
 *   fs.event_name AS "eventName"
 * FROM funnel_steps fs
 * JOIN funnel_definitions fd
 *   ON fd.funnel_id = fs.funnel_id
 * WHERE fd.project_id = :projectId
 *   AND fd.status = 'active'
 * ORDER BY fs.funnel_id ASC, fs.step_order ASC                                         
 * ```
 */
export const listActiveFunnelSteps = new PreparedQuery<IListActiveFunnelStepsParams,IListActiveFunnelStepsResult>(listActiveFunnelStepsIR);


/** 'ListActiveFunnelStepsByFunnelId' parameters type */
export interface IListActiveFunnelStepsByFunnelIdParams {
  funnelId?: string | null | void;
  projectId?: string | null | void;
}

/** 'ListActiveFunnelStepsByFunnelId' return type */
export interface IListActiveFunnelStepsByFunnelIdResult {
  eventName: string;
  funnelId: string;
  stepName: string;
  stepOrder: number;
}

/** 'ListActiveFunnelStepsByFunnelId' query type */
export interface IListActiveFunnelStepsByFunnelIdQuery {
  params: IListActiveFunnelStepsByFunnelIdParams;
  result: IListActiveFunnelStepsByFunnelIdResult;
}

const listActiveFunnelStepsByFunnelIdIR: any = {"usedParamSet":{"projectId":true,"funnelId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":233,"b":242}]},{"name":"funnelId","required":false,"transform":{"type":"scalar"},"locs":[{"a":265,"b":273}]}],"statement":"SELECT\n  fs.funnel_id AS \"funnelId\",\n  fs.step_order AS \"stepOrder\",\n  fs.step_name AS \"stepName\",\n  fs.event_name AS \"eventName\"\nFROM funnel_steps fs\nJOIN funnel_definitions fd\n  ON fd.funnel_id = fs.funnel_id\nWHERE fd.project_id = :projectId\n  AND fd.funnel_id = :funnelId\n  AND fd.status = 'active'\nORDER BY fs.step_order ASC                          "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   fs.funnel_id AS "funnelId",
 *   fs.step_order AS "stepOrder",
 *   fs.step_name AS "stepName",
 *   fs.event_name AS "eventName"
 * FROM funnel_steps fs
 * JOIN funnel_definitions fd
 *   ON fd.funnel_id = fs.funnel_id
 * WHERE fd.project_id = :projectId
 *   AND fd.funnel_id = :funnelId
 *   AND fd.status = 'active'
 * ORDER BY fs.step_order ASC                          
 * ```
 */
export const listActiveFunnelStepsByFunnelId = new PreparedQuery<IListActiveFunnelStepsByFunnelIdParams,IListActiveFunnelStepsByFunnelIdResult>(listActiveFunnelStepsByFunnelIdIR);


/** 'InsertFunnelDefinition' parameters type */
export interface IInsertFunnelDefinitionParams {
  funnelId?: string | null | void;
  funnelName?: string | null | void;
  projectId?: string | null | void;
}

/** 'InsertFunnelDefinition' return type */
export interface IInsertFunnelDefinitionResult {
  createdAt: Date;
  domainType: string;
  funnelId: string;
  funnelName: string;
  status: string;
  updatedAt: Date;
}

/** 'InsertFunnelDefinition' query type */
export interface IInsertFunnelDefinitionQuery {
  params: IInsertFunnelDefinitionParams;
  result: IInsertFunnelDefinitionResult;
}

const insertFunnelDefinitionIR: any = {"usedParamSet":{"funnelId":true,"projectId":true,"funnelName":true},"params":[{"name":"funnelId","required":false,"transform":{"type":"scalar"},"locs":[{"a":76,"b":84}]},{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":87,"b":96}]},{"name":"funnelName","required":false,"transform":{"type":"scalar"},"locs":[{"a":99,"b":109}]}],"statement":"INSERT INTO funnel_definitions (funnel_id, project_id, funnel_name)\nVALUES (:funnelId, :projectId, :funnelName)\nRETURNING\n  funnel_id AS \"funnelId\",\n  funnel_name AS \"funnelName\",\n  domain_type AS \"domainType\",\n  status,\n  created_at AS \"createdAt\",\n  updated_at AS \"updatedAt\"                          "};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO funnel_definitions (funnel_id, project_id, funnel_name)
 * VALUES (:funnelId, :projectId, :funnelName)
 * RETURNING
 *   funnel_id AS "funnelId",
 *   funnel_name AS "funnelName",
 *   domain_type AS "domainType",
 *   status,
 *   created_at AS "createdAt",
 *   updated_at AS "updatedAt"                          
 * ```
 */
export const insertFunnelDefinition = new PreparedQuery<IInsertFunnelDefinitionParams,IInsertFunnelDefinitionResult>(insertFunnelDefinitionIR);


/** 'InsertFunnelStep' parameters type */
export interface IInsertFunnelStepParams {
  eventName?: string | null | void;
  funnelId?: string | null | void;
  stepName?: string | null | void;
  stepOrder?: number | null | void;
}

/** 'InsertFunnelStep' return type */
export interface IInsertFunnelStepResult {
  eventName: string;
  funnelId: string;
  stepName: string;
  stepOrder: number;
}

/** 'InsertFunnelStep' query type */
export interface IInsertFunnelStepQuery {
  params: IInsertFunnelStepParams;
  result: IInsertFunnelStepResult;
}

const insertFunnelStepIR: any = {"usedParamSet":{"funnelId":true,"stepOrder":true,"stepName":true,"eventName":true},"params":[{"name":"funnelId","required":false,"transform":{"type":"scalar"},"locs":[{"a":80,"b":88}]},{"name":"stepOrder","required":false,"transform":{"type":"scalar"},"locs":[{"a":91,"b":100}]},{"name":"stepName","required":false,"transform":{"type":"scalar"},"locs":[{"a":103,"b":111}]},{"name":"eventName","required":false,"transform":{"type":"scalar"},"locs":[{"a":114,"b":123}]}],"statement":"INSERT INTO funnel_steps (funnel_id, step_order, step_name, event_name)\nVALUES (:funnelId, :stepOrder, :stepName, :eventName)\nRETURNING\n  funnel_id AS \"funnelId\",\n  step_order AS \"stepOrder\",\n  step_name AS \"stepName\",\n  event_name AS \"eventName\"                                         "};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO funnel_steps (funnel_id, step_order, step_name, event_name)
 * VALUES (:funnelId, :stepOrder, :stepName, :eventName)
 * RETURNING
 *   funnel_id AS "funnelId",
 *   step_order AS "stepOrder",
 *   step_name AS "stepName",
 *   event_name AS "eventName"                                         
 * ```
 */
export const insertFunnelStep = new PreparedQuery<IInsertFunnelStepParams,IInsertFunnelStepResult>(insertFunnelStepIR);


/** 'DeleteFunnelSteps' parameters type */
export interface IDeleteFunnelStepsParams {
  funnelId?: string | null | void;
  projectId?: string | null | void;
}

/** 'DeleteFunnelSteps' return type */
export type IDeleteFunnelStepsResult = void;

/** 'DeleteFunnelSteps' query type */
export interface IDeleteFunnelStepsQuery {
  params: IDeleteFunnelStepsParams;
  result: IDeleteFunnelStepsResult;
}

const deleteFunnelStepsIR: any = {"usedParamSet":{"projectId":true,"funnelId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":112,"b":121}]},{"name":"funnelId","required":false,"transform":{"type":"scalar"},"locs":[{"a":143,"b":151}]}],"statement":"DELETE FROM funnel_steps\nWHERE funnel_id IN (\n  SELECT funnel_id\n  FROM funnel_definitions\n  WHERE project_id = :projectId\n    AND funnel_id = :funnelId\n)                                        "};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM funnel_steps
 * WHERE funnel_id IN (
 *   SELECT funnel_id
 *   FROM funnel_definitions
 *   WHERE project_id = :projectId
 *     AND funnel_id = :funnelId
 * )                                        
 * ```
 */
export const deleteFunnelSteps = new PreparedQuery<IDeleteFunnelStepsParams,IDeleteFunnelStepsResult>(deleteFunnelStepsIR);


/** 'DeleteFunnelDefinition' parameters type */
export interface IDeleteFunnelDefinitionParams {
  funnelId?: string | null | void;
  projectId?: string | null | void;
}

/** 'DeleteFunnelDefinition' return type */
export interface IDeleteFunnelDefinitionResult {
  funnelId: string;
}

/** 'DeleteFunnelDefinition' query type */
export interface IDeleteFunnelDefinitionQuery {
  params: IDeleteFunnelDefinitionParams;
  result: IDeleteFunnelDefinitionResult;
}

const deleteFunnelDefinitionIR: any = {"usedParamSet":{"projectId":true,"funnelId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":50,"b":59}]},{"name":"funnelId","required":false,"transform":{"type":"scalar"},"locs":[{"a":79,"b":87}]}],"statement":"DELETE FROM funnel_definitions\nWHERE project_id = :projectId\n  AND funnel_id = :funnelId\nRETURNING funnel_id AS \"funnelId\""};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM funnel_definitions
 * WHERE project_id = :projectId
 *   AND funnel_id = :funnelId
 * RETURNING funnel_id AS "funnelId"
 * ```
 */
export const deleteFunnelDefinition = new PreparedQuery<IDeleteFunnelDefinitionParams,IDeleteFunnelDefinitionResult>(deleteFunnelDefinitionIR);


