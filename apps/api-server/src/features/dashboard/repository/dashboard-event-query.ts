import { type ClickHouseClient } from "@clickhouse/client";
import { Inject, Injectable } from "@nestjs/common";
import { CLICKHOUSE_CLIENT } from "../../../infra/database/index.js";
import type {
  ChartPointRow,
  CustomerGroupEventRow,
  DeviceFunnelCounts,
  FunnelCounts,
  MainMetricCounts,
  SegmentStatusRow
} from "./read-models.js";

type SegmentDimension = "channel" | "region" | "age_gender" | "device";

@Injectable()
export class DashboardEventQuery {
  constructor(
    @Inject(CLICKHOUSE_CLIENT)
    private readonly clickhouse: ClickHouseClient
  ) {}

  async readMainMetricCounts(projectId: string): Promise<MainMetricCounts> {
    const result = await this.clickhouse.query({
      query: `
        SELECT
          countIf(event_name IN ('session_start', 'page_view')) AS session_start_count,
          countIf(event_name = 'product_view') AS product_view_count,
          countIf(event_name = 'add_to_cart') AS add_to_cart_count,
          countIf(event_name = 'checkout_start') AS checkout_start_count,
          countIf(event_name = 'purchase') AS purchase_count,
          countIf(event_name = 'purchase' AND event_time >= now64(3, 'UTC') - INTERVAL 15 MINUTE) AS recent_purchase_count,
          sumIf(toFloat64(revenue), event_name = 'purchase') AS revenue
        FROM events
        WHERE project_id = {projectId:String}
      `,
      format: "JSONEachRow",
      query_params: { projectId }
    });
    const rows = await result.json<MainMetricCounts>();
    return numericMainMetricCounts(rows[0]);
  }

  async readBehaviorEventSeries(projectId: string): Promise<ChartPointRow[]> {
    const result = await this.clickhouse.query({
      query: `
        SELECT
          formatDateTime(toStartOfMinute(event_time), '%H:%M') AS label,
          countIf(event_name IN (
            'page_view',
            'product_view',
            'add_to_cart',
            'checkout_start',
            'ad_impression',
            'ad_click'
          )) AS value
        FROM events
        WHERE project_id = {projectId:String}
          AND event_time >= now64(3, 'UTC') - INTERVAL 15 MINUTE
        GROUP BY label
        ORDER BY label ASC
      `,
      format: "JSONEachRow",
      query_params: { projectId }
    });
    return numericChartRows(await result.json<ChartPointRow>());
  }

  async readPurchaseSeries(projectId: string): Promise<ChartPointRow[]> {
    const result = await this.clickhouse.query({
      query: `
        SELECT
          formatDateTime(toStartOfMinute(event_time), '%H:%M') AS label,
          countIf(event_name = 'purchase') AS value
        FROM events
        WHERE project_id = {projectId:String}
          AND event_time >= now64(3, 'UTC') - INTERVAL 15 MINUTE
        GROUP BY label
        ORDER BY label ASC
      `,
      format: "JSONEachRow",
      query_params: { projectId }
    });
    return numericChartRows(await result.json<ChartPointRow>());
  }

  async readSegmentStatus(
    projectId: string,
    dimension: SegmentDimension
  ): Promise<SegmentStatusRow[]> {
    const labelExpression = segmentLabelExpression(dimension);
    const valueExpression = dimension === "device" ? "countIf(event_name = 'purchase')" : "count()";

    const result = await this.clickhouse.query({
      query: `
        WITH rows AS (
          SELECT
            ${labelExpression} AS label,
            ${valueExpression} AS value
          FROM events
          WHERE project_id = {projectId:String}
          GROUP BY label
        )
        SELECT
          label,
          value,
          if(sum(value) OVER () > 0, value / sum(value) OVER (), 0) AS share
        FROM rows
        WHERE label != ''
        ORDER BY value DESC, label ASC
        LIMIT 4
      `,
      format: "JSONEachRow",
      query_params: { projectId }
    });
    return (await result.json<SegmentStatusRow>()).map((row) => ({
      label: row.label || "미상",
      value: Number(row.value),
      share: Number(row.share)
    }));
  }

  async readFunnel(projectId: string): Promise<FunnelCounts> {
    const result = await this.clickhouse.query({
      query: funnelSelectSql("events", "WHERE project_id = {projectId:String}"),
      format: "JSONEachRow",
      query_params: { projectId }
    });
    const rows = await result.json<FunnelCounts>();
    return numericFunnelCounts(rows[0]);
  }

