import type { DashboardExperiment, DashboardExperimentActionProbability } from "@loopad/shared";
import { InjectTransaction, type Transaction } from "@nestjs-cls/transactional";
import { Injectable } from "@nestjs/common";
import { type PgTypedTransactionalAdapter } from "../../../infra/database/index.js";
import {
  getExperiment,
  listExperimentActionProbabilities
} from "../database/__generated__/dashboard.queries.js";

@Injectable()
export class DashboardExperimentReader {
  constructor(
    @InjectTransaction()
    private readonly db: Transaction<PgTypedTransactionalAdapter>
  ) {}

  async readExperiment(
    projectId: string,
    experimentId: string
  ): Promise<DashboardExperiment | null> {
    const row = await this.db.query(getExperiment, { projectId, experimentId }).singleOrNull();
    if (!row) {
      return null;
    }

    return {
      experiment_id: row.experimentId,
      project_id: row.projectId,
      segment_id: row.segmentId,
      segment_hash: row.segmentHash,
      recommendation_id: row.recommendationId,
      recommendation_action_id: row.recommendationActionId,
      bandit_policy_id: row.banditPolicyId,
      bandit_arm_id: row.banditArmId,
      action_id: row.actionId,
      action_type: row.actionType,
      status: row.status,
      goal_metric: row.goalMetric ?? "purchase_rate",
      started_at: row.startedAt?.toISOString() ?? null,
      ended_at: row.endedAt?.toISOString() ?? null,
      created_at: row.createdAt.toISOString(),
      action_probabilities: row.banditPolicyId
        ? await this.readExperimentActionProbabilities(row.banditPolicyId)
        : []
    };
  }

  private async readExperimentActionProbabilities(
    banditPolicyId: string
  ): Promise<DashboardExperimentActionProbability[]> {
    const rows = await this.db
      .query(listExperimentActionProbabilities, { banditPolicyId })
      .multiple();

    return rows.map((row) => ({
      action_id: row.actionId,
      action_name: row.actionName,
      probability: Number(row.probability),
      impressions: Number(row.impressions),
      clicks: Number(row.clicks),
      purchases: Number(row.purchases),
      updated_at: row.updatedAt.toISOString()
    }));
  }
}
