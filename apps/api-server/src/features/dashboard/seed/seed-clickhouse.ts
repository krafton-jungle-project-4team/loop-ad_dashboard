import { clickhouse } from "../../../infra/database/clickhouse.js";
import { env } from "../../../infra/env/env.js";
import { toClickHouseDateTime } from "../../../shared/time.js";
import { demoEvents } from "./demo-events.js";

export async function seedClickHouse() {
  if (!env.seedDemoData) {
    return;
  }
  const result = await clickhouse.query({
    query: "SELECT count() AS count FROM events WHERE project_id = {projectId:String}",
    query_params: { projectId: env.projectId },
    format: "JSONEachRow"
  });
  const existing = await result.json<{ count: string }>();
  if (Number(existing[0]?.count ?? 0) > 0) {
    return;
  }
  const now = Date.now();
  const rows = demoEvents.flatMap((scenario, scenarioIndex) => {
    const [
      userId,
      sessionId,
      channel,
      campaignId,
      productId,
      category,
      ageGroup,
      gender,
      device,
      price,
      inventoryStatus,
      region,
      signal,
      reached
    ] = scenario;
    return reached.map((eventName, eventIndex) => ({
      project_id: env.projectId,
      user_id: userId,
      session_id: sessionId,
      event_name: eventName,
      timestamp: toClickHouseDateTime(
        new Date(now - (demoEvents.length - scenarioIndex) * 60_000 + eventIndex * 10_000)
      ),
      channel,
      campaign_id: campaignId,
      product_id: productId,
      category,
      age_group: ageGroup,
      gender,
      device,
      price,
      inventory_status: inventoryStatus,
      properties: JSON.stringify({
        page_url: `/products/${productId}`,
        referrer: channel,
        region,
        signal
      })
    }));
  });
  await clickhouse.insert({ table: "events", values: rows, format: "JSONEachRow" });
}