  async readDeviceFunnels(projectId: string): Promise<DeviceFunnelCounts[]> {
    const result = await this.clickhouse.query({
      query: `
        SELECT
          if(device = '', '미상', device) AS device,
          countIf(event_name IN ('session_start', 'page_view')) AS session_start_count,
          countIf(event_name = 'product_view') AS product_view_count,
          countIf(event_name = 'add_to_cart') AS add_to_cart_count,
          countIf(event_name = 'checkout_start') AS checkout_start_count,
          countIf(event_name = 'purchase') AS purchase_count
        FROM events
        WHERE project_id = {projectId:String}
        GROUP BY device
        ORDER BY purchase_count DESC, session_start_count DESC, device ASC
      `,
      format: "JSONEachRow",
      query_params: { projectId }
    });
    const rows = await result.json<DeviceFunnelCounts>();
    return rows.map((row) => ({
      device: row.device,
      ...numericFunnelCounts(row)
    }));
  }

  async readCustomerGroups(
    projectId: string,
    sort: "high" | "low"
  ): Promise<CustomerGroupEventRow[]> {
    const orderDirection = sort === "high" ? "DESC" : "ASC";
    const result = await this.clickhouse.query({
      query: `
        WITH grouped AS (
          SELECT
            if(
              JSONExtractString(properties_json, 'segment_hash') != '',
              JSONExtractString(properties_json, 'segment_hash'),
              lower(hex(MD5(concat(channel, '|', age_group, '|', gender, '|', category, '|', device, '|', JSONExtractString(properties_json, 'region')))))
            ) AS customer_group_id,
            if(channel = '', '미상', channel) AS channel,
            if(age_group = '', '미상', age_group) AS age_group,
            if(gender = '', '미상', gender) AS gender,
            if(category = '', '미상', category) AS category,
            if(JSONExtractString(properties_json, 'region') = '', '미상', JSONExtractString(properties_json, 'region')) AS region,
            if(device = '', '미상', device) AS device,
            countIf(event_name IN ('session_start', 'page_view')) AS session_start_count,
            countIf(event_name = 'product_view') AS product_view_count,
            countIf(event_name = 'add_to_cart') AS add_to_cart_count,
            countIf(event_name = 'checkout_start') AS checkout_start_count,
            countIf(event_name = 'purchase') AS purchase_count,
            sumIf(toFloat64(revenue), event_name = 'purchase') AS revenue
          FROM events
          WHERE project_id = {projectId:String}
          GROUP BY customer_group_id, channel, age_group, gender, category, region, device
        )
        SELECT
          customer_group_id,
          concat(channel, ' · ', age_group, ' · ', gender, ' · ', device, ' · ', category) AS customer_group_name,
          channel,
          age_group,
          gender,
          category,
          region,
          device,
          session_start_count,
          product_view_count,
          add_to_cart_count,
          checkout_start_count,
          purchase_count,
          revenue
        FROM grouped
        WHERE product_view_count > 0
        ORDER BY if(product_view_count > 0, purchase_count / product_view_count, 0) ${orderDirection}, product_view_count DESC
        LIMIT 20
      `,
      format: "JSONEachRow",
      query_params: { projectId }
    });
    const rows = await result.json<CustomerGroupEventRow>();
    return rows.map(numericCustomerGroupRow);
  }
}

function segmentLabelExpression(dimension: SegmentDimension): string {
  switch (dimension) {
    case "channel":
      return "if(channel = '', '미상', channel)";
    case "region":
      return "if(JSONExtractString(properties_json, 'region') = '', '미상', JSONExtractString(properties_json, 'region'))";
    case "age_gender":
      return "concat(if(age_group = '', '미상', age_group), ' ', if(gender = '', '미상', gender))";
    case "device":
      return "if(device = '', '미상', device)";
  }
}

function funnelSelectSql(table: string, whereClause: string): string {
  return `
    SELECT
      countIf(event_name IN ('session_start', 'page_view')) AS session_start_count,
      countIf(event_name = 'product_view') AS product_view_count,
      countIf(event_name = 'add_to_cart') AS add_to_cart_count,
      countIf(event_name = 'checkout_start') AS checkout_start_count,
      countIf(event_name = 'purchase') AS purchase_count
    FROM ${table}
    ${whereClause}
  `;
}

function numericMainMetricCounts(row: MainMetricCounts | undefined): MainMetricCounts {
  const counts = numericFunnelCounts(row);
  return {
    ...counts,
    recent_purchase_count: Number(row?.recent_purchase_count ?? 0),
    revenue: Number(row?.revenue ?? 0)
  };
}

function numericFunnelCounts(row: Partial<FunnelCounts> | undefined): FunnelCounts {
  return {
    session_start_count: Number(row?.session_start_count ?? 0),
    product_view_count: Number(row?.product_view_count ?? 0),
    add_to_cart_count: Number(row?.add_to_cart_count ?? 0),
    checkout_start_count: Number(row?.checkout_start_count ?? 0),
    purchase_count: Number(row?.purchase_count ?? 0)
  };
}

function numericChartRows(rows: ChartPointRow[]): ChartPointRow[] {
  return rows.map((row) => ({
    label: row.label,
    value: Number(row.value)
  }));
}

function numericCustomerGroupRow(row: CustomerGroupEventRow): CustomerGroupEventRow {
  return {
    ...row,
    ...numericFunnelCounts(row),
    revenue: Number(row.revenue)
  };
}
