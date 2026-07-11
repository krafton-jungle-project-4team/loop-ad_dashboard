/** Types for queries found in "src/features/dashboard/database/project-experiments.sql". */
import { PreparedQuery } from "@pgtyped/runtime";

export interface IListDashboardProjectExperimentsParams {
  projectId?: string | null | void;
}

export interface IListDashboardProjectExperimentsResult {
  adExperimentId: string;
  assignmentCount: number | null;
  campaignId: string;
  campaignName: string;
  channel: string;
  contentId: string;
  contentOptionId: string;
  endedAt: Date | null;
  evaluationActualValue: number | null;
  evaluationBasis: string | null;
  evaluationCreatedAt: Date | null;
  evaluationDenominatorCount: number | null;
  evaluationFeedback: string | null;
  evaluationMetric: string | null;
  evaluationNextLoopRequired: boolean | null;
  evaluationNumeratorCount: number | null;
  evaluationSampleSize: number | null;
  evaluationStatus: string | null;
  evaluationTargetValue: number | null;
  goalBasis: string;
  goalMetric: string;
  goalTargetValue: number | null;
  loopCount: number;
  nextLoopCount: number | null;
  nextLoopStatus: string | null;
  nextPromotionRunId: string | null;
  promotionId: string;
  promotionName: string;
  promotionRunId: string;
  segmentId: string;
  segmentName: string;
  startedAt: Date | null;
  status: string;
  updatedAt: Date;
}

const listDashboardProjectExperimentsIR: any = {
  usedParamSet: { projectId: true },
  params: [
    {
      name: "projectId",
      required: false,
      transform: { type: "scalar" },
      locs: [
        { a: 194, b: 203 },
        { a: 2878, b: 2887 }
      ]
    }
  ],
  statement: `WITH assignment_counts AS (
  SELECT
    project_id,
    promotion_run_id,
    ad_experiment_id,
    COUNT(user_id)::int AS assignment_count
  FROM user_segment_assignments
  WHERE project_id = :projectId
  GROUP BY project_id, promotion_run_id, ad_experiment_id
)
SELECT
  ae.ad_experiment_id AS "adExperimentId",
  ae.promotion_run_id AS "promotionRunId",
  ae.campaign_id AS "campaignId",
  c.name AS "campaignName",
  ae.promotion_id AS "promotionId",
  p.marketing_theme AS "promotionName",
  ae.segment_id AS "segmentId",
  ae.segment_name AS "segmentName",
  ae.content_id AS "contentId",
  ae.content_option_id AS "contentOptionId",
  ae.channel,
  ae.loop_count AS "loopCount",
  ae.goal_metric AS "goalMetric",
  CAST(ae.goal_target_value AS float8) AS "goalTargetValue",
  ae.goal_basis AS "goalBasis",
  COALESCE(ac.assignment_count, 0)::int AS "assignmentCount",
  ae.status,
  ae.started_at AS "startedAt",
  ae.ended_at AS "endedAt",
  ae.updated_at AS "updatedAt",
  evaluation.metric AS "evaluationMetric",
  CAST(evaluation.target_value AS float8) AS "evaluationTargetValue",
  CAST(evaluation.actual_value AS float8) AS "evaluationActualValue",
  evaluation.numerator_count AS "evaluationNumeratorCount",
  evaluation.denominator_count AS "evaluationDenominatorCount",
  evaluation.sample_size AS "evaluationSampleSize",
  evaluation.basis AS "evaluationBasis",
  evaluation.status AS "evaluationStatus",
  evaluation.feedback AS "evaluationFeedback",
  evaluation.next_loop_required AS "evaluationNextLoopRequired",
  evaluation.created_at AS "evaluationCreatedAt",
  next_run.promotion_run_id AS "nextPromotionRunId",
  next_run.loop_count AS "nextLoopCount",
  next_run.status AS "nextLoopStatus"
FROM ad_experiments ae
JOIN campaigns c
  ON c.project_id = ae.project_id
 AND c.campaign_id = ae.campaign_id
JOIN promotions p
  ON p.project_id = ae.project_id
 AND p.campaign_id = ae.campaign_id
 AND p.promotion_id = ae.promotion_id
LEFT JOIN assignment_counts ac
  ON ac.project_id = ae.project_id
 AND ac.promotion_run_id = ae.promotion_run_id
 AND ac.ad_experiment_id = ae.ad_experiment_id
LEFT JOIN LATERAL (
  SELECT
    pe.metric,
    pe.target_value,
    pe.actual_value,
    pe.numerator_count,
    pe.denominator_count,
    pe.sample_size,
    pe.basis,
    pe.status,
    pe.feedback,
    pe.next_loop_required,
    pe.created_at
  FROM promotion_evaluations pe
  WHERE pe.project_id = ae.project_id
    AND pe.ad_experiment_id = ae.ad_experiment_id
  ORDER BY pe.created_at DESC
  LIMIT 1
) evaluation ON TRUE
LEFT JOIN LATERAL (
  SELECT
    pr.promotion_run_id,
    pr.loop_count,
    pr.status
  FROM promotion_runs pr
  WHERE pr.project_id = ae.project_id
    AND pr.promotion_id = ae.promotion_id
    AND pr.loop_count = ae.loop_count + 1
  ORDER BY pr.updated_at DESC, pr.created_at DESC
  LIMIT 1
) next_run ON TRUE
WHERE ae.project_id = :projectId
ORDER BY ae.updated_at DESC, ae.created_at DESC, ae.ad_experiment_id ASC;`
};

export const listDashboardProjectExperiments = new PreparedQuery<
  IListDashboardProjectExperimentsParams,
  IListDashboardProjectExperimentsResult
>(listDashboardProjectExperimentsIR);

export interface IListDashboardRunningAdExperimentCountsParams {
  projectId?: string | null | void;
}

export interface IListDashboardRunningAdExperimentCountsResult {
  campaignId: string;
  runningAdExperimentCount: number | null;
}

const listDashboardRunningAdExperimentCountsIR: any = {
  usedParamSet: { projectId: true },
  params: [
    {
      name: "projectId",
      required: false,
      transform: { type: "scalar" },
      locs: [{ a: 292, b: 301 }]
    }
  ],
  statement: `SELECT
  c.campaign_id AS "campaignId",
  (COUNT(DISTINCT ae.ad_experiment_id) FILTER (WHERE ae.status = 'running'))::int
    AS "runningAdExperimentCount"
FROM campaigns c
LEFT JOIN ad_experiments ae
  ON ae.project_id = c.project_id
 AND ae.campaign_id = c.campaign_id
WHERE c.project_id = :projectId
GROUP BY c.campaign_id;`
};

export const listDashboardRunningAdExperimentCounts = new PreparedQuery<
  IListDashboardRunningAdExperimentCountsParams,
  IListDashboardRunningAdExperimentCountsResult
>(listDashboardRunningAdExperimentCountsIR);
