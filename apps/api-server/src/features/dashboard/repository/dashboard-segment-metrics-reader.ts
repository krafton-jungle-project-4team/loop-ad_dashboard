import { InjectTransaction, type Transaction } from "@nestjs-cls/transactional";
import { Injectable } from "@nestjs/common";
import { PgTypedTransactionalAdapter } from "../../../infra/database/index.js";
import {
  listSegmentDailyMetricRows,
  type IListSegmentDailyMetricRowsResult
} from "../database/__generated__/dashboard.queries.js";
import type { DashboardSegmentMetricView } from "./read-models.js";

type SegmentMetricRow = IListSegmentDailyMetricRowsResult;
type JsonObject = Record<string, unknown>;
type NumberLike = number | string | null;

@Injectable()
export class DashboardSegmentMetricsReader {
  constructor(
    @InjectTransaction()
    private readonly db: Transaction<PgTypedTransactionalAdapter>
  ) {}

  async readSegmentMetrics(
    projectId: string,
    analysisDate: string | undefined
  ): Promise<DashboardSegmentMetricView[]> {
    const rows = await this.db
      .query(listSegmentDailyMetricRows, {
        analysisDate: normalizeAnalysisDate(analysisDate),
        projectId
      })
      .multiple();

    return rows.map(toSegmentMetricView);
  }
}

function toSegmentMetricView(row: SegmentMetricRow): DashboardSegmentMetricView {
  const ruleJson = jsonObject(row.rule_json);
  const metricJson = jsonObject(row.metric_json);
  const dimensions = jsonObject(metricJson.dimensions);
  const channel = dimensionValue(ruleJson, dimensions, "acquisition_channel", "channel");
  const ageGroup = dimensionValue(ruleJson, dimensions, "age_group");
  const gender = dimensionValue(ruleJson, dimensions, "gender");
  const category = dimensionValue(ruleJson, dimensions, "primary_category", "category");
  const device = dimensionValue(ruleJson, dimensions, "device_type", "device");
  const region = dimensionValue(ruleJson, dimensions, "region");

  return {
    segment_id: row.segment_id,
    analysis_date: formatDate(row.analysis_date),
    customer_group_id: row.segment_key,
    customer_group_name:
      nonEmptyString(row.segment_name) ??
      [channel, ageGroup, gender, region, device, category].filter(Boolean).join(" · "),
    channel,
    age_group: ageGroup,
    gender,
    category,
    region,
    device,
    user_count: countValue(row.user_count),
    session_start_count: countValue(row.session_count),
    page_view_count: countValue(row.page_view_count),
    product_view_count: countValue(row.product_view_count),
    add_to_cart_count: countValue(row.add_to_cart_count),
    checkout_start_count: countValue(row.checkout_start_count),
    purchase_count: countValue(row.purchase_count),
    ad_impression_count: countValue(row.ad_impression_count),
    ad_click_count: countValue(row.ad_click_count),
    revenue: numberValue(row.revenue),
    view_to_cart_rate: optionalRate(row.view_to_cart_rate),
    cart_to_checkout_rate: optionalRate(row.cart_to_checkout_rate),
    checkout_to_purchase_rate: optionalRate(row.checkout_to_purchase_rate),
    view_to_purchase_rate: optionalRate(row.view_to_purchase_rate)
  };
}

function normalizeAnalysisDate(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function dimensionValue(
  ruleJson: JsonObject,
  dimensions: JsonObject,
  key: string,
  fallbackKey = key
) {
  return (
    nonEmptyString(ruleJson[key]) ??
    nonEmptyString(ruleJson[fallbackKey]) ??
    nonEmptyString(dimensions[key]) ??
    nonEmptyString(dimensions[fallbackKey]) ??
    "미상"
  );
}

function jsonObject(value: unknown): JsonObject {
  return isJsonObject(value) ? value : {};
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function countValue(value: NumberLike): number {
  return Math.max(0, Math.trunc(numberValue(value)));
}

function numberValue(value: NumberLike): number {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function optionalRate(value: NumberLike): number | undefined {
  if (value === null) {
    return undefined;
  }

  return clampRate(numberValue(value));
}

function clampRate(value: number) {
  return Math.min(Math.max(value, 0), 1);
}

function formatDate(value: Date | string): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}
