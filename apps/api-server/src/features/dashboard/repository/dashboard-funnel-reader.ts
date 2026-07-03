import { randomUUID } from "node:crypto";
import type {
  DashboardCreateFunnelRequest,
  DashboardEventCatalogItem,
  DashboardFunnel,
  DashboardFunnelStep
} from "@loopad/shared";
import { type ClickHouseClient } from "@clickhouse/client";
import { Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";
import { CLICKHOUSE_CLIENT, PG_POOL } from "../../../infra/database/index.js";

type FunnelRow = {
  funnel_id: string;
  funnel_name: string;
  domain_type: string;
  status: string;
  created_at: Date | string;
  updated_at: Date | string;
};

type FunnelStepRow = {
  funnel_id: string;
  step_order: number | string;
  step_name: string;
  event_name: DashboardFunnelStep["event_name"];
};

type EventCatalogRow = {
  event_name: string;
  event_count: number | string;
};

@Injectable()
export class DashboardFunnelReader {
  constructor(
    @Inject(PG_POOL)
    private readonly postgres: Pool,
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

    return rows.map((row) => ({
      event_name: row.event_name,
      display_name: eventDisplayName(row.event_name),
      event_count: countValue(row.event_count)
    }));
  }

  async listFunnels(projectId: string): Promise<DashboardFunnel[]> {
    const [funnels, steps] = await Promise.all([
      this.postgres.query<FunnelRow>(
        `
          SELECT
            funnel_id,
            funnel_name,
            domain_type,
            status,
            created_at,
            updated_at
          FROM funnel_definitions
          WHERE project_id = $1
            AND status = 'active'
          ORDER BY updated_at DESC, created_at DESC
        `,
        [projectId]
      ),
      this.postgres.query<FunnelStepRow>(
        `
          SELECT
            fs.funnel_id,
            fs.step_order,
            fs.step_name,
            fs.event_name
          FROM funnel_steps fs
          JOIN funnel_definitions fd
            ON fd.funnel_id = fs.funnel_id
          WHERE fd.project_id = $1
            AND fd.status = 'active'
          ORDER BY fs.funnel_id ASC, fs.step_order ASC
        `,
        [projectId]
      )
    ]);

    return funnels.rows.map((funnel) => toFunnel(funnel, steps.rows));
  }

  async createFunnel(
    projectId: string,
    request: DashboardCreateFunnelRequest
  ): Promise<DashboardFunnel> {
    const client = await this.postgres.connect();
    const funnelId = `funnel_${randomUUID()}`;

    try {
      await client.query("BEGIN");
      const funnel = await client.query<FunnelRow>(
        `
          INSERT INTO funnel_definitions (funnel_id, project_id, funnel_name)
          VALUES ($1, $2, $3)
          RETURNING funnel_id, funnel_name, domain_type, status, created_at, updated_at
        `,
        [funnelId, projectId, request.funnel_name]
      );

      const steps: FunnelStepRow[] = [];
      for (const [index, step] of request.steps.entries()) {
        const result = await client.query<FunnelStepRow>(
          `
            INSERT INTO funnel_steps (funnel_id, step_order, step_name, event_name)
            VALUES ($1, $2, $3, $4)
            RETURNING funnel_id, step_order, step_name, event_name
          `,
          [funnelId, index + 1, step.step_name, step.event_name]
        );
        steps.push(requireRow(result.rows[0], "funnel step"));
      }

      await client.query("COMMIT");
      return toFunnel(requireRow(funnel.rows[0], "funnel"), steps);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

function toFunnel(funnel: FunnelRow, steps: FunnelStepRow[]): DashboardFunnel {
  return {
    funnel_id: funnel.funnel_id,
    funnel_name: funnel.funnel_name,
    domain_type: funnel.domain_type,
    status: funnel.status,
    steps: steps
      .filter((step) => step.funnel_id === funnel.funnel_id)
      .map((step) => ({
        step_order: Number(step.step_order),
        step_name: step.step_name,
        event_name: step.event_name
      })),
    created_at: formatDateTime(funnel.created_at),
    updated_at: formatDateTime(funnel.updated_at)
  };
}

function formatDateTime(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function countValue(value: number | string): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : 0;
}

function eventDisplayName(eventName: string): string {
  return EVENT_DISPLAY_NAMES[eventName] ?? eventName;
}

function requireRow<T>(row: T | undefined, label: string): T {
  if (!row) {
    throw new Error(`Failed to create ${label}.`);
  }
  return row;
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
