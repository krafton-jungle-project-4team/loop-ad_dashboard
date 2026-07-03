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

const listDashboardCampaignSummariesIR: any = {"usedParamSet":{"projectId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":776,"b":785}]}],"statement":"SELECT\n  c.campaign_id AS \"campaignId\",\n  c.name AS \"campaignName\",\n  c.objective,\n  c.primary_metric AS \"primaryMetric\",\n  c.status,\n  c.start_date AS \"startDate\",\n  c.end_date AS \"endDate\",\n  COUNT(DISTINCT p.promotion_id)::int AS \"promotionCount\",\n  COUNT(DISTINCT pts.segment_id)::int AS \"segmentCount\",\n  COUNT(DISTINCT ae.ad_experiment_id)::int AS \"adExperimentCount\",\n  MAX(pe.actual_value)::float8 AS \"latestGoalAchievementRate\",\n  c.updated_at AS \"updatedAt\"\nFROM campaigns c\nLEFT JOIN promotions p\n  ON p.campaign_id = c.campaign_id\nLEFT JOIN promotion_target_segments pts\n  ON pts.campaign_id = c.campaign_id\nLEFT JOIN ad_experiments ae\n  ON ae.campaign_id = c.campaign_id\nLEFT JOIN promotion_evaluations pe\n  ON pe.campaign_id = c.campaign_id\nWHERE c.project_id = :projectId\nGROUP BY c.campaign_id\nORDER BY c.updated_at DESC, c.created_at DESC                                                              "};

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

const listActiveFunnelsIR: any = {"usedParamSet":{"projectId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":206,"b":215}]}],"statement":"SELECT\n  funnel_id AS \"funnelId\",\n  funnel_name AS \"funnelName\",\n  domain_type AS \"domainType\",\n  status,\n  created_at AS \"createdAt\",\n  updated_at AS \"updatedAt\"\nFROM funnel_definitions\nWHERE project_id = :projectId\n  AND status = 'active'\nORDER BY updated_at DESC, created_at DESC                                                        "};

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

const listActiveFunnelStepsIR: any = {"usedParamSet":{"projectId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":233,"b":242}]}],"statement":"SELECT\n  fs.funnel_id AS \"funnelId\",\n  fs.step_order AS \"stepOrder\",\n  fs.step_name AS \"stepName\",\n  fs.event_name AS \"eventName\"\nFROM funnel_steps fs\nJOIN funnel_definitions fd\n  ON fd.funnel_id = fs.funnel_id\nWHERE fd.project_id = :projectId\n  AND fd.status = 'active'\nORDER BY fs.funnel_id ASC, fs.step_order ASC                                          "};

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

const insertFunnelDefinitionIR: any = {"usedParamSet":{"funnelId":true,"projectId":true,"funnelName":true},"params":[{"name":"funnelId","required":false,"transform":{"type":"scalar"},"locs":[{"a":76,"b":84}]},{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":87,"b":96}]},{"name":"funnelName","required":false,"transform":{"type":"scalar"},"locs":[{"a":99,"b":109}]}],"statement":"INSERT INTO funnel_definitions (funnel_id, project_id, funnel_name)\nVALUES (:funnelId, :projectId, :funnelName)\nRETURNING\n  funnel_id AS \"funnelId\",\n  funnel_name AS \"funnelName\",\n  domain_type AS \"domainType\",\n  status,\n  created_at AS \"createdAt\",\n  updated_at AS \"updatedAt\"                                      "};

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

const insertFunnelStepIR: any = {"usedParamSet":{"funnelId":true,"stepOrder":true,"stepName":true,"eventName":true},"params":[{"name":"funnelId","required":false,"transform":{"type":"scalar"},"locs":[{"a":80,"b":88}]},{"name":"stepOrder","required":false,"transform":{"type":"scalar"},"locs":[{"a":91,"b":100}]},{"name":"stepName","required":false,"transform":{"type":"scalar"},"locs":[{"a":103,"b":111}]},{"name":"eventName","required":false,"transform":{"type":"scalar"},"locs":[{"a":114,"b":123}]}],"statement":"INSERT INTO funnel_steps (funnel_id, step_order, step_name, event_name)\nVALUES (:funnelId, :stepOrder, :stepName, :eventName)\nRETURNING\n  funnel_id AS \"funnelId\",\n  step_order AS \"stepOrder\",\n  step_name AS \"stepName\",\n  event_name AS \"eventName\""};

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


