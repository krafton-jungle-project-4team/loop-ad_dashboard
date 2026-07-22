/** Types generated for queries found in "src/features/dashboard/database/dashboard.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type DateOrString = Date | string;

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export type NumberOrString = number | string;

export type stringArray = (string)[];

/** 'ListDashboardProjects' parameters type */
export type IListDashboardProjectsParams = void;

/** 'ListDashboardProjects' return type */
export interface IListDashboardProjectsResult {
  createdAt: Date;
  domain: string;
  projectId: string;
  projectName: string;
  status: string;
  updatedAt: Date;
  writeKey: string;
}

/** 'ListDashboardProjects' query type */
export interface IListDashboardProjectsQuery {
  params: IListDashboardProjectsParams;
  result: IListDashboardProjectsResult;
}

const listDashboardProjectsIR: any = {"usedParamSet":{},"params":[],"statement":"SELECT\n  project_id AS \"projectId\",\n  project_name AS \"projectName\",\n  domain,\n  write_key AS \"writeKey\",\n  status,\n  created_at AS \"createdAt\",\n  updated_at AS \"updatedAt\"\nFROM projects\nWHERE status <> 'archived'\nORDER BY updated_at DESC, created_at DESC                               "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   project_id AS "projectId",
 *   project_name AS "projectName",
 *   domain,
 *   write_key AS "writeKey",
 *   status,
 *   created_at AS "createdAt",
 *   updated_at AS "updatedAt"
 * FROM projects
 * WHERE status <> 'archived'
 * ORDER BY updated_at DESC, created_at DESC
 * ```
 */
export const listDashboardProjects = new PreparedQuery<IListDashboardProjectsParams,IListDashboardProjectsResult>(listDashboardProjectsIR);


/** 'InsertDashboardProject' parameters type */
export interface IInsertDashboardProjectParams {
  domain?: string | null | void;
  projectId?: string | null | void;
  projectName?: string | null | void;
  status?: string | null | void;
  writeKey?: string | null | void;
}

/** 'InsertDashboardProject' return type */
export interface IInsertDashboardProjectResult {
  createdAt: Date;
  domain: string;
  projectId: string;
  projectName: string;
  status: string;
  updatedAt: Date;
  writeKey: string;
}

/** 'InsertDashboardProject' query type */
export interface IInsertDashboardProjectQuery {
  params: IInsertDashboardProjectParams;
  result: IInsertDashboardProjectResult;
}

const insertDashboardProjectIR: any = {"usedParamSet":{"projectId":true,"projectName":true,"domain":true,"writeKey":true,"status":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":98,"b":107}]},{"name":"projectName","required":false,"transform":{"type":"scalar"},"locs":[{"a":112,"b":123}]},{"name":"domain","required":false,"transform":{"type":"scalar"},"locs":[{"a":128,"b":134}]},{"name":"writeKey","required":false,"transform":{"type":"scalar"},"locs":[{"a":139,"b":147}]},{"name":"status","required":false,"transform":{"type":"scalar"},"locs":[{"a":152,"b":158}]}],"statement":"INSERT INTO projects (\n  project_id,\n  project_name,\n  domain,\n  write_key,\n  status\n)\nVALUES (\n  :projectId,\n  :projectName,\n  :domain,\n  :writeKey,\n  :status\n)\nON CONFLICT (project_id) DO UPDATE\nSET\n  project_name = EXCLUDED.project_name,\n  domain = EXCLUDED.domain,\n  write_key = EXCLUDED.write_key,\n  status = 'active',\n  updated_at = now()\nRETURNING\n  project_id AS \"projectId\",\n  project_name AS \"projectName\",\n  domain,\n  write_key AS \"writeKey\",\n  status,\n  created_at AS \"createdAt\",\n  updated_at AS \"updatedAt\"                                                "};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO projects (
 *   project_id,
 *   project_name,
 *   domain,
 *   write_key,
 *   status
 * )
 * VALUES (
 *   :projectId,
 *   :projectName,
 *   :domain,
 *   :writeKey,
 *   :status
 * )
 * ON CONFLICT (project_id) DO UPDATE
 * SET
 *   project_name = EXCLUDED.project_name,
 *   domain = EXCLUDED.domain,
 *   write_key = EXCLUDED.write_key,
 *   status = 'active',
 *   updated_at = now()
 * RETURNING
 *   project_id AS "projectId",
 *   project_name AS "projectName",
 *   domain,
 *   write_key AS "writeKey",
 *   status,
 *   created_at AS "createdAt",
 *   updated_at AS "updatedAt"
 * ```
 */
export const insertDashboardProject = new PreparedQuery<IInsertDashboardProjectParams,IInsertDashboardProjectResult>(insertDashboardProjectIR);


/** 'ArchiveDashboardProject' parameters type */
export interface IArchiveDashboardProjectParams {
  projectId?: string | null | void;
}

/** 'ArchiveDashboardProject' return type */
export interface IArchiveDashboardProjectResult {
  projectId: string;
  status: string;
}

/** 'ArchiveDashboardProject' query type */
export interface IArchiveDashboardProjectQuery {
  params: IArchiveDashboardProjectParams;
  result: IArchiveDashboardProjectResult;
}

const archiveDashboardProjectIR: any = {"usedParamSet":{"projectId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":83,"b":92}]}],"statement":"UPDATE projects\nSET status = 'archived',\n    updated_at = now()\nWHERE project_id = :projectId\n  AND status <> 'archived'\nRETURNING project_id AS \"projectId\", status                                        "};

/**
 * Query generated from SQL:
 * ```
 * UPDATE projects
 * SET status = 'archived',
 *     updated_at = now()
 * WHERE project_id = :projectId
 *   AND status <> 'archived'
 * RETURNING project_id AS "projectId", status
 * ```
 */
export const archiveDashboardProject = new PreparedQuery<IArchiveDashboardProjectParams,IArchiveDashboardProjectResult>(archiveDashboardProjectIR);


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
  updatedAt: Date;
}

/** 'ListDashboardCampaignSummaries' query type */
export interface IListDashboardCampaignSummariesQuery {
  params: IListDashboardCampaignSummariesParams;
  result: IListDashboardCampaignSummariesResult;
}

const listDashboardCampaignSummariesIR: any = {"usedParamSet":{"projectId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1852,"b":1861}]}],"statement":"SELECT\n  c.campaign_id AS \"campaignId\",\n  c.name AS \"campaignName\",\n  c.objective,\n  c.primary_metric AS \"primaryMetric\",\n  c.status,\n  c.start_date AS \"startDate\",\n  c.end_date AS \"endDate\",\n  COALESCE(MAX(p.max_loop_count), 0)::int AS \"maxLoopCount\",\n  COALESCE(MAX(pr.loop_count), 0)::int AS \"currentLoopCount\",\n  COUNT(DISTINCT p.promotion_id)::int AS \"promotionCount\",\n  COUNT(DISTINCT pts.segment_id)::int AS \"segmentCount\",\n  COUNT(DISTINCT ae.ad_experiment_id) FILTER (\n    WHERE ae.segment_id <> 'seg_existing_all'\n  )::int AS \"adExperimentCount\",\n  CAST(MAX(pe.actual_value) AS float8) AS \"latestGoalAchievementRate\",\n  CASE\n    WHEN c.status = 'draft' THEN 'campaign_start'\n    WHEN COUNT(DISTINCT p.promotion_id) = 0 THEN 'create_promotion'\n    WHEN COUNT(DISTINCT pts.segment_id) = 0 THEN 'attach_segment'\n    WHEN COUNT(DISTINCT ae.ad_experiment_id) FILTER (\n      WHERE ae.segment_id <> 'seg_existing_all'\n    ) = 0 THEN 'approve_content'\n    WHEN COUNT(*) FILTER (WHERE pe.next_loop_required) > 0 THEN 'next_loop'\n    ELSE 'monitor'\n  END AS \"nextAction\",\n  c.updated_at AS \"updatedAt\"\nFROM campaigns c\nLEFT JOIN promotions p\n  ON p.project_id = c.project_id\n AND p.campaign_id = c.campaign_id\n AND p.status <> 'stopped'\nLEFT JOIN promotion_runs pr\n  ON pr.project_id = p.project_id\n AND pr.promotion_id = p.promotion_id\n AND pr.status <> 'stopped'\nLEFT JOIN promotion_target_segments pts\n  ON pts.project_id = p.project_id\n AND pts.promotion_id = p.promotion_id\n AND pts.status <> 'stopped'\nLEFT JOIN ad_experiments ae\n  ON ae.project_id = p.project_id\n AND ae.promotion_id = p.promotion_id\n AND ae.status <> 'stopped'\nLEFT JOIN promotion_evaluations pe\n  ON pe.project_id = p.project_id\n AND pe.promotion_id = p.promotion_id\n AND pe.ad_experiment_id = ae.ad_experiment_id\n AND pe.segment_id <> 'seg_existing_all'\nWHERE c.project_id = :projectId\n  AND c.status <> 'stopped'\n\nGROUP BY c.campaign_id\nORDER BY c.updated_at DESC, c.created_at DESC                                      "};

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
 *   COALESCE(MAX(p.max_loop_count), 0)::int AS "maxLoopCount",
 *   COALESCE(MAX(pr.loop_count), 0)::int AS "currentLoopCount",
 *   COUNT(DISTINCT p.promotion_id)::int AS "promotionCount",
 *   COUNT(DISTINCT pts.segment_id)::int AS "segmentCount",
 *   COUNT(DISTINCT ae.ad_experiment_id) FILTER (
 *     WHERE ae.segment_id <> 'seg_existing_all'
 *   )::int AS "adExperimentCount",
 *   CAST(MAX(pe.actual_value) AS float8) AS "latestGoalAchievementRate",
 *   CASE
 *     WHEN c.status = 'draft' THEN 'campaign_start'
 *     WHEN COUNT(DISTINCT p.promotion_id) = 0 THEN 'create_promotion'
 *     WHEN COUNT(DISTINCT pts.segment_id) = 0 THEN 'attach_segment'
 *     WHEN COUNT(DISTINCT ae.ad_experiment_id) FILTER (
 *       WHERE ae.segment_id <> 'seg_existing_all'
 *     ) = 0 THEN 'approve_content'
 *     WHEN COUNT(*) FILTER (WHERE pe.next_loop_required) > 0 THEN 'next_loop'
 *     ELSE 'monitor'
 *   END AS "nextAction",
 *   c.updated_at AS "updatedAt"
 * FROM campaigns c
 * LEFT JOIN promotions p
 *   ON p.project_id = c.project_id
 *  AND p.campaign_id = c.campaign_id
 *  AND p.status <> 'stopped'
 * LEFT JOIN promotion_runs pr
 *   ON pr.project_id = p.project_id
 *  AND pr.promotion_id = p.promotion_id
 *  AND pr.status <> 'stopped'
 * LEFT JOIN promotion_target_segments pts
 *   ON pts.project_id = p.project_id
 *  AND pts.promotion_id = p.promotion_id
 *  AND pts.status <> 'stopped'
 * LEFT JOIN ad_experiments ae
 *   ON ae.project_id = p.project_id
 *  AND ae.promotion_id = p.promotion_id
 *  AND ae.status <> 'stopped'
 * LEFT JOIN promotion_evaluations pe
 *   ON pe.project_id = p.project_id
 *  AND pe.promotion_id = p.promotion_id
 *  AND pe.ad_experiment_id = ae.ad_experiment_id
 *  AND pe.segment_id <> 'seg_existing_all'
 * WHERE c.project_id = :projectId
 *   AND c.status <> 'stopped'
 *
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
  updatedAt: Date;
}

/** 'GetDashboardCampaignSummary' query type */
export interface IGetDashboardCampaignSummaryQuery {
  params: IGetDashboardCampaignSummaryParams;
  result: IGetDashboardCampaignSummaryResult;
}

const getDashboardCampaignSummaryIR: any = {"usedParamSet":{"projectId":true,"campaignId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1852,"b":1861}]},{"name":"campaignId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1885,"b":1895}]}],"statement":"SELECT\n  c.campaign_id AS \"campaignId\",\n  c.name AS \"campaignName\",\n  c.objective,\n  c.primary_metric AS \"primaryMetric\",\n  c.status,\n  c.start_date AS \"startDate\",\n  c.end_date AS \"endDate\",\n  COALESCE(MAX(p.max_loop_count), 0)::int AS \"maxLoopCount\",\n  COALESCE(MAX(pr.loop_count), 0)::int AS \"currentLoopCount\",\n  COUNT(DISTINCT p.promotion_id)::int AS \"promotionCount\",\n  COUNT(DISTINCT pts.segment_id)::int AS \"segmentCount\",\n  COUNT(DISTINCT ae.ad_experiment_id) FILTER (\n    WHERE ae.segment_id <> 'seg_existing_all'\n  )::int AS \"adExperimentCount\",\n  CAST(MAX(pe.actual_value) AS float8) AS \"latestGoalAchievementRate\",\n  CASE\n    WHEN c.status = 'draft' THEN 'campaign_start'\n    WHEN COUNT(DISTINCT p.promotion_id) = 0 THEN 'create_promotion'\n    WHEN COUNT(DISTINCT pts.segment_id) = 0 THEN 'attach_segment'\n    WHEN COUNT(DISTINCT ae.ad_experiment_id) FILTER (\n      WHERE ae.segment_id <> 'seg_existing_all'\n    ) = 0 THEN 'approve_content'\n    WHEN COUNT(*) FILTER (WHERE pe.next_loop_required) > 0 THEN 'next_loop'\n    ELSE 'monitor'\n  END AS \"nextAction\",\n  c.updated_at AS \"updatedAt\"\nFROM campaigns c\nLEFT JOIN promotions p\n  ON p.project_id = c.project_id\n AND p.campaign_id = c.campaign_id\n AND p.status <> 'stopped'\nLEFT JOIN promotion_runs pr\n  ON pr.project_id = p.project_id\n AND pr.promotion_id = p.promotion_id\n AND pr.status <> 'stopped'\nLEFT JOIN promotion_target_segments pts\n  ON pts.project_id = p.project_id\n AND pts.promotion_id = p.promotion_id\n AND pts.status <> 'stopped'\nLEFT JOIN ad_experiments ae\n  ON ae.project_id = p.project_id\n AND ae.promotion_id = p.promotion_id\n AND ae.status <> 'stopped'\nLEFT JOIN promotion_evaluations pe\n  ON pe.project_id = p.project_id\n AND pe.promotion_id = p.promotion_id\n AND pe.ad_experiment_id = ae.ad_experiment_id\n AND pe.segment_id <> 'seg_existing_all'\nWHERE c.project_id = :projectId\n  AND c.campaign_id = :campaignId\n  AND c.status <> 'stopped'\n\nGROUP BY c.campaign_id                              "};

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
 *   COALESCE(MAX(p.max_loop_count), 0)::int AS "maxLoopCount",
 *   COALESCE(MAX(pr.loop_count), 0)::int AS "currentLoopCount",
 *   COUNT(DISTINCT p.promotion_id)::int AS "promotionCount",
 *   COUNT(DISTINCT pts.segment_id)::int AS "segmentCount",
 *   COUNT(DISTINCT ae.ad_experiment_id) FILTER (
 *     WHERE ae.segment_id <> 'seg_existing_all'
 *   )::int AS "adExperimentCount",
 *   CAST(MAX(pe.actual_value) AS float8) AS "latestGoalAchievementRate",
 *   CASE
 *     WHEN c.status = 'draft' THEN 'campaign_start'
 *     WHEN COUNT(DISTINCT p.promotion_id) = 0 THEN 'create_promotion'
 *     WHEN COUNT(DISTINCT pts.segment_id) = 0 THEN 'attach_segment'
 *     WHEN COUNT(DISTINCT ae.ad_experiment_id) FILTER (
 *       WHERE ae.segment_id <> 'seg_existing_all'
 *     ) = 0 THEN 'approve_content'
 *     WHEN COUNT(*) FILTER (WHERE pe.next_loop_required) > 0 THEN 'next_loop'
 *     ELSE 'monitor'
 *   END AS "nextAction",
 *   c.updated_at AS "updatedAt"
 * FROM campaigns c
 * LEFT JOIN promotions p
 *   ON p.project_id = c.project_id
 *  AND p.campaign_id = c.campaign_id
 *  AND p.status <> 'stopped'
 * LEFT JOIN promotion_runs pr
 *   ON pr.project_id = p.project_id
 *  AND pr.promotion_id = p.promotion_id
 *  AND pr.status <> 'stopped'
 * LEFT JOIN promotion_target_segments pts
 *   ON pts.project_id = p.project_id
 *  AND pts.promotion_id = p.promotion_id
 *  AND pts.status <> 'stopped'
 * LEFT JOIN ad_experiments ae
 *   ON ae.project_id = p.project_id
 *  AND ae.promotion_id = p.promotion_id
 *  AND ae.status <> 'stopped'
 * LEFT JOIN promotion_evaluations pe
 *   ON pe.project_id = p.project_id
 *  AND pe.promotion_id = p.promotion_id
 *  AND pe.ad_experiment_id = ae.ad_experiment_id
 *  AND pe.segment_id <> 'seg_existing_all'
 * WHERE c.project_id = :projectId
 *   AND c.campaign_id = :campaignId
 *   AND c.status <> 'stopped'
 *
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

const insertDashboardCampaignIR: any = {"usedParamSet":{"campaignId":true,"projectId":true,"campaignName":true,"objective":true,"startDate":true,"endDate":true,"primaryMetric":true,"status":true},"params":[{"name":"campaignId","required":false,"transform":{"type":"scalar"},"locs":[{"a":140,"b":150}]},{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":155,"b":164}]},{"name":"campaignName","required":false,"transform":{"type":"scalar"},"locs":[{"a":169,"b":181}]},{"name":"objective","required":false,"transform":{"type":"scalar"},"locs":[{"a":186,"b":195}]},{"name":"startDate","required":false,"transform":{"type":"scalar"},"locs":[{"a":200,"b":209}]},{"name":"endDate","required":false,"transform":{"type":"scalar"},"locs":[{"a":214,"b":221}]},{"name":"primaryMetric","required":false,"transform":{"type":"scalar"},"locs":[{"a":226,"b":239}]},{"name":"status","required":false,"transform":{"type":"scalar"},"locs":[{"a":244,"b":250}]}],"statement":"INSERT INTO campaigns (\n  campaign_id,\n  project_id,\n  name,\n  objective,\n  start_date,\n  end_date,\n  primary_metric,\n  status\n)\nVALUES (\n  :campaignId,\n  :projectId,\n  :campaignName,\n  :objective,\n  :startDate,\n  :endDate,\n  :primaryMetric,\n  :status\n)\nRETURNING campaign_id AS \"campaignId\"                                  "};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO campaigns (
 *   campaign_id,
 *   project_id,
 *   name,
 *   objective,
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

const updateDashboardCampaignIR: any = {"usedParamSet":{"campaignName":true,"objectiveIsSet":true,"objective":true,"startDateIsSet":true,"startDate":true,"endDateIsSet":true,"endDate":true,"primaryMetricIsSet":true,"primaryMetric":true,"status":true,"projectId":true,"campaignId":true},"params":[{"name":"campaignName","required":false,"transform":{"type":"scalar"},"locs":[{"a":39,"b":51}]},{"name":"objectiveIsSet","required":false,"transform":{"type":"scalar"},"locs":[{"a":85,"b":99}]},{"name":"objective","required":false,"transform":{"type":"scalar"},"locs":[{"a":106,"b":115}]},{"name":"startDateIsSet","required":false,"transform":{"type":"scalar"},"locs":[{"a":162,"b":176}]},{"name":"startDate","required":false,"transform":{"type":"scalar"},"locs":[{"a":183,"b":192}]},{"name":"endDateIsSet","required":false,"transform":{"type":"scalar"},"locs":[{"a":238,"b":250}]},{"name":"endDate","required":false,"transform":{"type":"scalar"},"locs":[{"a":257,"b":264}]},{"name":"primaryMetricIsSet","required":false,"transform":{"type":"scalar"},"locs":[{"a":314,"b":332}]},{"name":"primaryMetric","required":false,"transform":{"type":"scalar"},"locs":[{"a":339,"b":352}]},{"name":"status","required":false,"transform":{"type":"scalar"},"locs":[{"a":399,"b":405}]},{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":457,"b":466}]},{"name":"campaignId","required":false,"transform":{"type":"scalar"},"locs":[{"a":488,"b":498}]}],"statement":"UPDATE campaigns\nSET\n  name = COALESCE(:campaignName, name),\n  objective = CASE WHEN :objectiveIsSet THEN :objective ELSE objective END,\n  start_date = CASE WHEN :startDateIsSet THEN :startDate ELSE start_date END,\n  end_date = CASE WHEN :endDateIsSet THEN :endDate ELSE end_date END,\n  primary_metric = CASE WHEN :primaryMetricIsSet THEN :primaryMetric ELSE primary_metric END,\n  status = COALESCE(:status, status),\n  updated_at = now()\nWHERE project_id = :projectId\n  AND campaign_id = :campaignId\n  AND status <> 'stopped'\nRETURNING campaign_id AS \"campaignId\"                                             "};

/**
 * Query generated from SQL:
 * ```
 * UPDATE campaigns
 * SET
 *   name = COALESCE(:campaignName, name),
 *   objective = CASE WHEN :objectiveIsSet THEN :objective ELSE objective END,
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


/** 'DeleteDashboardCampaign' parameters type */
export interface IDeleteDashboardCampaignParams {
  campaignId?: string | null | void;
  projectId?: string | null | void;
}

/** 'DeleteDashboardCampaign' return type */
export interface IDeleteDashboardCampaignResult {
  campaignId: string;
  status: string | null;
}

/** 'DeleteDashboardCampaign' query type */
export interface IDeleteDashboardCampaignQuery {
  params: IDeleteDashboardCampaignParams;
  result: IDeleteDashboardCampaignResult;
}

const deleteDashboardCampaignIR: any = {"usedParamSet":{"projectId":true,"campaignId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":118,"b":127},{"a":306,"b":315},{"a":510,"b":519},{"a":745,"b":754},{"a":1082,"b":1091},{"a":1334,"b":1343},{"a":1904,"b":1913},{"a":2176,"b":2185},{"a":2466,"b":2475},{"a":3113,"b":3122}]},{"name":"campaignId","required":false,"transform":{"type":"scalar"},"locs":[{"a":151,"b":161},{"a":339,"b":349},{"a":543,"b":553},{"a":778,"b":788},{"a":1115,"b":1125},{"a":1367,"b":1377},{"a":1937,"b":1947},{"a":2209,"b":2219},{"a":2499,"b":2509},{"a":3146,"b":3156}]}],"statement":"WITH stopped_campaign AS (\n  UPDATE campaigns\n  SET status = 'stopped',\n      updated_at = now()\n  WHERE project_id = :projectId\n    AND campaign_id = :campaignId\n  RETURNING campaign_id\n),\nstopped_promotions AS (\n  UPDATE promotions\n  SET status = 'stopped',\n      updated_at = now()\n  WHERE project_id = :projectId\n    AND campaign_id = :campaignId\n    AND status <> 'stopped'\n  RETURNING promotion_id\n),\nstopped_segments AS (\n  UPDATE promotion_target_segments\n  SET status = 'stopped'\n  WHERE project_id = :projectId\n    AND campaign_id = :campaignId\n    AND status <> 'stopped'\n  RETURNING segment_id\n),\narchived_segment_definitions AS (\n  UPDATE segment_definitions\n  SET status = 'archived',\n      updated_at = now()\n  WHERE project_id = :projectId\n    AND campaign_id = :campaignId\n    AND source IN ('custom_chatkit', 'manual_rule')\n    AND status = 'active'\n  RETURNING segment_id\n),\ndismissed_suggestions AS (\n  UPDATE promotion_segment_suggestions\n  SET status = 'dismissed',\n      decided_at = COALESCE(decided_at, now()),\n      updated_at = now()\n  WHERE project_id = :projectId\n    AND campaign_id = :campaignId\n    AND status IN ('suggested', 'accepted')\n  RETURNING suggestion_id\n),\narchived_content_candidates AS (\n  UPDATE content_candidates\n  SET status = 'archived',\n      updated_at = now()\n  WHERE project_id = :projectId\n    AND campaign_id = :campaignId\n    AND status IN ('draft', 'approved', 'active')\n  RETURNING content_id\n),\nfailed_generation_runs AS (\n  UPDATE generation_runs\n  SET status = 'failed',\n      started_at = COALESCE(started_at, now()),\n      finished_at = now(),\n      next_retry_at = NULL,\n      last_error_code = 'generation_invalidated_by_campaign_stop',\n      last_error_message = 'campaign stopped',\n      worker_id = NULL,\n      lease_token = NULL,\n      heartbeat_at = NULL,\n      lease_expires_at = NULL,\n      updated_at = now()\n  WHERE project_id = :projectId\n    AND campaign_id = :campaignId\n    AND status IN ('requested', 'running')\n  RETURNING generation_id\n),\ncancelled_dispatch_jobs AS (\n  UPDATE ad_dispatch_jobs\n  SET status = 'cancelled',\n      completed_at = COALESCE(completed_at, now())\n  WHERE project_id = :projectId\n    AND campaign_id = :campaignId\n    AND status IN ('queued', 'scheduled', 'running')\n  RETURNING ad_dispatch_job_id\n),\nstopped_runs AS (\n  UPDATE promotion_runs\n  SET status = 'stopped',\n      ended_at = COALESCE(ended_at, now()),\n      updated_at = now()\n  WHERE project_id = :projectId\n    AND campaign_id = :campaignId\n    AND status <> 'stopped'\n  RETURNING promotion_run_id\n),\ncancelled_automation_jobs AS (\n  UPDATE promotion_automation_jobs\n  SET status = 'cancelled',\n      worker_id = NULL,\n      lease_token = NULL,\n      locked_at = NULL,\n      lease_expires_at = NULL,\n      updated_at = now()\n  WHERE promotion_run_id IN (\n      SELECT promotion_run_id\n      FROM stopped_runs\n    )\n    AND status IN ('pending', 'running')\n  RETURNING job_id\n),\nstopped_experiments AS (\n  UPDATE ad_experiments\n  SET status = 'stopped',\n      ended_at = COALESCE(ended_at, now()),\n      updated_at = now()\n  WHERE project_id = :projectId\n    AND campaign_id = :campaignId\n    AND status <> 'stopped'\n  RETURNING ad_experiment_id\n)\nSELECT campaign_id AS \"campaignId\", 'deleted'::text AS status\nFROM stopped_campaign                                     "};

/**
 * Query generated from SQL:
 * ```
 * WITH stopped_campaign AS (
 *   UPDATE campaigns
 *   SET status = 'stopped',
 *       updated_at = now()
 *   WHERE project_id = :projectId
 *     AND campaign_id = :campaignId
 *   RETURNING campaign_id
 * ),
 * stopped_promotions AS (
 *   UPDATE promotions
 *   SET status = 'stopped',
 *       updated_at = now()
 *   WHERE project_id = :projectId
 *     AND campaign_id = :campaignId
 *     AND status <> 'stopped'
 *   RETURNING promotion_id
 * ),
 * stopped_segments AS (
 *   UPDATE promotion_target_segments
 *   SET status = 'stopped'
 *   WHERE project_id = :projectId
 *     AND campaign_id = :campaignId
 *     AND status <> 'stopped'
 *   RETURNING segment_id
 * ),
 * archived_segment_definitions AS (
 *   UPDATE segment_definitions
 *   SET status = 'archived',
 *       updated_at = now()
 *   WHERE project_id = :projectId
 *     AND campaign_id = :campaignId
 *     AND source IN ('custom_chatkit', 'manual_rule')
 *     AND status = 'active'
 *   RETURNING segment_id
 * ),
 * dismissed_suggestions AS (
 *   UPDATE promotion_segment_suggestions
 *   SET status = 'dismissed',
 *       decided_at = COALESCE(decided_at, now()),
 *       updated_at = now()
 *   WHERE project_id = :projectId
 *     AND campaign_id = :campaignId
 *     AND status IN ('suggested', 'accepted')
 *   RETURNING suggestion_id
 * ),
 * archived_content_candidates AS (
 *   UPDATE content_candidates
 *   SET status = 'archived',
 *       updated_at = now()
 *   WHERE project_id = :projectId
 *     AND campaign_id = :campaignId
 *     AND status IN ('draft', 'approved', 'active')
 *   RETURNING content_id
 * ),
 * failed_generation_runs AS (
 *   UPDATE generation_runs
 *   SET status = 'failed',
 *       started_at = COALESCE(started_at, now()),
 *       finished_at = now(),
 *       next_retry_at = NULL,
 *       last_error_code = 'generation_invalidated_by_campaign_stop',
 *       last_error_message = 'campaign stopped',
 *       worker_id = NULL,
 *       lease_token = NULL,
 *       heartbeat_at = NULL,
 *       lease_expires_at = NULL,
 *       updated_at = now()
 *   WHERE project_id = :projectId
 *     AND campaign_id = :campaignId
 *     AND status IN ('requested', 'running')
 *   RETURNING generation_id
 * ),
 * cancelled_dispatch_jobs AS (
 *   UPDATE ad_dispatch_jobs
 *   SET status = 'cancelled',
 *       completed_at = COALESCE(completed_at, now())
 *   WHERE project_id = :projectId
 *     AND campaign_id = :campaignId
 *     AND status IN ('queued', 'scheduled', 'running')
 *   RETURNING ad_dispatch_job_id
 * ),
 * stopped_runs AS (
 *   UPDATE promotion_runs
 *   SET status = 'stopped',
 *       ended_at = COALESCE(ended_at, now()),
 *       updated_at = now()
 *   WHERE project_id = :projectId
 *     AND campaign_id = :campaignId
 *     AND status <> 'stopped'
 *   RETURNING promotion_run_id
 * ),
 * cancelled_automation_jobs AS (
 *   UPDATE promotion_automation_jobs
 *   SET status = 'cancelled',
 *       worker_id = NULL,
 *       lease_token = NULL,
 *       locked_at = NULL,
 *       lease_expires_at = NULL,
 *       updated_at = now()
 *   WHERE promotion_run_id IN (
 *       SELECT promotion_run_id
 *       FROM stopped_runs
 *     )
 *     AND status IN ('pending', 'running')
 *   RETURNING job_id
 * ),
 * stopped_experiments AS (
 *   UPDATE ad_experiments
 *   SET status = 'stopped',
 *       ended_at = COALESCE(ended_at, now()),
 *       updated_at = now()
 *   WHERE project_id = :projectId
 *     AND campaign_id = :campaignId
 *     AND status <> 'stopped'
 *   RETURNING ad_experiment_id
 * )
 * SELECT campaign_id AS "campaignId", 'deleted'::text AS status
 * FROM stopped_campaign
 * ```
 */
export const deleteDashboardCampaign = new PreparedQuery<IDeleteDashboardCampaignParams,IDeleteDashboardCampaignResult>(deleteDashboardCampaignIR);


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
  executionMode: string;
  goalBasis: string;
  goalMetric: string;
  goalTargetValue: number | null;
  landingType: string | null;
  landingUrl: string | null;
  latestActualValue: number | null;
  loopIntervalUnit: string;
  loopIntervalValue: number;
  marketingTheme: string;
  maxLoopCount: number;
  messageBrief: string | null;
  minSampleSize: number;
  nextAction: string | null;
  offerLinks: Json | null;
  offerType: string | null;
  promotionId: string;
  scheduledEndAt: Date | null;
  scheduledStartAt: Date | null;
  status: string;
  targetSegmentCount: number | null;
  updatedAt: Date;
}

/** 'ListDashboardCampaignPromotions' query type */
export interface IListDashboardCampaignPromotionsQuery {
  params: IListDashboardCampaignPromotionsParams;
  result: IListDashboardCampaignPromotionsResult;
}

const listDashboardCampaignPromotionsIR: any = {"usedParamSet":{"projectId":true,"campaignId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":2094,"b":2103}]},{"name":"campaignId","required":false,"transform":{"type":"scalar"},"locs":[{"a":2127,"b":2137}]}],"statement":"SELECT\n  p.promotion_id AS \"promotionId\",\n  p.channel,\n  p.marketing_theme AS \"marketingTheme\",\n  p.goal_metric AS \"goalMetric\",\n  CAST(p.goal_target_value AS float8) AS \"goalTargetValue\",\n  p.goal_basis AS \"goalBasis\",\n  p.min_sample_size AS \"minSampleSize\",\n  p.max_loop_count AS \"maxLoopCount\",\n  COALESCE(MAX(pr.loop_count), 0)::int AS \"currentLoopCount\",\n  p.execution_mode AS \"executionMode\",\n  p.scheduled_start_at AS \"scheduledStartAt\",\n  p.scheduled_end_at AS \"scheduledEndAt\",\n  p.loop_interval_unit AS \"loopIntervalUnit\",\n  p.loop_interval_value AS \"loopIntervalValue\",\n  p.message_brief AS \"messageBrief\",\n  p.offer_type AS \"offerType\",\n  COALESCE(p.metadata_json -> 'offer_links', '[]'::jsonb) AS \"offerLinks\",\n  p.landing_url AS \"landingUrl\",\n  p.landing_type AS \"landingType\",\n  p.status,\n  COUNT(DISTINCT pts.segment_id)::int AS \"targetSegmentCount\",\n  COUNT(DISTINCT ae.ad_experiment_id) FILTER (\n    WHERE ae.segment_id <> 'seg_existing_all'\n  )::int AS \"adExperimentCount\",\n  CAST(MAX(pe.actual_value) AS float8) AS \"latestActualValue\",\n  CASE\n    WHEN p.status = 'draft' THEN 'complete_plan'\n    WHEN COUNT(DISTINCT pts.segment_id) = 0 THEN 'attach_segment'\n    WHEN COUNT(DISTINCT ae.ad_experiment_id) FILTER (\n      WHERE ae.segment_id <> 'seg_existing_all'\n    ) = 0 THEN 'approve_content'\n    WHEN COUNT(*) FILTER (WHERE pe.next_loop_required) > 0 THEN 'next_loop'\n    ELSE 'monitor'\n  END AS \"nextAction\",\n  p.updated_at AS \"updatedAt\"\nFROM promotions p\nLEFT JOIN promotion_runs pr\n  ON pr.project_id = p.project_id\n AND pr.promotion_id = p.promotion_id\n AND pr.status <> 'stopped'\nLEFT JOIN promotion_target_segments pts\n  ON pts.project_id = p.project_id\n AND pts.promotion_id = p.promotion_id\n AND pts.status <> 'stopped'\nLEFT JOIN ad_experiments ae\n  ON ae.project_id = p.project_id\n AND ae.promotion_id = p.promotion_id\n AND ae.status <> 'stopped'\nLEFT JOIN promotion_evaluations pe\n  ON pe.project_id = p.project_id\n AND pe.promotion_id = p.promotion_id\n AND pe.ad_experiment_id = ae.ad_experiment_id\n AND pe.segment_id <> 'seg_existing_all'\nWHERE p.project_id = :projectId\n  AND p.campaign_id = :campaignId\n  AND p.status <> 'stopped'\nGROUP BY p.promotion_id\nORDER BY p.updated_at DESC, p.created_at DESC                                       "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   p.promotion_id AS "promotionId",
 *   p.channel,
 *   p.marketing_theme AS "marketingTheme",
 *   p.goal_metric AS "goalMetric",
 *   CAST(p.goal_target_value AS float8) AS "goalTargetValue",
 *   p.goal_basis AS "goalBasis",
 *   p.min_sample_size AS "minSampleSize",
 *   p.max_loop_count AS "maxLoopCount",
 *   COALESCE(MAX(pr.loop_count), 0)::int AS "currentLoopCount",
 *   p.execution_mode AS "executionMode",
 *   p.scheduled_start_at AS "scheduledStartAt",
 *   p.scheduled_end_at AS "scheduledEndAt",
 *   p.loop_interval_unit AS "loopIntervalUnit",
 *   p.loop_interval_value AS "loopIntervalValue",
 *   p.message_brief AS "messageBrief",
 *   p.offer_type AS "offerType",
 *   COALESCE(p.metadata_json -> 'offer_links', '[]'::jsonb) AS "offerLinks",
 *   p.landing_url AS "landingUrl",
 *   p.landing_type AS "landingType",
 *   p.status,
 *   COUNT(DISTINCT pts.segment_id)::int AS "targetSegmentCount",
 *   COUNT(DISTINCT ae.ad_experiment_id) FILTER (
 *     WHERE ae.segment_id <> 'seg_existing_all'
 *   )::int AS "adExperimentCount",
 *   CAST(MAX(pe.actual_value) AS float8) AS "latestActualValue",
 *   CASE
 *     WHEN p.status = 'draft' THEN 'complete_plan'
 *     WHEN COUNT(DISTINCT pts.segment_id) = 0 THEN 'attach_segment'
 *     WHEN COUNT(DISTINCT ae.ad_experiment_id) FILTER (
 *       WHERE ae.segment_id <> 'seg_existing_all'
 *     ) = 0 THEN 'approve_content'
 *     WHEN COUNT(*) FILTER (WHERE pe.next_loop_required) > 0 THEN 'next_loop'
 *     ELSE 'monitor'
 *   END AS "nextAction",
 *   p.updated_at AS "updatedAt"
 * FROM promotions p
 * LEFT JOIN promotion_runs pr
 *   ON pr.project_id = p.project_id
 *  AND pr.promotion_id = p.promotion_id
 *  AND pr.status <> 'stopped'
 * LEFT JOIN promotion_target_segments pts
 *   ON pts.project_id = p.project_id
 *  AND pts.promotion_id = p.promotion_id
 *  AND pts.status <> 'stopped'
 * LEFT JOIN ad_experiments ae
 *   ON ae.project_id = p.project_id
 *  AND ae.promotion_id = p.promotion_id
 *  AND ae.status <> 'stopped'
 * LEFT JOIN promotion_evaluations pe
 *   ON pe.project_id = p.project_id
 *  AND pe.promotion_id = p.promotion_id
 *  AND pe.ad_experiment_id = ae.ad_experiment_id
 *  AND pe.segment_id <> 'seg_existing_all'
 * WHERE p.project_id = :projectId
 *   AND p.campaign_id = :campaignId
 *   AND p.status <> 'stopped'
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
  executionMode: string;
  goalBasis: string;
  goalMetric: string;
  goalTargetValue: number | null;
  landingType: string | null;
  landingUrl: string | null;
  latestActualValue: number | null;
  loopIntervalUnit: string;
  loopIntervalValue: number;
  marketingTheme: string;
  maxLoopCount: number;
  messageBrief: string | null;
  minSampleSize: number;
  nextAction: string | null;
  offerLinks: Json | null;
  offerType: string | null;
  promotionId: string;
  scheduledEndAt: Date | null;
  scheduledStartAt: Date | null;
  status: string;
  targetSegmentCount: number | null;
  updatedAt: Date;
}

