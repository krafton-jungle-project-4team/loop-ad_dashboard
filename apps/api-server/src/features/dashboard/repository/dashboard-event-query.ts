import { type ClickHouseClient } from "@clickhouse/client";
import { Inject, Injectable } from "@nestjs/common";
import { CLICKHOUSE_CLIENT } from "../../../infra/database/index.js";
import type { DashboardEventView } from "./read-models.js";

const DEFAULT_EVENT_VIEW_LIMIT = 10_000;

@Injectable()
export class DashboardEventQuery {
  constructor(
    @Inject(CLICKHOUSE_CLIENT)
    private readonly clickhouse: ClickHouseClient
  ) {}

  async queryEventViews(
    projectId: string,
    limit: number = DEFAULT_EVENT_VIEW_LIMIT
  ): Promise<DashboardEventView[]> {
    const result = await this.clickhouse.query({
      query: `
        SELECT
          event_name,
          toString(session_id) AS session_id,
          toString(event_time) AS event_time,
          if(channel = '', '미상', channel) AS channel,
          if(age_group = '', '미상', age_group) AS age_group,
          if(gender = '', '미상', gender) AS gender,
          if(category = '', '미상', category) AS category,
          if(device = '', '미상', device) AS device,
          if(JSONExtractString(properties_json, 'region') = '', '미상', JSONExtractString(properties_json, 'region')) AS region,
          JSONExtractString(properties_json, 'segment_key') AS segment_key,
          toFloat64(revenue) AS revenue
        FROM events
        WHERE project_id = {projectId:String}
        ORDER BY event_time DESC
        LIMIT {limit:UInt32}
      `,
      format: "JSONEachRow",
      query_params: { projectId, limit: normalizedLimit(limit) }
    });

    const rows = await result.json<DashboardEventView>();
    return rows.map(normalizeEventView);
  }
}

function normalizedLimit(limit: number) {
  return Math.min(Math.max(Math.trunc(limit), 1), DEFAULT_EVENT_VIEW_LIMIT);
}

function normalizeEventView(row: DashboardEventView): DashboardEventView {
  return {
    event_name: row.event_name,
    session_id: row.session_id || "",
    event_time: row.event_time,
    channel: row.channel || "미상",
    age_group: row.age_group || "미상",
    gender: row.gender || "미상",
    category: row.category || "미상",
    region: row.region || "미상",
    device: row.device || "미상",
    segment_key: row.segment_key || "",
    revenue: Number(row.revenue ?? 0)
  };
}
