/** Types generated for queries found in "src/features/dashboard/database/dashboard.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

/** 'ListDashboardCampaignSummaries' parameters type */
export interface IListDashboardCampaignSummariesParams {
  projectId?: string | null | void;
}

/** 'ListDashboardCampaignSummaries' return type */
export interface IListDashboardCampaignSummariesResult {
  adExperimentCount: number | null;
  campaignId: string;
  campaignName: string;
  endDate: Date | null;
  latestGoalAchievementRate: number | null;
  objective: string | null;
  primaryMetric: string | null;
  promotionCount: number | null;
  segmentCount: number | null;
  startDate: Date | null;
  status: string;
  updatedAt: Date;
}

/** 'ListDashboardCampaignSummaries' query type */
export interface IListDashboardCampaignSummariesQuery {
  params: IListDashboardCampaignSummariesParams;
  result: IListDashboardCampaignSummariesResult;
}

const listDashboardCampaignSummariesIR: any = {"usedParamSet":{"projectId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":776,"b":785}]}],"statement":"SELECT\n  c.campaign_id AS \"campaignId\",\n  c.name AS \"campaignName\",\n  c.objective,\n  c.primary_metric AS \"primaryMetric\",\n  c.status,\n  c.start_date AS \"startDate\",\n  c.end_date AS \"endDate\",\n  COUNT(DISTINCT p.promotion_id)::int AS \"promotionCount\",\n  COUNT(DISTINCT pts.segment_id)::int AS \"segmentCount\",\n  COUNT(DISTINCT ae.ad_experiment_id)::int AS \"adExperimentCount\",\n  MAX(pe.actual_value)::float8 AS \"latestGoalAchievementRate\",\n  c.updated_at AS \"updatedAt\"\nFROM campaigns c\nLEFT JOIN promotions p\n  ON p.campaign_id = c.campaign_id\nLEFT JOIN promotion_target_segments pts\n  ON pts.campaign_id = c.campaign_id\nLEFT JOIN ad_experiments ae\n  ON ae.campaign_id = c.campaign_id\nLEFT JOIN promotion_evaluations pe\n  ON pe.campaign_id = c.campaign_id\nWHERE c.project_id = :projectId\nGROUP BY c.campaign_id\nORDER BY c.updated_at DESC, c.created_at DESC                                      "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   c.campaign_id AS "campaignId",
 *   c.name AS "campaignName",
 *   c.objective,
 *   c.primary_metric AS "primaryMetric",
 *   c.status,
 *   c.start_date AS "startDate",
 *   c.end_date AS "endDate",
 *   COUNT(DISTINCT p.promotion_id)::int AS "promotionCount",
 *   COUNT(DISTINCT pts.segment_id)::int AS "segmentCount",
 *   COUNT(DISTINCT ae.ad_experiment_id)::int AS "adExperimentCount",
 *   MAX(pe.actual_value)::float8 AS "latestGoalAchievementRate",
 *   c.updated_at AS "updatedAt"
 * FROM campaigns c
 * LEFT JOIN promotions p
 *   ON p.campaign_id = c.campaign_id
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
  endDate: Date | null;
  latestGoalAchievementRate: number | null;
  objective: string | null;
  primaryMetric: string | null;
  promotionCount: number | null;
  segmentCount: number | null;
  startDate: Date | null;
  status: string;
  updatedAt: Date;
}

/** 'GetDashboardCampaignSummary' query type */
export interface IGetDashboardCampaignSummaryQuery {
  params: IGetDashboardCampaignSummaryParams;
  result: IGetDashboardCampaignSummaryResult;
}