/** 'GetDashboardPromotionSummary' query type */
export interface IGetDashboardPromotionSummaryQuery {
  params: IGetDashboardPromotionSummaryParams;
  result: IGetDashboardPromotionSummaryResult;
}

const getDashboardPromotionSummaryIR: any = {"usedParamSet":{"projectId":true,"promotionId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":2127,"b":2136}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":2161,"b":2172}]}],"statement":"SELECT\n  p.promotion_id AS \"promotionId\",\n  p.campaign_id AS \"campaignId\",\n  p.channel,\n  p.marketing_theme AS \"marketingTheme\",\n  p.goal_metric AS \"goalMetric\",\n  CAST(p.goal_target_value AS float8) AS \"goalTargetValue\",\n  p.goal_basis AS \"goalBasis\",\n  p.min_sample_size AS \"minSampleSize\",\n  p.max_loop_count AS \"maxLoopCount\",\n  COALESCE(MAX(pr.loop_count), 0)::int AS \"currentLoopCount\",\n  p.execution_mode AS \"executionMode\",\n  p.scheduled_start_at AS \"scheduledStartAt\",\n  p.scheduled_end_at AS \"scheduledEndAt\",\n  p.loop_interval_unit AS \"loopIntervalUnit\",\n  p.loop_interval_value AS \"loopIntervalValue\",\n  p.message_brief AS \"messageBrief\",\n  p.offer_type AS \"offerType\",\n  COALESCE(p.metadata_json -> 'offer_links', '[]'::jsonb) AS \"offerLinks\",\n  p.landing_url AS \"landingUrl\",\n  p.landing_type AS \"landingType\",\n  p.status,\n  COUNT(DISTINCT pts.segment_id)::int AS \"targetSegmentCount\",\n  COUNT(DISTINCT ae.ad_experiment_id) FILTER (\n    WHERE ae.segment_id <> 'seg_existing_all'\n  )::int AS \"adExperimentCount\",\n  CAST(MAX(pe.actual_value) AS float8) AS \"latestActualValue\",\n  CASE\n    WHEN p.status = 'draft' THEN 'complete_plan'\n    WHEN COUNT(DISTINCT pts.segment_id) = 0 THEN 'attach_segment'\n    WHEN COUNT(DISTINCT ae.ad_experiment_id) FILTER (\n      WHERE ae.segment_id <> 'seg_existing_all'\n    ) = 0 THEN 'approve_content'\n    WHEN COUNT(*) FILTER (WHERE pe.next_loop_required) > 0 THEN 'next_loop'\n    ELSE 'monitor'\n  END AS \"nextAction\",\n  p.updated_at AS \"updatedAt\"\nFROM promotions p\nLEFT JOIN promotion_runs pr\n  ON pr.project_id = p.project_id\n AND pr.promotion_id = p.promotion_id\n AND pr.status <> 'stopped'\nLEFT JOIN promotion_target_segments pts\n  ON pts.project_id = p.project_id\n AND pts.promotion_id = p.promotion_id\n AND pts.status <> 'stopped'\nLEFT JOIN ad_experiments ae\n  ON ae.project_id = p.project_id\n AND ae.promotion_id = p.promotion_id\n AND ae.status <> 'stopped'\nLEFT JOIN promotion_evaluations pe\n  ON pe.project_id = p.project_id\n AND pe.promotion_id = p.promotion_id\n AND pe.ad_experiment_id = ae.ad_experiment_id\n AND pe.segment_id <> 'seg_existing_all'\nWHERE p.project_id = :projectId\n  AND p.promotion_id = :promotionId\n  AND p.status <> 'stopped'\n\nGROUP BY p.promotion_id                             "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   p.promotion_id AS "promotionId",
 *   p.campaign_id AS "campaignId",
 *   p.channel,
 *   p.marketing_theme AS "marketingTheme",
 *   p.goal_metric AS "goalMetric",
 *   CAST(p.goal_target_value AS float8) AS "goalTargetValue",
 *   p.goal_basis AS "goalBasis",
 *   p.min_sample_size AS "minSampleSize",
 *   p.max_loop_count AS "maxLoopCount",
 *   COALESCE(MAX(pr.loop_count), 0)::int AS "currentLoopCount",
 *   p.execution_mode AS "executionMode",
 *   p.scheduled_start_at AS "scheduledStartAt",
 *   p.scheduled_end_at AS "scheduledEndAt",
 *   p.loop_interval_unit AS "loopIntervalUnit",
 *   p.loop_interval_value AS "loopIntervalValue",
 *   p.message_brief AS "messageBrief",
 *   p.offer_type AS "offerType",
 *   COALESCE(p.metadata_json -> 'offer_links', '[]'::jsonb) AS "offerLinks",
 *   p.landing_url AS "landingUrl",
 *   p.landing_type AS "landingType",
 *   p.status,
 *   COUNT(DISTINCT pts.segment_id)::int AS "targetSegmentCount",
 *   COUNT(DISTINCT ae.ad_experiment_id) FILTER (
 *     WHERE ae.segment_id <> 'seg_existing_all'
 *   )::int AS "adExperimentCount",
 *   CAST(MAX(pe.actual_value) AS float8) AS "latestActualValue",
 *   CASE
 *     WHEN p.status = 'draft' THEN 'complete_plan'
 *     WHEN COUNT(DISTINCT pts.segment_id) = 0 THEN 'attach_segment'
 *     WHEN COUNT(DISTINCT ae.ad_experiment_id) FILTER (
 *       WHERE ae.segment_id <> 'seg_existing_all'
 *     ) = 0 THEN 'approve_content'
 *     WHEN COUNT(*) FILTER (WHERE pe.next_loop_required) > 0 THEN 'next_loop'
 *     ELSE 'monitor'
 *   END AS "nextAction",
 *   p.updated_at AS "updatedAt"
 * FROM promotions p
 * LEFT JOIN promotion_runs pr
 *   ON pr.project_id = p.project_id
 *  AND pr.promotion_id = p.promotion_id
 *  AND pr.status <> 'stopped'
 * LEFT JOIN promotion_target_segments pts
 *   ON pts.project_id = p.project_id
 *  AND pts.promotion_id = p.promotion_id
 *  AND pts.status <> 'stopped'
 * LEFT JOIN ad_experiments ae
 *   ON ae.project_id = p.project_id
 *  AND ae.promotion_id = p.promotion_id
 *  AND ae.status <> 'stopped'
 * LEFT JOIN promotion_evaluations pe
 *   ON pe.project_id = p.project_id
 *  AND pe.promotion_id = p.promotion_id
 *  AND pe.ad_experiment_id = ae.ad_experiment_id
 *  AND pe.segment_id <> 'seg_existing_all'
 * WHERE p.project_id = :projectId
 *   AND p.promotion_id = :promotionId
 *   AND p.status <> 'stopped'
 *
 * GROUP BY p.promotion_id
 * ```
 */
export const getDashboardPromotionSummary = new PreparedQuery<IGetDashboardPromotionSummaryParams,IGetDashboardPromotionSummaryResult>(getDashboardPromotionSummaryIR);


/** 'InsertDashboardPromotion' parameters type */
export interface IInsertDashboardPromotionParams {
  campaignId?: string | null | void;
  channel?: string | null | void;
  executionMode?: string | null | void;
  goalBasis?: string | null | void;
  goalMetric?: string | null | void;
  goalTargetValue?: NumberOrString | null | void;
  landingType?: string | null | void;
  landingUrl?: string | null | void;
  loopIntervalUnit?: string | null | void;
  loopIntervalValue?: number | null | void;
  marketingTheme?: string | null | void;
  maxLoopCount?: number | null | void;
  messageBrief?: string | null | void;
  minSampleSize?: number | null | void;
  offerLinksIsSet?: boolean | null | void;
  offerLinksJson?: Json | null | void;
  offerType?: string | null | void;
  projectId?: string | null | void;
  promotionId?: string | null | void;
  scheduledEndAt?: DateOrString | null | void;
  scheduledStartAt?: DateOrString | null | void;
  status?: string | null | void;
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

const insertDashboardPromotionIR: any = {"usedParamSet":{"promotionId":true,"channel":true,"marketingTheme":true,"goalMetric":true,"goalTargetValue":true,"goalBasis":true,"minSampleSize":true,"maxLoopCount":true,"executionMode":true,"scheduledStartAt":true,"scheduledEndAt":true,"loopIntervalUnit":true,"loopIntervalValue":true,"messageBrief":true,"offerType":true,"offerLinksIsSet":true,"offerLinksJson":true,"landingUrl":true,"landingType":true,"status":true,"projectId":true,"campaignId":true},"params":[{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":391,"b":402}]},{"name":"channel","required":false,"transform":{"type":"scalar"},"locs":[{"a":440,"b":447}]},{"name":"marketingTheme","required":false,"transform":{"type":"scalar"},"locs":[{"a":452,"b":466}]},{"name":"goalMetric","required":false,"transform":{"type":"scalar"},"locs":[{"a":471,"b":481}]},{"name":"goalTargetValue","required":false,"transform":{"type":"scalar"},"locs":[{"a":486,"b":501}]},{"name":"goalBasis","required":false,"transform":{"type":"scalar"},"locs":[{"a":506,"b":515}]},{"name":"minSampleSize","required":false,"transform":{"type":"scalar"},"locs":[{"a":520,"b":533}]},{"name":"maxLoopCount","required":false,"transform":{"type":"scalar"},"locs":[{"a":538,"b":550}]},{"name":"executionMode","required":false,"transform":{"type":"scalar"},"locs":[{"a":555,"b":568}]},{"name":"scheduledStartAt","required":false,"transform":{"type":"scalar"},"locs":[{"a":573,"b":589}]},{"name":"scheduledEndAt","required":false,"transform":{"type":"scalar"},"locs":[{"a":594,"b":608}]},{"name":"loopIntervalUnit","required":false,"transform":{"type":"scalar"},"locs":[{"a":613,"b":629}]},{"name":"loopIntervalValue","required":false,"transform":{"type":"scalar"},"locs":[{"a":634,"b":651}]},{"name":"messageBrief","required":false,"transform":{"type":"scalar"},"locs":[{"a":656,"b":668}]},{"name":"offerType","required":false,"transform":{"type":"scalar"},"locs":[{"a":673,"b":682}]},{"name":"offerLinksIsSet","required":false,"transform":{"type":"scalar"},"locs":[{"a":701,"b":716}]},{"name":"offerLinksJson","required":false,"transform":{"type":"scalar"},"locs":[{"a":757,"b":771}]},{"name":"landingUrl","required":false,"transform":{"type":"scalar"},"locs":[{"a":811,"b":821}]},{"name":"landingType","required":false,"transform":{"type":"scalar"},"locs":[{"a":826,"b":837}]},{"name":"status","required":false,"transform":{"type":"scalar"},"locs":[{"a":842,"b":848}]},{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":888,"b":897}]},{"name":"campaignId","required":false,"transform":{"type":"scalar"},"locs":[{"a":921,"b":931}]}],"statement":"INSERT INTO promotions (\n  promotion_id,\n  project_id,\n  campaign_id,\n  channel,\n  marketing_theme,\n  goal_metric,\n  goal_target_value,\n  goal_basis,\n  min_sample_size,\n  max_loop_count,\n  execution_mode,\n  scheduled_start_at,\n  scheduled_end_at,\n  loop_interval_unit,\n  loop_interval_value,\n  message_brief,\n  offer_type,\n  metadata_json,\n  landing_url,\n  landing_type,\n  status\n)\nSELECT\n  :promotionId,\n  c.project_id,\n  c.campaign_id,\n  :channel,\n  :marketingTheme,\n  :goalMetric,\n  :goalTargetValue,\n  :goalBasis,\n  :minSampleSize,\n  :maxLoopCount,\n  :executionMode,\n  :scheduledStartAt,\n  :scheduledEndAt,\n  :loopIntervalUnit,\n  :loopIntervalValue,\n  :messageBrief,\n  :offerType,\n  CASE\n    WHEN :offerLinksIsSet THEN jsonb_build_object('offer_links', :offerLinksJson::jsonb)\n    ELSE '{}'::jsonb\n  END,\n  :landingUrl,\n  :landingType,\n  :status\nFROM campaigns c\nWHERE c.project_id = :projectId\n  AND c.campaign_id = :campaignId\n  AND c.status NOT IN ('completed', 'stopped')\n  AND (\n    c.end_date IS NULL\n    OR (c.end_date + 1)::timestamp AT TIME ZONE 'Asia/Seoul' > now()\n  )\nRETURNING promotion_id AS \"promotionId\"                            "};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO promotions (
 *   promotion_id,
 *   project_id,
 *   campaign_id,
 *   channel,
 *   marketing_theme,
 *   goal_metric,
 *   goal_target_value,
 *   goal_basis,
 *   min_sample_size,
 *   max_loop_count,
 *   execution_mode,
 *   scheduled_start_at,
 *   scheduled_end_at,
 *   loop_interval_unit,
 *   loop_interval_value,
 *   message_brief,
 *   offer_type,
 *   metadata_json,
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
 *   :goalMetric,
 *   :goalTargetValue,
 *   :goalBasis,
 *   :minSampleSize,
 *   :maxLoopCount,
 *   :executionMode,
 *   :scheduledStartAt,
 *   :scheduledEndAt,
 *   :loopIntervalUnit,
 *   :loopIntervalValue,
 *   :messageBrief,
 *   :offerType,
 *   CASE
 *     WHEN :offerLinksIsSet THEN jsonb_build_object('offer_links', :offerLinksJson::jsonb)
 *     ELSE '{}'::jsonb
 *   END,
 *   :landingUrl,
 *   :landingType,
 *   :status
 * FROM campaigns c
 * WHERE c.project_id = :projectId
 *   AND c.campaign_id = :campaignId
 *   AND c.status NOT IN ('completed', 'stopped')
 *   AND (
 *     c.end_date IS NULL
 *     OR (c.end_date + 1)::timestamp AT TIME ZONE 'Asia/Seoul' > now()
 *   )
 * RETURNING promotion_id AS "promotionId"
 * ```
 */
export const insertDashboardPromotion = new PreparedQuery<IInsertDashboardPromotionParams,IInsertDashboardPromotionResult>(insertDashboardPromotionIR);


/** 'UpdateDashboardPromotion' parameters type */
export interface IUpdateDashboardPromotionParams {
  channel?: string | null | void;
  executionMode?: string | null | void;
  goalBasis?: string | null | void;
  goalMetric?: string | null | void;
  goalTargetValue?: NumberOrString | null | void;
  landingType?: string | null | void;
  landingTypeIsSet?: boolean | null | void;
  landingUrl?: string | null | void;
  landingUrlIsSet?: boolean | null | void;
  loopIntervalUnit?: string | null | void;
  loopIntervalValue?: number | null | void;
  marketingTheme?: string | null | void;
  maxLoopCount?: number | null | void;
  messageBrief?: string | null | void;
  messageBriefIsSet?: boolean | null | void;
  minSampleSize?: number | null | void;
  offerLinksIsSet?: boolean | null | void;
  offerLinksJson?: Json | null | void;
  offerType?: string | null | void;
  offerTypeIsSet?: boolean | null | void;
  projectId?: string | null | void;
  promotionId?: string | null | void;
  scheduledEndAt?: DateOrString | null | void;
  scheduledEndAtIsSet?: boolean | null | void;
  scheduledStartAt?: DateOrString | null | void;
  scheduledStartAtIsSet?: boolean | null | void;
  status?: string | null | void;
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

const updateDashboardPromotionIR: any = {"usedParamSet":{"channel":true,"marketingTheme":true,"goalMetric":true,"goalTargetValue":true,"goalBasis":true,"minSampleSize":true,"maxLoopCount":true,"executionMode":true,"scheduledStartAtIsSet":true,"scheduledStartAt":true,"scheduledEndAtIsSet":true,"scheduledEndAt":true,"loopIntervalUnit":true,"loopIntervalValue":true,"messageBriefIsSet":true,"messageBrief":true,"offerTypeIsSet":true,"offerType":true,"offerLinksIsSet":true,"offerLinksJson":true,"landingUrlIsSet":true,"landingUrl":true,"landingTypeIsSet":true,"landingType":true,"status":true,"projectId":true,"promotionId":true},"params":[{"name":"channel","required":false,"transform":{"type":"scalar"},"locs":[{"a":43,"b":50}]},{"name":"marketingTheme","required":false,"transform":{"type":"scalar"},"locs":[{"a":92,"b":106}]},{"name":"goalMetric","required":false,"transform":{"type":"scalar"},"locs":[{"a":152,"b":162}]},{"name":"goalTargetValue","required":false,"transform":{"type":"scalar"},"locs":[{"a":210,"b":225}]},{"name":"goalBasis","required":false,"transform":{"type":"scalar"},"locs":[{"a":272,"b":281}]},{"name":"minSampleSize","required":false,"transform":{"type":"scalar"},"locs":[{"a":326,"b":339}]},{"name":"maxLoopCount","required":false,"transform":{"type":"scalar"},"locs":[{"a":388,"b":400}]},{"name":"executionMode","required":false,"transform":{"type":"scalar"},"locs":[{"a":448,"b":461}]},{"name":"scheduledStartAtIsSet","required":false,"transform":{"type":"scalar"},"locs":[{"a":518,"b":539}]},{"name":"scheduledStartAt","required":false,"transform":{"type":"scalar"},"locs":[{"a":546,"b":562}]},{"name":"scheduledEndAtIsSet","required":false,"transform":{"type":"scalar"},"locs":[{"a":634,"b":653}]},{"name":"scheduledEndAt","required":false,"transform":{"type":"scalar"},"locs":[{"a":660,"b":674}]},{"name":"loopIntervalUnit","required":false,"transform":{"type":"scalar"},"locs":[{"a":741,"b":757}]},{"name":"loopIntervalValue","required":false,"transform":{"type":"scalar"},"locs":[{"a":814,"b":831}]},{"name":"messageBriefIsSet","required":false,"transform":{"type":"scalar"},"locs":[{"a":884,"b":901}]},{"name":"messageBrief","required":false,"transform":{"type":"scalar"},"locs":[{"a":908,"b":920}]},{"name":"offerTypeIsSet","required":false,"transform":{"type":"scalar"},"locs":[{"a":971,"b":985}]},{"name":"offerType","required":false,"transform":{"type":"scalar"},"locs":[{"a":992,"b":1001}]},{"name":"offerLinksIsSet","required":false,"transform":{"type":"scalar"},"locs":[{"a":1056,"b":1071}]},{"name":"offerLinksJson","required":false,"transform":{"type":"scalar"},"locs":[{"a":1126,"b":1140}]},{"name":"landingUrlIsSet","required":false,"transform":{"type":"scalar"},"locs":[{"a":1212,"b":1227}]},{"name":"landingUrl","required":false,"transform":{"type":"scalar"},"locs":[{"a":1234,"b":1244}]},{"name":"landingTypeIsSet","required":false,"transform":{"type":"scalar"},"locs":[{"a":1295,"b":1311}]},{"name":"landingType","required":false,"transform":{"type":"scalar"},"locs":[{"a":1318,"b":1329}]},{"name":"status","required":false,"transform":{"type":"scalar"},"locs":[{"a":1374,"b":1380}]},{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1432,"b":1441}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1464,"b":1475}]}],"statement":"UPDATE promotions\nSET\n  channel = COALESCE(:channel, channel),\n  marketing_theme = COALESCE(:marketingTheme, marketing_theme),\n  goal_metric = COALESCE(:goalMetric, goal_metric),\n  goal_target_value = COALESCE(:goalTargetValue, goal_target_value),\n  goal_basis = COALESCE(:goalBasis, goal_basis),\n  min_sample_size = COALESCE(:minSampleSize, min_sample_size),\n  max_loop_count = COALESCE(:maxLoopCount, max_loop_count),\n  execution_mode = COALESCE(:executionMode, execution_mode),\n  scheduled_start_at = CASE\n    WHEN :scheduledStartAtIsSet THEN :scheduledStartAt\n    ELSE scheduled_start_at\n  END,\n  scheduled_end_at = CASE\n    WHEN :scheduledEndAtIsSet THEN :scheduledEndAt\n    ELSE scheduled_end_at\n  END,\n  loop_interval_unit = COALESCE(:loopIntervalUnit, loop_interval_unit),\n  loop_interval_value = COALESCE(:loopIntervalValue, loop_interval_value),\n  message_brief = CASE WHEN :messageBriefIsSet THEN :messageBrief ELSE message_brief END,\n  offer_type = CASE WHEN :offerTypeIsSet THEN :offerType ELSE offer_type END,\n  metadata_json = CASE\n    WHEN :offerLinksIsSet\n      THEN jsonb_set(metadata_json, '{offer_links}', :offerLinksJson::jsonb, true)\n    ELSE metadata_json\n  END,\n  landing_url = CASE WHEN :landingUrlIsSet THEN :landingUrl ELSE landing_url END,\n  landing_type = CASE WHEN :landingTypeIsSet THEN :landingType ELSE landing_type END,\n  status = COALESCE(:status, status),\n  updated_at = now()\nWHERE project_id = :projectId\n  AND promotion_id = :promotionId\n  AND status <> 'stopped'\nRETURNING promotion_id AS \"promotionId\"                                                "};

