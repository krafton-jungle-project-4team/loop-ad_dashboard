/** Types generated for queries found in "src/features/dashboard/database/dashboard.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

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

const getDashboardPromotionSummaryIR: any = {"usedParamSet":{"projectId":true,"promotionId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":834,"b":843}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":868,"b":879}]}],"statement":"SELECT\n  p.promotion_id AS \"promotionId\",\n  p.campaign_id AS \"campaignId\",\n  p.channel,\n  p.marketing_theme AS \"marketingTheme\",\n  p.target_audience AS \"targetAudience\",\n  p.goal_metric AS \"goalMetric\",\n  p.goal_target_value::float8 AS \"goalTargetValue\",\n  p.goal_basis AS \"goalBasis\",\n  p.offer_type AS \"offerType\",\n  p.landing_url AS \"landingUrl\",\n  p.status,\n  COUNT(DISTINCT pts.segment_id)::int AS \"targetSegmentCount\",\n  COUNT(DISTINCT ae.ad_experiment_id)::int AS \"adExperimentCount\",\n  MAX(pe.actual_value)::float8 AS \"latestActualValue\",\n  p.updated_at AS \"updatedAt\"\nFROM promotions p\nLEFT JOIN promotion_target_segments pts\n  ON pts.promotion_id = p.promotion_id\nLEFT JOIN ad_experiments ae\n  ON ae.promotion_id = p.promotion_id\nLEFT JOIN promotion_evaluations pe\n  ON pe.promotion_id = p.promotion_id\nWHERE p.project_id = :projectId\n  AND p.promotion_id = :promotionId\nGROUP BY p.promotion_id                                       "};

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
  estimatedSize: number;
  priority: string | null;
  promotionId: string;
  segmentId: string;
  segmentName: string;
  status: string;
}

/** 'ListDashboardCampaignSegments' query type */
export interface IListDashboardCampaignSegmentsQuery {
  params: IListDashboardCampaignSegmentsParams;
  result: IListDashboardCampaignSegmentsResult;
}

const listDashboardCampaignSegmentsIR: any = {"usedParamSet":{"projectId":true,"campaignId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":210,"b":219}]},{"name":"campaignId","required":false,"transform":{"type":"scalar"},"locs":[{"a":241,"b":251}]}],"statement":"SELECT\n  promotion_id AS \"promotionId\",\n  segment_id AS \"segmentId\",\n  segment_name AS \"segmentName\",\n  estimated_size AS \"estimatedSize\",\n  priority,\n  status\nFROM promotion_target_segments\nWHERE project_id = :projectId\n  AND campaign_id = :campaignId\nORDER BY promotion_id ASC, created_at DESC                                   "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   promotion_id AS "promotionId",
 *   segment_id AS "segmentId",
 *   segment_name AS "segmentName",
 *   estimated_size AS "estimatedSize",
 *   priority,
 *   status
 * FROM promotion_target_segments
 * WHERE project_id = :projectId
 *   AND campaign_id = :campaignId
 * ORDER BY promotion_id ASC, created_at DESC                                   
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
  estimatedSize: number;
  priority: string | null;
  promotionId: string;
  segmentId: string;
  segmentName: string;
  status: string;
}

/** 'ListDashboardPromotionSegments' query type */
export interface IListDashboardPromotionSegmentsQuery {
  params: IListDashboardPromotionSegmentsParams;
  result: IListDashboardPromotionSegmentsResult;
}