const getDashboardCampaignSummaryIR: any = {"usedParamSet":{"projectId":true,"campaignId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":776,"b":785}]},{"name":"campaignId","required":false,"transform":{"type":"scalar"},"locs":[{"a":809,"b":819}]}],"statement":"SELECT\n  c.campaign_id AS \"campaignId\",\n  c.name AS \"campaignName\",\n  c.objective,\n  c.primary_metric AS \"primaryMetric\",\n  c.status,\n  c.start_date AS \"startDate\",\n  c.end_date AS \"endDate\",\n  COUNT(DISTINCT p.promotion_id)::int AS \"promotionCount\",\n  COUNT(DISTINCT pts.segment_id)::int AS \"segmentCount\",\n  COUNT(DISTINCT ae.ad_experiment_id)::int AS \"adExperimentCount\",\n  MAX(pe.actual_value)::float8 AS \"latestGoalAchievementRate\",\n  c.updated_at AS \"updatedAt\"\nFROM campaigns c\nLEFT JOIN promotions p\n  ON p.campaign_id = c.campaign_id\nLEFT JOIN promotion_target_segments pts\n  ON pts.campaign_id = c.campaign_id\nLEFT JOIN ad_experiments ae\n  ON ae.campaign_id = c.campaign_id\nLEFT JOIN promotion_evaluations pe\n  ON pe.campaign_id = c.campaign_id\nWHERE c.project_id = :projectId\n  AND c.campaign_id = :campaignId\nGROUP BY c.campaign_id                                     "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   c.campaign_id AS "campaignId",
 *   c.name AS "campaignName",
 *   c.objective,
 *   c.primary_metric AS "primaryMetric",
 *   c.status,
 *   c.start_date AS "startDate",
 *   c.end_date AS "endDate",
 *   COUNT(DISTINCT p.promotion_id)::int AS "promotionCount",
 *   COUNT(DISTINCT pts.segment_id)::int AS "segmentCount",
 *   COUNT(DISTINCT ae.ad_experiment_id)::int AS "adExperimentCount",
 *   MAX(pe.actual_value)::float8 AS "latestGoalAchievementRate",
 *   c.updated_at AS "updatedAt"
 * FROM campaigns c
 * LEFT JOIN promotions p
 *   ON p.campaign_id = c.campaign_id
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


/** 'ListDashboardCampaignPromotions' parameters type */
export interface IListDashboardCampaignPromotionsParams {
  campaignId?: string | null | void;
  projectId?: string | null | void;
}

/** 'ListDashboardCampaignPromotions' return type */
export interface IListDashboardCampaignPromotionsResult {
  adExperimentCount: number | null;
  channel: string;
  goalBasis: string;
  goalMetric: string;
  goalTargetValue: number | null;
  latestActualValue: number | null;
  marketingTheme: string;
  promotionId: string;
  status: string;
  targetSegmentCount: number | null;
  updatedAt: Date;
}

/** 'ListDashboardCampaignPromotions' query type */
export interface IListDashboardCampaignPromotionsQuery {
  params: IListDashboardCampaignPromotionsParams;
  result: IListDashboardCampaignPromotionsResult;
}