/**
 * Query generated from SQL:
 * ```
 * UPDATE promotions
 * SET
 *   channel = COALESCE(:channel, channel),
 *   marketing_theme = COALESCE(:marketingTheme, marketing_theme),
 *   goal_metric = COALESCE(:goalMetric, goal_metric),
 *   goal_target_value = COALESCE(:goalTargetValue, goal_target_value),
 *   goal_basis = COALESCE(:goalBasis, goal_basis),
 *   min_sample_size = COALESCE(:minSampleSize, min_sample_size),
 *   max_loop_count = COALESCE(:maxLoopCount, max_loop_count),
 *   execution_mode = COALESCE(:executionMode, execution_mode),
 *   scheduled_start_at = CASE
 *     WHEN :scheduledStartAtIsSet THEN :scheduledStartAt
 *     ELSE scheduled_start_at
 *   END,
 *   scheduled_end_at = CASE
 *     WHEN :scheduledEndAtIsSet THEN :scheduledEndAt
 *     ELSE scheduled_end_at
 *   END,
 *   loop_interval_unit = COALESCE(:loopIntervalUnit, loop_interval_unit),
 *   loop_interval_value = COALESCE(:loopIntervalValue, loop_interval_value),
 *   message_brief = CASE WHEN :messageBriefIsSet THEN :messageBrief ELSE message_brief END,
 *   offer_type = CASE WHEN :offerTypeIsSet THEN :offerType ELSE offer_type END,
 *   metadata_json = CASE
 *     WHEN :offerLinksIsSet
 *       THEN jsonb_set(metadata_json, '{offer_links}', :offerLinksJson::jsonb, true)
 *     ELSE metadata_json
 *   END,
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

const stopDashboardPromotionIR: any = {"usedParamSet":{"projectId":true,"promotionId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":120,"b":129},{"a":306,"b":315},{"a":543,"b":552},{"a":882,"b":891},{"a":1136,"b":1145},{"a":1414,"b":1423},{"a":1706,"b":1715},{"a":2355,"b":2364}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":154,"b":165},{"a":340,"b":351},{"a":577,"b":588},{"a":916,"b":927},{"a":1170,"b":1181},{"a":1448,"b":1459},{"a":1740,"b":1751},{"a":2389,"b":2400}]}],"statement":"WITH stopped_promotion AS (\n  UPDATE promotions\n  SET status = 'stopped',\n      updated_at = now()\n  WHERE project_id = :projectId\n    AND promotion_id = :promotionId\n  RETURNING promotion_id, status\n),\nstopped_segments AS (\n  UPDATE promotion_target_segments\n  SET status = 'stopped'\n  WHERE project_id = :projectId\n    AND promotion_id = :promotionId\n    AND status <> 'stopped'\n  RETURNING segment_id\n),\narchived_segment_definitions AS (\n  UPDATE segment_definitions\n  SET status = 'archived',\n      updated_at = now()\n  WHERE project_id = :projectId\n    AND promotion_id = :promotionId\n    AND source IN ('custom_chatkit', 'manual_rule')\n    AND status = 'active'\n  RETURNING segment_id\n),\ndismissed_suggestions AS (\n  UPDATE promotion_segment_suggestions\n  SET status = 'dismissed',\n      decided_at = COALESCE(decided_at, now()),\n      updated_at = now()\n  WHERE project_id = :projectId\n    AND promotion_id = :promotionId\n    AND status IN ('suggested', 'accepted')\n  RETURNING suggestion_id\n),\narchived_content_candidates AS (\n  UPDATE content_candidates\n  SET status = 'archived',\n      updated_at = now()\n  WHERE project_id = :projectId\n    AND promotion_id = :promotionId\n    AND status IN ('draft', 'approved', 'active')\n  RETURNING content_id\n),\ncancelled_dispatch_jobs AS (\n  UPDATE ad_dispatch_jobs\n  SET status = 'cancelled',\n      completed_at = COALESCE(completed_at, now())\n  WHERE project_id = :projectId\n    AND promotion_id = :promotionId\n    AND status IN ('queued', 'scheduled', 'running')\n  RETURNING ad_dispatch_job_id\n),\nstopped_runs AS (\n  UPDATE promotion_runs\n  SET status = 'stopped',\n      ended_at = COALESCE(ended_at, now()),\n      updated_at = now()\n  WHERE project_id = :projectId\n    AND promotion_id = :promotionId\n    AND status <> 'stopped'\n  RETURNING promotion_run_id\n),\ncancelled_automation_jobs AS (\n  UPDATE promotion_automation_jobs\n  SET status = 'cancelled',\n      worker_id = NULL,\n      lease_token = NULL,\n      locked_at = NULL,\n      lease_expires_at = NULL,\n      updated_at = now()\n  WHERE promotion_run_id IN (\n      SELECT promotion_run_id\n      FROM stopped_runs\n    )\n    AND status IN ('pending', 'running')\n  RETURNING job_id\n),\nstopped_experiments AS (\n  UPDATE ad_experiments\n  SET status = 'stopped',\n      ended_at = COALESCE(ended_at, now()),\n      updated_at = now()\n  WHERE project_id = :projectId\n    AND promotion_id = :promotionId\n    AND status <> 'stopped'\n  RETURNING ad_experiment_id\n)\nSELECT promotion_id AS \"promotionId\", status\nFROM stopped_promotion                                       "};

/**
 * Query generated from SQL:
 * ```
 * WITH stopped_promotion AS (
 *   UPDATE promotions
 *   SET status = 'stopped',
 *       updated_at = now()
 *   WHERE project_id = :projectId
 *     AND promotion_id = :promotionId
 *   RETURNING promotion_id, status
 * ),
 * stopped_segments AS (
 *   UPDATE promotion_target_segments
 *   SET status = 'stopped'
 *   WHERE project_id = :projectId
 *     AND promotion_id = :promotionId
 *     AND status <> 'stopped'
 *   RETURNING segment_id
 * ),
 * archived_segment_definitions AS (
 *   UPDATE segment_definitions
 *   SET status = 'archived',
 *       updated_at = now()
 *   WHERE project_id = :projectId
 *     AND promotion_id = :promotionId
 *     AND source IN ('custom_chatkit', 'manual_rule')
 *     AND status = 'active'
 *   RETURNING segment_id
 * ),
 * dismissed_suggestions AS (
 *   UPDATE promotion_segment_suggestions
 *   SET status = 'dismissed',
 *       decided_at = COALESCE(decided_at, now()),
 *       updated_at = now()
 *   WHERE project_id = :projectId
 *     AND promotion_id = :promotionId
 *     AND status IN ('suggested', 'accepted')
 *   RETURNING suggestion_id
 * ),
 * archived_content_candidates AS (
 *   UPDATE content_candidates
 *   SET status = 'archived',
 *       updated_at = now()
 *   WHERE project_id = :projectId
 *     AND promotion_id = :promotionId
 *     AND status IN ('draft', 'approved', 'active')
 *   RETURNING content_id
 * ),
 * cancelled_dispatch_jobs AS (
 *   UPDATE ad_dispatch_jobs
 *   SET status = 'cancelled',
 *       completed_at = COALESCE(completed_at, now())
 *   WHERE project_id = :projectId
 *     AND promotion_id = :promotionId
 *     AND status IN ('queued', 'scheduled', 'running')
 *   RETURNING ad_dispatch_job_id
 * ),
 * stopped_runs AS (
 *   UPDATE promotion_runs
 *   SET status = 'stopped',
 *       ended_at = COALESCE(ended_at, now()),
 *       updated_at = now()
 *   WHERE project_id = :projectId
 *     AND promotion_id = :promotionId
 *     AND status <> 'stopped'
 *   RETURNING promotion_run_id
 * ),
 * cancelled_automation_jobs AS (
 *   UPDATE promotion_automation_jobs
 *   SET status = 'cancelled',
 *       worker_id = NULL,
 *       lease_token = NULL,
 *       locked_at = NULL,
 *       lease_expires_at = NULL,
 *       updated_at = now()
 *   WHERE promotion_run_id IN (
 *       SELECT promotion_run_id
 *       FROM stopped_runs
 *     )
 *     AND status IN ('pending', 'running')
 *   RETURNING job_id
 * ),
 * stopped_experiments AS (
 *   UPDATE ad_experiments
 *   SET status = 'stopped',
 *       ended_at = COALESCE(ended_at, now()),
 *       updated_at = now()
 *   WHERE project_id = :projectId
 *     AND promotion_id = :promotionId
 *     AND status <> 'stopped'
 *   RETURNING ad_experiment_id
 * )
 * SELECT promotion_id AS "promotionId", status
 * FROM stopped_promotion
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
  allocationPlanId: string | null;
  analysisId: string;
  audienceMeetsMinSampleSize: boolean;
  audienceMinSampleSize: number;
  audienceReservationState: string | null;
  audienceSnapshotId: string | null;
  audienceSnapshotKind: string;
  audienceSnapshotStatus: string;
  audienceStatus: string;
  contentBriefJson: Json;
  dataEvidenceJson: Json;
  estimatedSize: number;
  finalUserCount: number;
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
  sourceAudienceSnapshotId: string | null;
  status: string;
  totalEligibleUserCount: number;
}

/** 'ListDashboardCampaignSegments' query type */
export interface IListDashboardCampaignSegmentsQuery {
  params: IListDashboardCampaignSegmentsParams;
  result: IListDashboardCampaignSegmentsResult;
}

const listDashboardCampaignSegmentsIR: any = {"usedParamSet":{"projectId":true,"campaignId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":2429,"b":2438}]},{"name":"campaignId","required":false,"transform":{"type":"scalar"},"locs":[{"a":2464,"b":2474}]}],"statement":"SELECT\n  pts.analysis_id AS \"analysisId\",\n  pts.audience_snapshot_id AS \"audienceSnapshotId\",\n  CAST(pts.allocation_plan_id AS varchar) AS \"allocationPlanId\",\n  pts.audience_reservation_state AS \"audienceReservationState\",\n  audience_snapshot.snapshot_kind AS \"audienceSnapshotKind\",\n  audience_snapshot.final_user_count AS \"finalUserCount\",\n  audience_snapshot.min_sample_size AS \"audienceMinSampleSize\",\n  audience_snapshot.meets_min_sample_size AS \"audienceMeetsMinSampleSize\",\n  audience_snapshot.audience_status AS \"audienceStatus\",\n  audience_snapshot.status AS \"audienceSnapshotStatus\",\n  audience_snapshot.source_snapshot_id AS \"sourceAudienceSnapshotId\",\n  pts.promotion_id AS \"promotionId\",\n  pts.segment_id AS \"segmentId\",\n  pts.segment_name AS \"segmentName\",\n  sd.source,\n  sd.natural_language_query AS \"naturalLanguageQuery\",\n  pts.rule_json AS \"ruleJson\",\n  pts.profile_json AS \"profileJson\",\n  pts.content_brief_json AS \"contentBriefJson\",\n  pts.data_evidence_json AS \"dataEvidenceJson\",\n  pts.estimated_size AS \"estimatedSize\",\n  sd.sample_size AS \"sampleSize\",\n  sd.total_eligible_user_count AS \"totalEligibleUserCount\",\n  CAST(sd.sample_ratio AS float8) AS \"sampleRatio\",\n  p.goal_metric AS \"goalMetric\",\n  CAST(MAX(pe.actual_value) AS float8) AS \"latestActualValue\",\n  MAX(ae.ad_experiment_id) AS \"adExperimentId\",\n  CASE\n    WHEN pts.status = 'planned' THEN 'create_content'\n    WHEN COUNT(DISTINCT ae.ad_experiment_id) = 0 THEN 'approve_content'\n    WHEN COUNT(*) FILTER (WHERE pe.status = 'insufficient_data') > 0 THEN 'review_sample'\n    WHEN COUNT(*) FILTER (WHERE pe.next_loop_required) > 0 THEN 'next_loop'\n    ELSE 'monitor'\n  END AS \"nextAction\",\n  pts.priority,\n  pts.status\nFROM promotion_target_segments pts\nLEFT JOIN segment_definitions sd\n  ON sd.segment_id = pts.segment_id\nLEFT JOIN segment_audience_snapshots audience_snapshot\n  ON audience_snapshot.snapshot_id = pts.audience_snapshot_id\nJOIN promotions p\n  ON p.project_id = pts.project_id\n AND p.promotion_id = pts.promotion_id\n AND p.status <> 'stopped'\nLEFT JOIN ad_experiments ae\n  ON ae.project_id = pts.project_id\n AND ae.promotion_id = pts.promotion_id\n AND ae.segment_id = pts.segment_id\n AND ae.status <> 'stopped'\nLEFT JOIN promotion_evaluations pe\n  ON pe.project_id = pts.project_id\n AND pe.promotion_id = pts.promotion_id\n AND pe.segment_id = pts.segment_id\n AND pe.ad_experiment_id = ae.ad_experiment_id\nWHERE pts.project_id = :projectId\n  AND pts.campaign_id = :campaignId\n  AND pts.status <> 'stopped'\nGROUP BY\n  pts.analysis_id,\n  pts.audience_snapshot_id,\n  pts.allocation_plan_id,\n  pts.audience_reservation_state,\n  audience_snapshot.snapshot_kind,\n  audience_snapshot.final_user_count,\n  audience_snapshot.min_sample_size,\n  audience_snapshot.meets_min_sample_size,\n  audience_snapshot.audience_status,\n  audience_snapshot.status,\n  audience_snapshot.source_snapshot_id,\n  pts.promotion_id,\n  pts.segment_id,\n  pts.segment_name,\n  sd.source,\n  sd.natural_language_query,\n  pts.rule_json,\n  pts.profile_json,\n  pts.content_brief_json,\n  pts.data_evidence_json,\n  pts.estimated_size,\n  sd.sample_size,\n  sd.total_eligible_user_count,\n  sd.sample_ratio,\n  p.goal_metric,\n  pts.priority,\n  pts.status,\n  pts.created_at\nORDER BY pts.promotion_id ASC, pts.created_at DESC                                   "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   pts.analysis_id AS "analysisId",
 *   pts.audience_snapshot_id AS "audienceSnapshotId",
 *   CAST(pts.allocation_plan_id AS varchar) AS "allocationPlanId",
 *   pts.audience_reservation_state AS "audienceReservationState",
 *   audience_snapshot.snapshot_kind AS "audienceSnapshotKind",
 *   audience_snapshot.final_user_count AS "finalUserCount",
 *   audience_snapshot.min_sample_size AS "audienceMinSampleSize",
 *   audience_snapshot.meets_min_sample_size AS "audienceMeetsMinSampleSize",
 *   audience_snapshot.audience_status AS "audienceStatus",
 *   audience_snapshot.status AS "audienceSnapshotStatus",
 *   audience_snapshot.source_snapshot_id AS "sourceAudienceSnapshotId",
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
 *   CAST(sd.sample_ratio AS float8) AS "sampleRatio",
 *   p.goal_metric AS "goalMetric",
 *   CAST(MAX(pe.actual_value) AS float8) AS "latestActualValue",
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
 * LEFT JOIN segment_definitions sd
 *   ON sd.segment_id = pts.segment_id
 * LEFT JOIN segment_audience_snapshots audience_snapshot
 *   ON audience_snapshot.snapshot_id = pts.audience_snapshot_id
 * JOIN promotions p
 *   ON p.project_id = pts.project_id
 *  AND p.promotion_id = pts.promotion_id
 *  AND p.status <> 'stopped'
 * LEFT JOIN ad_experiments ae
 *   ON ae.project_id = pts.project_id
 *  AND ae.promotion_id = pts.promotion_id
 *  AND ae.segment_id = pts.segment_id
 *  AND ae.status <> 'stopped'
 * LEFT JOIN promotion_evaluations pe
 *   ON pe.project_id = pts.project_id
 *  AND pe.promotion_id = pts.promotion_id
 *  AND pe.segment_id = pts.segment_id
 *  AND pe.ad_experiment_id = ae.ad_experiment_id
 * WHERE pts.project_id = :projectId
 *   AND pts.campaign_id = :campaignId
 *   AND pts.status <> 'stopped'
 * GROUP BY
 *   pts.analysis_id,
 *   pts.audience_snapshot_id,
 *   pts.allocation_plan_id,
 *   pts.audience_reservation_state,
 *   audience_snapshot.snapshot_kind,
 *   audience_snapshot.final_user_count,
 *   audience_snapshot.min_sample_size,
 *   audience_snapshot.meets_min_sample_size,
 *   audience_snapshot.audience_status,
 *   audience_snapshot.status,
 *   audience_snapshot.source_snapshot_id,
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
  allocationPlanId: string | null;
  analysisId: string;
  audienceMeetsMinSampleSize: boolean;
  audienceMinSampleSize: number;
  audienceReservationState: string | null;
  audienceSnapshotId: string | null;
  audienceSnapshotKind: string;
  audienceSnapshotStatus: string;
  audienceStatus: string;
  contentBriefJson: Json;
  dataEvidenceJson: Json;
  estimatedSize: number;
  finalUserCount: number;
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
  sourceAudienceSnapshotId: string | null;
  status: string;
  totalEligibleUserCount: number;
}

/** 'ListDashboardPromotionSegments' query type */
export interface IListDashboardPromotionSegmentsQuery {
  params: IListDashboardPromotionSegmentsParams;
  result: IListDashboardPromotionSegmentsResult;
}

const listDashboardPromotionSegmentsIR: any = {"usedParamSet":{"projectId":true,"promotionId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":2429,"b":2438}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":2465,"b":2476}]}],"statement":"SELECT\n  pts.analysis_id AS \"analysisId\",\n  pts.audience_snapshot_id AS \"audienceSnapshotId\",\n  CAST(pts.allocation_plan_id AS varchar) AS \"allocationPlanId\",\n  pts.audience_reservation_state AS \"audienceReservationState\",\n  audience_snapshot.snapshot_kind AS \"audienceSnapshotKind\",\n  audience_snapshot.final_user_count AS \"finalUserCount\",\n  audience_snapshot.min_sample_size AS \"audienceMinSampleSize\",\n  audience_snapshot.meets_min_sample_size AS \"audienceMeetsMinSampleSize\",\n  audience_snapshot.audience_status AS \"audienceStatus\",\n  audience_snapshot.status AS \"audienceSnapshotStatus\",\n  audience_snapshot.source_snapshot_id AS \"sourceAudienceSnapshotId\",\n  pts.promotion_id AS \"promotionId\",\n  pts.segment_id AS \"segmentId\",\n  pts.segment_name AS \"segmentName\",\n  sd.source,\n  sd.natural_language_query AS \"naturalLanguageQuery\",\n  pts.rule_json AS \"ruleJson\",\n  pts.profile_json AS \"profileJson\",\n  pts.content_brief_json AS \"contentBriefJson\",\n  pts.data_evidence_json AS \"dataEvidenceJson\",\n  pts.estimated_size AS \"estimatedSize\",\n  sd.sample_size AS \"sampleSize\",\n  sd.total_eligible_user_count AS \"totalEligibleUserCount\",\n  CAST(sd.sample_ratio AS float8) AS \"sampleRatio\",\n  p.goal_metric AS \"goalMetric\",\n  CAST(MAX(pe.actual_value) AS float8) AS \"latestActualValue\",\n  MAX(ae.ad_experiment_id) AS \"adExperimentId\",\n  CASE\n    WHEN pts.status = 'planned' THEN 'create_content'\n    WHEN COUNT(DISTINCT ae.ad_experiment_id) = 0 THEN 'approve_content'\n    WHEN COUNT(*) FILTER (WHERE pe.status = 'insufficient_data') > 0 THEN 'review_sample'\n    WHEN COUNT(*) FILTER (WHERE pe.next_loop_required) > 0 THEN 'next_loop'\n    ELSE 'monitor'\n  END AS \"nextAction\",\n  pts.priority,\n  pts.status\nFROM promotion_target_segments pts\nLEFT JOIN segment_definitions sd\n  ON sd.segment_id = pts.segment_id\nLEFT JOIN segment_audience_snapshots audience_snapshot\n  ON audience_snapshot.snapshot_id = pts.audience_snapshot_id\nJOIN promotions p\n  ON p.project_id = pts.project_id\n AND p.promotion_id = pts.promotion_id\n AND p.status <> 'stopped'\nLEFT JOIN ad_experiments ae\n  ON ae.project_id = pts.project_id\n AND ae.promotion_id = pts.promotion_id\n AND ae.segment_id = pts.segment_id\n AND ae.status <> 'stopped'\nLEFT JOIN promotion_evaluations pe\n  ON pe.project_id = pts.project_id\n AND pe.promotion_id = pts.promotion_id\n AND pe.segment_id = pts.segment_id\n AND pe.ad_experiment_id = ae.ad_experiment_id\nWHERE pts.project_id = :projectId\n  AND pts.promotion_id = :promotionId\n  AND pts.status <> 'stopped'\nGROUP BY\n  pts.analysis_id,\n  pts.audience_snapshot_id,\n  pts.allocation_plan_id,\n  pts.audience_reservation_state,\n  audience_snapshot.snapshot_kind,\n  audience_snapshot.final_user_count,\n  audience_snapshot.min_sample_size,\n  audience_snapshot.meets_min_sample_size,\n  audience_snapshot.audience_status,\n  audience_snapshot.status,\n  audience_snapshot.source_snapshot_id,\n  pts.promotion_id,\n  pts.segment_id,\n  pts.segment_name,\n  sd.source,\n  sd.natural_language_query,\n  pts.rule_json,\n  pts.profile_json,\n  pts.content_brief_json,\n  pts.data_evidence_json,\n  pts.estimated_size,\n  sd.sample_size,\n  sd.total_eligible_user_count,\n  sd.sample_ratio,\n  p.goal_metric,\n  pts.priority,\n  pts.status,\n  pts.created_at\nORDER BY pts.created_at DESC                                    "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   pts.analysis_id AS "analysisId",
 *   pts.audience_snapshot_id AS "audienceSnapshotId",
 *   CAST(pts.allocation_plan_id AS varchar) AS "allocationPlanId",
 *   pts.audience_reservation_state AS "audienceReservationState",
 *   audience_snapshot.snapshot_kind AS "audienceSnapshotKind",
 *   audience_snapshot.final_user_count AS "finalUserCount",
 *   audience_snapshot.min_sample_size AS "audienceMinSampleSize",
 *   audience_snapshot.meets_min_sample_size AS "audienceMeetsMinSampleSize",
 *   audience_snapshot.audience_status AS "audienceStatus",
 *   audience_snapshot.status AS "audienceSnapshotStatus",
 *   audience_snapshot.source_snapshot_id AS "sourceAudienceSnapshotId",
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
 *   CAST(sd.sample_ratio AS float8) AS "sampleRatio",
 *   p.goal_metric AS "goalMetric",
 *   CAST(MAX(pe.actual_value) AS float8) AS "latestActualValue",
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
 * LEFT JOIN segment_definitions sd
 *   ON sd.segment_id = pts.segment_id
 * LEFT JOIN segment_audience_snapshots audience_snapshot
 *   ON audience_snapshot.snapshot_id = pts.audience_snapshot_id
 * JOIN promotions p
 *   ON p.project_id = pts.project_id
 *  AND p.promotion_id = pts.promotion_id
 *  AND p.status <> 'stopped'
 * LEFT JOIN ad_experiments ae
 *   ON ae.project_id = pts.project_id
 *  AND ae.promotion_id = pts.promotion_id
 *  AND ae.segment_id = pts.segment_id
 *  AND ae.status <> 'stopped'
 * LEFT JOIN promotion_evaluations pe
 *   ON pe.project_id = pts.project_id
 *  AND pe.promotion_id = pts.promotion_id
 *  AND pe.segment_id = pts.segment_id
 *  AND pe.ad_experiment_id = ae.ad_experiment_id
 * WHERE pts.project_id = :projectId
 *   AND pts.promotion_id = :promotionId
 *   AND pts.status <> 'stopped'
 * GROUP BY
 *   pts.analysis_id,
 *   pts.audience_snapshot_id,
 *   pts.allocation_plan_id,
 *   pts.audience_reservation_state,
 *   audience_snapshot.snapshot_kind,
 *   audience_snapshot.final_user_count,
 *   audience_snapshot.min_sample_size,
 *   audience_snapshot.meets_min_sample_size,
 *   audience_snapshot.audience_status,
 *   audience_snapshot.status,
 *   audience_snapshot.source_snapshot_id,
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
  allocationPlanId: string | null;
  analysisId: string;
  audienceMeetsMinSampleSize: boolean;
  audienceMinSampleSize: number;
  audienceReservationState: string | null;
  audienceSnapshotId: string | null;
  audienceSnapshotKind: string;
  audienceSnapshotStatus: string;
  audienceStatus: string;
  contentBriefJson: Json;
  dataEvidenceJson: Json;
  estimatedSize: number;
  finalUserCount: number;
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
  sourceAudienceSnapshotId: string | null;
  status: string;
  totalEligibleUserCount: number;
}

/** 'GetDashboardPromotionSegment' query type */
export interface IGetDashboardPromotionSegmentQuery {
  params: IGetDashboardPromotionSegmentParams;
  result: IGetDashboardPromotionSegmentResult;
}

const getDashboardPromotionSegmentIR: any = {"usedParamSet":{"projectId":true,"promotionId":true,"segmentId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":2429,"b":2438}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":2465,"b":2476}]},{"name":"segmentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":2501,"b":2510}]}],"statement":"SELECT\n  pts.analysis_id AS \"analysisId\",\n  pts.audience_snapshot_id AS \"audienceSnapshotId\",\n  CAST(pts.allocation_plan_id AS varchar) AS \"allocationPlanId\",\n  pts.audience_reservation_state AS \"audienceReservationState\",\n  audience_snapshot.snapshot_kind AS \"audienceSnapshotKind\",\n  audience_snapshot.final_user_count AS \"finalUserCount\",\n  audience_snapshot.min_sample_size AS \"audienceMinSampleSize\",\n  audience_snapshot.meets_min_sample_size AS \"audienceMeetsMinSampleSize\",\n  audience_snapshot.audience_status AS \"audienceStatus\",\n  audience_snapshot.status AS \"audienceSnapshotStatus\",\n  audience_snapshot.source_snapshot_id AS \"sourceAudienceSnapshotId\",\n  pts.promotion_id AS \"promotionId\",\n  pts.segment_id AS \"segmentId\",\n  pts.segment_name AS \"segmentName\",\n  sd.source,\n  sd.natural_language_query AS \"naturalLanguageQuery\",\n  pts.rule_json AS \"ruleJson\",\n  pts.profile_json AS \"profileJson\",\n  pts.content_brief_json AS \"contentBriefJson\",\n  pts.data_evidence_json AS \"dataEvidenceJson\",\n  pts.estimated_size AS \"estimatedSize\",\n  sd.sample_size AS \"sampleSize\",\n  sd.total_eligible_user_count AS \"totalEligibleUserCount\",\n  CAST(sd.sample_ratio AS float8) AS \"sampleRatio\",\n  p.goal_metric AS \"goalMetric\",\n  CAST(MAX(pe.actual_value) AS float8) AS \"latestActualValue\",\n  MAX(ae.ad_experiment_id) AS \"adExperimentId\",\n  CASE\n    WHEN pts.status = 'planned' THEN 'create_content'\n    WHEN COUNT(DISTINCT ae.ad_experiment_id) = 0 THEN 'approve_content'\n    WHEN COUNT(*) FILTER (WHERE pe.status = 'insufficient_data') > 0 THEN 'review_sample'\n    WHEN COUNT(*) FILTER (WHERE pe.next_loop_required) > 0 THEN 'next_loop'\n    ELSE 'monitor'\n  END AS \"nextAction\",\n  pts.priority,\n  pts.status\nFROM promotion_target_segments pts\nLEFT JOIN segment_definitions sd\n  ON sd.segment_id = pts.segment_id\nLEFT JOIN segment_audience_snapshots audience_snapshot\n  ON audience_snapshot.snapshot_id = pts.audience_snapshot_id\nJOIN promotions p\n  ON p.project_id = pts.project_id\n AND p.promotion_id = pts.promotion_id\n AND p.status <> 'stopped'\nLEFT JOIN ad_experiments ae\n  ON ae.project_id = pts.project_id\n AND ae.promotion_id = pts.promotion_id\n AND ae.segment_id = pts.segment_id\n AND ae.status <> 'stopped'\nLEFT JOIN promotion_evaluations pe\n  ON pe.project_id = pts.project_id\n AND pe.promotion_id = pts.promotion_id\n AND pe.segment_id = pts.segment_id\n AND pe.ad_experiment_id = ae.ad_experiment_id\nWHERE pts.project_id = :projectId\n  AND pts.promotion_id = :promotionId\n  AND pts.segment_id = :segmentId\n  AND pts.status <> 'stopped'\n\nGROUP BY\n  pts.analysis_id,\n  pts.audience_snapshot_id,\n  pts.allocation_plan_id,\n  pts.audience_reservation_state,\n  audience_snapshot.snapshot_kind,\n  audience_snapshot.final_user_count,\n  audience_snapshot.min_sample_size,\n  audience_snapshot.meets_min_sample_size,\n  audience_snapshot.audience_status,\n  audience_snapshot.status,\n  audience_snapshot.source_snapshot_id,\n  pts.promotion_id,\n  pts.segment_id,\n  pts.segment_name,\n  sd.source,\n  sd.natural_language_query,\n  pts.rule_json,\n  pts.profile_json,\n  pts.content_brief_json,\n  pts.data_evidence_json,\n  pts.estimated_size,\n  sd.sample_size,\n  sd.total_eligible_user_count,\n  sd.sample_ratio,\n  p.goal_metric,\n  pts.priority,\n  pts.status,\n  pts.created_at\nORDER BY pts.created_at DESC\nLIMIT 1                                              "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   pts.analysis_id AS "analysisId",
 *   pts.audience_snapshot_id AS "audienceSnapshotId",
 *   CAST(pts.allocation_plan_id AS varchar) AS "allocationPlanId",
 *   pts.audience_reservation_state AS "audienceReservationState",
 *   audience_snapshot.snapshot_kind AS "audienceSnapshotKind",
 *   audience_snapshot.final_user_count AS "finalUserCount",
 *   audience_snapshot.min_sample_size AS "audienceMinSampleSize",
 *   audience_snapshot.meets_min_sample_size AS "audienceMeetsMinSampleSize",
 *   audience_snapshot.audience_status AS "audienceStatus",
 *   audience_snapshot.status AS "audienceSnapshotStatus",
 *   audience_snapshot.source_snapshot_id AS "sourceAudienceSnapshotId",
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
 *   CAST(sd.sample_ratio AS float8) AS "sampleRatio",
 *   p.goal_metric AS "goalMetric",
 *   CAST(MAX(pe.actual_value) AS float8) AS "latestActualValue",
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
 * LEFT JOIN segment_definitions sd
 *   ON sd.segment_id = pts.segment_id
 * LEFT JOIN segment_audience_snapshots audience_snapshot
 *   ON audience_snapshot.snapshot_id = pts.audience_snapshot_id
 * JOIN promotions p
 *   ON p.project_id = pts.project_id
 *  AND p.promotion_id = pts.promotion_id
 *  AND p.status <> 'stopped'
 * LEFT JOIN ad_experiments ae
 *   ON ae.project_id = pts.project_id
 *  AND ae.promotion_id = pts.promotion_id
 *  AND ae.segment_id = pts.segment_id
 *  AND ae.status <> 'stopped'
 * LEFT JOIN promotion_evaluations pe
 *   ON pe.project_id = pts.project_id
 *  AND pe.promotion_id = pts.promotion_id
 *  AND pe.segment_id = pts.segment_id
 *  AND pe.ad_experiment_id = ae.ad_experiment_id
 * WHERE pts.project_id = :projectId
 *   AND pts.promotion_id = :promotionId
 *   AND pts.segment_id = :segmentId
 *   AND pts.status <> 'stopped'
 *
 * GROUP BY
 *   pts.analysis_id,
 *   pts.audience_snapshot_id,
 *   pts.allocation_plan_id,
 *   pts.audience_reservation_state,
 *   audience_snapshot.snapshot_kind,
 *   audience_snapshot.final_user_count,
 *   audience_snapshot.min_sample_size,
 *   audience_snapshot.meets_min_sample_size,
 *   audience_snapshot.audience_status,
 *   audience_snapshot.status,
 *   audience_snapshot.source_snapshot_id,
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
 * LIMIT 1
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

const insertDashboardManualPromotionAnalysisIR: any = {"usedParamSet":{"analysisId":true,"projectId":true,"campaignId":true,"promotionId":true},"params":[{"name":"analysisId","required":false,"transform":{"type":"scalar"},"locs":[{"a":139,"b":149}]},{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":154,"b":163}]},{"name":"campaignId","required":false,"transform":{"type":"scalar"},"locs":[{"a":168,"b":178}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":183,"b":194}]}],"statement":"INSERT INTO promotion_analyses (\n  analysis_id,\n  project_id,\n  campaign_id,\n  promotion_id,\n  operator_instruction,\n  status\n)\nVALUES (\n  :analysisId,\n  :projectId,\n  :campaignId,\n  :promotionId,\n  'dashboard_manual_segment_attach',\n  'completed'\n)\nON CONFLICT (analysis_id) DO UPDATE\nSET status = 'completed'\nRETURNING analysis_id AS \"analysisId\"                                        "};

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
 * ON CONFLICT (analysis_id) DO UPDATE
 * SET status = 'completed'
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

const insertDashboardPromotionTargetSegmentIR: any = {"usedParamSet":{"analysisId":true,"campaignId":true,"promotionId":true,"segmentName":true,"priority":true,"status":true,"projectId":true,"segmentId":true},"params":[{"name":"analysisId","required":false,"transform":{"type":"scalar"},"locs":[{"a":254,"b":264}]},{"name":"campaignId","required":false,"transform":{"type":"scalar"},"locs":[{"a":297,"b":307},{"a":932,"b":942}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":323,"b":334},{"a":1039,"b":1050},{"a":1253,"b":1264}]},{"name":"segmentName","required":false,"transform":{"type":"scalar"},"locs":[{"a":375,"b":386}]},{"name":"priority","required":false,"transform":{"type":"scalar"},"locs":[{"a":645,"b":653}]},{"name":"status","required":false,"transform":{"type":"scalar"},"locs":[{"a":658,"b":664}]},{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":716,"b":725},{"a":895,"b":904},{"a":1001,"b":1010},{"a":1204,"b":1213}]},{"name":"segmentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":749,"b":758},{"a":1302,"b":1311}]}],"statement":"INSERT INTO promotion_target_segments (\n  analysis_id,\n  project_id,\n  campaign_id,\n  promotion_id,\n  segment_id,\n  segment_name,\n  rule_json,\n  profile_json,\n  content_brief_json,\n  data_evidence_json,\n  estimated_size,\n  priority,\n  status\n)\nSELECT\n  (:analysisId)::varchar,\n  sd.project_id,\n  (:campaignId)::varchar,\n  (:promotionId)::varchar,\n  sd.segment_id,\n  COALESCE(:segmentName, sd.segment_name),\n  sd.rule_json,\n  sd.profile_json,\n  '{}'::jsonb,\n  jsonb_build_object(\n    'source', sd.source,\n    'query_preview_id', sd.query_preview_id,\n    'sample_size', sd.sample_size,\n    'sample_ratio', sd.sample_ratio\n  ),\n  sd.sample_size,\n  :priority,\n  :status\nFROM segment_definitions sd\nWHERE sd.project_id = :projectId\n  AND sd.segment_id = :segmentId\n  AND EXISTS (\n    SELECT 1\n    FROM campaigns c\n    JOIN promotions p\n      ON p.campaign_id = c.campaign_id\n    WHERE c.project_id = :projectId\n      AND c.campaign_id = :campaignId\n      AND c.status <> 'stopped'\n      AND p.project_id = :projectId\n      AND p.promotion_id = :promotionId\n      AND p.status <> 'stopped'\n  )\n  AND NOT EXISTS (\n    SELECT 1\n    FROM promotion_target_segments existing_pts\n    WHERE existing_pts.project_id = :projectId\n      AND existing_pts.promotion_id = :promotionId\n      AND existing_pts.segment_id = :segmentId\n      AND existing_pts.status <> 'stopped'\n  )\nRETURNING promotion_id AS \"promotionId\", segment_id AS \"segmentId\"                                          "};

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


/** 'ListDashboardPromotionScopedSegmentDefinitions' parameters type */
export interface IListDashboardPromotionScopedSegmentDefinitionsParams {
  projectId?: string | null | void;
  promotionId?: string | null | void;
}

/** 'ListDashboardPromotionScopedSegmentDefinitions' return type */
export interface IListDashboardPromotionScopedSegmentDefinitionsResult {
  campaignId: string | null;
  generatedSql: string | null;
  naturalLanguageQuery: string | null;
  profileJson: Json;
  promotionId: string | null;
  queryPreviewId: string | null;
  ruleJson: Json;
  sampleRatio: number | null;
  sampleSize: number;
  segmentId: string;
  segmentName: string;
  source: string;
  status: string;
  totalEligibleUserCount: number;
}