const listDashboardPromotionSegmentsIR: any = {"usedParamSet":{"projectId":true,"promotionId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":210,"b":219}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":242,"b":253}]}],"statement":"SELECT\n  promotion_id AS \"promotionId\",\n  segment_id AS \"segmentId\",\n  segment_name AS \"segmentName\",\n  estimated_size AS \"estimatedSize\",\n  priority,\n  status\nFROM promotion_target_segments\nWHERE project_id = :projectId\n  AND promotion_id = :promotionId\nORDER BY created_at DESC                                   "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   promotion_id AS "promotionId",
 *   segment_id AS "segmentId",
 *   segment_name AS "segmentName",
 *   estimated_size AS "estimatedSize",
 *   priority,
 *   status
 * FROM promotion_target_segments
 * WHERE project_id = :projectId
 *   AND promotion_id = :promotionId
 * ORDER BY created_at DESC                                   
 * ```
 */
export const listDashboardPromotionSegments = new PreparedQuery<IListDashboardPromotionSegmentsParams,IListDashboardPromotionSegmentsResult>(listDashboardPromotionSegmentsIR);


/** 'ListDashboardCampaignExperimentMetrics' parameters type */
export interface IListDashboardCampaignExperimentMetricsParams {
  campaignId?: string | null | void;
  projectId?: string | null | void;
}

/** 'ListDashboardCampaignExperimentMetrics' return type */
export interface IListDashboardCampaignExperimentMetricsResult {
  actualValue: number | null;
  adExperimentId: string | null;
  createdAt: Date;
  denominatorCount: number;
  metric: string;
  numeratorCount: number;
  promotionId: string;
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

const listDashboardCampaignExperimentMetricsIR: any = {"usedParamSet":{"projectId":true,"campaignId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":398,"b":407}]},{"name":"campaignId","required":false,"transform":{"type":"scalar"},"locs":[{"a":429,"b":439}]}],"statement":"SELECT\n  promotion_id AS \"promotionId\",\n  ad_experiment_id AS \"adExperimentId\",\n  segment_id AS \"segmentId\",\n  metric,\n  target_value::float8 AS \"targetValue\",\n  actual_value::float8 AS \"actualValue\",\n  numerator_count AS \"numeratorCount\",\n  denominator_count AS \"denominatorCount\",\n  sample_size AS \"sampleSize\",\n  status,\n  created_at AS \"createdAt\"\nFROM promotion_evaluations\nWHERE project_id = :projectId\n  AND campaign_id = :campaignId\nORDER BY created_at DESC                               "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   promotion_id AS "promotionId",
 *   ad_experiment_id AS "adExperimentId",
 *   segment_id AS "segmentId",
 *   metric,
 *   target_value::float8 AS "targetValue",
 *   actual_value::float8 AS "actualValue",
 *   numerator_count AS "numeratorCount",
 *   denominator_count AS "denominatorCount",
 *   sample_size AS "sampleSize",
 *   status,
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
  createdAt: Date;
  denominatorCount: number;
  metric: string;
  numeratorCount: number;
  promotionId: string;
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

const listDashboardPromotionExperimentMetricsIR: any = {"usedParamSet":{"projectId":true,"promotionId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":398,"b":407}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":430,"b":441}]}],"statement":"SELECT\n  promotion_id AS \"promotionId\",\n  ad_experiment_id AS \"adExperimentId\",\n  segment_id AS \"segmentId\",\n  metric,\n  target_value::float8 AS \"targetValue\",\n  actual_value::float8 AS \"actualValue\",\n  numerator_count AS \"numeratorCount\",\n  denominator_count AS \"denominatorCount\",\n  sample_size AS \"sampleSize\",\n  status,\n  created_at AS \"createdAt\"\nFROM promotion_evaluations\nWHERE project_id = :projectId\n  AND promotion_id = :promotionId\nORDER BY created_at DESC                                  "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   promotion_id AS "promotionId",
 *   ad_experiment_id AS "adExperimentId",
 *   segment_id AS "segmentId",
 *   metric,
 *   target_value::float8 AS "targetValue",
 *   actual_value::float8 AS "actualValue",
 *   numerator_count AS "numeratorCount",
 *   denominator_count AS "denominatorCount",
 *   sample_size AS "sampleSize",
 *   status,
 *   created_at AS "createdAt"
 * FROM promotion_evaluations
 * WHERE project_id = :projectId
 *   AND promotion_id = :promotionId
 * ORDER BY created_at DESC                                  
 * ```
 */
export const listDashboardPromotionExperimentMetrics = new PreparedQuery<IListDashboardPromotionExperimentMetricsParams,IListDashboardPromotionExperimentMetricsResult>(listDashboardPromotionExperimentMetricsIR);


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


