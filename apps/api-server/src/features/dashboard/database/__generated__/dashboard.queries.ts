/** Types generated for queries found in "src/features/dashboard/database/dashboard.sql" */
import type { SQLQueryIR } from "@pgtyped/parser";
import { PreparedQuery } from "@pgtyped/runtime";

type QueryParam = {
  name: string;
  required: boolean;
  transform: { type: "scalar" };
  locs: Array<{ a: number; b: number }>;
};

function scalarParam(statement: string, name: string, required = false): QueryParam {
  const token = `:${name}`;
  const locs: Array<{ a: number; b: number }> = [];
  let offset = statement.indexOf(token);

  while (offset >= 0) {
    locs.push({ a: offset, b: offset + token.length - 1 });
    offset = statement.indexOf(token, offset + token.length);
  }

  return {
    name,
    required,
    transform: { type: "scalar" },
    locs
  };
}

export interface IListRecommendationRowsParams {
  projectId: string;
  recommendationResultId: string | null;
}

export interface IListRecommendationRowsResult {
  actionId: string | null;
  actionName: string | null;
  actionType: string | null;
  contentCreatedAt: Date | null;
  contentId: string | null;
  contentUrl: string | null;
  createdAt: Date;
  description: string | null;
  reason: string | null;
  recommendationId: string;
  segmentId: string;
  status: string;
  title: string | null;
}

const listRecommendationRowsStatement = `
SELECT
  rr.id::text AS "recommendationId",
  rr.segment_hash AS "segmentId",
  rr.summary_message AS title,
  COALESCE(ra.rationale, rr.root_causes_json::text) AS reason,
  rr.status,
  rr.created_at AS "createdAt",
  ra.action_id AS "actionId",
  ra.action_type AS "actionType",
  COALESCE(ra.title, ac.title, ra.action_id) AS "actionName",
  COALESCE(ra.description, ac.description, '') AS description,
  adc.id::text AS "contentId",
  adc.image_url AS "contentUrl",
  adc.created_at AS "contentCreatedAt"
FROM recommendation_results rr
LEFT JOIN recommendation_actions ra
  ON ra.recommendation_result_id = rr.id
LEFT JOIN action_catalog ac
  ON ac.action_id = ra.action_id
LEFT JOIN segment_ad_mappings sam
  ON sam.recommendation_action_id = ra.id
LEFT JOIN ad_creatives adc
  ON adc.id = sam.creative_id
WHERE rr.project_id = :projectId
  AND (:recommendationResultId::text IS NULL OR rr.id::text = :recommendationResultId)
ORDER BY rr.created_at DESC, ra.created_at ASC
`;

const listRecommendationRowsIR = {
  usedParamSet: { projectId: true, recommendationResultId: true },
  params: [
    scalarParam(listRecommendationRowsStatement, "projectId", true),
    scalarParam(listRecommendationRowsStatement, "recommendationResultId")
  ],
  statement: listRecommendationRowsStatement
} as unknown as SQLQueryIR;

export const listRecommendationRows = new PreparedQuery<
  IListRecommendationRowsParams,
  IListRecommendationRowsResult
>(listRecommendationRowsIR);

export interface IGetExperimentParams {
  experimentId: string;
  projectId: string;
}

export interface IGetExperimentResult {
  actionId: string;
  actionType: string;
  banditArmId: string | null;
  banditPolicyId: string | null;
  createdAt: Date;
  endedAt: Date | null;
  experimentId: string;
  goalMetric: string | null;
  projectId: string;
  recommendationActionId: string;
  recommendationId: string;
  segmentHash: string;
  segmentId: string;
  startedAt: Date | null;
  status: string;
}

const getExperimentStatement = `
SELECT
  e.id::text AS "experimentId",
  e.project_id AS "projectId",
  e.segment_hash AS "segmentId",
  e.segment_hash AS "segmentHash",
  e.recommendation_result_id::text AS "recommendationId",
  e.recommendation_action_id::text AS "recommendationActionId",
  e.bandit_policy_id::text AS "banditPolicyId",
  e.bandit_arm_id::text AS "banditArmId",
  e.action_id AS "actionId",
  e.action_type AS "actionType",
  e.status,
  e.primary_metric AS "goalMetric",
  e.started_at AS "startedAt",
  e.ended_at AS "endedAt",
  e.created_at AS "createdAt"
FROM experiments e
WHERE e.project_id = :projectId
  AND e.id::text = :experimentId
`;

const getExperimentIR = {
  usedParamSet: { experimentId: true, projectId: true },
  params: [
    scalarParam(getExperimentStatement, "projectId", true),
    scalarParam(getExperimentStatement, "experimentId", true)
  ],
  statement: getExperimentStatement
} as unknown as SQLQueryIR;

export const getExperiment = new PreparedQuery<IGetExperimentParams, IGetExperimentResult>(
  getExperimentIR
);

export interface IListExperimentActionProbabilitiesParams {
  banditPolicyId: string;
}

export interface IListExperimentActionProbabilitiesResult {
  actionId: string;
  actionName: string;
  clicks: number | string;
  impressions: number | string;
  probability: number | string;
  purchases: number | string;
  updatedAt: Date;
}

const listExperimentActionProbabilitiesStatement = `
WITH arm_scores AS (
  SELECT
    ba.action_id AS "actionId",
    COALESCE(ac.title, ba.action_id) AS "actionName",
    ba.alpha / NULLIF(ba.alpha + ba.beta, 0) AS score,
    ba.impressions,
    0::bigint AS clicks,
    ba.conversions AS purchases,
    ba.updated_at AS "updatedAt"
  FROM bandit_arms ba
  LEFT JOIN action_catalog ac
    ON ac.action_id = ba.action_id
  WHERE ba.bandit_policy_id::text = :banditPolicyId
    AND ba.status = 'active'
)
SELECT
  "actionId",
  "actionName",
  CASE
    WHEN SUM(score) OVER () > 0 THEN score / SUM(score) OVER ()
    ELSE 0
  END AS probability,
  impressions,
  clicks,
  purchases,
  "updatedAt"
FROM arm_scores
ORDER BY probability DESC, "actionId" ASC
`;

const listExperimentActionProbabilitiesIR = {
  usedParamSet: { banditPolicyId: true },
  params: [scalarParam(listExperimentActionProbabilitiesStatement, "banditPolicyId", true)],
  statement: listExperimentActionProbabilitiesStatement
} as unknown as SQLQueryIR;

export const listExperimentActionProbabilities = new PreparedQuery<
  IListExperimentActionProbabilitiesParams,
  IListExperimentActionProbabilitiesResult
>(listExperimentActionProbabilitiesIR);