/** 'ListDashboardPromotionScopedSegmentDefinitions' query type */
export interface IListDashboardPromotionScopedSegmentDefinitionsQuery {
  params: IListDashboardPromotionScopedSegmentDefinitionsParams;
  result: IListDashboardPromotionScopedSegmentDefinitionsResult;
}

const listDashboardPromotionScopedSegmentDefinitionsIR: any = {"usedParamSet":{"projectId":true,"promotionId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":520,"b":529}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":552,"b":563}]}],"statement":"SELECT\n  segment_id AS \"segmentId\",\n  campaign_id AS \"campaignId\",\n  promotion_id AS \"promotionId\",\n  segment_name AS \"segmentName\",\n  source,\n  query_preview_id AS \"queryPreviewId\",\n  natural_language_query AS \"naturalLanguageQuery\",\n  generated_sql AS \"generatedSql\",\n  rule_json AS \"ruleJson\",\n  profile_json AS \"profileJson\",\n  sample_size AS \"sampleSize\",\n  total_eligible_user_count AS \"totalEligibleUserCount\",\n  CAST(sample_ratio AS float8) AS \"sampleRatio\",\n  status\nFROM segment_definitions\nWHERE project_id = :projectId\n  AND promotion_id = :promotionId\n  AND source IN ('custom_chatkit', 'manual_rule')\n  AND status = 'active'\nORDER BY created_at DESC                                             "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   segment_id AS "segmentId",
 *   campaign_id AS "campaignId",
 *   promotion_id AS "promotionId",
 *   segment_name AS "segmentName",
 *   source,
 *   query_preview_id AS "queryPreviewId",
 *   natural_language_query AS "naturalLanguageQuery",
 *   generated_sql AS "generatedSql",
 *   rule_json AS "ruleJson",
 *   profile_json AS "profileJson",
 *   sample_size AS "sampleSize",
 *   total_eligible_user_count AS "totalEligibleUserCount",
 *   CAST(sample_ratio AS float8) AS "sampleRatio",
 *   status
 * FROM segment_definitions
 * WHERE project_id = :projectId
 *   AND promotion_id = :promotionId
 *   AND source IN ('custom_chatkit', 'manual_rule')
 *   AND status = 'active'
 * ORDER BY created_at DESC
 * ```
 */
export const listDashboardPromotionScopedSegmentDefinitions = new PreparedQuery<IListDashboardPromotionScopedSegmentDefinitionsParams,IListDashboardPromotionScopedSegmentDefinitionsResult>(listDashboardPromotionScopedSegmentDefinitionsIR);


/** 'ArchiveDashboardPromotionScopedSegmentDefinition' parameters type */
export interface IArchiveDashboardPromotionScopedSegmentDefinitionParams {
  projectId?: string | null | void;
  promotionId?: string | null | void;
  segmentId?: string | null | void;
}

/** 'ArchiveDashboardPromotionScopedSegmentDefinition' return type */
export interface IArchiveDashboardPromotionScopedSegmentDefinitionResult {
  promotionId: string | null;
  segmentId: string;
  status: string;
}

/** 'ArchiveDashboardPromotionScopedSegmentDefinition' query type */
export interface IArchiveDashboardPromotionScopedSegmentDefinitionQuery {
  params: IArchiveDashboardPromotionScopedSegmentDefinitionParams;
  result: IArchiveDashboardPromotionScopedSegmentDefinitionResult;
}

const archiveDashboardPromotionScopedSegmentDefinitionIR: any = {"usedParamSet":{"projectId":true,"promotionId":true,"segmentId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":94,"b":103}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":126,"b":137}]},{"name":"segmentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":158,"b":167}]}],"statement":"UPDATE segment_definitions\nSET status = 'archived',\n    updated_at = now()\nWHERE project_id = :projectId\n  AND promotion_id = :promotionId\n  AND segment_id = :segmentId\n  AND source IN ('custom_chatkit', 'manual_rule')\n  AND status = 'active'\nRETURNING promotion_id AS \"promotionId\", segment_id AS \"segmentId\", status                                                          "};

/**
 * Query generated from SQL:
 * ```
 * UPDATE segment_definitions
 * SET status = 'archived',
 *     updated_at = now()
 * WHERE project_id = :projectId
 *   AND promotion_id = :promotionId
 *   AND segment_id = :segmentId
 *   AND source IN ('custom_chatkit', 'manual_rule')
 *   AND status = 'active'
 * RETURNING promotion_id AS "promotionId", segment_id AS "segmentId", status
 * ```
 */
export const archiveDashboardPromotionScopedSegmentDefinition = new PreparedQuery<IArchiveDashboardPromotionScopedSegmentDefinitionParams,IArchiveDashboardPromotionScopedSegmentDefinitionResult>(archiveDashboardPromotionScopedSegmentDefinitionIR);


/** 'InsertDashboardPromotionCustomSegmentDefinition' parameters type */
export interface IInsertDashboardPromotionCustomSegmentDefinitionParams {
  campaignId?: string | null | void;
  projectId?: string | null | void;
  promotionId?: string | null | void;
  queryPreviewId?: string | null | void;
  ruleJson?: Json | null | void;
  segmentId?: string | null | void;
  segmentName?: string | null | void;
}

/** 'InsertDashboardPromotionCustomSegmentDefinition' return type */
export interface IInsertDashboardPromotionCustomSegmentDefinitionResult {
  campaignId: string | null;
  generatedSql: string | null;
  naturalLanguageQuery: string | null;
  profileJson: Json;
  promotionId: string | null;
  queryPreviewId: string | null;
  ruleJson: Json;
  sampleRatio: number | null;
  sampleSize: number;
  segmentId: string;
  segmentName: string;
  source: string;
  status: string;
  totalEligibleUserCount: number;
}

/** 'InsertDashboardPromotionCustomSegmentDefinition' query type */
export interface IInsertDashboardPromotionCustomSegmentDefinitionQuery {
  params: IInsertDashboardPromotionCustomSegmentDefinitionParams;
  result: IInsertDashboardPromotionCustomSegmentDefinitionResult;
}

const insertDashboardPromotionCustomSegmentDefinitionIR: any = {"usedParamSet":{"segmentId":true,"campaignId":true,"promotionId":true,"segmentName":true,"ruleJson":true,"projectId":true,"queryPreviewId":true},"params":[{"name":"segmentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":291,"b":300}]},{"name":"campaignId","required":false,"transform":{"type":"scalar"},"locs":[{"a":323,"b":333}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":338,"b":349}]},{"name":"segmentName","required":false,"transform":{"type":"scalar"},"locs":[{"a":354,"b":365}]},{"name":"ruleJson","required":false,"transform":{"type":"scalar"},"locs":[{"a":465,"b":473}]},{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":629,"b":638}]},{"name":"queryPreviewId","required":false,"transform":{"type":"scalar"},"locs":[{"a":669,"b":683}]}],"statement":"INSERT INTO segment_definitions (\n  segment_id,\n  project_id,\n  campaign_id,\n  promotion_id,\n  segment_name,\n  source,\n  query_preview_id,\n  natural_language_query,\n  generated_sql,\n  rule_json,\n  profile_json,\n  sample_size,\n  total_eligible_user_count,\n  sample_ratio,\n  status\n)\nSELECT\n  :segmentId,\n  sqp.project_id,\n  :campaignId,\n  :promotionId,\n  :segmentName,\n  'custom_chatkit',\n  sqp.query_preview_id,\n  sqp.natural_language_query,\n  sqp.generated_sql,\n  :ruleJson,\n  '{}'::jsonb,\n  sqp.sample_size,\n  sqp.total_eligible_user_count,\n  sqp.sample_ratio,\n  'active'\nFROM segment_query_previews sqp\nWHERE sqp.project_id = :projectId\n  AND sqp.query_preview_id = :queryPreviewId\n  AND sqp.sample_size_status = 'valid'\n  AND sqp.status = 'previewed'\nRETURNING\n  segment_id AS \"segmentId\",\n  campaign_id AS \"campaignId\",\n  promotion_id AS \"promotionId\",\n  segment_name AS \"segmentName\",\n  source,\n  query_preview_id AS \"queryPreviewId\",\n  natural_language_query AS \"naturalLanguageQuery\",\n  generated_sql AS \"generatedSql\",\n  rule_json AS \"ruleJson\",\n  profile_json AS \"profileJson\",\n  sample_size AS \"sampleSize\",\n  total_eligible_user_count AS \"totalEligibleUserCount\",\n  CAST(sample_ratio AS float8) AS \"sampleRatio\",\n  status                                          "};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO segment_definitions (
 *   segment_id,
 *   project_id,
 *   campaign_id,
 *   promotion_id,
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
 * SELECT
 *   :segmentId,
 *   sqp.project_id,
 *   :campaignId,
 *   :promotionId,
 *   :segmentName,
 *   'custom_chatkit',
 *   sqp.query_preview_id,
 *   sqp.natural_language_query,
 *   sqp.generated_sql,
 *   :ruleJson,
 *   '{}'::jsonb,
 *   sqp.sample_size,
 *   sqp.total_eligible_user_count,
 *   sqp.sample_ratio,
 *   'active'
 * FROM segment_query_previews sqp
 * WHERE sqp.project_id = :projectId
 *   AND sqp.query_preview_id = :queryPreviewId
 *   AND sqp.sample_size_status = 'valid'
 *   AND sqp.status = 'previewed'
 * RETURNING
 *   segment_id AS "segmentId",
 *   campaign_id AS "campaignId",
 *   promotion_id AS "promotionId",
 *   segment_name AS "segmentName",
 *   source,
 *   query_preview_id AS "queryPreviewId",
 *   natural_language_query AS "naturalLanguageQuery",
 *   generated_sql AS "generatedSql",
 *   rule_json AS "ruleJson",
 *   profile_json AS "profileJson",
 *   sample_size AS "sampleSize",
 *   total_eligible_user_count AS "totalEligibleUserCount",
 *   CAST(sample_ratio AS float8) AS "sampleRatio",
 *   status
 * ```
 */
export const insertDashboardPromotionCustomSegmentDefinition = new PreparedQuery<IInsertDashboardPromotionCustomSegmentDefinitionParams,IInsertDashboardPromotionCustomSegmentDefinitionResult>(insertDashboardPromotionCustomSegmentDefinitionIR);


/** 'InsertDashboardPromotionManualSegmentDefinition' parameters type */
export interface IInsertDashboardPromotionManualSegmentDefinitionParams {
  campaignId?: string | null | void;
  naturalLanguageQuery?: string | null | void;
  profileJson?: Json | null | void;
  projectId?: string | null | void;
  promotionId?: string | null | void;
  ruleJson?: Json | null | void;
  sampleRatio?: NumberOrString | null | void;
  sampleSize?: number | null | void;
  segmentId?: string | null | void;
  segmentName?: string | null | void;
  totalEligibleUserCount?: number | null | void;
}

/** 'InsertDashboardPromotionManualSegmentDefinition' return type */
export interface IInsertDashboardPromotionManualSegmentDefinitionResult {
  campaignId: string | null;
  generatedSql: string | null;
  naturalLanguageQuery: string | null;
  profileJson: Json;
  promotionId: string | null;
  queryPreviewId: string | null;
  ruleJson: Json;
  sampleRatio: number | null;
  sampleSize: number;
  segmentId: string;
  segmentName: string;
  source: string;
  status: string;
  totalEligibleUserCount: number;
}

/** 'InsertDashboardPromotionManualSegmentDefinition' query type */
export interface IInsertDashboardPromotionManualSegmentDefinitionQuery {
  params: IInsertDashboardPromotionManualSegmentDefinitionParams;
  result: IInsertDashboardPromotionManualSegmentDefinitionResult;
}

const insertDashboardPromotionManualSegmentDefinitionIR: any = {"usedParamSet":{"segmentId":true,"projectId":true,"campaignId":true,"promotionId":true,"segmentName":true,"naturalLanguageQuery":true,"ruleJson":true,"profileJson":true,"sampleSize":true,"totalEligibleUserCount":true,"sampleRatio":true},"params":[{"name":"segmentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":293,"b":302}]},{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":307,"b":316}]},{"name":"campaignId","required":false,"transform":{"type":"scalar"},"locs":[{"a":321,"b":331}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":336,"b":347}]},{"name":"segmentName","required":false,"transform":{"type":"scalar"},"locs":[{"a":352,"b":363}]},{"name":"naturalLanguageQuery","required":false,"transform":{"type":"scalar"},"locs":[{"a":393,"b":413}]},{"name":"ruleJson","required":false,"transform":{"type":"scalar"},"locs":[{"a":426,"b":434}]},{"name":"profileJson","required":false,"transform":{"type":"scalar"},"locs":[{"a":439,"b":450}]},{"name":"sampleSize","required":false,"transform":{"type":"scalar"},"locs":[{"a":455,"b":465}]},{"name":"totalEligibleUserCount","required":false,"transform":{"type":"scalar"},"locs":[{"a":470,"b":492}]},{"name":"sampleRatio","required":false,"transform":{"type":"scalar"},"locs":[{"a":497,"b":508}]}],"statement":"INSERT INTO segment_definitions (\n  segment_id,\n  project_id,\n  campaign_id,\n  promotion_id,\n  segment_name,\n  source,\n  query_preview_id,\n  natural_language_query,\n  generated_sql,\n  rule_json,\n  profile_json,\n  sample_size,\n  total_eligible_user_count,\n  sample_ratio,\n  status\n)\nVALUES (\n  :segmentId,\n  :projectId,\n  :campaignId,\n  :promotionId,\n  :segmentName,\n  'manual_rule',\n  NULL,\n  :naturalLanguageQuery,\n  NULL,\n  :ruleJson,\n  :profileJson,\n  :sampleSize,\n  :totalEligibleUserCount,\n  :sampleRatio,\n  'active'\n)\nRETURNING\n  segment_id AS \"segmentId\",\n  campaign_id AS \"campaignId\",\n  promotion_id AS \"promotionId\",\n  segment_name AS \"segmentName\",\n  source,\n  query_preview_id AS \"queryPreviewId\",\n  natural_language_query AS \"naturalLanguageQuery\",\n  generated_sql AS \"generatedSql\",\n  rule_json AS \"ruleJson\",\n  profile_json AS \"profileJson\",\n  sample_size AS \"sampleSize\",\n  total_eligible_user_count AS \"totalEligibleUserCount\",\n  CAST(sample_ratio AS float8) AS \"sampleRatio\",\n  status                                               "};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO segment_definitions (
 *   segment_id,
 *   project_id,
 *   campaign_id,
 *   promotion_id,
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
 *   :campaignId,
 *   :promotionId,
 *   :segmentName,
 *   'manual_rule',
 *   NULL,
 *   :naturalLanguageQuery,
 *   NULL,
 *   :ruleJson,
 *   :profileJson,
 *   :sampleSize,
 *   :totalEligibleUserCount,
 *   :sampleRatio,
 *   'active'
 * )
 * RETURNING
 *   segment_id AS "segmentId",
 *   campaign_id AS "campaignId",
 *   promotion_id AS "promotionId",
 *   segment_name AS "segmentName",
 *   source,
 *   query_preview_id AS "queryPreviewId",
 *   natural_language_query AS "naturalLanguageQuery",
 *   generated_sql AS "generatedSql",
 *   rule_json AS "ruleJson",
 *   profile_json AS "profileJson",
 *   sample_size AS "sampleSize",
 *   total_eligible_user_count AS "totalEligibleUserCount",
 *   CAST(sample_ratio AS float8) AS "sampleRatio",
 *   status
 * ```
 */
export const insertDashboardPromotionManualSegmentDefinition = new PreparedQuery<IInsertDashboardPromotionManualSegmentDefinitionParams,IInsertDashboardPromotionManualSegmentDefinitionResult>(insertDashboardPromotionManualSegmentDefinitionIR);


/** 'ListDashboardPromotionSegmentSuggestions' parameters type */
export interface IListDashboardPromotionSegmentSuggestionsParams {
  analysisId?: string | null | void;
  projectId?: string | null | void;
  promotionId?: string | null | void;
}

/** 'ListDashboardPromotionSegmentSuggestions' return type */
export interface IListDashboardPromotionSegmentSuggestionsResult {
  analysisId: string;
  audienceAllocationPreviewContext: Json | null;
  audienceSnapshotId: string | null;
  campaignId: string;
  createdAt: Date;
  decidedAt: Date | null;
  metadataJson: Json;
  profileJson: Json;
  promotionId: string;
  reasonJson: Json;
  ruleJson: Json;
  sampleRatio: number | null;
  sampleSize: number;
  scoreJson: Json;
  segmentId: string;
  segmentName: string;
  segmentSource: string;
  suggestedRank: number;
  suggestionId: string;
  suggestionSource: string;
  suggestionStatus: string;
  updatedAt: Date;
}

/** 'ListDashboardPromotionSegmentSuggestions' query type */
export interface IListDashboardPromotionSegmentSuggestionsQuery {
  params: IListDashboardPromotionSegmentSuggestionsParams;
  result: IListDashboardPromotionSegmentSuggestionsResult;
}

const listDashboardPromotionSegmentSuggestionsIR: any = {"usedParamSet":{"projectId":true,"promotionId":true,"analysisId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1073,"b":1082},{"a":1300,"b":1309}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1109,"b":1120},{"a":1345,"b":1356}]},{"name":"analysisId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1160,"b":1170}]}],"statement":"SELECT\n  pss.suggestion_id AS \"suggestionId\",\n  pss.analysis_id AS \"analysisId\",\n  pss.audience_snapshot_id AS \"audienceSnapshotId\",\n  pa.output_json->'audience_allocation_preview_context' AS \"audienceAllocationPreviewContext\",\n  pss.campaign_id AS \"campaignId\",\n  pss.promotion_id AS \"promotionId\",\n  pss.segment_id AS \"segmentId\",\n  pss.suggested_rank AS \"suggestedRank\",\n  pss.suggestion_source AS \"suggestionSource\",\n  pss.status AS \"suggestionStatus\",\n  pss.score_json AS \"scoreJson\",\n  pss.reason_json AS \"reasonJson\",\n  pss.metadata_json AS \"metadataJson\",\n  sd.segment_name AS \"segmentName\",\n  sd.source AS \"segmentSource\",\n  sd.rule_json AS \"ruleJson\",\n  sd.profile_json AS \"profileJson\",\n  sd.sample_size AS \"sampleSize\",\n  CAST(sd.sample_ratio AS float8) AS \"sampleRatio\",\n  pss.created_at AS \"createdAt\",\n  pss.updated_at AS \"updatedAt\",\n  pss.decided_at AS \"decidedAt\"\nFROM promotion_segment_suggestions pss\nJOIN segment_definitions sd\n  ON sd.segment_id = pss.segment_id\nJOIN promotion_analyses pa\n  ON pa.analysis_id = pss.analysis_id\nWHERE pss.project_id = :projectId\n  AND pss.promotion_id = :promotionId\n  AND pss.analysis_id = COALESCE(\n    :analysisId::varchar,\n    (\n      SELECT latest.analysis_id\n      FROM promotion_segment_suggestions latest\n      WHERE latest.project_id = :projectId\n        AND latest.promotion_id = :promotionId\n      ORDER BY latest.created_at DESC, latest.analysis_id DESC\n      LIMIT 1\n    )\n  )\nORDER BY pss.suggested_rank ASC, pss.created_at ASC                                             "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   pss.suggestion_id AS "suggestionId",
 *   pss.analysis_id AS "analysisId",
 *   pss.audience_snapshot_id AS "audienceSnapshotId",
 *   pa.output_json->'audience_allocation_preview_context' AS "audienceAllocationPreviewContext",
 *   pss.campaign_id AS "campaignId",
 *   pss.promotion_id AS "promotionId",
 *   pss.segment_id AS "segmentId",
 *   pss.suggested_rank AS "suggestedRank",
 *   pss.suggestion_source AS "suggestionSource",
 *   pss.status AS "suggestionStatus",
 *   pss.score_json AS "scoreJson",
 *   pss.reason_json AS "reasonJson",
 *   pss.metadata_json AS "metadataJson",
 *   sd.segment_name AS "segmentName",
 *   sd.source AS "segmentSource",
 *   sd.rule_json AS "ruleJson",
 *   sd.profile_json AS "profileJson",
 *   sd.sample_size AS "sampleSize",
 *   CAST(sd.sample_ratio AS float8) AS "sampleRatio",
 *   pss.created_at AS "createdAt",
 *   pss.updated_at AS "updatedAt",
 *   pss.decided_at AS "decidedAt"
 * FROM promotion_segment_suggestions pss
 * JOIN segment_definitions sd
 *   ON sd.segment_id = pss.segment_id
 * JOIN promotion_analyses pa
 *   ON pa.analysis_id = pss.analysis_id
 * WHERE pss.project_id = :projectId
 *   AND pss.promotion_id = :promotionId
 *   AND pss.analysis_id = COALESCE(
 *     :analysisId::varchar,
 *     (
 *       SELECT latest.analysis_id
 *       FROM promotion_segment_suggestions latest
 *       WHERE latest.project_id = :projectId
 *         AND latest.promotion_id = :promotionId
 *       ORDER BY latest.created_at DESC, latest.analysis_id DESC
 *       LIMIT 1
 *     )
 *   )
 * ORDER BY pss.suggested_rank ASC, pss.created_at ASC
 * ```
 */
export const listDashboardPromotionSegmentSuggestions = new PreparedQuery<IListDashboardPromotionSegmentSuggestionsParams,IListDashboardPromotionSegmentSuggestionsResult>(listDashboardPromotionSegmentSuggestionsIR);


/** 'ListDashboardPromotionSegmentSuggestionAudienceMembers' parameters type */
export interface IListDashboardPromotionSegmentSuggestionAudienceMembersParams {
  projectId?: string | null | void;
  promotionId?: string | null | void;
  suggestionId?: string | null | void;
}

/** 'ListDashboardPromotionSegmentSuggestionAudienceMembers' return type */
export interface IListDashboardPromotionSegmentSuggestionAudienceMembersResult {
  userId: string;
}

/** 'ListDashboardPromotionSegmentSuggestionAudienceMembers' query type */
export interface IListDashboardPromotionSegmentSuggestionAudienceMembersQuery {
  params: IListDashboardPromotionSegmentSuggestionAudienceMembersParams;
  result: IListDashboardPromotionSegmentSuggestionAudienceMembersResult;
}