const listDashboardCampaignPromotionsIR: any = {"usedParamSet":{"projectId":true,"campaignId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":696,"b":705}]},{"name":"campaignId","required":false,"transform":{"type":"scalar"},"locs":[{"a":729,"b":739}]}],"statement":"SELECT\n  p.promotion_id AS \"promotionId\",\n  p.channel,\n  p.marketing_theme AS \"marketingTheme\",\n  p.goal_metric AS \"goalMetric\",\n  p.goal_target_value::float8 AS \"goalTargetValue\",\n  p.goal_basis AS \"goalBasis\",\n  p.status,\n  COUNT(DISTINCT pts.segment_id)::int AS \"targetSegmentCount\",\n  COUNT(DISTINCT ae.ad_experiment_id)::int AS \"adExperimentCount\",\n  MAX(pe.actual_value)::float8 AS \"latestActualValue\",\n  p.updated_at AS \"updatedAt\"\nFROM promotions p\nLEFT JOIN promotion_target_segments pts\n  ON pts.promotion_id = p.promotion_id\nLEFT JOIN ad_experiments ae\n  ON ae.promotion_id = p.promotion_id\nLEFT JOIN promotion_evaluations pe\n  ON pe.promotion_id = p.promotion_id\nWHERE p.project_id = :projectId\n  AND p.campaign_id = :campaignId\nGROUP BY p.promotion_id\nORDER BY p.updated_at DESC, p.created_at DESC                                       "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   p.promotion_id AS "promotionId",
 *   p.channel,
 *   p.marketing_theme AS "marketingTheme",
 *   p.goal_metric AS "goalMetric",
 *   p.goal_target_value::float8 AS "goalTargetValue",
 *   p.goal_basis AS "goalBasis",
 *   p.status,
 *   COUNT(DISTINCT pts.segment_id)::int AS "targetSegmentCount",
 *   COUNT(DISTINCT ae.ad_experiment_id)::int AS "adExperimentCount",
 *   MAX(pe.actual_value)::float8 AS "latestActualValue",
 *   p.updated_at AS "updatedAt"
 * FROM promotions p
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
  goalBasis: string;
  goalMetric: string;
  goalTargetValue: number | null;
  landingUrl: string | null;
  latestActualValue: number | null;
  marketingTheme: string;
  minSampleSize: number;
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

const getDashboardPromotionSummaryIR: any = {"usedParamSet":{"projectId":true,"promotionId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":874,"b":883}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":908,"b":919}]}],"statement":"SELECT\n  p.promotion_id AS \"promotionId\",\n  p.campaign_id AS \"campaignId\",\n  p.channel,\n  p.marketing_theme AS \"marketingTheme\",\n  p.target_audience AS \"targetAudience\",\n  p.goal_metric AS \"goalMetric\",\n  p.goal_target_value::float8 AS \"goalTargetValue\",\n  p.goal_basis AS \"goalBasis\",\n  p.min_sample_size AS \"minSampleSize\",\n  p.offer_type AS \"offerType\",\n  p.landing_url AS \"landingUrl\",\n  p.status,\n  COUNT(DISTINCT pts.segment_id)::int AS \"targetSegmentCount\",\n  COUNT(DISTINCT ae.ad_experiment_id)::int AS \"adExperimentCount\",\n  MAX(pe.actual_value)::float8 AS \"latestActualValue\",\n  p.updated_at AS \"updatedAt\"\nFROM promotions p\nLEFT JOIN promotion_target_segments pts\n  ON pts.promotion_id = p.promotion_id\nLEFT JOIN ad_experiments ae\n  ON ae.promotion_id = p.promotion_id\nLEFT JOIN promotion_evaluations pe\n  ON pe.promotion_id = p.promotion_id\nWHERE p.project_id = :projectId\n  AND p.promotion_id = :promotionId\nGROUP BY p.promotion_id                                       "};

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
 *   p.offer_type AS "offerType",
 *   p.landing_url AS "landingUrl",
 *   p.status,
 *   COUNT(DISTINCT pts.segment_id)::int AS "targetSegmentCount",
 *   COUNT(DISTINCT ae.ad_experiment_id)::int AS "adExperimentCount",
 *   MAX(pe.actual_value)::float8 AS "latestActualValue",
 *   p.updated_at AS "updatedAt"
 * FROM promotions p
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


/** 'ListDashboardCampaignSegments' parameters type */
export interface IListDashboardCampaignSegmentsParams {
  campaignId?: string | null | void;
  projectId?: string | null | void;
}

