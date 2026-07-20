import {
  DashboardExperimentEvaluationDiagnosisSchema,
  type DashboardExperimentEvaluationDiagnosis,
  type DashboardProjectExperiment,
  type DashboardProjectExperimentLatestEvaluation,
  type DashboardProjectExperimentList,
  type DashboardProjectExperimentNextLoop
} from "@loopad/shared";
import { InjectTransaction, type Transaction } from "@nestjs-cls/transactional";
import { Injectable } from "@nestjs/common";
import { PgTypedTransactionalAdapter } from "../../../infra/database/pgtyped-transactional.adapter.js";
import {
  listDashboardProjectExperiments,
  type IListDashboardProjectExperimentsResult
} from "../database/__generated__/project-experiments.queries.js";
import { countValue, jsonObject } from "./dashboard-campaign-mappers.js";

@Injectable()
export class DashboardProjectExperimentsReader {
  constructor(
    @InjectTransaction()
    private readonly db: Transaction<PgTypedTransactionalAdapter>
  ) {}

  async list(projectId: string): Promise<DashboardProjectExperimentList> {
    const rows = await this.db.query(listDashboardProjectExperiments, { projectId }).multiple();

    return { experiments: rows.map(toProjectExperiment) };
  }
}

function toProjectExperiment(
  row: IListDashboardProjectExperimentsResult
): DashboardProjectExperiment {
  return {
    ad_experiment_id: requiredText(row.adExperimentId, "adExperimentId"),
    assignment_count: countValue(row.assignmentCount),
    campaign_id: row.campaignId,
    campaign_name: row.campaignName,
    channel: row.channel,
    content_id: row.contentId,
    content_option_id: row.contentOptionId,
    ended_at: row.endedAt?.toISOString() ?? null,
    goal_basis: row.goalBasis,
    goal_metric: row.goalMetric,
    goal_target_value: numberValue(row.goalTargetValue),
    latest_evaluation: toLatestEvaluation(row),
    loop_count: countValue(row.loopCount),
    max_loop_count: countValue(row.maxLoopCount),
    execution_mode: row.executionMode as "manual" | "automatic",
    scheduled_start_at: row.scheduledStartAt?.toISOString() ?? null,
    scheduled_end_at: row.scheduledEndAt?.toISOString() ?? null,
    loop_interval_unit: row.loopIntervalUnit as "hour" | "day",
    loop_interval_value: countValue(row.loopIntervalValue),
    next_loop: toNextLoop(row),
    promotion_id: row.promotionId,
    promotion_name: row.promotionName,
    promotion_run_id: row.promotionRunId,
    segment_id: row.segmentId,
    segment_name: requiredText(row.segmentName, "segmentName"),
    started_at: row.startedAt?.toISOString() ?? null,
    status: row.status,
    updated_at: row.updatedAt.toISOString()
  };
}

function toLatestEvaluation(
  row: IListDashboardProjectExperimentsResult
): DashboardProjectExperimentLatestEvaluation | null {
  if (!row.evaluationCreatedAt) {
    return null;
  }
  const resultJson = jsonObject(row.evaluationResultJson);

  return {
    actual_value: numberValue(row.evaluationActualValue),
    basis: requiredText(row.evaluationBasis, "evaluationBasis"),
    created_at: row.evaluationCreatedAt.toISOString(),
    denominator_count: countValue(row.evaluationDenominatorCount),
    diagnosis: toEvaluationDiagnosis(resultJson.diagnosis),
    evaluation_cutoff_at: optionalText(resultJson.evaluation_cutoff_at),
    feedback: row.evaluationFeedback,
    metric: requiredText(row.evaluationMetric, "evaluationMetric"),
    next_loop_required: row.evaluationNextLoopRequired ?? false,
    numerator_count: countValue(row.evaluationNumeratorCount),
    sample_size: countValue(row.evaluationSampleSize),
    status: requiredText(row.evaluationStatus, "evaluationStatus"),
    target_value: numberValue(row.evaluationTargetValue),
    window_start: optionalText(resultJson.window_start)
  };
}

function toEvaluationDiagnosis(value: unknown): DashboardExperimentEvaluationDiagnosis | null {
  const parsed = DashboardExperimentEvaluationDiagnosisSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function toNextLoop(
  row: IListDashboardProjectExperimentsResult
): DashboardProjectExperimentNextLoop | null {
  if (!row.nextPromotionRunId) {
    return null;
  }

  return {
    loop_count: countValue(row.nextLoopCount),
    promotion_run_id: row.nextPromotionRunId,
    status: requiredText(row.nextLoopStatus, "nextLoopStatus")
  };
}

function numberValue(value: number | string | null): number {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function requiredText(value: string | null, fieldName: string): string {
  if (!value) {
    throw new Error(`Dashboard experiment query returned empty '${fieldName}'.`);
  }
  return value;
}

function optionalText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}