const listDashboardPromotionSegmentSuggestionAudienceMembersIR: any = {"usedParamSet":{"projectId":true,"promotionId":true,"suggestionId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":499,"b":508}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":542,"b":553}]},{"name":"suggestionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":588,"b":600}]}],"statement":"SELECT\n  member.user_id AS \"userId\"\nFROM promotion_segment_suggestions suggestion\nJOIN segment_audience_snapshots snapshot\n  ON snapshot.snapshot_id = suggestion.audience_snapshot_id\n AND snapshot.project_id = suggestion.project_id\n AND snapshot.campaign_id = suggestion.campaign_id\n AND snapshot.promotion_id = suggestion.promotion_id\n AND snapshot.segment_id = suggestion.segment_id\nJOIN segment_audience_members member\n  ON member.snapshot_id = snapshot.snapshot_id\nWHERE suggestion.project_id = :projectId\n  AND suggestion.promotion_id = :promotionId\n  AND suggestion.suggestion_id = :suggestionId\n  AND snapshot.status = 'completed'\nORDER BY member.user_id ASC                                                 "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   member.user_id AS "userId"
 * FROM promotion_segment_suggestions suggestion
 * JOIN segment_audience_snapshots snapshot
 *   ON snapshot.snapshot_id = suggestion.audience_snapshot_id
 *  AND snapshot.project_id = suggestion.project_id
 *  AND snapshot.campaign_id = suggestion.campaign_id
 *  AND snapshot.promotion_id = suggestion.promotion_id
 *  AND snapshot.segment_id = suggestion.segment_id
 * JOIN segment_audience_members member
 *   ON member.snapshot_id = snapshot.snapshot_id
 * WHERE suggestion.project_id = :projectId
 *   AND suggestion.promotion_id = :promotionId
 *   AND suggestion.suggestion_id = :suggestionId
 *   AND snapshot.status = 'completed'
 * ORDER BY member.user_id ASC
 * ```
 */
export const listDashboardPromotionSegmentSuggestionAudienceMembers = new PreparedQuery<IListDashboardPromotionSegmentSuggestionAudienceMembersParams,IListDashboardPromotionSegmentSuggestionAudienceMembersResult>(listDashboardPromotionSegmentSuggestionAudienceMembersIR);


/** 'DecideDashboardPromotionSegmentSuggestion' parameters type */
export interface IDecideDashboardPromotionSegmentSuggestionParams {
  projectId?: string | null | void;
  promotionId?: string | null | void;
  status?: string | null | void;
  suggestionId?: string | null | void;
}

/** 'DecideDashboardPromotionSegmentSuggestion' return type */
export interface IDecideDashboardPromotionSegmentSuggestionResult {
  analysisId: string | null;
  audienceSnapshotId: string | null;
  campaignId: string | null;
  createdAt: Date | null;
  decidedAt: Date | null;
  metadataJson: Json | null;
  profileJson: Json;
  promotionId: string | null;
  reasonJson: Json | null;
  ruleJson: Json;
  sampleRatio: number | null;
  sampleSize: number;
  scoreJson: Json | null;
  segmentId: string | null;
  segmentName: string;
  segmentSource: string;
  suggestedRank: number | null;
  suggestionId: string | null;
  suggestionSource: string | null;
  suggestionStatus: string | null;
  updatedAt: Date | null;
}

/** 'DecideDashboardPromotionSegmentSuggestion' query type */
export interface IDecideDashboardPromotionSegmentSuggestionQuery {
  params: IDecideDashboardPromotionSegmentSuggestionParams;
  result: IDecideDashboardPromotionSegmentSuggestionResult;
}

const decideDashboardPromotionSegmentSuggestionIR: any = {"usedParamSet":{"status":true,"projectId":true,"promotionId":true,"suggestionId":true},"params":[{"name":"status","required":false,"transform":{"type":"scalar"},"locs":[{"a":72,"b":78},{"a":110,"b":116},{"a":318,"b":324},{"a":612,"b":618}]},{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":225,"b":234},{"a":519,"b":528}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":259,"b":270},{"a":553,"b":564}]},{"name":"suggestionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":296,"b":308},{"a":590,"b":602}]}],"statement":"WITH updated AS (\n  UPDATE promotion_segment_suggestions\n  SET status = :status,\n      decided_at = CASE WHEN :status = 'accepted' THEN COALESCE(decided_at, now()) ELSE NULL END,\n      updated_at = now()\n  WHERE project_id = :projectId\n    AND promotion_id = :promotionId\n    AND suggestion_id = :suggestionId\n    AND :status IN ('suggested', 'accepted')\n    AND status IN ('suggested', 'accepted')\n  RETURNING *, status AS result_status\n),\ndeleted AS (\n  DELETE FROM promotion_segment_suggestions\n  WHERE project_id = :projectId\n    AND promotion_id = :promotionId\n    AND suggestion_id = :suggestionId\n    AND :status = 'dismissed'\n    AND status IN ('suggested', 'accepted', 'dismissed')\n  RETURNING *, 'dismissed'::varchar AS result_status\n),\ndecided AS (\n  SELECT * FROM updated\n  UNION ALL\n  SELECT * FROM deleted\n)\nSELECT\n  d.suggestion_id AS \"suggestionId\",\n  d.analysis_id AS \"analysisId\",\n  d.audience_snapshot_id AS \"audienceSnapshotId\",\n  d.campaign_id AS \"campaignId\",\n  d.promotion_id AS \"promotionId\",\n  d.segment_id AS \"segmentId\",\n  d.suggested_rank AS \"suggestedRank\",\n  d.suggestion_source AS \"suggestionSource\",\n  d.result_status AS \"suggestionStatus\",\n  d.score_json AS \"scoreJson\",\n  d.reason_json AS \"reasonJson\",\n  d.metadata_json AS \"metadataJson\",\n  sd.segment_name AS \"segmentName\",\n  sd.source AS \"segmentSource\",\n  sd.rule_json AS \"ruleJson\",\n  sd.profile_json AS \"profileJson\",\n  sd.sample_size AS \"sampleSize\",\n  CAST(sd.sample_ratio AS float8) AS \"sampleRatio\",\n  d.created_at AS \"createdAt\",\n  d.updated_at AS \"updatedAt\",\n  d.decided_at AS \"decidedAt\"\nFROM decided d\nJOIN segment_definitions sd\n  ON sd.segment_id = d.segment_id                                             "};

/**
 * Query generated from SQL:
 * ```
 * WITH updated AS (
 *   UPDATE promotion_segment_suggestions
 *   SET status = :status,
 *       decided_at = CASE WHEN :status = 'accepted' THEN COALESCE(decided_at, now()) ELSE NULL END,
 *       updated_at = now()
 *   WHERE project_id = :projectId
 *     AND promotion_id = :promotionId
 *     AND suggestion_id = :suggestionId
 *     AND :status IN ('suggested', 'accepted')
 *     AND status IN ('suggested', 'accepted')
 *   RETURNING *, status AS result_status
 * ),
 * deleted AS (
 *   DELETE FROM promotion_segment_suggestions
 *   WHERE project_id = :projectId
 *     AND promotion_id = :promotionId
 *     AND suggestion_id = :suggestionId
 *     AND :status = 'dismissed'
 *     AND status IN ('suggested', 'accepted', 'dismissed')
 *   RETURNING *, 'dismissed'::varchar AS result_status
 * ),
 * decided AS (
 *   SELECT * FROM updated
 *   UNION ALL
 *   SELECT * FROM deleted
 * )
 * SELECT
 *   d.suggestion_id AS "suggestionId",
 *   d.analysis_id AS "analysisId",
 *   d.audience_snapshot_id AS "audienceSnapshotId",
 *   d.campaign_id AS "campaignId",
 *   d.promotion_id AS "promotionId",
 *   d.segment_id AS "segmentId",
 *   d.suggested_rank AS "suggestedRank",
 *   d.suggestion_source AS "suggestionSource",
 *   d.result_status AS "suggestionStatus",
 *   d.score_json AS "scoreJson",
 *   d.reason_json AS "reasonJson",
 *   d.metadata_json AS "metadataJson",
 *   sd.segment_name AS "segmentName",
 *   sd.source AS "segmentSource",
 *   sd.rule_json AS "ruleJson",
 *   sd.profile_json AS "profileJson",
 *   sd.sample_size AS "sampleSize",
 *   CAST(sd.sample_ratio AS float8) AS "sampleRatio",
 *   d.created_at AS "createdAt",
 *   d.updated_at AS "updatedAt",
 *   d.decided_at AS "decidedAt"
 * FROM decided d
 * JOIN segment_definitions sd
 *   ON sd.segment_id = d.segment_id
 * ```
 */
export const decideDashboardPromotionSegmentSuggestion = new PreparedQuery<IDecideDashboardPromotionSegmentSuggestionParams,IDecideDashboardPromotionSegmentSuggestionResult>(decideDashboardPromotionSegmentSuggestionIR);


/** 'ConfirmDashboardLegacyPromotionSegments' parameters type */
export interface IConfirmDashboardLegacyPromotionSegmentsParams {
  analysisId?: string | null | void;
  confirmedBy?: string | null | void;
  manualAnalysisId?: string | null | void;
  projectId?: string | null | void;
  promotionId?: string | null | void;
  segmentIds?: stringArray | null | void;
  suggestionIds?: stringArray | null | void;
}

/** 'ConfirmDashboardLegacyPromotionSegments' return type */
export interface IConfirmDashboardLegacyPromotionSegmentsResult {
  confirmedSegmentCount: number | null;
  promotionId: string | null;
}

/** 'ConfirmDashboardLegacyPromotionSegments' query type */
export interface IConfirmDashboardLegacyPromotionSegmentsQuery {
  params: IConfirmDashboardLegacyPromotionSegmentsParams;
  result: IConfirmDashboardLegacyPromotionSegmentsResult;
}

const confirmDashboardLegacyPromotionSegmentsIR: any = {"usedParamSet":{"manualAnalysisId":true,"projectId":true,"promotionId":true,"analysisId":true,"suggestionIds":true,"segmentIds":true,"confirmedBy":true},"params":[{"name":"manualAnalysisId","required":false,"transform":{"type":"scalar"},"locs":[{"a":45,"b":61},{"a":975,"b":991}]},{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":768,"b":777},{"a":1510,"b":1519},{"a":3442,"b":3451},{"a":5843,"b":5852}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":806,"b":817},{"a":1547,"b":1558},{"a":3480,"b":3491},{"a":5881,"b":5892},{"a":6083,"b":6094}]},{"name":"analysisId","required":false,"transform":{"type":"scalar"},"locs":[{"a":845,"b":855},{"a":5920,"b":5930}]},{"name":"suggestionIds","required":false,"transform":{"type":"scalar"},"locs":[{"a":889,"b":902},{"a":5964,"b":5977}]},{"name":"segmentIds","required":false,"transform":{"type":"scalar"},"locs":[{"a":1588,"b":1598}]},{"name":"confirmedBy","required":false,"transform":{"type":"scalar"},"locs":[{"a":4925,"b":4936}]}],"statement":"WITH accepted_suggestions AS (\n  SELECT\n    (:manualAnalysisId)::varchar AS analysis_id,\n    pss.project_id,\n    pss.campaign_id,\n    pss.promotion_id,\n    sd.segment_id,\n    sd.segment_name,\n    sd.rule_json,\n    sd.profile_json,\n    sd.sample_size,\n    pss.suggestion_id,\n    pss.analysis_id AS source_analysis_id,\n    jsonb_build_object(\n      'source', sd.source,\n      'suggestion_id', pss.suggestion_id,\n      'score', pss.score_json,\n      'reason', pss.reason_json,\n      'display_copy', pss.metadata_json->'display_copy',\n      'sample_size', sd.sample_size,\n      'sample_ratio', sd.sample_ratio\n    ) AS data_evidence_json\n  FROM promotion_segment_suggestions pss\n  JOIN segment_definitions sd\n    ON sd.segment_id = pss.segment_id\n  WHERE pss.project_id = :projectId\n    AND pss.promotion_id = :promotionId\n    AND pss.analysis_id = :analysisId\n    AND pss.suggestion_id = ANY(:suggestionIds)\n    AND pss.status = 'accepted'\n),\nmanual_segments AS (\n  SELECT\n    (:manualAnalysisId)::varchar AS analysis_id,\n    sd.project_id,\n    sd.campaign_id,\n    sd.promotion_id,\n    sd.segment_id,\n    sd.segment_name,\n    sd.rule_json,\n    sd.profile_json,\n    sd.sample_size,\n    NULL::varchar AS suggestion_id,\n    NULL::varchar AS source_analysis_id,\n    jsonb_build_object(\n      'source', sd.source,\n      'query_preview_id', sd.query_preview_id,\n      'sample_size', sd.sample_size,\n      'sample_ratio', sd.sample_ratio\n    ) AS data_evidence_json\n  FROM segment_definitions sd\n  WHERE sd.project_id = :projectId\n    AND sd.promotion_id = :promotionId\n    AND sd.segment_id = ANY(:segmentIds)\n    AND sd.source IN ('custom_chatkit', 'manual_rule')\n    AND sd.status = 'active'\n),\nselected_segments AS (\n  SELECT * FROM accepted_suggestions\n  UNION ALL\n  SELECT * FROM manual_segments\n),\nconfirmed_vectors AS (\n  INSERT INTO segment_vectors (\n    segment_vector_id,\n    project_id,\n    segment_id,\n    promotion_id,\n    promotion_run_id,\n    analysis_id,\n    vector_dim,\n    vector_values,\n    embedding,\n    vector_version,\n    source\n  )\n  SELECT\n    'segvec_' || substr(\n      encode(\n        digest(\n          selected.analysis_id || ':' || selected.segment_id || ':' || source_vector.vector_version,\n          'sha256'\n        ),\n        'hex'\n      ),\n      1,\n      40\n    ),\n    selected.project_id,\n    selected.segment_id,\n    selected.promotion_id,\n    NULL,\n    selected.analysis_id,\n    source_vector.vector_dim,\n    source_vector.vector_values,\n    source_vector.embedding,\n    source_vector.vector_version,\n    'manual'\n  FROM selected_segments selected\n  JOIN LATERAL (\n    SELECT\n      sv.vector_dim,\n      sv.vector_values,\n      sv.embedding,\n      sv.vector_version\n    FROM segment_vectors sv\n    WHERE sv.project_id = selected.project_id\n      AND sv.promotion_id = selected.promotion_id\n      AND sv.segment_id = selected.segment_id\n      AND (\n        selected.source_analysis_id IS NULL\n        OR sv.analysis_id = selected.source_analysis_id\n      )\n    ORDER BY sv.created_at DESC, sv.segment_vector_id DESC\n    LIMIT 1\n  ) source_vector ON true\n  ON CONFLICT (segment_vector_id) DO UPDATE\n  SET\n    vector_dim = EXCLUDED.vector_dim,\n    vector_values = EXCLUDED.vector_values,\n    embedding = EXCLUDED.embedding,\n    source = EXCLUDED.source\n  RETURNING segment_id, segment_vector_id\n),\nreset_unselected_approved AS (\n  UPDATE promotion_target_segments pts\n  SET status = 'planned'\n  WHERE pts.project_id = :projectId\n    AND pts.promotion_id = :promotionId\n    AND pts.status = 'approved'\n    AND EXISTS (\n      SELECT 1\n      FROM selected_segments selected\n      WHERE selected.project_id = pts.project_id\n        AND selected.campaign_id = pts.campaign_id\n        AND selected.promotion_id = pts.promotion_id\n        AND selected.analysis_id = pts.analysis_id\n    )\n    AND NOT EXISTS (\n      SELECT 1\n      FROM selected_segments selected\n      WHERE selected.project_id = pts.project_id\n        AND selected.campaign_id = pts.campaign_id\n        AND selected.promotion_id = pts.promotion_id\n        AND selected.analysis_id = pts.analysis_id\n        AND selected.segment_id = pts.segment_id\n    )\n  RETURNING pts.segment_id\n),\nconfirmed AS (\n  INSERT INTO promotion_target_segments (\n    analysis_id,\n    project_id,\n    campaign_id,\n    promotion_id,\n    segment_id,\n    segment_name,\n    segment_vector_id,\n    rule_json,\n    profile_json,\n    content_brief_json,\n    data_evidence_json,\n    estimated_size,\n    priority,\n    status,\n    suggestion_id,\n    confirmed_by,\n    confirmed_at\n  )\n  SELECT\n    selected.analysis_id,\n    selected.project_id,\n    selected.campaign_id,\n    selected.promotion_id,\n    selected.segment_id,\n    selected.segment_name,\n    confirmed_vector.segment_vector_id,\n    selected.rule_json,\n    selected.profile_json,\n    '{}'::jsonb,\n    selected.data_evidence_json,\n    selected.sample_size,\n    NULL,\n    'approved',\n    selected.suggestion_id,\n    :confirmedBy,\n    now()\n  FROM selected_segments selected\n  LEFT JOIN confirmed_vectors confirmed_vector\n    ON confirmed_vector.segment_id = selected.segment_id\n  CROSS JOIN (SELECT count(*) FROM reset_unselected_approved) dependency\n  ON CONFLICT (analysis_id, segment_id) DO UPDATE\n  SET\n    segment_vector_id = EXCLUDED.segment_vector_id,\n    suggestion_id = EXCLUDED.suggestion_id,\n    confirmed_by = EXCLUDED.confirmed_by,\n    confirmed_at = EXCLUDED.confirmed_at,\n    status = CASE\n      WHEN promotion_target_segments.status IN ('planned', 'stopped') THEN 'approved'\n      ELSE promotion_target_segments.status\n    END\n  RETURNING promotion_id AS \"promotionId\", segment_id AS \"segmentId\", suggestion_id AS \"suggestionId\"\n),\nupdated AS (\n  UPDATE promotion_segment_suggestions pss\n  SET status = 'confirmed',\n      decided_at = COALESCE(pss.decided_at, now()),\n      updated_at = now()\n  WHERE pss.project_id = :projectId\n    AND pss.promotion_id = :promotionId\n    AND pss.analysis_id = :analysisId\n    AND pss.suggestion_id = ANY(:suggestionIds)\n    AND pss.status IN ('suggested', 'accepted', 'confirmed')\n  RETURNING pss.suggestion_id\n)\nSELECT\n  (:promotionId)::varchar AS \"promotionId\",\n  COUNT(*)::int AS \"confirmedSegmentCount\"\nFROM confirmed                                                        "};

/**
 * Query generated from SQL:
 * ```
 * WITH accepted_suggestions AS (
 *   SELECT
 *     (:manualAnalysisId)::varchar AS analysis_id,
 *     pss.project_id,
 *     pss.campaign_id,
 *     pss.promotion_id,
 *     sd.segment_id,
 *     sd.segment_name,
 *     sd.rule_json,
 *     sd.profile_json,
 *     sd.sample_size,
 *     pss.suggestion_id,
 *     pss.analysis_id AS source_analysis_id,
 *     jsonb_build_object(
 *       'source', sd.source,
 *       'suggestion_id', pss.suggestion_id,
 *       'score', pss.score_json,
 *       'reason', pss.reason_json,
 *       'display_copy', pss.metadata_json->'display_copy',
 *       'sample_size', sd.sample_size,
 *       'sample_ratio', sd.sample_ratio
 *     ) AS data_evidence_json
 *   FROM promotion_segment_suggestions pss
 *   JOIN segment_definitions sd
 *     ON sd.segment_id = pss.segment_id
 *   WHERE pss.project_id = :projectId
 *     AND pss.promotion_id = :promotionId
 *     AND pss.analysis_id = :analysisId
 *     AND pss.suggestion_id = ANY(:suggestionIds)
 *     AND pss.status = 'accepted'
 * ),
 * manual_segments AS (
 *   SELECT
 *     (:manualAnalysisId)::varchar AS analysis_id,
 *     sd.project_id,
 *     sd.campaign_id,
 *     sd.promotion_id,
 *     sd.segment_id,
 *     sd.segment_name,
 *     sd.rule_json,
 *     sd.profile_json,
 *     sd.sample_size,
 *     NULL::varchar AS suggestion_id,
 *     NULL::varchar AS source_analysis_id,
 *     jsonb_build_object(
 *       'source', sd.source,
 *       'query_preview_id', sd.query_preview_id,
 *       'sample_size', sd.sample_size,
 *       'sample_ratio', sd.sample_ratio
 *     ) AS data_evidence_json
 *   FROM segment_definitions sd
 *   WHERE sd.project_id = :projectId
 *     AND sd.promotion_id = :promotionId
 *     AND sd.segment_id = ANY(:segmentIds)
 *     AND sd.source IN ('custom_chatkit', 'manual_rule')
 *     AND sd.status = 'active'
 * ),
 * selected_segments AS (
 *   SELECT * FROM accepted_suggestions
 *   UNION ALL
 *   SELECT * FROM manual_segments
 * ),
 * confirmed_vectors AS (
 *   INSERT INTO segment_vectors (
 *     segment_vector_id,
 *     project_id,
 *     segment_id,
 *     promotion_id,
 *     promotion_run_id,
 *     analysis_id,
 *     vector_dim,
 *     vector_values,
 *     embedding,
 *     vector_version,
 *     source
 *   )
 *   SELECT
 *     'segvec_' || substr(
 *       encode(
 *         digest(
 *           selected.analysis_id || ':' || selected.segment_id || ':' || source_vector.vector_version,
 *           'sha256'
 *         ),
 *         'hex'
 *       ),
 *       1,
 *       40
 *     ),
 *     selected.project_id,
 *     selected.segment_id,
 *     selected.promotion_id,
 *     NULL,
 *     selected.analysis_id,
 *     source_vector.vector_dim,
 *     source_vector.vector_values,
 *     source_vector.embedding,
 *     source_vector.vector_version,
 *     'manual'
 *   FROM selected_segments selected
 *   JOIN LATERAL (
 *     SELECT
 *       sv.vector_dim,
 *       sv.vector_values,
 *       sv.embedding,
 *       sv.vector_version
 *     FROM segment_vectors sv
 *     WHERE sv.project_id = selected.project_id
 *       AND sv.promotion_id = selected.promotion_id
 *       AND sv.segment_id = selected.segment_id
 *       AND (
 *         selected.source_analysis_id IS NULL
 *         OR sv.analysis_id = selected.source_analysis_id
 *       )
 *     ORDER BY sv.created_at DESC, sv.segment_vector_id DESC
 *     LIMIT 1
 *   ) source_vector ON true
 *   ON CONFLICT (segment_vector_id) DO UPDATE
 *   SET
 *     vector_dim = EXCLUDED.vector_dim,
 *     vector_values = EXCLUDED.vector_values,
 *     embedding = EXCLUDED.embedding,
 *     source = EXCLUDED.source
 *   RETURNING segment_id, segment_vector_id
 * ),
 * reset_unselected_approved AS (
 *   UPDATE promotion_target_segments pts
 *   SET status = 'planned'
 *   WHERE pts.project_id = :projectId
 *     AND pts.promotion_id = :promotionId
 *     AND pts.status = 'approved'
 *     AND EXISTS (
 *       SELECT 1
 *       FROM selected_segments selected
 *       WHERE selected.project_id = pts.project_id
 *         AND selected.campaign_id = pts.campaign_id
 *         AND selected.promotion_id = pts.promotion_id
 *         AND selected.analysis_id = pts.analysis_id
 *     )
 *     AND NOT EXISTS (
 *       SELECT 1
 *       FROM selected_segments selected
 *       WHERE selected.project_id = pts.project_id
 *         AND selected.campaign_id = pts.campaign_id
 *         AND selected.promotion_id = pts.promotion_id
 *         AND selected.analysis_id = pts.analysis_id
 *         AND selected.segment_id = pts.segment_id
 *     )
 *   RETURNING pts.segment_id
 * ),
 * confirmed AS (
 *   INSERT INTO promotion_target_segments (
 *     analysis_id,
 *     project_id,
 *     campaign_id,
 *     promotion_id,
 *     segment_id,
 *     segment_name,
 *     segment_vector_id,
 *     rule_json,
 *     profile_json,
 *     content_brief_json,
 *     data_evidence_json,
 *     estimated_size,
 *     priority,
 *     status,
 *     suggestion_id,
 *     confirmed_by,
 *     confirmed_at
 *   )
 *   SELECT
 *     selected.analysis_id,
 *     selected.project_id,
 *     selected.campaign_id,
 *     selected.promotion_id,
 *     selected.segment_id,
 *     selected.segment_name,
 *     confirmed_vector.segment_vector_id,
 *     selected.rule_json,
 *     selected.profile_json,
 *     '{}'::jsonb,
 *     selected.data_evidence_json,
 *     selected.sample_size,
 *     NULL,
 *     'approved',
 *     selected.suggestion_id,
 *     :confirmedBy,
 *     now()
 *   FROM selected_segments selected
 *   LEFT JOIN confirmed_vectors confirmed_vector
 *     ON confirmed_vector.segment_id = selected.segment_id
 *   CROSS JOIN (SELECT count(*) FROM reset_unselected_approved) dependency
 *   ON CONFLICT (analysis_id, segment_id) DO UPDATE
 *   SET
 *     segment_vector_id = EXCLUDED.segment_vector_id,
 *     suggestion_id = EXCLUDED.suggestion_id,
 *     confirmed_by = EXCLUDED.confirmed_by,
 *     confirmed_at = EXCLUDED.confirmed_at,
 *     status = CASE
 *       WHEN promotion_target_segments.status IN ('planned', 'stopped') THEN 'approved'
 *       ELSE promotion_target_segments.status
 *     END
 *   RETURNING promotion_id AS "promotionId", segment_id AS "segmentId", suggestion_id AS "suggestionId"
 * ),
 * updated AS (
 *   UPDATE promotion_segment_suggestions pss
 *   SET status = 'confirmed',
 *       decided_at = COALESCE(pss.decided_at, now()),
 *       updated_at = now()
 *   WHERE pss.project_id = :projectId
 *     AND pss.promotion_id = :promotionId
 *     AND pss.analysis_id = :analysisId
 *     AND pss.suggestion_id = ANY(:suggestionIds)
 *     AND pss.status IN ('suggested', 'accepted', 'confirmed')
 *   RETURNING pss.suggestion_id
 * )
 * SELECT
 *   (:promotionId)::varchar AS "promotionId",
 *   COUNT(*)::int AS "confirmedSegmentCount"
 * FROM confirmed
 * ```
 */
export const confirmDashboardLegacyPromotionSegments = new PreparedQuery<IConfirmDashboardLegacyPromotionSegmentsParams,IConfirmDashboardLegacyPromotionSegmentsResult>(confirmDashboardLegacyPromotionSegmentsIR);


/** 'ConfirmDashboardV2PromotionSegmentSuggestions' parameters type */
export interface IConfirmDashboardV2PromotionSegmentSuggestionsParams {
  confirmationAnalysisId?: string | null | void;
  confirmedBy?: string | null | void;
  projectId?: string | null | void;
  promotionId?: string | null | void;
  sourceAnalysisId?: string | null | void;
  suggestionIds?: stringArray | null | void;
}

/** 'ConfirmDashboardV2PromotionSegmentSuggestions' return type */
export interface IConfirmDashboardV2PromotionSegmentSuggestionsResult {
  confirmedSegmentCount: number | null;
  promotionId: string | null;
  updatedSuggestionCount: number | null;
}

/** 'ConfirmDashboardV2PromotionSegmentSuggestions' query type */
export interface IConfirmDashboardV2PromotionSegmentSuggestionsQuery {
  params: IConfirmDashboardV2PromotionSegmentSuggestionsParams;
  result: IConfirmDashboardV2PromotionSegmentSuggestionsResult;
}

const confirmDashboardV2PromotionSegmentSuggestionsIR: any = {"usedParamSet":{"projectId":true,"promotionId":true,"sourceAnalysisId":true,"suggestionIds":true,"confirmedBy":true,"confirmationAnalysisId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":148,"b":157},{"a":680,"b":689},{"a":1310,"b":1319}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":186,"b":197},{"a":721,"b":732},{"a":1355,"b":1366},{"a":1524,"b":1535}]},{"name":"sourceAnalysisId","required":false,"transform":{"type":"scalar"},"locs":[{"a":225,"b":241},{"a":1401,"b":1417}]},{"name":"suggestionIds","required":false,"transform":{"type":"scalar"},"locs":[{"a":275,"b":288}]},{"name":"confirmedBy","required":false,"transform":{"type":"scalar"},"locs":[{"a":520,"b":531}]},{"name":"confirmationAnalysisId","required":false,"transform":{"type":"scalar"},"locs":[{"a":763,"b":785}]}],"statement":"WITH selected_suggestions AS (\n  SELECT\n    pss.suggestion_id,\n    pss.segment_id\n  FROM promotion_segment_suggestions pss\n  WHERE pss.project_id = :projectId\n    AND pss.promotion_id = :promotionId\n    AND pss.analysis_id = :sourceAnalysisId\n    AND pss.suggestion_id = ANY(:suggestionIds)\n    AND pss.status IN ('accepted', 'confirmed')\n    AND pss.audience_snapshot_id IS NOT NULL\n),\nenriched_targets AS (\n  UPDATE promotion_target_segments target\n  SET\n    suggestion_id = selected.suggestion_id,\n    confirmed_by = :confirmedBy,\n    confirmed_at = COALESCE(target.confirmed_at, now()),\n    status = 'approved'\n  FROM selected_suggestions selected\n  WHERE target.project_id = :projectId\n    AND target.promotion_id = :promotionId\n    AND target.analysis_id = :confirmationAnalysisId\n    AND target.segment_id = selected.segment_id\n    AND target.audience_snapshot_id IS NOT NULL\n    AND target.allocation_plan_id IS NOT NULL\n    AND target.audience_reservation_state = 'reserved'\n  RETURNING target.promotion_id, target.segment_id, target.suggestion_id\n),\nupdated_suggestions AS (\n  UPDATE promotion_segment_suggestions suggestion\n  SET\n    status = 'confirmed',\n    decided_at = COALESCE(suggestion.decided_at, now()),\n    updated_at = now()\n  FROM enriched_targets target\n  WHERE suggestion.project_id = :projectId\n    AND suggestion.promotion_id = :promotionId\n    AND suggestion.analysis_id = :sourceAnalysisId\n    AND suggestion.suggestion_id = target.suggestion_id\n  RETURNING suggestion.suggestion_id\n)\nSELECT\n  (:promotionId)::varchar AS \"promotionId\",\n  COUNT(*)::int AS \"confirmedSegmentCount\",\n  (SELECT COUNT(*)::int FROM updated_suggestions) AS \"updatedSuggestionCount\"\nFROM enriched_targets                                      "};

/**
 * Query generated from SQL:
 * ```
 * WITH selected_suggestions AS (
 *   SELECT
 *     pss.suggestion_id,
 *     pss.segment_id
 *   FROM promotion_segment_suggestions pss
 *   WHERE pss.project_id = :projectId
 *     AND pss.promotion_id = :promotionId
 *     AND pss.analysis_id = :sourceAnalysisId
 *     AND pss.suggestion_id = ANY(:suggestionIds)
 *     AND pss.status IN ('accepted', 'confirmed')
 *     AND pss.audience_snapshot_id IS NOT NULL
 * ),
 * enriched_targets AS (
 *   UPDATE promotion_target_segments target
 *   SET
 *     suggestion_id = selected.suggestion_id,
 *     confirmed_by = :confirmedBy,
 *     confirmed_at = COALESCE(target.confirmed_at, now()),
 *     status = 'approved'
 *   FROM selected_suggestions selected
 *   WHERE target.project_id = :projectId
 *     AND target.promotion_id = :promotionId
 *     AND target.analysis_id = :confirmationAnalysisId
 *     AND target.segment_id = selected.segment_id
 *     AND target.audience_snapshot_id IS NOT NULL
 *     AND target.allocation_plan_id IS NOT NULL
 *     AND target.audience_reservation_state = 'reserved'
 *   RETURNING target.promotion_id, target.segment_id, target.suggestion_id
 * ),
 * updated_suggestions AS (
 *   UPDATE promotion_segment_suggestions suggestion
 *   SET
 *     status = 'confirmed',
 *     decided_at = COALESCE(suggestion.decided_at, now()),
 *     updated_at = now()
 *   FROM enriched_targets target
 *   WHERE suggestion.project_id = :projectId
 *     AND suggestion.promotion_id = :promotionId
 *     AND suggestion.analysis_id = :sourceAnalysisId
 *     AND suggestion.suggestion_id = target.suggestion_id
 *   RETURNING suggestion.suggestion_id
 * )
 * SELECT
 *   (:promotionId)::varchar AS "promotionId",
 *   COUNT(*)::int AS "confirmedSegmentCount",
 *   (SELECT COUNT(*)::int FROM updated_suggestions) AS "updatedSuggestionCount"
 * FROM enriched_targets
 * ```
 */
export const confirmDashboardV2PromotionSegmentSuggestions = new PreparedQuery<IConfirmDashboardV2PromotionSegmentSuggestionsParams,IConfirmDashboardV2PromotionSegmentSuggestionsResult>(confirmDashboardV2PromotionSegmentSuggestionsIR);


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

const updateDashboardPromotionTargetSegmentIR: any = {"usedParamSet":{"segmentName":true,"priorityIsSet":true,"priority":true,"status":true,"projectId":true,"promotionId":true,"segmentId":true},"params":[{"name":"segmentName","required":false,"transform":{"type":"scalar"},"locs":[{"a":63,"b":74}]},{"name":"priorityIsSet","required":false,"transform":{"type":"scalar"},"locs":[{"a":115,"b":128}]},{"name":"priority","required":false,"transform":{"type":"scalar"},"locs":[{"a":135,"b":143}]},{"name":"status","required":false,"transform":{"type":"scalar"},"locs":[{"a":184,"b":190}]},{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":220,"b":229}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":252,"b":263}]},{"name":"segmentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":284,"b":293}]}],"statement":"UPDATE promotion_target_segments\nSET\n  segment_name = COALESCE(:segmentName, segment_name),\n  priority = CASE WHEN :priorityIsSet THEN :priority ELSE priority END,\n  status = COALESCE(:status, status)\nWHERE project_id = :projectId\n  AND promotion_id = :promotionId\n  AND segment_id = :segmentId\n  AND status <> 'stopped'\nRETURNING promotion_id AS \"promotionId\", segment_id AS \"segmentId\"                                                     "};

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
  promotionId: string | null;
  segmentId: string | null;
  status: string | null;
}

/** 'StopDashboardPromotionTargetSegment' query type */
export interface IStopDashboardPromotionTargetSegmentQuery {
  params: IStopDashboardPromotionTargetSegmentParams;
  result: IStopDashboardPromotionTargetSegmentResult;
}

const stopDashboardPromotionTargetSegmentIR: any = {"usedParamSet":{"projectId":true,"promotionId":true,"segmentId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":226,"b":235}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":260,"b":271}]},{"name":"segmentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":294,"b":303},{"a":7959,"b":7968}]}],"statement":"WITH target_segment AS (\n  SELECT project_id, promotion_id, segment_id, analysis_id,\n         audience_snapshot_id, allocation_plan_id,\n         audience_reservation_state\n  FROM promotion_target_segments\n  WHERE project_id = :projectId\n    AND promotion_id = :promotionId\n    AND segment_id = :segmentId\n    AND (\n      status <> 'stopped'\n      OR (\n        audience_snapshot_id IS NOT NULL\n        AND audience_reservation_state IN ('reserved', 'consumed')\n      )\n    )\n),\nlegacy_target AS (\n  SELECT *\n  FROM target_segment\n  WHERE audience_snapshot_id IS NULL\n),\nsnapshot_target AS (\n  SELECT *\n  FROM target_segment\n  WHERE audience_snapshot_id IS NOT NULL\n),\ninvalidated_generation_runs AS (\n  UPDATE generation_runs gr\n  SET status = 'failed',\n      started_at = COALESCE(gr.started_at, now()),\n      finished_at = now(),\n      next_retry_at = NULL,\n      last_error_code = 'generation_invalidated_by_segment_change',\n      last_error_message = 'promotion target segments changed after generation',\n      worker_id = NULL,\n      lease_token = NULL,\n      heartbeat_at = NULL,\n      lease_expires_at = NULL,\n      updated_at = now()\n  FROM legacy_target target\n  WHERE gr.project_id = target.project_id\n    AND gr.promotion_id = target.promotion_id\n    AND gr.analysis_id = target.analysis_id\n    AND gr.status <> 'failed'\n  RETURNING gr.generation_id\n),\narchived_generation_content_candidates AS (\n  UPDATE content_candidates cc\n  SET status = 'archived',\n      updated_at = now()\n  FROM generation_runs gr,\n       legacy_target target,\n       (SELECT count(*) FROM invalidated_generation_runs) dependency\n  WHERE gr.project_id = target.project_id\n    AND gr.promotion_id = target.promotion_id\n    AND gr.analysis_id = target.analysis_id\n    AND cc.project_id = gr.project_id\n    AND cc.generation_id = gr.generation_id\n    AND cc.segment_id <> target.segment_id\n    AND cc.status IN ('draft', 'approved', 'active')\n  RETURNING cc.content_id\n),\ndeleted_dispatch_jobs AS (\n  DELETE FROM ad_dispatch_jobs adj\n  USING legacy_target target,\n        (SELECT count(*) FROM archived_generation_content_candidates) dependency\n  WHERE adj.project_id = target.project_id\n    AND adj.promotion_id = target.promotion_id\n    AND adj.ad_experiment_id IN (\n      SELECT ae.ad_experiment_id\n      FROM ad_experiments ae\n      WHERE ae.project_id = target.project_id\n        AND ae.promotion_id = target.promotion_id\n        AND ae.segment_id = target.segment_id\n    )\n  RETURNING adj.ad_dispatch_job_id\n),\ndeleted_promotion_evaluations AS (\n  DELETE FROM promotion_evaluations pe\n  USING legacy_target target,\n        (SELECT count(*) FROM deleted_dispatch_jobs) dependency\n  WHERE pe.project_id = target.project_id\n    AND pe.promotion_id = target.promotion_id\n    AND pe.segment_id = target.segment_id\n  RETURNING pe.promotion_run_id\n),\ndeleted_ad_experiments AS (\n  DELETE FROM ad_experiments ae\n  USING legacy_target target,\n        (SELECT count(*) FROM deleted_promotion_evaluations) dependency\n  WHERE ae.project_id = target.project_id\n    AND ae.promotion_id = target.promotion_id\n    AND ae.segment_id = target.segment_id\n  RETURNING ae.ad_experiment_id\n),\ndeleted_content_candidates AS (\n  DELETE FROM content_candidates cc\n  USING legacy_target target,\n        (SELECT count(*) FROM deleted_ad_experiments) dependency\n  WHERE cc.project_id = target.project_id\n    AND cc.promotion_id = target.promotion_id\n    AND cc.segment_id = target.segment_id\n  RETURNING cc.content_id\n),\ndeleted_target_segment AS (\n  DELETE FROM promotion_target_segments pts\n  USING legacy_target target,\n        (SELECT count(*) FROM deleted_content_candidates) dependency\n  WHERE pts.project_id = target.project_id\n    AND pts.promotion_id = target.promotion_id\n    AND pts.segment_id = target.segment_id\n  RETURNING pts.promotion_id, pts.segment_id, 'stopped'::text AS status\n),\ncancelled_snapshot_dispatch_jobs AS (\n  UPDATE ad_dispatch_jobs adj\n  SET status = 'cancelled',\n      completed_at = COALESCE(adj.completed_at, now())\n  FROM snapshot_target target\n  WHERE adj.project_id = target.project_id\n    AND adj.promotion_id = target.promotion_id\n    AND adj.status IN ('queued', 'scheduled', 'running')\n    AND adj.ad_experiment_id IN (\n      SELECT ae.ad_experiment_id\n      FROM ad_experiments ae\n      WHERE ae.project_id = target.project_id\n        AND ae.promotion_id = target.promotion_id\n        AND ae.segment_id = target.segment_id\n    )\n  RETURNING adj.ad_dispatch_job_id\n),\nsnapshot_run_ids AS (\n  SELECT DISTINCT ae.promotion_run_id\n  FROM ad_experiments ae\n  JOIN snapshot_target target\n    ON ae.project_id = target.project_id\n   AND ae.promotion_id = target.promotion_id\n   AND ae.segment_id = target.segment_id\n  WHERE ae.promotion_run_id IS NOT NULL\n),\nstopped_snapshot_experiments AS (\n  UPDATE ad_experiments ae\n  SET status = 'stopped',\n      ended_at = COALESCE(ae.ended_at, now()),\n      updated_at = now()\n  FROM snapshot_target target,\n       (SELECT count(*) FROM cancelled_snapshot_dispatch_jobs) dependency\n  WHERE ae.project_id = target.project_id\n    AND ae.promotion_id = target.promotion_id\n    AND ae.segment_id = target.segment_id\n    AND ae.status <> 'stopped'\n  RETURNING ae.promotion_run_id\n),\nstopped_snapshot_runs AS (\n  UPDATE promotion_runs pr\n  SET status = 'stopped',\n      ended_at = COALESCE(pr.ended_at, now()),\n      updated_at = now()\n  FROM snapshot_target target,\n       (SELECT count(*) FROM stopped_snapshot_experiments) dependency\n  WHERE pr.project_id = target.project_id\n    AND pr.promotion_id = target.promotion_id\n    AND pr.promotion_run_id IN (\n      SELECT promotion_run_id\n      FROM snapshot_run_ids\n    )\n    AND pr.status <> 'stopped'\n    AND NOT EXISTS (\n      SELECT 1\n      FROM ad_experiments other\n      WHERE other.promotion_run_id = pr.promotion_run_id\n        AND other.segment_id <> target.segment_id\n        AND other.status <> 'stopped'\n    )\n  RETURNING pr.promotion_run_id\n),\ncancelled_snapshot_automation_jobs AS (\n  UPDATE promotion_automation_jobs paj\n  SET status = 'cancelled',\n      worker_id = NULL,\n      lease_token = NULL,\n      locked_at = NULL,\n      lease_expires_at = NULL,\n      updated_at = now()\n  WHERE paj.promotion_run_id IN (\n      SELECT promotion_run_id\n      FROM stopped_snapshot_runs\n    )\n    AND paj.status IN ('pending', 'running')\n  RETURNING paj.job_id\n),\narchived_snapshot_content_candidates AS (\n  UPDATE content_candidates cc\n  SET status = 'archived',\n      updated_at = now()\n  FROM snapshot_target target,\n       (SELECT count(*) FROM cancelled_snapshot_automation_jobs) dependency\n  WHERE cc.project_id = target.project_id\n    AND cc.promotion_id = target.promotion_id\n    AND cc.segment_id = target.segment_id\n    AND cc.status IN ('draft', 'approved', 'active')\n  RETURNING cc.content_id\n),\narchived_snapshot_segment_definitions AS (\n  UPDATE segment_definitions sd\n  SET status = 'archived',\n      updated_at = now()\n  FROM snapshot_target target,\n       (SELECT count(*) FROM archived_snapshot_content_candidates) dependency\n  WHERE sd.project_id = target.project_id\n    AND sd.promotion_id = target.promotion_id\n    AND sd.segment_id = target.segment_id\n    AND sd.source IN ('custom_chatkit', 'manual_rule')\n    AND sd.status = 'active'\n  RETURNING sd.segment_id\n),\nstopped_snapshot_target AS (\n  UPDATE promotion_target_segments pts\n  SET status = 'stopped'\n  FROM snapshot_target target\n  CROSS JOIN (SELECT count(*) FROM archived_snapshot_segment_definitions) dependency\n  WHERE pts.project_id = target.project_id\n    AND pts.promotion_id = target.promotion_id\n    AND pts.analysis_id = target.analysis_id\n    AND pts.segment_id = target.segment_id\n  RETURNING\n    pts.promotion_id,\n    pts.segment_id,\n    pts.status\n)\nSELECT promotion_id AS \"promotionId\", segment_id AS \"segmentId\", status\nFROM deleted_target_segment\nUNION ALL\nSELECT promotion_id AS \"promotionId\", segment_id AS \"segmentId\", status\nFROM stopped_snapshot_target\nWHERE segment_id = :segmentId                                           "};

/**
 * Query generated from SQL:
 * ```
 * WITH target_segment AS (
 *   SELECT project_id, promotion_id, segment_id, analysis_id,
 *          audience_snapshot_id, allocation_plan_id,
 *          audience_reservation_state
 *   FROM promotion_target_segments
 *   WHERE project_id = :projectId
 *     AND promotion_id = :promotionId
 *     AND segment_id = :segmentId
 *     AND (
 *       status <> 'stopped'
 *       OR (
 *         audience_snapshot_id IS NOT NULL
 *         AND audience_reservation_state IN ('reserved', 'consumed')
 *       )
 *     )
 * ),
 * legacy_target AS (
 *   SELECT *
 *   FROM target_segment
 *   WHERE audience_snapshot_id IS NULL
 * ),
 * snapshot_target AS (
 *   SELECT *
 *   FROM target_segment
 *   WHERE audience_snapshot_id IS NOT NULL
 * ),
 * invalidated_generation_runs AS (
 *   UPDATE generation_runs gr
 *   SET status = 'failed',
 *       started_at = COALESCE(gr.started_at, now()),
 *       finished_at = now(),
 *       next_retry_at = NULL,
 *       last_error_code = 'generation_invalidated_by_segment_change',
 *       last_error_message = 'promotion target segments changed after generation',
 *       worker_id = NULL,
 *       lease_token = NULL,
 *       heartbeat_at = NULL,
 *       lease_expires_at = NULL,
 *       updated_at = now()
 *   FROM legacy_target target
 *   WHERE gr.project_id = target.project_id
 *     AND gr.promotion_id = target.promotion_id
 *     AND gr.analysis_id = target.analysis_id
 *     AND gr.status <> 'failed'
 *   RETURNING gr.generation_id
 * ),
 * archived_generation_content_candidates AS (
 *   UPDATE content_candidates cc
 *   SET status = 'archived',
 *       updated_at = now()
 *   FROM generation_runs gr,
 *        legacy_target target,
 *        (SELECT count(*) FROM invalidated_generation_runs) dependency
 *   WHERE gr.project_id = target.project_id
 *     AND gr.promotion_id = target.promotion_id
 *     AND gr.analysis_id = target.analysis_id
 *     AND cc.project_id = gr.project_id
 *     AND cc.generation_id = gr.generation_id
 *     AND cc.segment_id <> target.segment_id
 *     AND cc.status IN ('draft', 'approved', 'active')
 *   RETURNING cc.content_id
 * ),
 * deleted_dispatch_jobs AS (
 *   DELETE FROM ad_dispatch_jobs adj
 *   USING legacy_target target,
 *         (SELECT count(*) FROM archived_generation_content_candidates) dependency
 *   WHERE adj.project_id = target.project_id
 *     AND adj.promotion_id = target.promotion_id
 *     AND adj.ad_experiment_id IN (
 *       SELECT ae.ad_experiment_id
 *       FROM ad_experiments ae
 *       WHERE ae.project_id = target.project_id
 *         AND ae.promotion_id = target.promotion_id
 *         AND ae.segment_id = target.segment_id
 *     )
 *   RETURNING adj.ad_dispatch_job_id
 * ),
 * deleted_promotion_evaluations AS (
 *   DELETE FROM promotion_evaluations pe
 *   USING legacy_target target,
 *         (SELECT count(*) FROM deleted_dispatch_jobs) dependency
 *   WHERE pe.project_id = target.project_id
 *     AND pe.promotion_id = target.promotion_id
 *     AND pe.segment_id = target.segment_id
 *   RETURNING pe.promotion_run_id
 * ),
 * deleted_ad_experiments AS (
 *   DELETE FROM ad_experiments ae
 *   USING legacy_target target,
 *         (SELECT count(*) FROM deleted_promotion_evaluations) dependency
 *   WHERE ae.project_id = target.project_id
 *     AND ae.promotion_id = target.promotion_id
 *     AND ae.segment_id = target.segment_id
 *   RETURNING ae.ad_experiment_id
 * ),
 * deleted_content_candidates AS (
 *   DELETE FROM content_candidates cc
 *   USING legacy_target target,
 *         (SELECT count(*) FROM deleted_ad_experiments) dependency
 *   WHERE cc.project_id = target.project_id
 *     AND cc.promotion_id = target.promotion_id
 *     AND cc.segment_id = target.segment_id
 *   RETURNING cc.content_id
 * ),
 * deleted_target_segment AS (
 *   DELETE FROM promotion_target_segments pts
 *   USING legacy_target target,
 *         (SELECT count(*) FROM deleted_content_candidates) dependency
 *   WHERE pts.project_id = target.project_id
 *     AND pts.promotion_id = target.promotion_id
 *     AND pts.segment_id = target.segment_id
 *   RETURNING pts.promotion_id, pts.segment_id, 'stopped'::text AS status
 * ),
 * cancelled_snapshot_dispatch_jobs AS (
 *   UPDATE ad_dispatch_jobs adj
 *   SET status = 'cancelled',
 *       completed_at = COALESCE(adj.completed_at, now())
 *   FROM snapshot_target target
 *   WHERE adj.project_id = target.project_id
 *     AND adj.promotion_id = target.promotion_id
 *     AND adj.status IN ('queued', 'scheduled', 'running')
 *     AND adj.ad_experiment_id IN (
 *       SELECT ae.ad_experiment_id
 *       FROM ad_experiments ae
 *       WHERE ae.project_id = target.project_id
 *         AND ae.promotion_id = target.promotion_id
 *         AND ae.segment_id = target.segment_id
 *     )
 *   RETURNING adj.ad_dispatch_job_id
 * ),
 * snapshot_run_ids AS (
 *   SELECT DISTINCT ae.promotion_run_id
 *   FROM ad_experiments ae
 *   JOIN snapshot_target target
 *     ON ae.project_id = target.project_id
 *    AND ae.promotion_id = target.promotion_id
 *    AND ae.segment_id = target.segment_id
 *   WHERE ae.promotion_run_id IS NOT NULL
 * ),
 * stopped_snapshot_experiments AS (
 *   UPDATE ad_experiments ae
 *   SET status = 'stopped',
 *       ended_at = COALESCE(ae.ended_at, now()),
 *       updated_at = now()
 *   FROM snapshot_target target,
 *        (SELECT count(*) FROM cancelled_snapshot_dispatch_jobs) dependency
 *   WHERE ae.project_id = target.project_id
 *     AND ae.promotion_id = target.promotion_id
 *     AND ae.segment_id = target.segment_id
 *     AND ae.status <> 'stopped'
 *   RETURNING ae.promotion_run_id
 * ),
 * stopped_snapshot_runs AS (
 *   UPDATE promotion_runs pr
 *   SET status = 'stopped',
 *       ended_at = COALESCE(pr.ended_at, now()),
 *       updated_at = now()
 *   FROM snapshot_target target,
 *        (SELECT count(*) FROM stopped_snapshot_experiments) dependency
 *   WHERE pr.project_id = target.project_id
 *     AND pr.promotion_id = target.promotion_id
 *     AND pr.promotion_run_id IN (
 *       SELECT promotion_run_id
 *       FROM snapshot_run_ids
 *     )
 *     AND pr.status <> 'stopped'
 *     AND NOT EXISTS (
 *       SELECT 1
 *       FROM ad_experiments other
 *       WHERE other.promotion_run_id = pr.promotion_run_id
 *         AND other.segment_id <> target.segment_id
 *         AND other.status <> 'stopped'
 *     )
 *   RETURNING pr.promotion_run_id
 * ),
 * cancelled_snapshot_automation_jobs AS (
 *   UPDATE promotion_automation_jobs paj
 *   SET status = 'cancelled',
 *       worker_id = NULL,
 *       lease_token = NULL,
 *       locked_at = NULL,
 *       lease_expires_at = NULL,
 *       updated_at = now()
 *   WHERE paj.promotion_run_id IN (
 *       SELECT promotion_run_id
 *       FROM stopped_snapshot_runs
 *     )
 *     AND paj.status IN ('pending', 'running')
 *   RETURNING paj.job_id
 * ),
 * archived_snapshot_content_candidates AS (
 *   UPDATE content_candidates cc
 *   SET status = 'archived',
 *       updated_at = now()
 *   FROM snapshot_target target,
 *        (SELECT count(*) FROM cancelled_snapshot_automation_jobs) dependency
 *   WHERE cc.project_id = target.project_id
 *     AND cc.promotion_id = target.promotion_id
 *     AND cc.segment_id = target.segment_id
 *     AND cc.status IN ('draft', 'approved', 'active')
 *   RETURNING cc.content_id
 * ),
 * archived_snapshot_segment_definitions AS (
 *   UPDATE segment_definitions sd
 *   SET status = 'archived',
 *       updated_at = now()
 *   FROM snapshot_target target,
 *        (SELECT count(*) FROM archived_snapshot_content_candidates) dependency
 *   WHERE sd.project_id = target.project_id
 *     AND sd.promotion_id = target.promotion_id
 *     AND sd.segment_id = target.segment_id
 *     AND sd.source IN ('custom_chatkit', 'manual_rule')
 *     AND sd.status = 'active'
 *   RETURNING sd.segment_id
 * ),
 * stopped_snapshot_target AS (
 *   UPDATE promotion_target_segments pts
 *   SET status = 'stopped'
 *   FROM snapshot_target target
 *   CROSS JOIN (SELECT count(*) FROM archived_snapshot_segment_definitions) dependency
 *   WHERE pts.project_id = target.project_id
 *     AND pts.promotion_id = target.promotion_id
 *     AND pts.analysis_id = target.analysis_id
 *     AND pts.segment_id = target.segment_id
 *   RETURNING
 *     pts.promotion_id,
 *     pts.segment_id,
 *     pts.status
 * )
 * SELECT promotion_id AS "promotionId", segment_id AS "segmentId", status
 * FROM deleted_target_segment
 * UNION ALL
 * SELECT promotion_id AS "promotionId", segment_id AS "segmentId", status
 * FROM stopped_snapshot_target
 * WHERE segment_id = :segmentId
 * ```
 */
export const stopDashboardPromotionTargetSegment = new PreparedQuery<IStopDashboardPromotionTargetSegmentParams,IStopDashboardPromotionTargetSegmentResult>(stopDashboardPromotionTargetSegmentIR);


/** 'ReleaseDashboardPromotionTargetAudience' parameters type */
export interface IReleaseDashboardPromotionTargetAudienceParams {
  projectId?: string | null | void;
  promotionId?: string | null | void;
  segmentId?: string | null | void;
}

/** 'ReleaseDashboardPromotionTargetAudience' return type */
export interface IReleaseDashboardPromotionTargetAudienceResult {
  releasedTargetCount: number | null;
  releasedUserCount: number | null;
}

/** 'ReleaseDashboardPromotionTargetAudience' query type */
export interface IReleaseDashboardPromotionTargetAudienceQuery {
  params: IReleaseDashboardPromotionTargetAudienceParams;
  result: IReleaseDashboardPromotionTargetAudienceResult;
}

const releaseDashboardPromotionTargetAudienceIR: any = {"usedParamSet":{"projectId":true,"promotionId":true,"segmentId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":226,"b":235}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":260,"b":271}]},{"name":"segmentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":294,"b":303}]}],"statement":"WITH target_segment AS (\n  SELECT project_id, promotion_id, segment_id, analysis_id,\n         audience_snapshot_id, allocation_plan_id,\n         audience_reservation_state\n  FROM promotion_target_segments\n  WHERE project_id = :projectId\n    AND promotion_id = :promotionId\n    AND segment_id = :segmentId\n    AND status = 'stopped'\n    AND audience_snapshot_id IS NOT NULL\n    AND audience_reservation_state IN ('reserved', 'consumed')\n),\nadvanced_exclusion_revision AS (\n  SELECT\n    target.*,\n    advance_promotion_audience_exclusion_revision(target.promotion_id)\n      AS revision\n  FROM target_segment target\n),\nreleased_exclusion_members AS (\n  UPDATE promotion_audience_exclusion_members excluded\n  SET state = 'released',\n      revision = advanced.revision,\n      consumed_at = NULL,\n      released_at = now()\n  FROM advanced_exclusion_revision advanced\n  WHERE excluded.project_id = advanced.project_id\n    AND excluded.promotion_id = advanced.promotion_id\n    AND excluded.target_analysis_id = advanced.analysis_id\n    AND excluded.segment_id = advanced.segment_id\n    AND excluded.allocation_plan_id = advanced.allocation_plan_id\n    AND excluded.final_snapshot_id = advanced.audience_snapshot_id\n    AND excluded.state IN ('reserved', 'consumed')\n  RETURNING excluded.user_id\n),\nreleased_target AS (\n  UPDATE promotion_target_segments pts\n  SET audience_reservation_state = 'released'\n  FROM advanced_exclusion_revision advanced,\n       (SELECT count(*) FROM released_exclusion_members) dependency\n  WHERE pts.project_id = advanced.project_id\n    AND pts.promotion_id = advanced.promotion_id\n    AND pts.analysis_id = advanced.analysis_id\n    AND pts.segment_id = advanced.segment_id\n    AND pts.allocation_plan_id = advanced.allocation_plan_id\n    AND pts.audience_snapshot_id = advanced.audience_snapshot_id\n  RETURNING pts.allocation_plan_id\n)\nSELECT\n  count(*)::int AS \"releasedTargetCount\",\n  (SELECT count(*)::int FROM released_exclusion_members)\n    AS \"releasedUserCount\"\nFROM released_target                                        "};

/**
 * Query generated from SQL:
 * ```
 * WITH target_segment AS (
 *   SELECT project_id, promotion_id, segment_id, analysis_id,
 *          audience_snapshot_id, allocation_plan_id,
 *          audience_reservation_state
 *   FROM promotion_target_segments
 *   WHERE project_id = :projectId
 *     AND promotion_id = :promotionId
 *     AND segment_id = :segmentId
 *     AND status = 'stopped'
 *     AND audience_snapshot_id IS NOT NULL
 *     AND audience_reservation_state IN ('reserved', 'consumed')
 * ),
 * advanced_exclusion_revision AS (
 *   SELECT
 *     target.*,
 *     advance_promotion_audience_exclusion_revision(target.promotion_id)
 *       AS revision
 *   FROM target_segment target
 * ),
 * released_exclusion_members AS (
 *   UPDATE promotion_audience_exclusion_members excluded
 *   SET state = 'released',
 *       revision = advanced.revision,
 *       consumed_at = NULL,
 *       released_at = now()
 *   FROM advanced_exclusion_revision advanced
 *   WHERE excluded.project_id = advanced.project_id
 *     AND excluded.promotion_id = advanced.promotion_id
 *     AND excluded.target_analysis_id = advanced.analysis_id
 *     AND excluded.segment_id = advanced.segment_id
 *     AND excluded.allocation_plan_id = advanced.allocation_plan_id
 *     AND excluded.final_snapshot_id = advanced.audience_snapshot_id
 *     AND excluded.state IN ('reserved', 'consumed')
 *   RETURNING excluded.user_id
 * ),
 * released_target AS (
 *   UPDATE promotion_target_segments pts
 *   SET audience_reservation_state = 'released'
 *   FROM advanced_exclusion_revision advanced,
 *        (SELECT count(*) FROM released_exclusion_members) dependency
 *   WHERE pts.project_id = advanced.project_id
 *     AND pts.promotion_id = advanced.promotion_id
 *     AND pts.analysis_id = advanced.analysis_id
 *     AND pts.segment_id = advanced.segment_id
 *     AND pts.allocation_plan_id = advanced.allocation_plan_id
 *     AND pts.audience_snapshot_id = advanced.audience_snapshot_id
 *   RETURNING pts.allocation_plan_id
 * )
 * SELECT
 *   count(*)::int AS "releasedTargetCount",
 *   (SELECT count(*)::int FROM released_exclusion_members)
 *     AS "releasedUserCount"
 * FROM released_target
 * ```
 */
export const releaseDashboardPromotionTargetAudience = new PreparedQuery<IReleaseDashboardPromotionTargetAudienceParams,IReleaseDashboardPromotionTargetAudienceResult>(releaseDashboardPromotionTargetAudienceIR);


/** 'ReleaseDashboardPromotionAllocationPlan' parameters type */
export interface IReleaseDashboardPromotionAllocationPlanParams {
  projectId?: string | null | void;
  promotionId?: string | null | void;
  segmentId?: string | null | void;
}

/** 'ReleaseDashboardPromotionAllocationPlan' return type */
export interface IReleaseDashboardPromotionAllocationPlanResult {
  allocationPlanId: string;
}

/** 'ReleaseDashboardPromotionAllocationPlan' query type */
export interface IReleaseDashboardPromotionAllocationPlanQuery {
  params: IReleaseDashboardPromotionAllocationPlanParams;
  result: IReleaseDashboardPromotionAllocationPlanResult;
}

const releaseDashboardPromotionAllocationPlanIR: any = {"usedParamSet":{"projectId":true,"promotionId":true,"segmentId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":261,"b":270}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":304,"b":315}]},{"name":"segmentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":347,"b":356}]}],"statement":"UPDATE segment_audience_allocation_plans plan\nSET status = 'released',\n    locked_at = NULL,\n    released_at = now()\nWHERE plan.allocation_plan_id IN (\n    SELECT target.allocation_plan_id\n    FROM promotion_target_segments target\n    WHERE target.project_id = :projectId\n      AND target.promotion_id = :promotionId\n      AND target.segment_id = :segmentId\n      AND target.status = 'stopped'\n      AND target.audience_reservation_state = 'released'\n)\n  AND plan.status IN ('finalized', 'locked')\n  AND NOT EXISTS (\n    SELECT 1\n    FROM promotion_run_target_bindings binding\n    WHERE binding.allocation_plan_id = plan.allocation_plan_id\n  )\n  AND NOT EXISTS (\n    SELECT 1\n    FROM promotion_target_segments other\n    WHERE other.allocation_plan_id = plan.allocation_plan_id\n      AND (\n        other.status <> 'stopped'\n        OR other.audience_reservation_state <> 'released'\n      )\n  )\nRETURNING plan.allocation_plan_id AS \"allocationPlanId\"                                                  "};

/**
 * Query generated from SQL:
 * ```
 * UPDATE segment_audience_allocation_plans plan
 * SET status = 'released',
 *     locked_at = NULL,
 *     released_at = now()
 * WHERE plan.allocation_plan_id IN (
 *     SELECT target.allocation_plan_id
 *     FROM promotion_target_segments target
 *     WHERE target.project_id = :projectId
 *       AND target.promotion_id = :promotionId
 *       AND target.segment_id = :segmentId
 *       AND target.status = 'stopped'
 *       AND target.audience_reservation_state = 'released'
 * )
 *   AND plan.status IN ('finalized', 'locked')
 *   AND NOT EXISTS (
 *     SELECT 1
 *     FROM promotion_run_target_bindings binding
 *     WHERE binding.allocation_plan_id = plan.allocation_plan_id
 *   )
 *   AND NOT EXISTS (
 *     SELECT 1
 *     FROM promotion_target_segments other
 *     WHERE other.allocation_plan_id = plan.allocation_plan_id
 *       AND (
 *         other.status <> 'stopped'
 *         OR other.audience_reservation_state <> 'released'
 *       )
 *   )
 * RETURNING plan.allocation_plan_id AS "allocationPlanId"
 * ```
 */
export const releaseDashboardPromotionAllocationPlan = new PreparedQuery<IReleaseDashboardPromotionAllocationPlanParams,IReleaseDashboardPromotionAllocationPlanResult>(releaseDashboardPromotionAllocationPlanIR);


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

const listDashboardPromotionAnalysesIR: any = {"usedParamSet":{"projectId":true,"promotionId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":406,"b":415}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":438,"b":449}]}],"statement":"SELECT\n  analysis_id AS \"analysisId\",\n  promotion_id AS \"promotionId\",\n  focus_segment_ids_json AS \"focusSegmentIdsJson\",\n  operator_instruction AS \"operatorInstruction\",\n  input_snapshot_json AS \"inputSnapshotJson\",\n  profile_summary_json AS \"profileSummaryJson\",\n  output_json AS \"outputJson\",\n  status,\n  created_at AS \"createdAt\",\n  updated_at AS \"updatedAt\"\nFROM promotion_analyses\nWHERE project_id = :projectId\n  AND promotion_id = :promotionId\n\nORDER BY updated_at DESC, created_at DESC                                   "};

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
 *
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

const listDashboardCampaignExperimentMetricsIR: any = {"usedParamSet":{"projectId":true,"campaignId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":952,"b":961}]},{"name":"campaignId","required":false,"transform":{"type":"scalar"},"locs":[{"a":986,"b":996}]}],"statement":"SELECT\n  pe.promotion_id AS \"promotionId\",\n  pe.promotion_run_id AS \"promotionRunId\",\n  pe.ad_experiment_id AS \"adExperimentId\",\n  pe.segment_id AS \"segmentId\",\n  pe.content_id AS \"contentId\",\n  pe.content_option_id AS \"contentOptionId\",\n  pe.metric,\n  CAST(pe.target_value AS float8) AS \"targetValue\",\n  CAST(pe.actual_value AS float8) AS \"actualValue\",\n  pe.numerator_count AS \"numeratorCount\",\n  pe.denominator_count AS \"denominatorCount\",\n  pe.sample_size AS \"sampleSize\",\n  pe.basis,\n  pe.status,\n  pe.feedback,\n  pe.next_loop_required AS \"nextLoopRequired\",\n  pe.result_json AS \"resultJson\",\n  pe.created_at AS \"createdAt\"\nFROM promotion_evaluations pe\nJOIN promotion_runs pr\n  ON pr.project_id = pe.project_id\n AND pr.promotion_run_id = pe.promotion_run_id\n AND pr.status <> 'stopped'\nLEFT JOIN ad_experiments ae\n  ON ae.project_id = pe.project_id\n AND ae.ad_experiment_id = pe.ad_experiment_id\n AND ae.status <> 'stopped'\nWHERE pe.project_id = :projectId\n  AND pe.campaign_id = :campaignId\n  AND (pe.ad_experiment_id IS NULL OR ae.ad_experiment_id IS NOT NULL)\n\nORDER BY pe.created_at DESC                               "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   pe.promotion_id AS "promotionId",
 *   pe.promotion_run_id AS "promotionRunId",
 *   pe.ad_experiment_id AS "adExperimentId",
 *   pe.segment_id AS "segmentId",
 *   pe.content_id AS "contentId",
 *   pe.content_option_id AS "contentOptionId",
 *   pe.metric,
 *   CAST(pe.target_value AS float8) AS "targetValue",
 *   CAST(pe.actual_value AS float8) AS "actualValue",
 *   pe.numerator_count AS "numeratorCount",
 *   pe.denominator_count AS "denominatorCount",
 *   pe.sample_size AS "sampleSize",
 *   pe.basis,
 *   pe.status,
 *   pe.feedback,
 *   pe.next_loop_required AS "nextLoopRequired",
 *   pe.result_json AS "resultJson",
 *   pe.created_at AS "createdAt"
 * FROM promotion_evaluations pe
 * JOIN promotion_runs pr
 *   ON pr.project_id = pe.project_id
 *  AND pr.promotion_run_id = pe.promotion_run_id
 *  AND pr.status <> 'stopped'
 * LEFT JOIN ad_experiments ae
 *   ON ae.project_id = pe.project_id
 *  AND ae.ad_experiment_id = pe.ad_experiment_id
 *  AND ae.status <> 'stopped'
 * WHERE pe.project_id = :projectId
 *   AND pe.campaign_id = :campaignId
 *   AND (pe.ad_experiment_id IS NULL OR ae.ad_experiment_id IS NOT NULL)
 *
 * ORDER BY pe.created_at DESC
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

const listDashboardPromotionExperimentMetricsIR: any = {"usedParamSet":{"projectId":true,"promotionId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":952,"b":961}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":987,"b":998}]}],"statement":"SELECT\n  pe.promotion_id AS \"promotionId\",\n  pe.promotion_run_id AS \"promotionRunId\",\n  pe.ad_experiment_id AS \"adExperimentId\",\n  pe.segment_id AS \"segmentId\",\n  pe.content_id AS \"contentId\",\n  pe.content_option_id AS \"contentOptionId\",\n  pe.metric,\n  CAST(pe.target_value AS float8) AS \"targetValue\",\n  CAST(pe.actual_value AS float8) AS \"actualValue\",\n  pe.numerator_count AS \"numeratorCount\",\n  pe.denominator_count AS \"denominatorCount\",\n  pe.sample_size AS \"sampleSize\",\n  pe.basis,\n  pe.status,\n  pe.feedback,\n  pe.next_loop_required AS \"nextLoopRequired\",\n  pe.result_json AS \"resultJson\",\n  pe.created_at AS \"createdAt\"\nFROM promotion_evaluations pe\nJOIN promotion_runs pr\n  ON pr.project_id = pe.project_id\n AND pr.promotion_run_id = pe.promotion_run_id\n AND pr.status <> 'stopped'\nLEFT JOIN ad_experiments ae\n  ON ae.project_id = pe.project_id\n AND ae.ad_experiment_id = pe.ad_experiment_id\n AND ae.status <> 'stopped'\nWHERE pe.project_id = :projectId\n  AND pe.promotion_id = :promotionId\n  AND (pe.ad_experiment_id IS NULL OR ae.ad_experiment_id IS NOT NULL)\n\nORDER BY pe.created_at DESC                                   "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   pe.promotion_id AS "promotionId",
 *   pe.promotion_run_id AS "promotionRunId",
 *   pe.ad_experiment_id AS "adExperimentId",
 *   pe.segment_id AS "segmentId",
 *   pe.content_id AS "contentId",
 *   pe.content_option_id AS "contentOptionId",
 *   pe.metric,
 *   CAST(pe.target_value AS float8) AS "targetValue",
 *   CAST(pe.actual_value AS float8) AS "actualValue",
 *   pe.numerator_count AS "numeratorCount",
 *   pe.denominator_count AS "denominatorCount",
 *   pe.sample_size AS "sampleSize",
 *   pe.basis,
 *   pe.status,
 *   pe.feedback,
 *   pe.next_loop_required AS "nextLoopRequired",
 *   pe.result_json AS "resultJson",
 *   pe.created_at AS "createdAt"
 * FROM promotion_evaluations pe
 * JOIN promotion_runs pr
 *   ON pr.project_id = pe.project_id
 *  AND pr.promotion_run_id = pe.promotion_run_id
 *  AND pr.status <> 'stopped'
 * LEFT JOIN ad_experiments ae
 *   ON ae.project_id = pe.project_id
 *  AND ae.ad_experiment_id = pe.ad_experiment_id
 *  AND ae.status <> 'stopped'
 * WHERE pe.project_id = :projectId
 *   AND pe.promotion_id = :promotionId
 *   AND (pe.ad_experiment_id IS NULL OR ae.ad_experiment_id IS NOT NULL)
 *
 * ORDER BY pe.created_at DESC
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

const listDashboardSegmentExperimentMetricsIR: any = {"usedParamSet":{"projectId":true,"promotionId":true,"segmentId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":952,"b":961}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":987,"b":998}]},{"name":"segmentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1022,"b":1031}]}],"statement":"SELECT\n  pe.promotion_id AS \"promotionId\",\n  pe.promotion_run_id AS \"promotionRunId\",\n  pe.ad_experiment_id AS \"adExperimentId\",\n  pe.segment_id AS \"segmentId\",\n  pe.content_id AS \"contentId\",\n  pe.content_option_id AS \"contentOptionId\",\n  pe.metric,\n  CAST(pe.target_value AS float8) AS \"targetValue\",\n  CAST(pe.actual_value AS float8) AS \"actualValue\",\n  pe.numerator_count AS \"numeratorCount\",\n  pe.denominator_count AS \"denominatorCount\",\n  pe.sample_size AS \"sampleSize\",\n  pe.basis,\n  pe.status,\n  pe.feedback,\n  pe.next_loop_required AS \"nextLoopRequired\",\n  pe.result_json AS \"resultJson\",\n  pe.created_at AS \"createdAt\"\nFROM promotion_evaluations pe\nJOIN promotion_runs pr\n  ON pr.project_id = pe.project_id\n AND pr.promotion_run_id = pe.promotion_run_id\n AND pr.status <> 'stopped'\nLEFT JOIN ad_experiments ae\n  ON ae.project_id = pe.project_id\n AND ae.ad_experiment_id = pe.ad_experiment_id\n AND ae.status <> 'stopped'\nWHERE pe.project_id = :projectId\n  AND pe.promotion_id = :promotionId\n  AND pe.segment_id = :segmentId\n  AND (pe.ad_experiment_id IS NULL OR ae.ad_experiment_id IS NOT NULL)\n\nORDER BY pe.created_at DESC                                        "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   pe.promotion_id AS "promotionId",
 *   pe.promotion_run_id AS "promotionRunId",
 *   pe.ad_experiment_id AS "adExperimentId",
 *   pe.segment_id AS "segmentId",
 *   pe.content_id AS "contentId",
 *   pe.content_option_id AS "contentOptionId",
 *   pe.metric,
 *   CAST(pe.target_value AS float8) AS "targetValue",
 *   CAST(pe.actual_value AS float8) AS "actualValue",
 *   pe.numerator_count AS "numeratorCount",
 *   pe.denominator_count AS "denominatorCount",
 *   pe.sample_size AS "sampleSize",
 *   pe.basis,
 *   pe.status,
 *   pe.feedback,
 *   pe.next_loop_required AS "nextLoopRequired",
 *   pe.result_json AS "resultJson",
 *   pe.created_at AS "createdAt"
 * FROM promotion_evaluations pe
 * JOIN promotion_runs pr
 *   ON pr.project_id = pe.project_id
 *  AND pr.promotion_run_id = pe.promotion_run_id
 *  AND pr.status <> 'stopped'
 * LEFT JOIN ad_experiments ae
 *   ON ae.project_id = pe.project_id
 *  AND ae.ad_experiment_id = pe.ad_experiment_id
 *  AND ae.status <> 'stopped'
 * WHERE pe.project_id = :projectId
 *   AND pe.promotion_id = :promotionId
 *   AND pe.segment_id = :segmentId
 *   AND (pe.ad_experiment_id IS NULL OR ae.ad_experiment_id IS NOT NULL)
 *
 * ORDER BY pe.created_at DESC
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

const getDashboardCampaignDeliveryStatusIR: any = {"usedParamSet":{"projectId":true,"campaignId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":609,"b":618}]},{"name":"campaignId","required":false,"transform":{"type":"scalar"},"locs":[{"a":644,"b":654}]}],"statement":"SELECT\n  COALESCE(SUM(target_count), 0)::int AS \"scheduledCount\",\n  COALESCE(SUM(sent_count), 0)::int AS \"sentCount\",\n  COALESCE(SUM(sent_count), 0)::int AS \"deliveredCount\",\n  0::int AS \"openedCount\",\n  0::int AS \"bouncedCount\",\n  COALESCE(SUM(failed_count), 0)::int AS \"failedCount\"\nFROM ad_dispatch_jobs adj\nJOIN promotion_runs pr\n  ON pr.project_id = adj.project_id\n AND pr.promotion_run_id = adj.promotion_run_id\n AND pr.status <> 'stopped'\nLEFT JOIN ad_experiments ae\n  ON ae.project_id = adj.project_id\n AND ae.ad_experiment_id = adj.ad_experiment_id\n AND ae.status <> 'stopped'\nWHERE adj.project_id = :projectId\n  AND adj.campaign_id = :campaignId\n  AND adj.channel IN ('email', 'sms')\n  AND (adj.ad_experiment_id IS NULL OR ae.ad_experiment_id IS NOT NULL)                                         "};

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
 * FROM ad_dispatch_jobs adj
 * JOIN promotion_runs pr
 *   ON pr.project_id = adj.project_id
 *  AND pr.promotion_run_id = adj.promotion_run_id
 *  AND pr.status <> 'stopped'
 * LEFT JOIN ad_experiments ae
 *   ON ae.project_id = adj.project_id
 *  AND ae.ad_experiment_id = adj.ad_experiment_id
 *  AND ae.status <> 'stopped'
 * WHERE adj.project_id = :projectId
 *   AND adj.campaign_id = :campaignId
 *   AND adj.channel IN ('email', 'sms')
 *   AND (adj.ad_experiment_id IS NULL OR ae.ad_experiment_id IS NOT NULL)
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

const getDashboardPromotionDeliveryStatusIR: any = {"usedParamSet":{"projectId":true,"promotionId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":609,"b":618}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":645,"b":656}]}],"statement":"SELECT\n  COALESCE(SUM(target_count), 0)::int AS \"scheduledCount\",\n  COALESCE(SUM(sent_count), 0)::int AS \"sentCount\",\n  COALESCE(SUM(sent_count), 0)::int AS \"deliveredCount\",\n  0::int AS \"openedCount\",\n  0::int AS \"bouncedCount\",\n  COALESCE(SUM(failed_count), 0)::int AS \"failedCount\"\nFROM ad_dispatch_jobs adj\nJOIN promotion_runs pr\n  ON pr.project_id = adj.project_id\n AND pr.promotion_run_id = adj.promotion_run_id\n AND pr.status <> 'stopped'\nLEFT JOIN ad_experiments ae\n  ON ae.project_id = adj.project_id\n AND ae.ad_experiment_id = adj.ad_experiment_id\n AND ae.status <> 'stopped'\nWHERE adj.project_id = :projectId\n  AND adj.promotion_id = :promotionId\n  AND adj.channel IN ('email', 'sms')\n  AND (adj.ad_experiment_id IS NULL OR ae.ad_experiment_id IS NOT NULL)                                         "};

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
 * FROM ad_dispatch_jobs adj
 * JOIN promotion_runs pr
 *   ON pr.project_id = adj.project_id
 *  AND pr.promotion_run_id = adj.promotion_run_id
 *  AND pr.status <> 'stopped'
 * LEFT JOIN ad_experiments ae
 *   ON ae.project_id = adj.project_id
 *  AND ae.ad_experiment_id = adj.ad_experiment_id
 *  AND ae.status <> 'stopped'
 * WHERE adj.project_id = :projectId
 *   AND adj.promotion_id = :promotionId
 *   AND adj.channel IN ('email', 'sms')
 *   AND (adj.ad_experiment_id IS NULL OR ae.ad_experiment_id IS NOT NULL)
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

const getDashboardSegmentDeliveryStatusIR: any = {"usedParamSet":{"projectId":true,"promotionId":true,"segmentId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":485,"b":494}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":521,"b":532}]},{"name":"segmentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":556,"b":565}]}],"statement":"SELECT\n  COALESCE(SUM(adj.target_count), 0)::int AS \"scheduledCount\",\n  COALESCE(SUM(adj.sent_count), 0)::int AS \"sentCount\",\n  COALESCE(SUM(adj.sent_count), 0)::int AS \"deliveredCount\",\n  0::int AS \"openedCount\",\n  0::int AS \"bouncedCount\",\n  COALESCE(SUM(adj.failed_count), 0)::int AS \"failedCount\"\nFROM ad_dispatch_jobs adj\nJOIN ad_experiments ae\n  ON ae.project_id = adj.project_id\n AND ae.ad_experiment_id = adj.ad_experiment_id\n AND ae.status <> 'stopped'\nWHERE adj.project_id = :projectId\n  AND adj.promotion_id = :promotionId\n  AND ae.segment_id = :segmentId\n  AND adj.channel IN ('email', 'sms')                                              "};

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
 *   ON ae.project_id = adj.project_id
 *  AND ae.ad_experiment_id = adj.ad_experiment_id
 *  AND ae.status <> 'stopped'
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

const listDashboardPromotionSegmentDeliverySummariesIR: any = {"usedParamSet":{"projectId":true,"promotionId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":462,"b":471}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":498,"b":509}]}],"statement":"SELECT\n  ae.segment_id AS \"segmentId\",\n  COALESCE(SUM(adj.target_count), 0)::int AS \"scheduledCount\",\n  COALESCE(SUM(adj.sent_count), 0)::int AS \"sentCount\",\n  COALESCE(SUM(adj.sent_count), 0)::int AS \"deliveredCount\",\n  COALESCE(SUM(adj.failed_count), 0)::int AS \"failedCount\"\nFROM ad_dispatch_jobs adj\nJOIN ad_experiments ae\n  ON ae.project_id = adj.project_id\n AND ae.ad_experiment_id = adj.ad_experiment_id\n AND ae.status <> 'stopped'\nWHERE adj.project_id = :projectId\n  AND adj.promotion_id = :promotionId\n  AND adj.channel IN ('email', 'sms')\nGROUP BY ae.segment_id\nORDER BY COALESCE(SUM(adj.sent_count), 0)::int DESC, ae.segment_id ASC                                 "};

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
 *   ON ae.project_id = adj.project_id
 *  AND ae.ad_experiment_id = adj.ad_experiment_id
 *  AND ae.status <> 'stopped'
 * WHERE adj.project_id = :projectId
 *   AND adj.promotion_id = :promotionId
 *   AND adj.channel IN ('email', 'sms')
 * GROUP BY ae.segment_id
 * ORDER BY COALESCE(SUM(adj.sent_count), 0)::int DESC, ae.segment_id ASC
 * ```
 */
export const listDashboardPromotionSegmentDeliverySummaries = new PreparedQuery<IListDashboardPromotionSegmentDeliverySummariesParams,IListDashboardPromotionSegmentDeliverySummariesResult>(listDashboardPromotionSegmentDeliverySummariesIR);


/** 'ListDashboardCampaignContentCandidates' parameters type */
export interface IListDashboardCampaignContentCandidatesParams {
  campaignId?: string | null | void;
  projectId?: string | null | void;
}

/** 'ListDashboardCampaignContentCandidates' return type */
export interface IListDashboardCampaignContentCandidatesResult {
  analysisId: string;
  body: string | null;
  channel: string;
  contentId: string;
  contentOptionId: string;
  cta: string | null;
  dataEvidenceJson: Json;
  generationId: string;
  generationPrompt: string | null;
  imagePrompt: string | null;
  imageUrl: string | null;
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

/** 'ListDashboardCampaignContentCandidates' query type */
export interface IListDashboardCampaignContentCandidatesQuery {
  params: IListDashboardCampaignContentCandidatesParams;
  result: IListDashboardCampaignContentCandidatesResult;
}

const listDashboardCampaignContentCandidatesIR: any = {"usedParamSet":{"projectId":true,"campaignId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":648,"b":657}]},{"name":"campaignId","required":false,"transform":{"type":"scalar"},"locs":[{"a":679,"b":689}]}],"statement":"SELECT\n  content_id AS \"contentId\",\n  content_option_id AS \"contentOptionId\",\n  generation_id AS \"generationId\",\n  analysis_id AS \"analysisId\",\n  promotion_id AS \"promotionId\",\n  segment_id AS \"segmentId\",\n  channel,\n  subject,\n  preheader,\n  title,\n  body,\n  cta,\n  message,\n  image_prompt AS \"imagePrompt\",\n  image_url AS \"imageUrl\",\n  landing_url AS \"landingUrl\",\n  generation_prompt AS \"generationPrompt\",\n  reason_summary AS \"reasonSummary\",\n  data_evidence_json AS \"dataEvidenceJson\",\n  message_strategy AS \"messageStrategy\",\n  metadata_json AS \"metadataJson\",\n  status,\n  updated_at AS \"updatedAt\"\nFROM content_candidates\nWHERE project_id = :projectId\n  AND campaign_id = :campaignId\n  AND status <> 'archived'\n\nORDER BY updated_at DESC, created_at DESC                                    "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   content_id AS "contentId",
 *   content_option_id AS "contentOptionId",
 *   generation_id AS "generationId",
 *   analysis_id AS "analysisId",
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
 *   image_url AS "imageUrl",
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
 *   AND campaign_id = :campaignId
 *   AND status <> 'archived'
 *
 * ORDER BY updated_at DESC, created_at DESC
 * ```
 */
export const listDashboardCampaignContentCandidates = new PreparedQuery<IListDashboardCampaignContentCandidatesParams,IListDashboardCampaignContentCandidatesResult>(listDashboardCampaignContentCandidatesIR);


/** 'ListDashboardSegmentContentCandidates' parameters type */
export interface IListDashboardSegmentContentCandidatesParams {
  projectId?: string | null | void;
  promotionId?: string | null | void;
  segmentId?: string | null | void;
}

/** 'ListDashboardSegmentContentCandidates' return type */
export interface IListDashboardSegmentContentCandidatesResult {
  analysisId: string;
  body: string | null;
  channel: string;
  contentId: string;
  contentOptionId: string;
  cta: string | null;
  dataEvidenceJson: Json;
  generationId: string;
  generationPrompt: string | null;
  imagePrompt: string | null;
  imageUrl: string | null;
  landingUrl: string | null;
  message: string | null;
  messageStrategy: string | null;
  metadataJson: Json;
  nextLoopPreparationId: string | null;
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

const listDashboardSegmentContentCandidatesIR: any = {"usedParamSet":{"projectId":true,"promotionId":true,"segmentId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1045,"b":1054}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1077,"b":1088}]},{"name":"segmentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1109,"b":1118}]}],"statement":"SELECT\n  content_id AS \"contentId\",\n  content_option_id AS \"contentOptionId\",\n  generation_id AS \"generationId\",\n  analysis_id AS \"analysisId\",\n  promotion_id AS \"promotionId\",\n  segment_id AS \"segmentId\",\n  channel,\n  subject,\n  preheader,\n  title,\n  body,\n  cta,\n  message,\n  image_prompt AS \"imagePrompt\",\n  image_url AS \"imageUrl\",\n  landing_url AS \"landingUrl\",\n  generation_prompt AS \"generationPrompt\",\n  reason_summary AS \"reasonSummary\",\n  data_evidence_json AS \"dataEvidenceJson\",\n  message_strategy AS \"messageStrategy\",\n  metadata_json AS \"metadataJson\",\n  (\n    SELECT preparation.next_loop_preparation_id\n    FROM next_loop_preparations AS preparation\n    WHERE preparation.analysis_id = content_candidates.analysis_id\n      AND preparation.generation_id = content_candidates.generation_id\n      AND preparation.status IN ('awaiting_content_approval', 'activated')\n    ORDER BY preparation.updated_at DESC\n    LIMIT 1\n  ) AS \"nextLoopPreparationId\",\n  status,\n  updated_at AS \"updatedAt\"\nFROM content_candidates\nWHERE project_id = :projectId\n  AND promotion_id = :promotionId\n  AND segment_id = :segmentId\n  AND status <> 'archived'\n\nORDER BY updated_at DESC, created_at DESC                                     "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   content_id AS "contentId",
 *   content_option_id AS "contentOptionId",
 *   generation_id AS "generationId",
 *   analysis_id AS "analysisId",
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
 *   image_url AS "imageUrl",
 *   landing_url AS "landingUrl",
 *   generation_prompt AS "generationPrompt",
 *   reason_summary AS "reasonSummary",
 *   data_evidence_json AS "dataEvidenceJson",
 *   message_strategy AS "messageStrategy",
 *   metadata_json AS "metadataJson",
 *   (
 *     SELECT preparation.next_loop_preparation_id
 *     FROM next_loop_preparations AS preparation
 *     WHERE preparation.analysis_id = content_candidates.analysis_id
 *       AND preparation.generation_id = content_candidates.generation_id
 *       AND preparation.status IN ('awaiting_content_approval', 'activated')
 *     ORDER BY preparation.updated_at DESC
 *     LIMIT 1
 *   ) AS "nextLoopPreparationId",
 *   status,
 *   updated_at AS "updatedAt"
 * FROM content_candidates
 * WHERE project_id = :projectId
 *   AND promotion_id = :promotionId
 *   AND segment_id = :segmentId
 *   AND status <> 'archived'
 *
 * ORDER BY updated_at DESC, created_at DESC
 * ```
 */
