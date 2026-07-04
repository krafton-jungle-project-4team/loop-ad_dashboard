import { randomUUID } from "node:crypto";
import { DashboardFunnelEventNameSchema } from "@loopad/shared";
import type {
  DashboardCreateFunnelRequest,
  DashboardDeleteFunnelResult,
  DashboardEventCatalogItem,
  DashboardFunnel,
  DashboardFunnelMetrics,
  DashboardFunnelStep,
  DashboardSegmentRealtimeMetrics
} from "@loopad/shared";
import { type ClickHouseClient } from "@clickhouse/client";
import { InjectTransaction, type Transaction } from "@nestjs-cls/transactional";
import { Inject, Injectable } from "@nestjs/common";
import { CLICKHOUSE_CLIENT } from "../../../infra/database/index.js";
import { PgTypedTransactionalAdapter } from "../../../infra/database/pgtyped-transactional.adapter.js";
import {
  deleteFunnelDefinition,
  deleteFunnelSteps,
  getActiveFunnelById,
  insertFunnelDefinition,
  insertFunnelStep,
  listActiveFunnels,
  listActiveFunnelSteps,
  listActiveFunnelStepsByFunnelId,
  type IGetActiveFunnelByIdResult,
  type IInsertFunnelDefinitionResult,
  type IInsertFunnelStepResult,
  type IListActiveFunnelsResult,
  type IListActiveFunnelStepsByFunnelIdResult,
  type IListActiveFunnelStepsResult
} from "../database/__generated__/dashboard.queries.js";

type EventCatalogRow = {
  event_name: string;
  event_count: number | string;
};

type FunnelStepMetricRow = {
  event_name: string;
  event_count: number | string;
};

type SegmentRealtimeMetricRow = {
  event_name: string;
  event_count: number | string;
  unique_user_count: number | string;
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

  async getFunnelMetrics(projectId: string, funnelId: string): Promise<DashboardFunnelMetrics> {
    const [funnel, steps] = await Promise.all([
      this.db.query(getActiveFunnelById, { funnelId, projectId }).single(),
      this.db.query(listActiveFunnelStepsByFunnelId, { funnelId, projectId }).multiple()
    ]);
    const eventCounts = await this.countFunnelStepEvents(projectId, steps);

    return {
      funnel_id: funnel.funnelId,
      funnel_name: funnel.funnelName,
      steps: steps.map((step) => ({
        step_order: step.stepOrder,
        step_name: step.stepName,
        event_name: DashboardFunnelEventNameSchema.parse(step.eventName),
        event_count: eventCounts.get(step.eventName) ?? 0
      }))
    };
  }

  async getSegmentRealtimeMetrics(
    projectId: string,
    promotionId: string,
    segmentId: string
  ): Promise<DashboardSegmentRealtimeMetrics> {
    const result = await this.clickhouse.query({
      query: `
        SELECT
          event_name,
          count() AS event_count,
          uniqExact(user_id) AS unique_user_count
        FROM (
          SELECT event_name, user_id
          FROM promotion_touch_events
          WHERE project_id = {projectId:String}
            AND promotion_id = {promotionId:String}
            AND segment_id = {segmentId:String}

          UNION ALL

          SELECT event_name, user_id
          FROM booking_outcome_events
          WHERE project_id = {projectId:String}
            AND ifNull(promotion_id, '') = {promotionId:String}
            AND ifNull(segment_id, '') = {segmentId:String}
        )
        GROUP BY event_name
        ORDER BY event_count DESC, event_name ASC
      `,
      format: "JSONEachRow",
      query_params: { projectId, promotionId, segmentId }
    });
    const rows = await result.json<SegmentRealtimeMetricRow>();
    const events = rows.map((row) => ({
      event_name: DashboardFunnelEventNameSchema.parse(row.event_name),
      event_count: countValue(row.event_count),
      unique_user_count: countValue(row.unique_user_count)
    }));

    return {
      promotion_id: promotionId,
      segment_id: segmentId,
      total_event_count: events.reduce((sum, event) => sum + event.event_count, 0),
      events
    };
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

  async deleteFunnel(
    projectId: string,
    funnelId: string
  ): Promise<DashboardDeleteFunnelResult> {
    await this.db.query(deleteFunnelSteps, { funnelId, projectId }).multiple();
    const deleted = await this.db
      .query(deleteFunnelDefinition, { funnelId, projectId })
      .single();

    return {
      funnel_id: deleted.funnelId,
      deleted: true
    };
  }

  private async countFunnelStepEvents(
    projectId: string,
    steps: IListActiveFunnelStepsByFunnelIdResult[]
  ): Promise<Map<string, number>> {
    const eventNames = [...new Set(steps.map((step) => step.eventName))];
    if (eventNames.length === 0) {
      return new Map();
    }

    const result = await this.clickhouse.query({
      query: `
        SELECT
          event_name,
          count() AS event_count
        FROM funnel_step_events
        WHERE project_id = {projectId:String}
          AND event_name IN {eventNames:Array(String)}
        GROUP BY event_name
      `,
      format: "JSONEachRow",
      query_params: { eventNames, projectId }
    });
    const rows = await result.json<FunnelStepMetricRow>();

    return new Map(rows.map((row) => [row.event_name, countValue(row.event_count)]));
  }
}

function toFunnel(
  funnel: IGetActiveFunnelByIdResult | IInsertFunnelDefinitionResult | IListActiveFunnelsResult,
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
