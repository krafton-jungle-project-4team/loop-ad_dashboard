import { EventNameSchema } from "@loopad/shared";
import { clickhouse } from "../db/clickhouse.js";
import type { EventRecord, EventRow } from "../models/events.js";

export async function readEvents(project: string): Promise<EventRecord[]> {
  const result = await clickhouse.query({
    query: `
      SELECT *
      FROM events
      WHERE project_id = {projectId:String}
      ORDER BY timestamp ASC
    `,
    query_params: { projectId: project },
    format: "JSONEachRow"
  });
  const rows = await result.json<EventRow>();
  return rows.map((row) => ({
    ...row,
    event_name: EventNameSchema.parse(row.event_name),
    price: Number(row.price),
    properties: parseProperties(row.properties)
  }));
}

function parseProperties(value: string) {
  try {
    return JSON.parse(value) as EventRecord["properties"];
  } catch {
    return {};
  }
}