export const listDashboardSegmentContentCandidates = new PreparedQuery<IListDashboardSegmentContentCandidatesParams,IListDashboardSegmentContentCandidatesResult>(listDashboardSegmentContentCandidatesIR);


/** 'GetDashboardContentCandidate' parameters type */
export interface IGetDashboardContentCandidateParams {
  contentId?: string | null | void;
  projectId?: string | null | void;
  promotionId?: string | null | void;
  segmentId?: string | null | void;
}

/** 'GetDashboardContentCandidate' return type */
export interface IGetDashboardContentCandidateResult {
  analysisId: string;
  body: string | null;
  channel: string;
  contentId: string;
  contentOptionId: string;
  cta: string | null;
  dataEvidenceJson: Json;
  generationId: string;
  generationPrompt: string | null;
  imagePrompt: string | null;
  imageUrl: string | null;
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

/** 'GetDashboardContentCandidate' query type */
export interface IGetDashboardContentCandidateQuery {
  params: IGetDashboardContentCandidateParams;
  result: IGetDashboardContentCandidateResult;
}

const getDashboardContentCandidateIR: any = {"usedParamSet":{"projectId":true,"promotionId":true,"segmentId":true,"contentId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":648,"b":657}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":680,"b":691}]},{"name":"segmentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":712,"b":721}]},{"name":"contentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":742,"b":751}]}],"statement":"SELECT\n  content_id AS \"contentId\",\n  content_option_id AS \"contentOptionId\",\n  generation_id AS \"generationId\",\n  analysis_id AS \"analysisId\",\n  promotion_id AS \"promotionId\",\n  segment_id AS \"segmentId\",\n  channel,\n  subject,\n  preheader,\n  title,\n  body,\n  cta,\n  message,\n  image_prompt AS \"imagePrompt\",\n  image_url AS \"imageUrl\",\n  landing_url AS \"landingUrl\",\n  generation_prompt AS \"generationPrompt\",\n  reason_summary AS \"reasonSummary\",\n  data_evidence_json AS \"dataEvidenceJson\",\n  message_strategy AS \"messageStrategy\",\n  metadata_json AS \"metadataJson\",\n  status,\n  updated_at AS \"updatedAt\"\nFROM content_candidates\nWHERE project_id = :projectId\n  AND promotion_id = :promotionId\n  AND segment_id = :segmentId\n  AND content_id = :contentId\n  AND status <> 'archived'                                                          "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   content_id AS "contentId",
 *   content_option_id AS "contentOptionId",
 *   generation_id AS "generationId",
 *   analysis_id AS "analysisId",
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
 *   image_url AS "imageUrl",
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
 *   AND content_id = :contentId
 *   AND status <> 'archived'
 * ```
 */
export const getDashboardContentCandidate = new PreparedQuery<IGetDashboardContentCandidateParams,IGetDashboardContentCandidateResult>(getDashboardContentCandidateIR);


/** 'GetDashboardPromotionGenerationResult' parameters type */
export interface IGetDashboardPromotionGenerationResultParams {
  analysisId?: string | null | void;
  projectId?: string | null | void;
  promotionId?: string | null | void;
  segmentId?: string | null | void;
}

/** 'GetDashboardPromotionGenerationResult' return type */
export interface IGetDashboardPromotionGenerationResultResult {
  contentCandidateCount: number | null;
  generationId: string;
  promotionId: string;
  status: string;
}

/** 'GetDashboardPromotionGenerationResult' query type */
export interface IGetDashboardPromotionGenerationResultQuery {
  params: IGetDashboardPromotionGenerationResultParams;
  result: IGetDashboardPromotionGenerationResultResult;
}

const getDashboardPromotionGenerationResultIR: any = {"usedParamSet":{"segmentId":true,"projectId":true,"promotionId":true,"analysisId":true},"params":[{"name":"segmentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":288,"b":297},{"a":334,"b":343},{"a":547,"b":556},{"a":628,"b":637},{"a":668,"b":677}]},{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":375,"b":384}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":410,"b":421}]},{"name":"analysisId","required":false,"transform":{"type":"scalar"},"locs":[{"a":446,"b":456}]}],"statement":"SELECT\n  gr.generation_id AS \"generationId\",\n  gr.promotion_id AS \"promotionId\",\n  gr.status,\n  COUNT(cc.content_id)::int AS \"contentCandidateCount\"\nFROM generation_runs gr\nLEFT JOIN content_candidates cc\n  ON cc.project_id = gr.project_id\n AND cc.generation_id = gr.generation_id\n AND ((:segmentId)::text IS NULL OR cc.segment_id = (:segmentId)::text)\nWHERE gr.project_id = :projectId\n  AND gr.promotion_id = :promotionId\n  AND gr.analysis_id = :analysisId\n  AND jsonb_typeof(gr.input_json -> 'target_segment_ids') = 'array'\n  AND (\n    (\n      (:segmentId)::text IS NOT NULL\n      AND gr.input_json -> 'target_segment_ids' ? (:segmentId)::text\n    )\n    OR (\n      (:segmentId)::text IS NULL\n      AND EXISTS (\n        SELECT 1\n        FROM promotion_target_segments pts\n        WHERE pts.project_id = gr.project_id\n          AND pts.promotion_id = gr.promotion_id\n          AND pts.analysis_id = gr.analysis_id\n          AND pts.status = 'approved'\n      )\n      AND jsonb_array_length(gr.input_json -> 'target_segment_ids') = (\n        SELECT COUNT(*)::int\n        FROM promotion_target_segments pts\n        WHERE pts.project_id = gr.project_id\n          AND pts.promotion_id = gr.promotion_id\n          AND pts.analysis_id = gr.analysis_id\n          AND pts.status = 'approved'\n      )\n      AND NOT EXISTS (\n        SELECT 1\n        FROM promotion_target_segments pts\n        WHERE pts.project_id = gr.project_id\n          AND pts.promotion_id = gr.promotion_id\n          AND pts.analysis_id = gr.analysis_id\n          AND pts.status = 'approved'\n          AND NOT (gr.input_json -> 'target_segment_ids' ? pts.segment_id)\n      )\n    )\n  )\nGROUP BY gr.generation_id, gr.promotion_id, gr.status, gr.updated_at, gr.created_at\nORDER BY gr.updated_at DESC, gr.created_at DESC\nLIMIT 1                                                              "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   gr.generation_id AS "generationId",
 *   gr.promotion_id AS "promotionId",
 *   gr.status,
 *   COUNT(cc.content_id)::int AS "contentCandidateCount"
 * FROM generation_runs gr
 * LEFT JOIN content_candidates cc
 *   ON cc.project_id = gr.project_id
 *  AND cc.generation_id = gr.generation_id
 *  AND ((:segmentId)::text IS NULL OR cc.segment_id = (:segmentId)::text)
 * WHERE gr.project_id = :projectId
 *   AND gr.promotion_id = :promotionId
 *   AND gr.analysis_id = :analysisId
 *   AND jsonb_typeof(gr.input_json -> 'target_segment_ids') = 'array'
 *   AND (
 *     (
 *       (:segmentId)::text IS NOT NULL
 *       AND gr.input_json -> 'target_segment_ids' ? (:segmentId)::text
 *     )
 *     OR (
 *       (:segmentId)::text IS NULL
 *       AND EXISTS (
 *         SELECT 1
 *         FROM promotion_target_segments pts
 *         WHERE pts.project_id = gr.project_id
 *           AND pts.promotion_id = gr.promotion_id
 *           AND pts.analysis_id = gr.analysis_id
 *           AND pts.status = 'approved'
 *       )
 *       AND jsonb_array_length(gr.input_json -> 'target_segment_ids') = (
 *         SELECT COUNT(*)::int
 *         FROM promotion_target_segments pts
 *         WHERE pts.project_id = gr.project_id
 *           AND pts.promotion_id = gr.promotion_id
 *           AND pts.analysis_id = gr.analysis_id
 *           AND pts.status = 'approved'
 *       )
 *       AND NOT EXISTS (
 *         SELECT 1
 *         FROM promotion_target_segments pts
 *         WHERE pts.project_id = gr.project_id
 *           AND pts.promotion_id = gr.promotion_id
 *           AND pts.analysis_id = gr.analysis_id
 *           AND pts.status = 'approved'
 *           AND NOT (gr.input_json -> 'target_segment_ids' ? pts.segment_id)
 *       )
 *     )
 *   )
 * GROUP BY gr.generation_id, gr.promotion_id, gr.status, gr.updated_at, gr.created_at
 * ORDER BY gr.updated_at DESC, gr.created_at DESC
 * LIMIT 1
 * ```
 */
export const getDashboardPromotionGenerationResult = new PreparedQuery<IGetDashboardPromotionGenerationResultParams,IGetDashboardPromotionGenerationResultResult>(getDashboardPromotionGenerationResultIR);


/** 'EnsureDashboardPromotionTargetSegmentApproved' parameters type */
export interface IEnsureDashboardPromotionTargetSegmentApprovedParams {
  analysisId?: string | null | void;
  projectId?: string | null | void;
  promotionId?: string | null | void;
  segmentId?: string | null | void;
}

/** 'EnsureDashboardPromotionTargetSegmentApproved' return type */
export interface IEnsureDashboardPromotionTargetSegmentApprovedResult {
  segmentId: string;
}

/** 'EnsureDashboardPromotionTargetSegmentApproved' query type */
export interface IEnsureDashboardPromotionTargetSegmentApprovedQuery {
  params: IEnsureDashboardPromotionTargetSegmentApprovedParams;
  result: IEnsureDashboardPromotionTargetSegmentApprovedResult;
}

const ensureDashboardPromotionTargetSegmentApprovedIR: any = {"usedParamSet":{"projectId":true,"promotionId":true,"analysisId":true,"segmentId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":76,"b":85}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":108,"b":119}]},{"name":"analysisId","required":false,"transform":{"type":"scalar"},"locs":[{"a":141,"b":151}]},{"name":"segmentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":172,"b":181}]}],"statement":"UPDATE promotion_target_segments\nSET status = 'approved'\nWHERE project_id = :projectId\n  AND promotion_id = :promotionId\n  AND analysis_id = :analysisId\n  AND segment_id = :segmentId\n  AND status IN ('planned', 'approved')\nRETURNING segment_id AS \"segmentId\"                                    "};

/**
 * Query generated from SQL:
 * ```
 * UPDATE promotion_target_segments
 * SET status = 'approved'
 * WHERE project_id = :projectId
 *   AND promotion_id = :promotionId
 *   AND analysis_id = :analysisId
 *   AND segment_id = :segmentId
 *   AND status IN ('planned', 'approved')
 * RETURNING segment_id AS "segmentId"
 * ```
 */
export const ensureDashboardPromotionTargetSegmentApproved = new PreparedQuery<IEnsureDashboardPromotionTargetSegmentApprovedParams,IEnsureDashboardPromotionTargetSegmentApprovedResult>(ensureDashboardPromotionTargetSegmentApprovedIR);


/** 'ListDashboardCampaignAdExperiments' parameters type */
export interface IListDashboardCampaignAdExperimentsParams {
  campaignId?: string | null | void;
  projectId?: string | null | void;
}

/** 'ListDashboardCampaignAdExperiments' return type */
export interface IListDashboardCampaignAdExperimentsResult {
  adExperimentId: string;
  assignmentCount: number | null;
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

/** 'ListDashboardCampaignAdExperiments' query type */
export interface IListDashboardCampaignAdExperimentsQuery {
  params: IListDashboardCampaignAdExperimentsParams;
  result: IListDashboardCampaignAdExperimentsResult;
}

const listDashboardCampaignAdExperimentsIR: any = {"usedParamSet":{"projectId":true,"campaignId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":687,"b":696}]},{"name":"campaignId","required":false,"transform":{"type":"scalar"},"locs":[{"a":721,"b":731}]}],"statement":"SELECT\n  ae.ad_experiment_id AS \"adExperimentId\",\n  ae.promotion_run_id AS \"promotionRunId\",\n  ae.promotion_id AS \"promotionId\",\n  ae.segment_id AS \"segmentId\",\n  ae.content_id AS \"contentId\",\n  ae.content_option_id AS \"contentOptionId\",\n  ae.channel,\n  ae.loop_count AS \"loopCount\",\n  ae.goal_metric AS \"goalMetric\",\n  CAST(ae.goal_target_value AS float8) AS \"goalTargetValue\",\n  ae.goal_basis AS \"goalBasis\",\n  ae.status,\n  COUNT(usa.user_id)::int AS \"assignmentCount\"\nFROM ad_experiments ae\nLEFT JOIN user_segment_assignments usa\n  ON usa.project_id = ae.project_id\n AND usa.promotion_run_id = ae.promotion_run_id\n AND usa.ad_experiment_id = ae.ad_experiment_id\nWHERE ae.project_id = :projectId\n  AND ae.campaign_id = :campaignId\n  AND ae.status <> 'stopped'\nGROUP BY\n  ae.ad_experiment_id,\n  ae.promotion_run_id,\n  ae.promotion_id,\n  ae.segment_id,\n  ae.content_id,\n  ae.content_option_id,\n  ae.channel,\n  ae.loop_count,\n  ae.goal_metric,\n  ae.goal_target_value,\n  ae.goal_basis,\n  ae.status,\n  ae.updated_at,\n  ae.created_at\nORDER BY ae.loop_count DESC, ae.updated_at DESC, ae.created_at DESC                                        "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   ae.ad_experiment_id AS "adExperimentId",
 *   ae.promotion_run_id AS "promotionRunId",
 *   ae.promotion_id AS "promotionId",
 *   ae.segment_id AS "segmentId",
 *   ae.content_id AS "contentId",
 *   ae.content_option_id AS "contentOptionId",
 *   ae.channel,
 *   ae.loop_count AS "loopCount",
 *   ae.goal_metric AS "goalMetric",
 *   CAST(ae.goal_target_value AS float8) AS "goalTargetValue",
 *   ae.goal_basis AS "goalBasis",
 *   ae.status,
 *   COUNT(usa.user_id)::int AS "assignmentCount"
 * FROM ad_experiments ae
 * LEFT JOIN user_segment_assignments usa
 *   ON usa.project_id = ae.project_id
 *  AND usa.promotion_run_id = ae.promotion_run_id
 *  AND usa.ad_experiment_id = ae.ad_experiment_id
 * WHERE ae.project_id = :projectId
 *   AND ae.campaign_id = :campaignId
 *   AND ae.status <> 'stopped'
 * GROUP BY
 *   ae.ad_experiment_id,
 *   ae.promotion_run_id,
 *   ae.promotion_id,
 *   ae.segment_id,
 *   ae.content_id,
 *   ae.content_option_id,
 *   ae.channel,
 *   ae.loop_count,
 *   ae.goal_metric,
 *   ae.goal_target_value,
 *   ae.goal_basis,
 *   ae.status,
 *   ae.updated_at,
 *   ae.created_at
 * ORDER BY ae.loop_count DESC, ae.updated_at DESC, ae.created_at DESC
 * ```
 */
export const listDashboardCampaignAdExperiments = new PreparedQuery<IListDashboardCampaignAdExperimentsParams,IListDashboardCampaignAdExperimentsResult>(listDashboardCampaignAdExperimentsIR);


/** 'ListDashboardSegmentAdExperiments' parameters type */
export interface IListDashboardSegmentAdExperimentsParams {
  projectId?: string | null | void;
  promotionId?: string | null | void;
  segmentId?: string | null | void;
}

/** 'ListDashboardSegmentAdExperiments' return type */
export interface IListDashboardSegmentAdExperimentsResult {
  adExperimentId: string;
  assignmentCount: number | null;
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

const listDashboardSegmentAdExperimentsIR: any = {"usedParamSet":{"projectId":true,"promotionId":true,"segmentId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":687,"b":696}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":722,"b":733}]},{"name":"segmentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":757,"b":766}]}],"statement":"SELECT\n  ae.ad_experiment_id AS \"adExperimentId\",\n  ae.promotion_run_id AS \"promotionRunId\",\n  ae.promotion_id AS \"promotionId\",\n  ae.segment_id AS \"segmentId\",\n  ae.content_id AS \"contentId\",\n  ae.content_option_id AS \"contentOptionId\",\n  ae.channel,\n  ae.loop_count AS \"loopCount\",\n  ae.goal_metric AS \"goalMetric\",\n  CAST(ae.goal_target_value AS float8) AS \"goalTargetValue\",\n  ae.goal_basis AS \"goalBasis\",\n  ae.status,\n  COUNT(usa.user_id)::int AS \"assignmentCount\"\nFROM ad_experiments ae\nLEFT JOIN user_segment_assignments usa\n  ON usa.project_id = ae.project_id\n AND usa.promotion_run_id = ae.promotion_run_id\n AND usa.ad_experiment_id = ae.ad_experiment_id\nWHERE ae.project_id = :projectId\n  AND ae.promotion_id = :promotionId\n  AND ae.segment_id = :segmentId\n  AND ae.status <> 'stopped'\nGROUP BY\n  ae.ad_experiment_id,\n  ae.promotion_run_id,\n  ae.promotion_id,\n  ae.segment_id,\n  ae.content_id,\n  ae.content_option_id,\n  ae.channel,\n  ae.loop_count,\n  ae.goal_metric,\n  ae.goal_target_value,\n  ae.goal_basis,\n  ae.status,\n  ae.updated_at,\n  ae.created_at\n\nORDER BY ae.loop_count DESC, ae.updated_at DESC, ae.created_at DESC                                                     "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   ae.ad_experiment_id AS "adExperimentId",
 *   ae.promotion_run_id AS "promotionRunId",
 *   ae.promotion_id AS "promotionId",
 *   ae.segment_id AS "segmentId",
 *   ae.content_id AS "contentId",
 *   ae.content_option_id AS "contentOptionId",
 *   ae.channel,
 *   ae.loop_count AS "loopCount",
 *   ae.goal_metric AS "goalMetric",
 *   CAST(ae.goal_target_value AS float8) AS "goalTargetValue",
 *   ae.goal_basis AS "goalBasis",
 *   ae.status,
 *   COUNT(usa.user_id)::int AS "assignmentCount"
 * FROM ad_experiments ae
 * LEFT JOIN user_segment_assignments usa
 *   ON usa.project_id = ae.project_id
 *  AND usa.promotion_run_id = ae.promotion_run_id
 *  AND usa.ad_experiment_id = ae.ad_experiment_id
 * WHERE ae.project_id = :projectId
 *   AND ae.promotion_id = :promotionId
 *   AND ae.segment_id = :segmentId
 *   AND ae.status <> 'stopped'
 * GROUP BY
 *   ae.ad_experiment_id,
 *   ae.promotion_run_id,
 *   ae.promotion_id,
 *   ae.segment_id,
 *   ae.content_id,
 *   ae.content_option_id,
 *   ae.channel,
 *   ae.loop_count,
 *   ae.goal_metric,
 *   ae.goal_target_value,
 *   ae.goal_basis,
 *   ae.status,
 *   ae.updated_at,
 *   ae.created_at
 *
 * ORDER BY ae.loop_count DESC, ae.updated_at DESC, ae.created_at DESC
 * ```
 */
export const listDashboardSegmentAdExperiments = new PreparedQuery<IListDashboardSegmentAdExperimentsParams,IListDashboardSegmentAdExperimentsResult>(listDashboardSegmentAdExperimentsIR);


/** 'StartDashboardAdExperiment' parameters type */
export interface IStartDashboardAdExperimentParams {
  adExperimentId?: string | null | void;
  projectId?: string | null | void;
  promotionId?: string | null | void;
}

/** 'StartDashboardAdExperiment' return type */
export interface IStartDashboardAdExperimentResult {
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

/** 'StartDashboardAdExperiment' query type */
export interface IStartDashboardAdExperimentQuery {
  params: IStartDashboardAdExperimentParams;
  result: IStartDashboardAdExperimentResult;
}

const startDashboardAdExperimentIR: any = {"usedParamSet":{"projectId":true,"promotionId":true,"adExperimentId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":134,"b":143}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":166,"b":177}]},{"name":"adExperimentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":204,"b":218}]}],"statement":"UPDATE ad_experiments\nSET status = 'running',\n    started_at = COALESCE(started_at, now()),\n    updated_at = now()\nWHERE project_id = :projectId\n  AND promotion_id = :promotionId\n  AND ad_experiment_id = :adExperimentId\n  AND status IN ('planned', 'approved', 'running')\n  AND EXISTS (\n    SELECT 1\n    FROM promotions promotion\n    JOIN campaigns campaign\n      ON campaign.project_id = promotion.project_id\n     AND campaign.campaign_id = promotion.campaign_id\n    WHERE promotion.project_id = ad_experiments.project_id\n      AND promotion.promotion_id = ad_experiments.promotion_id\n      AND promotion.status <> 'stopped'\n      AND campaign.status NOT IN ('completed', 'stopped')\n      AND (\n        GREATEST(\n          promotion.scheduled_start_at,\n          campaign.start_date::timestamp AT TIME ZONE 'Asia/Seoul'\n        ) IS NULL\n        OR GREATEST(\n          promotion.scheduled_start_at,\n          campaign.start_date::timestamp AT TIME ZONE 'Asia/Seoul'\n        ) <= now()\n      )\n      AND (\n        LEAST(\n          promotion.scheduled_end_at,\n          (campaign.end_date + 1)::timestamp AT TIME ZONE 'Asia/Seoul'\n        ) IS NULL\n        OR LEAST(\n          promotion.scheduled_end_at,\n          (campaign.end_date + 1)::timestamp AT TIME ZONE 'Asia/Seoul'\n        ) > now()\n      )\n  )\nRETURNING\n  ad_experiment_id AS \"adExperimentId\",\n  promotion_run_id AS \"promotionRunId\",\n  promotion_id AS \"promotionId\",\n  segment_id AS \"segmentId\",\n  content_id AS \"contentId\",\n  content_option_id AS \"contentOptionId\",\n  channel,\n  loop_count AS \"loopCount\",\n  goal_metric AS \"goalMetric\",\n  CAST(goal_target_value AS float8) AS \"goalTargetValue\",\n  goal_basis AS \"goalBasis\",\n  status                                                        "};

/**
 * Query generated from SQL:
 * ```
 * UPDATE ad_experiments
 * SET status = 'running',
 *     started_at = COALESCE(started_at, now()),
 *     updated_at = now()
 * WHERE project_id = :projectId
 *   AND promotion_id = :promotionId
 *   AND ad_experiment_id = :adExperimentId
 *   AND status IN ('planned', 'approved', 'running')
 *   AND EXISTS (
 *     SELECT 1
 *     FROM promotions promotion
 *     JOIN campaigns campaign
 *       ON campaign.project_id = promotion.project_id
 *      AND campaign.campaign_id = promotion.campaign_id
 *     WHERE promotion.project_id = ad_experiments.project_id
 *       AND promotion.promotion_id = ad_experiments.promotion_id
 *       AND promotion.status <> 'stopped'
 *       AND campaign.status NOT IN ('completed', 'stopped')
 *       AND (
 *         GREATEST(
 *           promotion.scheduled_start_at,
 *           campaign.start_date::timestamp AT TIME ZONE 'Asia/Seoul'
 *         ) IS NULL
 *         OR GREATEST(
 *           promotion.scheduled_start_at,
 *           campaign.start_date::timestamp AT TIME ZONE 'Asia/Seoul'
 *         ) <= now()
 *       )
 *       AND (
 *         LEAST(
 *           promotion.scheduled_end_at,
 *           (campaign.end_date + 1)::timestamp AT TIME ZONE 'Asia/Seoul'
 *         ) IS NULL
 *         OR LEAST(
 *           promotion.scheduled_end_at,
 *           (campaign.end_date + 1)::timestamp AT TIME ZONE 'Asia/Seoul'
 *         ) > now()
 *       )
 *   )
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
 *   CAST(goal_target_value AS float8) AS "goalTargetValue",
 *   goal_basis AS "goalBasis",
 *   status
 * ```
 */
export const startDashboardAdExperiment = new PreparedQuery<IStartDashboardAdExperimentParams,IStartDashboardAdExperimentResult>(startDashboardAdExperimentIR);


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

const getDashboardContentCandidateForApprovalIR: any = {"usedParamSet":{"projectId":true,"promotionId":true,"segmentId":true,"contentId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1024,"b":1033}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1059,"b":1070}]},{"name":"segmentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1094,"b":1103}]},{"name":"contentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1127,"b":1136}]}],"statement":"SELECT\n  cc.content_id AS \"contentId\",\n  cc.content_option_id AS \"contentOptionId\",\n  cc.generation_id AS \"generationId\",\n  cc.analysis_id AS \"analysisId\",\n  cc.project_id AS \"projectId\",\n  cc.campaign_id AS \"campaignId\",\n  cc.promotion_id AS \"promotionId\",\n  cc.segment_id AS \"segmentId\",\n  COALESCE(pts.segment_name, sd.segment_name) AS \"segmentName\",\n  cc.channel,\n  p.goal_metric AS \"goalMetric\",\n  CAST(p.goal_target_value AS float8) AS \"goalTargetValue\",\n  p.goal_basis AS \"goalBasis\",\n  cc.status AS \"contentStatus\"\nFROM content_candidates cc\nJOIN promotions p\n  ON p.project_id = cc.project_id\n AND p.campaign_id = cc.campaign_id\n AND p.promotion_id = cc.promotion_id\nLEFT JOIN segment_definitions sd\n  ON sd.project_id = cc.project_id\n AND sd.segment_id = cc.segment_id\nJOIN promotion_target_segments pts\n  ON pts.project_id = cc.project_id\n AND pts.campaign_id = cc.campaign_id\n AND pts.promotion_id = cc.promotion_id\n AND pts.segment_id = cc.segment_id\n AND pts.analysis_id = cc.analysis_id\nWHERE cc.project_id = :projectId\n  AND cc.promotion_id = :promotionId\n  AND cc.segment_id = :segmentId\n  AND cc.content_id = :contentId\n  AND p.status <> 'stopped'\n  AND pts.status <> 'stopped'\n  AND cc.status IN ('draft', 'approved', 'active')                                           "};

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
 *   CAST(p.goal_target_value AS float8) AS "goalTargetValue",
 *   p.goal_basis AS "goalBasis",
 *   cc.status AS "contentStatus"
 * FROM content_candidates cc
 * JOIN promotions p
 *   ON p.project_id = cc.project_id
 *  AND p.campaign_id = cc.campaign_id
 *  AND p.promotion_id = cc.promotion_id
 * LEFT JOIN segment_definitions sd
 *   ON sd.project_id = cc.project_id
 *  AND sd.segment_id = cc.segment_id
 * JOIN promotion_target_segments pts
 *   ON pts.project_id = cc.project_id
 *  AND pts.campaign_id = cc.campaign_id
 *  AND pts.promotion_id = cc.promotion_id
 *  AND pts.segment_id = cc.segment_id
 *  AND pts.analysis_id = cc.analysis_id
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

const approveDashboardContentCandidateIR: any = {"usedParamSet":{"projectId":true,"promotionId":true,"segmentId":true,"contentId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":93,"b":102}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":125,"b":136}]},{"name":"segmentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":157,"b":166}]},{"name":"contentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":187,"b":196}]}],"statement":"UPDATE content_candidates\nSET status = 'approved',\n    updated_at = now()\nWHERE project_id = :projectId\n  AND promotion_id = :promotionId\n  AND segment_id = :segmentId\n  AND content_id = :contentId\n  AND status IN ('draft', 'approved', 'active')\nRETURNING\n  content_id AS \"contentId\",\n  content_option_id AS \"contentOptionId\",\n  status                                       "};

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


/** 'UnapproveDashboardContentCandidate' parameters type */
export interface IUnapproveDashboardContentCandidateParams {
  contentId?: string | null | void;
  projectId?: string | null | void;
  promotionId?: string | null | void;
  segmentId?: string | null | void;
}

/** 'UnapproveDashboardContentCandidate' return type */
export interface IUnapproveDashboardContentCandidateResult {
  contentId: string;
  contentOptionId: string;
  status: string;
}

/** 'UnapproveDashboardContentCandidate' query type */
export interface IUnapproveDashboardContentCandidateQuery {
  params: IUnapproveDashboardContentCandidateParams;
  result: IUnapproveDashboardContentCandidateResult;
}

const unapproveDashboardContentCandidateIR: any = {"usedParamSet":{"projectId":true,"promotionId":true,"segmentId":true,"contentId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":90,"b":99}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":122,"b":133}]},{"name":"segmentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":154,"b":163}]},{"name":"contentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":184,"b":193}]}],"statement":"UPDATE content_candidates\nSET status = 'draft',\n    updated_at = now()\nWHERE project_id = :projectId\n  AND promotion_id = :promotionId\n  AND segment_id = :segmentId\n  AND content_id = :contentId\n  AND status = 'approved'\nRETURNING\n  content_id AS \"contentId\",\n  content_option_id AS \"contentOptionId\",\n  status                                                     "};

/**
 * Query generated from SQL:
 * ```
 * UPDATE content_candidates
 * SET status = 'draft',
 *     updated_at = now()
 * WHERE project_id = :projectId
 *   AND promotion_id = :promotionId
 *   AND segment_id = :segmentId
 *   AND content_id = :contentId
 *   AND status = 'approved'
 * RETURNING
 *   content_id AS "contentId",
 *   content_option_id AS "contentOptionId",
 *   status
 * ```
 */
export const unapproveDashboardContentCandidate = new PreparedQuery<IUnapproveDashboardContentCandidateParams,IUnapproveDashboardContentCandidateResult>(unapproveDashboardContentCandidateIR);


/** 'UpdateDashboardContentCandidateCopy' parameters type */
export interface IUpdateDashboardContentCandidateCopyParams {
  body?: string | null | void;
  contentId?: string | null | void;
  cta?: string | null | void;
  expectedBody?: string | null | void;
  expectedCta?: string | null | void;
  expectedHeadline?: string | null | void;
  expectedMetadataJson?: Json | null | void;
  headline?: string | null | void;
  metadataJson?: Json | null | void;
  projectId?: string | null | void;
  promotionId?: string | null | void;
  segmentId?: string | null | void;
}

/** 'UpdateDashboardContentCandidateCopy' return type */
export interface IUpdateDashboardContentCandidateCopyResult {
  body: string | null;
  contentId: string;
  cta: string | null;
  headline: string | null;
  promotionId: string;
  segmentId: string;
  status: string;
  updatedAt: Date;
}

/** 'UpdateDashboardContentCandidateCopy' query type */
export interface IUpdateDashboardContentCandidateCopyQuery {
  params: IUpdateDashboardContentCandidateCopyParams;
  result: IUpdateDashboardContentCandidateCopyResult;
}

const updateDashboardContentCandidateCopyIR: any = {"usedParamSet":{"headline":true,"body":true,"cta":true,"metadataJson":true,"projectId":true,"promotionId":true,"segmentId":true,"contentId":true,"expectedMetadataJson":true,"expectedHeadline":true,"expectedBody":true,"expectedCta":true},"params":[{"name":"headline","required":false,"transform":{"type":"scalar"},"locs":[{"a":73,"b":81},{"a":154,"b":162}]},{"name":"body","required":false,"transform":{"type":"scalar"},"locs":[{"a":191,"b":195}]},{"name":"cta","required":false,"transform":{"type":"scalar"},"locs":[{"a":208,"b":211}]},{"name":"metadataJson","required":false,"transform":{"type":"scalar"},"locs":[{"a":234,"b":246}]},{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":298,"b":307}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":330,"b":341}]},{"name":"segmentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":362,"b":371}]},{"name":"contentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":392,"b":401}]},{"name":"expectedMetadataJson","required":false,"transform":{"type":"scalar"},"locs":[{"a":448,"b":468}]},{"name":"expectedHeadline","required":false,"transform":{"type":"scalar"},"locs":[{"a":555,"b":571}]},{"name":"expectedBody","required":false,"transform":{"type":"scalar"},"locs":[{"a":600,"b":612}]},{"name":"expectedCta","required":false,"transform":{"type":"scalar"},"locs":[{"a":640,"b":651}]}],"statement":"UPDATE content_candidates\nSET subject = CASE WHEN channel = 'email' THEN :headline ELSE subject END,\n    title = CASE WHEN channel = 'onsite_banner' THEN :headline ELSE title END,\n    body = :body,\n    cta = :cta,\n    metadata_json = :metadataJson::jsonb,\n    updated_at = now()\nWHERE project_id = :projectId\n  AND promotion_id = :promotionId\n  AND segment_id = :segmentId\n  AND content_id = :contentId\n  AND status = 'draft'\n  AND metadata_json = :expectedMetadataJson::jsonb\n  AND COALESCE(CASE WHEN channel = 'email' THEN subject ELSE title END, '') = :expectedHeadline\n  AND COALESCE(body, '') = :expectedBody\n  AND COALESCE(cta, '') = :expectedCta\nRETURNING\n  content_id AS \"contentId\",\n  promotion_id AS \"promotionId\",\n  segment_id AS \"segmentId\",\n  CASE WHEN channel = 'email' THEN subject ELSE title END AS headline,\n  body,\n  cta,\n  status,\n  updated_at AS \"updatedAt\"                                           "};

