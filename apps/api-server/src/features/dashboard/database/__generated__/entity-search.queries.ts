/** Types for queries found in "src/features/dashboard/database/entity-search.sql". */
import { PreparedQuery } from "@pgtyped/runtime";

export interface ISearchDashboardEntitiesParams {
  entityType?: string | null | void;
  projectId?: string | null | void;
  query?: string | null | void;
}

export interface ISearchDashboardEntitiesResult {
  campaignId: string;
  displayName: string;
  entityId: string;
  entityType: string;
  promotionId: string | null;
  segmentId: string | null;
  status: string;
  updatedAt: Date;
}

export interface ISearchDashboardEntitiesQuery {
  params: ISearchDashboardEntitiesParams;
  result: ISearchDashboardEntitiesResult;
}

const searchDashboardEntitiesIR: any = {
  usedParamSet: { entityType: true, projectId: true, query: true },
  params: [
    {
      name: "query",
      required: false,
      transform: { type: "scalar" },
      locs: [{ a: 44, b: 49 }]
    },
    {
      name: "projectId",
      required: false,
      transform: { type: "scalar" },
      locs: [
        { a: 598, b: 607 },
        { a: 1489, b: 1498 },
        { a: 2907, b: 2916 }
      ]
    },
    {
      name: "entityType",
      required: false,
      transform: { type: "scalar" },
      locs: [
        { a: 647, b: 657 },
        { a: 1568, b: 1578 },
        { a: 3018, b: 3028 }
      ]
    }
  ],
  statement: `WITH search_input AS (
  SELECT lower(btrim(:query)) AS normalized_query
),
campaign_entities AS (
  SELECT
    'campaign'::text AS "entityType",
    c.campaign_id AS "entityId",
    c.name AS "displayName",
    c.status,
    c.campaign_id AS "campaignId",
    NULL::text AS "promotionId",
    NULL::text AS "segmentId",
    c.updated_at AS "updatedAt",
    CASE
      WHEN lower(c.name) = input.normalized_query THEN 0
      WHEN strpos(lower(c.name), input.normalized_query) = 1 THEN 1
      ELSE 2
    END AS "matchRank"
  FROM campaigns c
  CROSS JOIN search_input input
  WHERE c.project_id = :projectId
    AND c.status <> 'stopped'
    AND :entityType IN ('all', 'campaign')
    AND (
      strpos(lower(c.name), input.normalized_query) > 0
      OR strpos(lower(COALESCE(c.objective, '')), input.normalized_query) > 0
    )
),
promotion_entities AS (
  SELECT
    'promotion'::text AS "entityType",
    p.promotion_id AS "entityId",
    p.marketing_theme AS "displayName",
    p.status,
    p.campaign_id AS "campaignId",
    p.promotion_id AS "promotionId",
    NULL::text AS "segmentId",
    p.updated_at AS "updatedAt",
    CASE
      WHEN lower(p.marketing_theme) = input.normalized_query THEN 0
      WHEN strpos(lower(p.marketing_theme), input.normalized_query) = 1 THEN 1
      ELSE 2
    END AS "matchRank"
  FROM promotions p
  JOIN campaigns c
    ON c.project_id = p.project_id
   AND c.campaign_id = p.campaign_id
  CROSS JOIN search_input input
  WHERE p.project_id = :projectId
    AND p.status <> 'stopped'
    AND c.status <> 'stopped'
    AND :entityType IN ('all', 'promotion')
    AND (
      strpos(lower(p.marketing_theme), input.normalized_query) > 0
      OR strpos(lower(COALESCE(p.message_brief, '')), input.normalized_query) > 0
      OR strpos(lower(p.channel), input.normalized_query) > 0
    )
),
segment_entities AS (
  SELECT DISTINCT ON (pts.promotion_id, pts.segment_id)
    'segment'::text AS "entityType",
    pts.segment_id AS "entityId",
    pts.segment_name AS "displayName",
    pts.status,
    pts.campaign_id AS "campaignId",
    pts.promotion_id AS "promotionId",
    pts.segment_id AS "segmentId",
    COALESCE(sd.updated_at, pts.created_at) AS "updatedAt",
    CASE
      WHEN lower(pts.segment_name) = input.normalized_query THEN 0
      WHEN strpos(lower(pts.segment_name), input.normalized_query) = 1 THEN 1
      ELSE 2
    END AS "matchRank"
  FROM promotion_target_segments pts
  JOIN promotions p
    ON p.project_id = pts.project_id
   AND p.campaign_id = pts.campaign_id
   AND p.promotion_id = pts.promotion_id
  JOIN campaigns c
    ON c.project_id = pts.project_id
   AND c.campaign_id = pts.campaign_id
  LEFT JOIN segment_definitions sd
    ON sd.project_id = pts.project_id
   AND sd.segment_id = pts.segment_id
   AND (sd.promotion_id = pts.promotion_id OR sd.promotion_id IS NULL)
  CROSS JOIN search_input input
  WHERE pts.project_id = :projectId
    AND pts.status <> 'stopped'
    AND p.status <> 'stopped'
    AND c.status <> 'stopped'
    AND :entityType IN ('all', 'segment')
    AND (
      strpos(lower(pts.segment_name), input.normalized_query) > 0
      OR strpos(lower(COALESCE(sd.natural_language_query, '')), input.normalized_query) > 0
    )
  ORDER BY pts.promotion_id, pts.segment_id, pts.created_at DESC
),
entity_results AS (
  SELECT * FROM campaign_entities
  UNION ALL
  SELECT * FROM promotion_entities
  UNION ALL
  SELECT * FROM segment_entities
)
SELECT
  "entityType",
  "entityId",
  "displayName",
  status,
  "campaignId",
  "promotionId",
  "segmentId",
  "updatedAt"
FROM entity_results
ORDER BY "matchRank" ASC, "updatedAt" DESC, "entityType" ASC, "entityId" ASC
LIMIT 20;`
};

export const searchDashboardEntities = new PreparedQuery<
  ISearchDashboardEntitiesParams,
  ISearchDashboardEntitiesResult
>(searchDashboardEntitiesIR);
