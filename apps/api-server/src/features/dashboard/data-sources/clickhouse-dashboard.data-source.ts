import { Injectable } from "@nestjs/common";
import { EventNameSchema } from "@loopad/shared";
import { clickhouse } from "../../../infra/database/clickhouse.js";
import type { EventRecord } from "../model/events.js";

type RawEventRow = {
  event_id: string;
  user_id: string;
  campaign_id: string;
  creative_id: string;
  event_type: string;
  occurred_at: string;
  request_id: string;
  payload: string;
};

@Injectable()
export class ClickHouseDashboardDataSource {
  async readEvents(_project: string): Promise<EventRecord[]> {
    void _project;

    const result = await clickhouse.query({
      query: `
        SELECT event_id, user_id, campaign_id, creative_id, event_type, occurred_at, request_id, payload
        FROM loopad.raw_events
        ORDER BY occurred_at ASC
      `,
      format: "JSONEachRow"
    });
    const rows = await result.json<RawEventRow>();
    return rows.map(toEventRecord);
  }
}

function toEventRecord(row: RawEventRow): EventRecord {
  const properties = parseProperties(row.payload);
  return {
    project_id: "loopad",
    user_id: row.user_id,
    session_id: row.request_id,
    event_name: EventNameSchema.parse(row.event_type),
    timestamp: row.occurred_at,
    channel: String(properties.slot ?? "unknown"),
    campaign_id: row.campaign_id,
    product_id: row.creative_id,
    category: row.campaign_id,
    age_group: "unknown",
    gender: "unknown",
    device: "unknown",
    price: 0,
    inventory_status: "unknown",
    properties
  };
}

function parseProperties(value: string): EventRecord["properties"] {
  try {
    return JSON.parse(value) as EventRecord["properties"];
  } catch {
    return {};
  }
}