/**
 * Query generated from SQL:
 * ```
 * UPDATE content_candidates
 * SET subject = CASE WHEN channel = 'email' THEN :headline ELSE subject END,
 *     title = CASE WHEN channel = 'onsite_banner' THEN :headline ELSE title END,
 *     body = :body,
 *     cta = :cta,
 *     metadata_json = :metadataJson::jsonb,
 *     updated_at = now()
 * WHERE project_id = :projectId
 *   AND promotion_id = :promotionId
 *   AND segment_id = :segmentId
 *   AND content_id = :contentId
 *   AND status = 'draft'
 *   AND metadata_json = :expectedMetadataJson::jsonb
 *   AND COALESCE(CASE WHEN channel = 'email' THEN subject ELSE title END, '') = :expectedHeadline
 *   AND COALESCE(body, '') = :expectedBody
 *   AND COALESCE(cta, '') = :expectedCta
 * RETURNING
 *   content_id AS "contentId",
 *   promotion_id AS "promotionId",
 *   segment_id AS "segmentId",
 *   CASE WHEN channel = 'email' THEN subject ELSE title END AS headline,
 *   body,
 *   cta,
 *   status,
 *   updated_at AS "updatedAt"
 * ```
 */
export const updateDashboardContentCandidateCopy = new PreparedQuery<IUpdateDashboardContentCandidateCopyParams,IUpdateDashboardContentCandidateCopyResult>(updateDashboardContentCandidateCopyIR);


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

