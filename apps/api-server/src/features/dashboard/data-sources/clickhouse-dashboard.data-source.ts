import { Injectable } from "@nestjs/common";
import { EventNameSchema } from "@loopad/shared";
import { clickhouse } from "../../../infra/database/clickhouse.js";
import type {
  DashboardEventRow,
  ExperimentActionCounts,
  FunnelCounts,
  SegmentFunnelCounts
} from "../model/events.js";

type RawEventCountRow = {
  event_name: string;
  count: number | string;
};

@Injectable()
export class ClickHouseDashboardDataSource {
  async readEventCounts(projectId: string): Promise<RawEventCountRow[]> {
    const result = await clickhouse.query({
      query: `
        SELECT event_name, count() AS count
        FROM events
        WHERE project_id = {projectId:String}
          AND event_name IN (
            'page_view',
            'product_view',
            'add_to_cart',
            'purchase',
            'ad_impression',
            'ad_click'
          )
        GROUP BY event_name
        ORDER BY event_name ASC
      `,
      format: "JSONEachRow",
      query_params: { projectId }
    });
    return result.json<RawEventCountRow>();
  }

  async readRecentEvents(projectId: string): Promise<DashboardEventRow[]> {
    const result = await clickhouse.query({
      query: `
        SELECT
          event_time,
          project_id,
          user_id,
          session_id,
          event_name,
          nullIf(segment_id, '') AS segment_id,
          nullIf(experiment_id, '') AS experiment_id,
          nullIf(recommendation_id, '') AS recommendation_id,
          nullIf(action_id, '') AS action_id,
          nullIf(content_id, '') AS content_id,
          nullIf(decision_id, '') AS decision_id,
          nullIf(page_url, '') AS page_url,
          nullIf(product_id, '') AS product_id,
          nullIf(category, '') AS category,
          nullIf(device, '') AS device
        FROM events
        WHERE project_id = {projectId:String}
          AND event_name IN (
            'page_view',
            'product_view',
            'add_to_cart',
            'purchase',
            'ad_impression',
            'ad_click'
          )
        ORDER BY event_time DESC
        LIMIT 30
      `,
      format: "JSONEachRow",
      query_params: { projectId }
    });
    const rows = await result.json<DashboardEventRow>();
    return rows.map((row) => ({ ...row, event_name: EventNameSchema.parse(row.event_name) }));
  }

  async readFunnel(projectId: string): Promise<FunnelCounts> {
    const result = await clickhouse.query({
      query: `
        SELECT
          countIf(event_name = 'product_view') AS product_view_count,
          countIf(event_name = 'add_to_cart') AS add_to_cart_count,
          countIf(event_name = 'purchase') AS purchase_count
        FROM events
        WHERE project_id = {projectId:String}
      `,
      format: "JSONEachRow",
      query_params: { projectId }
    });
    const rows = await result.json<FunnelCounts>();
    return numericFunnelCounts(rows[0]);
  }

  async readSegmentFunnels(projectId: string): Promise<SegmentFunnelCounts[]> {
    const result = await clickhouse.query({
      query: `
        SELECT
          segment_id,
          countIf(event_name = 'product_view') AS product_view_count,
          countIf(event_name = 'add_to_cart') AS add_to_cart_count,
          countIf(event_name = 'purchase') AS purchase_count
        FROM events
        WHERE project_id = {projectId:String}
          AND segment_id != ''
        GROUP BY segment_id
        ORDER BY purchase_count DESC, segment_id ASC
      `,
      format: "JSONEachRow",
      query_params: { projectId }
    });
    const rows = await result.json<SegmentFunnelCounts>();
    return rows.map((row) => ({
      segment_id: row.segment_id,
      ...numericFunnelCounts(row)
    }));
  }

  async readExperimentActionCounts(
    projectId: string,
    experimentId: string
  ): Promise<ExperimentActionCounts[]> {
    const result = await clickhouse.query({
      query: `
        SELECT
          action_id,
          countIf(event_name = 'ad_impression') AS impressions,
          countIf(event_name = 'ad_click') AS clicks,
          countIf(event_name = 'purchase') AS purchases
        FROM events
        WHERE project_id = {projectId:String}
          AND experiment_id = {experimentId:String}
          AND action_id != ''
        GROUP BY action_id
        ORDER BY action_id ASC
      `,
      format: "JSONEachRow",
      query_params: { projectId, experimentId }
    });
    const rows = await result.json<ExperimentActionCounts>();
    return rows.map((row) => ({
      action_id: row.action_id,
      impressions: Number(row.impressions),
      clicks: Number(row.clicks),
      purchases: Number(row.purchases)
    }));
  }
}

function numericFunnelCounts(row: FunnelCounts | undefined): FunnelCounts {
  return {
    product_view_count: Number(row?.product_view_count ?? 0),
    add_to_cart_count: Number(row?.add_to_cart_count ?? 0),
    purchase_count: Number(row?.purchase_count ?? 0)
  };
}
