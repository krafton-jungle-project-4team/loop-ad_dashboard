import { randomUUID } from "node:crypto";
import { DashboardFunnelEventNameSchema } from "@loopad/shared";
import type {
  DashboardCreateFunnelRequest,
  DashboardEventCatalogItem,
  DashboardFunnel,
  DashboardFunnelStep
} from "@loopad/shared";
import { type ClickHouseClient } from "@clickhouse/client";
import { InjectTransaction, type Transaction } from "@nestjs-cls/transactional";
import { Inject, Injectable } from "@nestjs/common";
import { CLICKHOUSE_CLIENT } from "../../../infra/database/index.js";
import { PgTypedTransactionalAdapter } from "../../../infra/database/pgtyped-transactional.adapter.js";
import {
  insertFunnelDefinition,
  insertFunnelStep,
  listActiveFunnels,
  listActiveFunnelSteps,
  type IInsertFunnelDefinitionResult,
  type IInsertFunnelStepResult,
  type IListActiveFunnelsResult,
  type IListActiveFunnelStepsResult
} from "../database/__generated__/dashboard.queries.js";

type EventCatalogRow = {
  event_name: string;
  event_count: number | string;
};

@Injectable()
export class DashboardFunnelReader {
  constructor(
    @InjectTransaction()
    private readonly db: Transaction<PgTypedTransactionalAdapter>,
    @Inject(CLICKHOUSE_CLIENT)
    private readonly clickhouse: ClickHouseClient
  ) {}

  async listEventCatalog(projectId: string): Promise<DashboardEventCatalogItem[]> {
    const result = await this.clickhouse.query({
      query: `
        SELECT
          event_name,
          count() AS event_count
        FROM funnel_step_events
        WHERE project_id = {projectId:String}
        GROUP BY event_name
        ORDER BY event_count DESC, event_name ASC
      `,
      format: "JSONEachRow",
      query_params: { projectId }
    });
    const rows = await result.json<EventCatalogRow>();

    return rows.map((row) => {
      const eventName = DashboardFunnelEventNameSchema.parse(row.event_name);
      return {
        event_name: eventName,
        display_name: eventDisplayName(eventName),
        event_count: countValue(row.event_count)
      };
    });
  }

  async listFunnels(projectId: string): Promise<DashboardFunnel[]> {
    const [funnels, steps] = await Promise.all([
      this.db.query(listActiveFunnels, { projectId }).multiple(),
      this.db.query(listActiveFunnelSteps, { projectId }).multiple()
    ]);

    return funnels.map((funnel) => toFunnel(funnel, steps));
  }

  async createFunnel(
    projectId: string,
    request: DashboardCreateFunnelRequest
  ): Promise<DashboardFunnel> {
    const funnelId = `funnel_${randomUUID()}`;
    const funnel = await this.db
      .query(insertFunnelDefinition, {
        funnelId,
        projectId,
        funnelName: request.funnel_name
      })
      .single();

    const steps: IInsertFunnelStepResult[] = [];
    for (const [index, step] of request.steps.entries()) {
      steps.push(
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

    return toFunnel(funnel, steps);
  }
}

function toFunnel(
  funnel: IInsertFunnelDefinitionResult | IListActiveFunnelsResult,
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

function countValue(value: number | string): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : 0;
}

function eventDisplayName(eventName: string): string {
  return EVENT_DISPLAY_NAMES[eventName] ?? eventName;
}

const EVENT_DISPLAY_NAMES: Record<string, string> = {
  booking_cancel: "예약 취소",
  booking_complete: "예약 완료",
  booking_start: "예약 시작",
  campaign_landing: "캠페인 랜딩",
  campaign_redirect_click: "캠페인 리다이렉트 클릭",
  hotel_click: "숙소 클릭",
  hotel_detail_view: "숙소 상세 조회",
  hotel_search: "숙소 검색",
  page_view: "페이지 조회",
  promotion_click: "프로모션 클릭",
  promotion_impression: "프로모션 노출"
};