const rejectDashboardContentCandidateIR: any = {"usedParamSet":{"projectId":true,"promotionId":true,"segmentId":true,"contentId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":263,"b":272}]},{"name":"promotionId","required":false,"transform":{"type":"scalar"},"locs":[{"a":298,"b":309}]},{"name":"segmentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":333,"b":342}]},{"name":"contentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":366,"b":375}]}],"statement":"UPDATE content_candidates cc\nSET status = 'rejected',\n    updated_at = now()\nFROM promotions p\nJOIN promotion_target_segments pts\n  ON pts.project_id = p.project_id\n AND pts.campaign_id = p.campaign_id\n AND pts.promotion_id = p.promotion_id\nWHERE cc.project_id = :projectId\n  AND cc.promotion_id = :promotionId\n  AND cc.segment_id = :segmentId\n  AND cc.content_id = :contentId\n  AND p.project_id = cc.project_id\n  AND p.campaign_id = cc.campaign_id\n  AND p.promotion_id = cc.promotion_id\n  AND pts.analysis_id = cc.analysis_id\n  AND pts.segment_id = cc.segment_id\n  AND p.status <> 'stopped'\n  AND pts.status <> 'stopped'\n  AND cc.status IN ('draft', 'approved', 'active')\nRETURNING\n  cc.content_id AS \"contentId\",\n  cc.promotion_id AS \"promotionId\",\n  cc.segment_id AS \"segmentId\",\n  cc.status,\n  cc.updated_at AS \"rejectedAt\"                                        "};

/**
 * Query generated from SQL:
 * ```
 * UPDATE content_candidates cc
 * SET status = 'rejected',
 *     updated_at = now()
 * FROM promotions p
 * JOIN promotion_target_segments pts
 *   ON pts.project_id = p.project_id
 *  AND pts.campaign_id = p.campaign_id
 *  AND pts.promotion_id = p.promotion_id
 * WHERE cc.project_id = :projectId
 *   AND cc.promotion_id = :promotionId
 *   AND cc.segment_id = :segmentId
 *   AND cc.content_id = :contentId
 *   AND p.project_id = cc.project_id
 *   AND p.campaign_id = cc.campaign_id
 *   AND p.promotion_id = cc.promotion_id
 *   AND pts.analysis_id = cc.analysis_id
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

const insertDashboardSegmentQueryPreviewIR: any = {"usedParamSet":{"queryPreviewId":true,"projectId":true,"naturalLanguageQuery":true,"generatedSql":true,"queryParamsJson":true,"baseTimeFrom":true,"baseTimeTo":true,"sampleSize":true,"totalEligibleUserCount":true,"sampleRatio":true,"sampleSizeStatus":true,"resultColumnsJson":true,"resultPreviewJson":true},"params":[{"name":"queryPreviewId","required":false,"transform":{"type":"scalar"},"locs":[{"a":319,"b":333}]},{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":338,"b":347}]},{"name":"naturalLanguageQuery","required":false,"transform":{"type":"scalar"},"locs":[{"a":352,"b":372}]},{"name":"generatedSql","required":false,"transform":{"type":"scalar"},"locs":[{"a":377,"b":389}]},{"name":"queryParamsJson","required":false,"transform":{"type":"scalar"},"locs":[{"a":394,"b":409}]},{"name":"baseTimeFrom","required":false,"transform":{"type":"scalar"},"locs":[{"a":414,"b":426}]},{"name":"baseTimeTo","required":false,"transform":{"type":"scalar"},"locs":[{"a":431,"b":441}]},{"name":"sampleSize","required":false,"transform":{"type":"scalar"},"locs":[{"a":446,"b":456}]},{"name":"totalEligibleUserCount","required":false,"transform":{"type":"scalar"},"locs":[{"a":461,"b":483}]},{"name":"sampleRatio","required":false,"transform":{"type":"scalar"},"locs":[{"a":488,"b":499}]},{"name":"sampleSizeStatus","required":false,"transform":{"type":"scalar"},"locs":[{"a":504,"b":520}]},{"name":"resultColumnsJson","required":false,"transform":{"type":"scalar"},"locs":[{"a":525,"b":542}]},{"name":"resultPreviewJson","required":false,"transform":{"type":"scalar"},"locs":[{"a":547,"b":564}]}],"statement":"INSERT INTO segment_query_previews (\n  query_preview_id,\n  project_id,\n  natural_language_query,\n  generated_sql,\n  query_params_json,\n  base_time_from,\n  base_time_to,\n  sample_size,\n  total_eligible_user_count,\n  sample_ratio,\n  sample_size_status,\n  result_columns_json,\n  result_preview_json,\n  status\n)\nVALUES (\n  :queryPreviewId,\n  :projectId,\n  :naturalLanguageQuery,\n  :generatedSql,\n  :queryParamsJson,\n  :baseTimeFrom,\n  :baseTimeTo,\n  :sampleSize,\n  :totalEligibleUserCount,\n  :sampleRatio,\n  :sampleSizeStatus,\n  :resultColumnsJson,\n  :resultPreviewJson,\n  'previewed'\n)\nRETURNING\n  query_preview_id AS \"queryPreviewId\",\n  project_id AS \"projectId\",\n  natural_language_query AS \"naturalLanguageQuery\",\n  generated_sql AS \"generatedSql\",\n  sample_size AS \"sampleSize\",\n  total_eligible_user_count AS \"totalEligibleUserCount\",\n  CAST(sample_ratio AS float8) AS \"sampleRatio\",\n  sample_size_status AS \"sampleSizeStatus\",\n  result_columns_json AS \"resultColumnsJson\",\n  result_preview_json AS \"resultPreviewJson\",\n  status                                     "};

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
 *   CAST(sample_ratio AS float8) AS "sampleRatio",
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
  queryParamsJson: Json;
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

const getDashboardSegmentQueryPreviewForSaveIR: any = {"usedParamSet":{"projectId":true,"queryPreviewId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":442,"b":451}]},{"name":"queryPreviewId","required":false,"transform":{"type":"scalar"},"locs":[{"a":478,"b":492}]}],"statement":"SELECT\n  query_preview_id AS \"queryPreviewId\",\n  project_id AS \"projectId\",\n  natural_language_query AS \"naturalLanguageQuery\",\n  generated_sql AS \"generatedSql\",\n  query_params_json AS \"queryParamsJson\",\n  sample_size AS \"sampleSize\",\n  total_eligible_user_count AS \"totalEligibleUserCount\",\n  CAST(sample_ratio AS float8) AS \"sampleRatio\",\n  sample_size_status AS \"sampleSizeStatus\",\n  status\nFROM segment_query_previews\nWHERE project_id = :projectId\n  AND query_preview_id = :queryPreviewId                                                  "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   query_preview_id AS "queryPreviewId",
 *   project_id AS "projectId",
 *   natural_language_query AS "naturalLanguageQuery",
 *   generated_sql AS "generatedSql",
 *   query_params_json AS "queryParamsJson",
 *   sample_size AS "sampleSize",
 *   total_eligible_user_count AS "totalEligibleUserCount",
 *   CAST(sample_ratio AS float8) AS "sampleRatio",
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
  ruleJson?: Json | null | void;
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
  projectId: string | null;
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

const insertDashboardCustomSegmentDefinitionIR: any = {"usedParamSet":{"segmentId":true,"projectId":true,"segmentName":true,"queryPreviewId":true,"naturalLanguageQuery":true,"generatedSql":true,"ruleJson":true,"sampleSize":true,"totalEligibleUserCount":true,"sampleRatio":true},"params":[{"name":"segmentId","required":false,"transform":{"type":"scalar"},"locs":[{"a":262,"b":271}]},{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":276,"b":285}]},{"name":"segmentName","required":false,"transform":{"type":"scalar"},"locs":[{"a":290,"b":301}]},{"name":"queryPreviewId","required":false,"transform":{"type":"scalar"},"locs":[{"a":326,"b":340}]},{"name":"naturalLanguageQuery","required":false,"transform":{"type":"scalar"},"locs":[{"a":345,"b":365}]},{"name":"generatedSql","required":false,"transform":{"type":"scalar"},"locs":[{"a":370,"b":382}]},{"name":"ruleJson","required":false,"transform":{"type":"scalar"},"locs":[{"a":387,"b":395}]},{"name":"sampleSize","required":false,"transform":{"type":"scalar"},"locs":[{"a":415,"b":425}]},{"name":"totalEligibleUserCount","required":false,"transform":{"type":"scalar"},"locs":[{"a":430,"b":452}]},{"name":"sampleRatio","required":false,"transform":{"type":"scalar"},"locs":[{"a":457,"b":468}]}],"statement":"INSERT INTO segment_definitions (\n  segment_id,\n  project_id,\n  segment_name,\n  source,\n  query_preview_id,\n  natural_language_query,\n  generated_sql,\n  rule_json,\n  profile_json,\n  sample_size,\n  total_eligible_user_count,\n  sample_ratio,\n  status\n)\nVALUES (\n  :segmentId,\n  :projectId,\n  :segmentName,\n  'custom_chatkit',\n  :queryPreviewId,\n  :naturalLanguageQuery,\n  :generatedSql,\n  :ruleJson,\n  '{}'::jsonb,\n  :sampleSize,\n  :totalEligibleUserCount,\n  :sampleRatio,\n  'active'\n)\nRETURNING\n  segment_id AS \"segmentId\",\n  project_id AS \"projectId\",\n  segment_name AS \"segmentName\",\n  source,\n  query_preview_id AS \"queryPreviewId\",\n  natural_language_query AS \"naturalLanguageQuery\",\n  generated_sql AS \"generatedSql\",\n  sample_size AS \"sampleSize\",\n  total_eligible_user_count AS \"totalEligibleUserCount\",\n  CAST(sample_ratio AS float8) AS \"sampleRatio\",\n  status                                   "};

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
 *   :ruleJson,
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
 *   CAST(sample_ratio AS float8) AS "sampleRatio",
 *   status
 * ```
 */
export const insertDashboardCustomSegmentDefinition = new PreparedQuery<IInsertDashboardCustomSegmentDefinitionParams,IInsertDashboardCustomSegmentDefinitionResult>(insertDashboardCustomSegmentDefinitionIR);


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

const markDashboardSegmentQueryPreviewSavedIR: any = {"usedParamSet":{"projectId":true,"queryPreviewId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":70,"b":79}]},{"name":"queryPreviewId","required":false,"transform":{"type":"scalar"},"locs":[{"a":106,"b":120}]}],"statement":"UPDATE segment_query_previews\nSET status = 'saved'\nWHERE project_id = :projectId\n  AND query_preview_id = :queryPreviewId\n\nRETURNING query_preview_id AS \"queryPreviewId\"                                  "};

/**
 * Query generated from SQL:
 * ```
 * UPDATE segment_query_previews
 * SET status = 'saved'
 * WHERE project_id = :projectId
 *   AND query_preview_id = :queryPreviewId
 *
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
  stepCount: number | null;
  updatedAt: Date;
}

/** 'ListActiveFunnels' query type */
export interface IListActiveFunnelsQuery {
  params: IListActiveFunnelsParams;
  result: IListActiveFunnelsResult;
}

const listActiveFunnelsIR: any = {"usedParamSet":{"projectId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":332,"b":341}]}],"statement":"SELECT\n  fd.funnel_id AS \"funnelId\",\n  fd.funnel_name AS \"funnelName\",\n  fd.domain_type AS \"domainType\",\n  fd.status,\n  COUNT(fs.funnel_id)::int AS \"stepCount\",\n  fd.created_at AS \"createdAt\",\n  fd.updated_at AS \"updatedAt\"\nFROM funnel_definitions fd\nLEFT JOIN funnel_steps fs\n  ON fs.funnel_id = fd.funnel_id\nWHERE fd.project_id = :projectId\n  AND fd.status = 'active'\nGROUP BY\n  fd.funnel_id,\n  fd.funnel_name,\n  fd.domain_type,\n  fd.status,\n  fd.created_at,\n  fd.updated_at\nORDER BY fd.updated_at DESC, fd.created_at DESC                                  "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   fd.funnel_id AS "funnelId",
 *   fd.funnel_name AS "funnelName",
 *   fd.domain_type AS "domainType",
 *   fd.status,
 *   COUNT(fs.funnel_id)::int AS "stepCount",
 *   fd.created_at AS "createdAt",
 *   fd.updated_at AS "updatedAt"
 * FROM funnel_definitions fd
 * LEFT JOIN funnel_steps fs
 *   ON fs.funnel_id = fd.funnel_id
 * WHERE fd.project_id = :projectId
 *   AND fd.status = 'active'
 * GROUP BY
 *   fd.funnel_id,
 *   fd.funnel_name,
 *   fd.domain_type,
 *   fd.status,
 *   fd.created_at,
 *   fd.updated_at
 * ORDER BY fd.updated_at DESC, fd.created_at DESC
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

const insertFunnelDefinitionIR: any = {"usedParamSet":{"funnelId":true,"projectId":true,"funnelName":true},"params":[{"name":"funnelId","required":false,"transform":{"type":"scalar"},"locs":[{"a":76,"b":84}]},{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":87,"b":96}]},{"name":"funnelName","required":false,"transform":{"type":"scalar"},"locs":[{"a":99,"b":109}]}],"statement":"INSERT INTO funnel_definitions (funnel_id, project_id, funnel_name)\nVALUES (:funnelId, :projectId, :funnelName)\nRETURNING\n  funnel_id AS \"funnelId\",\n  funnel_name AS \"funnelName\",\n  domain_type AS \"domainType\",\n  status,\n  created_at AS \"createdAt\",\n  updated_at AS \"updatedAt\"                                        "};

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


/** 'UpdateFunnelDefinition' parameters type */
export interface IUpdateFunnelDefinitionParams {
  funnelId?: string | null | void;
  funnelName?: string | null | void;
  projectId?: string | null | void;
}

/** 'UpdateFunnelDefinition' return type */
export interface IUpdateFunnelDefinitionResult {
  createdAt: Date;
  domainType: string;
  funnelId: string;
  funnelName: string;
  status: string;
  updatedAt: Date;
}

/** 'UpdateFunnelDefinition' query type */
export interface IUpdateFunnelDefinitionQuery {
  params: IUpdateFunnelDefinitionParams;
  result: IUpdateFunnelDefinitionResult;
}

const updateFunnelDefinitionIR: any = {"usedParamSet":{"funnelName":true,"projectId":true,"funnelId":true},"params":[{"name":"funnelName","required":false,"transform":{"type":"scalar"},"locs":[{"a":46,"b":56}]},{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":99,"b":108}]},{"name":"funnelId","required":false,"transform":{"type":"scalar"},"locs":[{"a":128,"b":136}]}],"statement":"UPDATE funnel_definitions\nSET\n  funnel_name = :funnelName,\n  updated_at = now()\nWHERE project_id = :projectId\n  AND funnel_id = :funnelId\n  AND status = 'active'\nRETURNING\n  funnel_id AS \"funnelId\",\n  funnel_name AS \"funnelName\",\n  domain_type AS \"domainType\",\n  status,\n  created_at AS \"createdAt\",\n  updated_at AS \"updatedAt\"                          "};

/**
 * Query generated from SQL:
 * ```
 * UPDATE funnel_definitions
 * SET
 *   funnel_name = :funnelName,
 *   updated_at = now()
 * WHERE project_id = :projectId
 *   AND funnel_id = :funnelId
 *   AND status = 'active'
 * RETURNING
 *   funnel_id AS "funnelId",
 *   funnel_name AS "funnelName",
 *   domain_type AS "domainType",
 *   status,
 *   created_at AS "createdAt",
 *   updated_at AS "updatedAt"
 * ```
 */
export const updateFunnelDefinition = new PreparedQuery<IUpdateFunnelDefinitionParams,IUpdateFunnelDefinitionResult>(updateFunnelDefinitionIR);


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

const deleteFunnelDefinitionIR: any = {"usedParamSet":{"projectId":true,"funnelId":true},"params":[{"name":"projectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":50,"b":59}]},{"name":"funnelId","required":false,"transform":{"type":"scalar"},"locs":[{"a":79,"b":87}]}],"statement":"DELETE FROM funnel_definitions\nWHERE project_id = :projectId\n  AND funnel_id = :funnelId\n\nRETURNING funnel_id AS \"funnelId\""};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM funnel_definitions
 * WHERE project_id = :projectId
 *   AND funnel_id = :funnelId
 *
 * RETURNING funnel_id AS "funnelId"
 * ```
 */
export const deleteFunnelDefinition = new PreparedQuery<IDeleteFunnelDefinitionParams,IDeleteFunnelDefinitionResult>(deleteFunnelDefinitionIR);