/** 'ListDashboardCampaignSegments' return type */
export interface IListDashboardCampaignSegmentsResult {
  contentBriefJson: Json;
  dataEvidenceJson: Json;
  estimatedSize: number;
  naturalLanguageQuery: string | null;
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

const listDashboardCampaignSegmentsIR: any = {"usedParamSet":{"projectId":true,"campaignId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":676,"b":685}]},{"name":"campaignId","required":false,"transform":{"type":"scalar"},"locs":[{"a":711,"b":721}]}],"statement":"SELECT\n  pts.promotion_id AS \"promotionId\",\n  pts.segment_id AS \"segmentId\",\n  pts.segment_name AS \"segmentName\",\n  sd.source,\n  sd.natural_language_query AS \"naturalLanguageQuery\",\n  pts.rule_json AS \"ruleJson\",\n  pts.profile_json AS \"profileJson\",\n  pts.content_brief_json AS \"contentBriefJson\",\n  pts.data_evidence_json AS \"dataEvidenceJson\",\n  pts.estimated_size AS \"estimatedSize\",\n  sd.sample_size AS \"sampleSize\",\n  sd.total_eligible_user_count AS \"totalEligibleUserCount\",\n  sd.sample_ratio::float8 AS \"sampleRatio\",\n  pts.priority,\n  pts.status\nFROM promotion_target_segments pts\nJOIN segment_definitions sd\n  ON sd.segment_id = pts.segment_id\nWHERE pts.project_id = :projectId\n  AND pts.campaign_id = :campaignId\nORDER BY pts.promotion_id ASC, pts.created_at DESC                                   "};

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
 *   pts.priority,
 *   pts.status
 * FROM promotion_target_segments pts
 * JOIN segment_definitions sd
 *   ON sd.segment_id = pts.segment_id
 * WHERE pts.project_id = :projectId
 *   AND pts.campaign_id = :campaignId
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
  contentBriefJson: Json;
  dataEvidenceJson: Json;
  estimatedSize: number;
  naturalLanguageQuery: string | null;
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

const listDashboardPromotionSegmentsIR: any = {"usedParamSet":{"projectId":true,"promotionId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":676,"b":685}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":712,"b":723}]}],"statement":"SELECT\n  pts.promotion_id AS \"promotionId\",\n  pts.segment_id AS \"segmentId\",\n  pts.segment_name AS \"segmentName\",\n  sd.source,\n  sd.natural_language_query AS \"naturalLanguageQuery\",\n  pts.rule_json AS \"ruleJson\",\n  pts.profile_json AS \"profileJson\",\n  pts.content_brief_json AS \"contentBriefJson\",\n  pts.data_evidence_json AS \"dataEvidenceJson\",\n  pts.estimated_size AS \"estimatedSize\",\n  sd.sample_size AS \"sampleSize\",\n  sd.total_eligible_user_count AS \"totalEligibleUserCount\",\n  sd.sample_ratio::float8 AS \"sampleRatio\",\n  pts.priority,\n  pts.status\nFROM promotion_target_segments pts\nJOIN segment_definitions sd\n  ON sd.segment_id = pts.segment_id\nWHERE pts.project_id = :projectId\n  AND pts.promotion_id = :promotionId\nORDER BY pts.created_at DESC                                    "};

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
 *   pts.priority,
 *   pts.status
 * FROM promotion_target_segments pts
 * JOIN segment_definitions sd
 *   ON sd.segment_id = pts.segment_id
 * WHERE pts.project_id = :projectId
 *   AND pts.promotion_id = :promotionId
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
  contentBriefJson: Json;
  dataEvidenceJson: Json;
  estimatedSize: number;
  naturalLanguageQuery: string | null;
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

