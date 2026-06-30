/** Types generated for queries found in "src/features/ads/database/ads.sql" */
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

export interface IGetAdProjectParams {
  projectId: string;
}

export interface IGetAdProjectResult {
  projectDbId: string;
  projectId: string;
}

const getAdProjectStatement = `
SELECT
  id::text AS "projectDbId",
  project_key AS "projectId"
FROM projects
WHERE project_key = :projectId
`;

const getAdProjectIR = {
  usedParamSet: { projectId: true },
  params: [scalarParam(getAdProjectStatement, "projectId", true)],
  statement: getAdProjectStatement
} as unknown as SQLQueryIR;

export const getAdProject = new PreparedQuery<IGetAdProjectParams, IGetAdProjectResult>(
  getAdProjectIR
);

export interface IGetLatestPrimarySegmentParams {
  projectDbId: string;
  userId: string;
}

export interface IGetLatestPrimarySegmentResult {
  segmentDbId: string;
}

const getLatestPrimarySegmentStatement = `
SELECT
  segment_id::text AS "segmentDbId"
FROM latest_user_primary_segments
WHERE project_id = :projectDbId::bigint
  AND external_user_id = :userId
LIMIT 1
`;

const getLatestPrimarySegmentIR = {
  usedParamSet: { projectDbId: true, userId: true },
  params: [
    scalarParam(getLatestPrimarySegmentStatement, "projectDbId", true),
    scalarParam(getLatestPrimarySegmentStatement, "userId", true)
  ],
  statement: getLatestPrimarySegmentStatement
} as unknown as SQLQueryIR;

export const getLatestPrimarySegment = new PreparedQuery<
  IGetLatestPrimarySegmentParams,
  IGetLatestPrimarySegmentResult
>(getLatestPrimarySegmentIR);

export interface IGetDefaultSegmentParams {
  projectDbId: string;
}

export interface IGetDefaultSegmentResult {
  segmentDbId: string;
}

const getDefaultSegmentStatement = `
SELECT
  id::text AS "segmentDbId"
FROM segments
WHERE project_id = :projectDbId::bigint
  AND is_default = true
  AND status = 'active'
ORDER BY created_at ASC
LIMIT 1
`;

const getDefaultSegmentIR = {
  usedParamSet: { projectDbId: true },
  params: [scalarParam(getDefaultSegmentStatement, "projectDbId", true)],
  statement: getDefaultSegmentStatement
} as unknown as SQLQueryIR;

export const getDefaultSegment = new PreparedQuery<
  IGetDefaultSegmentParams,
  IGetDefaultSegmentResult
>(getDefaultSegmentIR);

export interface IListAdServingCandidatesParams {
  placementKey: string;
  projectDbId: string;
  segmentDbId: string;
}

export interface IListAdServingCandidatesResult {
  actionId: string | null;
  body: string | null;
  contentType: string | null;
  creativeId: string | null;
  ctaLabel: string | null;
  experimentId: string | null;
  imageUrl: string | null;
  landingUrl: string | null;
  mappingId: string | null;
  priority: number | string;
  title: string | null;
  trafficWeight: number | string;
  variantId: string | null;
}

const listAdServingCandidatesStatement = `
SELECT
  mapping_id::text AS "mappingId",
  priority,
  traffic_weight::float8 AS "trafficWeight",
  COALESCE(experiment_id::text, '') AS "experimentId",
  COALESCE(experiment_variant_id::text, '') AS "variantId",
  generated_content_id::text AS "creativeId",
  content_type AS "contentType",
  title,
  COALESCE(body, '') AS body,
  COALESCE(cta_label, '') AS "ctaLabel",
  COALESCE(image_url, '') AS "imageUrl",
  COALESCE(landing_url, '') AS "landingUrl",
  COALESCE(action_id::text, '') AS "actionId"
FROM active_ad_serving_rules
WHERE project_id = :projectDbId::bigint
  AND segment_id = :segmentDbId::bigint
  AND placement_key = :placementKey
ORDER BY priority DESC, mapping_id ASC
`;

const listAdServingCandidatesIR = {
  usedParamSet: { projectDbId: true, segmentDbId: true, placementKey: true },
  params: [
    scalarParam(listAdServingCandidatesStatement, "projectDbId", true),
    scalarParam(listAdServingCandidatesStatement, "segmentDbId", true),
    scalarParam(listAdServingCandidatesStatement, "placementKey", true)
  ],
  statement: listAdServingCandidatesStatement
} as unknown as SQLQueryIR;

export const listAdServingCandidates = new PreparedQuery<
  IListAdServingCandidatesParams,
  IListAdServingCandidatesResult
>(listAdServingCandidatesIR);
