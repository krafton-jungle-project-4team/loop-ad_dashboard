import { randomUUID } from "node:crypto";
import { DashboardFunnelEventNameSchema } from "@loopad/shared";
import type {
  DashboardCreateFunnelRequest,
  DashboardDeleteFunnelResult,
  DashboardFunnel,
  DashboardFunnelSummary,
  DashboardUpdateFunnelRequest
} from "@loopad/shared";
import type { Transaction } from "@nestjs-cls/transactional";
import { PgTypedTransactionalAdapter } from "../../../infra/database/pgtyped-transactional.adapter.js";
import {
  deleteFunnelDefinition,
  deleteFunnelSteps,
  getActiveFunnelById,
  insertFunnelDefinition,
  insertFunnelStep,
  listActiveFunnels,
  listActiveFunnelStepsByFunnelId,
  updateFunnelDefinition,
  type IGetActiveFunnelByIdResult,
  type IInsertFunnelDefinitionResult,
  type IInsertFunnelStepResult,
  type IListActiveFunnelsResult,
  type IListActiveFunnelStepsResult,
  type IUpdateFunnelDefinitionResult
} from "../database/__generated__/dashboard.queries.js";

export class DashboardFunnelDefinitionRepository {
  constructor(private readonly db: Transaction<PgTypedTransactionalAdapter>) {}

  async list(projectId: string): Promise<DashboardFunnelSummary[]> {
    const funnels = await this.db.query(listActiveFunnels, { projectId }).multiple();
    return funnels.map(toFunnelSummary);
  }

  async get(projectId: string, funnelId: string): Promise<DashboardFunnel> {
    const [funnel, steps] = await Promise.all([
      this.db.query(getActiveFunnelById, { funnelId, projectId }).single(),
      this.db.query(listActiveFunnelStepsByFunnelId, { funnelId, projectId }).multiple()
    ]);
    return toFunnel(funnel, steps);
  }

  async getMetricDefinition(projectId: string, funnelId: string) {
    const [funnel, steps] = await Promise.all([
      this.db.query(getActiveFunnelById, { funnelId, projectId }).single(),
      this.db.query(listActiveFunnelStepsByFunnelId, { funnelId, projectId }).multiple()
    ]);
    return {
      funnelId: funnel.funnelId,
      funnelName: funnel.funnelName,
      steps: steps.map((step) => ({
        eventName: step.eventName,
        stepName: step.stepName,
        stepOrder: step.stepOrder
      }))
    };
  }

  async create(projectId: string, request: DashboardCreateFunnelRequest): Promise<DashboardFunnel> {
    const funnelId = `funnel_${randomUUID()}`;
    const funnel = await this.db
      .query(insertFunnelDefinition, {
        funnelId,
        projectId,
        funnelName: request.funnel_name
      })
      .single();
    const steps = await this.replaceSteps(funnelId, request.steps);
    return toFunnel(funnel, steps);
  }

  async update(
    projectId: string,
    funnelId: string,
    request: DashboardUpdateFunnelRequest
  ): Promise<DashboardFunnel> {
    const funnel = await this.db
      .query(updateFunnelDefinition, {
        funnelId,
        projectId,
        funnelName: request.funnel_name
      })
      .single();
    await this.db.query(deleteFunnelSteps, { funnelId, projectId }).multiple();
    const steps = await this.replaceSteps(funnelId, request.steps);
    return toFunnel(funnel, steps);
  }

  async delete(projectId: string, funnelId: string): Promise<DashboardDeleteFunnelResult> {
    await this.db.query(deleteFunnelSteps, { funnelId, projectId }).multiple();
    const deleted = await this.db.query(deleteFunnelDefinition, { funnelId, projectId }).single();
    return { funnel_id: deleted.funnelId, deleted: true };
  }

  private async replaceSteps(
    funnelId: string,
    steps: DashboardCreateFunnelRequest["steps"]
  ): Promise<IInsertFunnelStepResult[]> {
    const storedSteps: IInsertFunnelStepResult[] = [];
    for (const [index, step] of steps.entries()) {
      storedSteps.push(
        await this.db
          .query(insertFunnelStep, {
            funnelId,
            stepOrder: index + 1,
            stepName: step.step_name,
            eventName: step.event_name
          })
          .single()
      );
    }
    return storedSteps;
  }
}

function toFunnel(
  funnel:
    | IGetActiveFunnelByIdResult
    | IInsertFunnelDefinitionResult
    | IListActiveFunnelsResult
    | IUpdateFunnelDefinitionResult,
  steps: Array<IInsertFunnelStepResult | IListActiveFunnelStepsResult>
): DashboardFunnel {
  return {
    funnel_id: funnel.funnelId,
    funnel_name: funnel.funnelName,
    domain_type: funnel.domainType,
    status: funnel.status,
    steps: steps
      .filter((step) => step.funnelId === funnel.funnelId)
      .map((step) => ({
        step_order: step.stepOrder,
        step_name: step.stepName,
        event_name: DashboardFunnelEventNameSchema.parse(step.eventName)
      })),
    created_at: funnel.createdAt.toISOString(),
    updated_at: funnel.updatedAt.toISOString()
  };
}

function toFunnelSummary(funnel: IListActiveFunnelsResult): DashboardFunnelSummary {
  return {
    funnel_id: funnel.funnelId,
    funnel_name: funnel.funnelName,
    domain_type: funnel.domainType,
    status: funnel.status,
    step_count: countValue(funnel.stepCount),
    created_at: funnel.createdAt.toISOString(),
    updated_at: funnel.updatedAt.toISOString()
  };
}

function countValue(value: number | string | null): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : 0;
}