const getDashboardPromotionSegmentIR: any = {"usedParamSet":{"projectId":true,"promotionId":true,"segmentId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":676,"b":685}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":712,"b":723}]},{"name":"segmentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":748,"b":757}]}],"statement":"SELECT\n  pts.promotion_id AS \"promotionId\",\n  pts.segment_id AS \"segmentId\",\n  pts.segment_name AS \"segmentName\",\n  sd.source,\n  sd.natural_language_query AS \"naturalLanguageQuery\",\n  pts.rule_json AS \"ruleJson\",\n  pts.profile_json AS \"profileJson\",\n  pts.content_brief_json AS \"contentBriefJson\",\n  pts.data_evidence_json AS \"dataEvidenceJson\",\n  pts.estimated_size AS \"estimatedSize\",\n  sd.sample_size AS \"sampleSize\",\n  sd.total_eligible_user_count AS \"totalEligibleUserCount\",\n  sd.sample_ratio::float8 AS \"sampleRatio\",\n  pts.priority,\n  pts.status\nFROM promotion_target_segments pts\nJOIN segment_definitions sd\n  ON sd.segment_id = pts.segment_id\nWHERE pts.project_id = :projectId\n  AND pts.promotion_id = :promotionId\n  AND pts.segment_id = :segmentId                                   "};

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
 *   pts.priority,
 *   pts.status
 * FROM promotion_target_segments pts
 * JOIN segment_definitions sd
 *   ON sd.segment_id = pts.segment_id
 * WHERE pts.project_id = :projectId
 *   AND pts.promotion_id = :promotionId
 *   AND pts.segment_id = :segmentId                                   
 * ```
 */
export const getDashboardPromotionSegment = new PreparedQuery<IGetDashboardPromotionSegmentParams,IGetDashboardPromotionSegmentResult>(getDashboardPromotionSegmentIR);


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

const listDashboardSegmentExperimentMetricsIR: any = {"usedParamSet":{"projectId":true,"promotionId":true,"segmentId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":605,"b":614}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":637,"b":648}]},{"name":"segmentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":669,"b":678}]}],"statement":"SELECT\n  promotion_id AS \"promotionId\",\n  promotion_run_id AS \"promotionRunId\",\n  ad_experiment_id AS \"adExperimentId\",\n  segment_id AS \"segmentId\",\n  content_id AS \"contentId\",\n  content_option_id AS \"contentOptionId\",\n  metric,\n  target_value::float8 AS \"targetValue\",\n  actual_value::float8 AS \"actualValue\",\n  numerator_count AS \"numeratorCount\",\n  denominator_count AS \"denominatorCount\",\n  sample_size AS \"sampleSize\",\n  basis,\n  status,\n  feedback,\n  next_loop_required AS \"nextLoopRequired\",\n  result_json AS \"resultJson\",\n  created_at AS \"createdAt\"\nFROM promotion_evaluations\nWHERE project_id = :projectId\n  AND promotion_id = :promotionId\n  AND segment_id = :segmentId\nORDER BY created_at DESC                                    "};

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
  promotionId: string;
  reasonSummary: string | null;
  segmentId: string;
  status: string;
  title: string | null;
  updatedAt: Date;
}

/** 'ListDashboardSegmentContentCandidates' query type */
export interface IListDashboardSegmentContentCandidatesQuery {
  params: IListDashboardSegmentContentCandidatesParams;
  result: IListDashboardSegmentContentCandidatesResult;
}

const listDashboardSegmentContentCandidatesIR: any = {"usedParamSet":{"projectId":true,"promotionId":true,"segmentId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":531,"b":540}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":563,"b":574}]},{"name":"segmentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":595,"b":604}]}],"statement":"SELECT\n  content_id AS \"contentId\",\n  content_option_id AS \"contentOptionId\",\n  promotion_id AS \"promotionId\",\n  segment_id AS \"segmentId\",\n  channel,\n  title,\n  body,\n  cta,\n  message,\n  image_prompt AS \"imagePrompt\",\n  landing_url AS \"landingUrl\",\n  generation_prompt AS \"generationPrompt\",\n  reason_summary AS \"reasonSummary\",\n  data_evidence_json AS \"dataEvidenceJson\",\n  message_strategy AS \"messageStrategy\",\n  metadata_json AS \"metadataJson\",\n  status,\n  updated_at AS \"updatedAt\"\nFROM content_candidates\nWHERE project_id = :projectId\n  AND promotion_id = :promotionId\n  AND segment_id = :segmentId\nORDER BY updated_at DESC, created_at DESC                                  "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   content_id AS "contentId",
 *   content_option_id AS "contentOptionId",
 *   promotion_id AS "promotionId",
 *   segment_id AS "segmentId",
 *   channel,
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


