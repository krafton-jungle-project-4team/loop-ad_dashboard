import { randomUUID } from "node:crypto";
import { type ClickHouseClient } from "@clickhouse/client";
import { InjectTransaction, type Transaction } from "@nestjs-cls/transactional";
import { Inject, Injectable } from "@nestjs/common";
import type {
  DashboardDeleteSavedSegmentResult,
  DashboardSavedSegment,
  DashboardSavedSegmentList,
  DashboardSegmentQueryPreview,
  DashboardSegmentQueryPreviewRequest,
  DashboardSaveSegmentRequest,
  DashboardSegmentSampleSizeStatus,
  DashboardUpdateSavedSegmentRequest
} from "@loopad/shared";
import { CLICKHOUSE_CLIENT } from "../../../infra/database/index.js";
import { PgTypedTransactionalAdapter } from "../../../infra/database/pgtyped-transactional.adapter.js";
import { dashboardErrors } from "../dashboard-errors.js";
import {
  archiveDashboardSavedSegment,
  getDashboardSegmentQueryPreviewForSave,
  insertDashboardCustomSegmentDefinition,
  insertDashboardSegmentQueryPreview,
  listDashboardSavedSegments,
  markDashboardSegmentQueryPreviewSaved,
  updateDashboardSavedSegment,
  type IArchiveDashboardSavedSegmentResult,
  type IInsertDashboardCustomSegmentDefinitionResult,
  type IInsertDashboardSegmentQueryPreviewResult,
  type IListDashboardSavedSegmentsResult,
  type IUpdateDashboardSavedSegmentResult,
  type Json
} from "../database/__generated__/dashboard.queries.js";

const PREVIEW_ROW_LIMIT = 500;
const PREVIEW_TIMEOUT_SECONDS = 10;
const MIN_SEGMENT_USER_COUNT = 100;
const MIN_SEGMENT_RATIO = 0.005;

type PreviewRow = Record<string, unknown>;

type ClickHouseJsonResponse = {
  meta?: Array<{ name: string; type: string }>;
  data?: PreviewRow[];
};

type CountRow = {
  sample_size: number | string;
};

@Injectable()
export class DashboardSegmentQueryRepository {
  constructor(
    @InjectTransaction()
    private readonly db: Transaction<PgTypedTransactionalAdapter>,
    @Inject(CLICKHOUSE_CLIENT)
    private readonly clickhouse: ClickHouseClient
  ) {}

  async createQueryPreview(
    projectId: string,
    request: DashboardSegmentQueryPreviewRequest
  ): Promise<DashboardSegmentQueryPreview> {
    const timeRange = normalizeTimeRange(request.base_time_range);
    const query = planSegmentQuery(projectId, request.natural_language_query, timeRange);
    const [preview, sampleSize, totalEligibleUserCount] = await Promise.all([
      this.executePreviewQuery(query.previewSql),
      this.executeCountQuery(query.countSql),
      this.countEligibleUsers(projectId, timeRange)
    ]);
    const sampleRatio =
      totalEligibleUserCount > 0 ? roundRatio(sampleSize / totalEligibleUserCount) : 0;
    const sampleSizeStatus = getSampleSizeStatus(sampleSize, sampleRatio);
    const row = await this.db
      .query(insertDashboardSegmentQueryPreview, {
        baseTimeFrom: timeRange.from,
        baseTimeTo: timeRange.to,
        generatedSql: query.generatedSql,
        naturalLanguageQuery: request.natural_language_query,
        projectId,
        queryParamsJson: {},
        queryPreviewId: `seg_query_preview_${randomUUID()}`,
        resultColumnsJson: preview.columns,
        resultPreviewJson: toJson(preview.rows),
        sampleRatio,
        sampleSize,
        sampleSizeStatus,
        totalEligibleUserCount
      })
      .single();

    return toSegmentQueryPreview(row);
  }

  async listSavedSegments(projectId: string): Promise<DashboardSavedSegmentList> {
    const rows = await this.db.query(listDashboardSavedSegments, { projectId }).multiple();

    return {
      segments: rows.map(toSavedSegment)
    };
  }

  async saveSegment(
    projectId: string,
    request: DashboardSaveSegmentRequest
  ): Promise<DashboardSavedSegment> {
    const preview = await this.db
      .query(getDashboardSegmentQueryPreviewForSave, {
        projectId,
        queryPreviewId: request.query_preview_id
      })
      .single();

    if (preview.sampleSizeStatus !== "valid" || preview.status !== "previewed") {
      throw dashboardErrors.segmentPreviewNotSaveable();
    }

    const segment = await this.db
      .query(insertDashboardCustomSegmentDefinition, {
        generatedSql: preview.generatedSql,
        naturalLanguageQuery: preview.naturalLanguageQuery,
        projectId,
        queryPreviewId: preview.queryPreviewId,
        sampleRatio: numberValue(preview.sampleRatio),
        sampleSize: countValue(preview.sampleSize),
        segmentId: `seg_custom_${randomUUID()}`,
        segmentName: request.segment_name,
        totalEligibleUserCount: countValue(preview.totalEligibleUserCount)
      })
      .single();
    await this.db
      .query(markDashboardSegmentQueryPreviewSaved, {
        projectId,
        queryPreviewId: request.query_preview_id
      })
      .single();

    return toSavedSegment(segment);
  }

  async updateSavedSegment(
    projectId: string,
    segmentId: string,
    request: DashboardUpdateSavedSegmentRequest
  ): Promise<DashboardSavedSegment> {
    const segment = await this.db
      .query(updateDashboardSavedSegment, {
        projectId,
        segmentId,
        segmentName: request.segment_name,
        status: request.status
      })
      .single();

    return toSavedSegment(segment);
  }

  async archiveSavedSegment(
    projectId: string,
    segmentId: string
  ): Promise<DashboardDeleteSavedSegmentResult> {
    const row = await this.db
      .query(archiveDashboardSavedSegment, { projectId, segmentId })
      .single();

    return toDeleteSavedSegmentResult(row);
  }

  private async executePreviewQuery(sql: string): Promise<{ columns: string[]; rows: PreviewRow[] }> {
    const result = await this.clickhouse.query({
      query: sql,
      format: "JSON",
      clickhouse_settings: {
        max_execution_time: PREVIEW_TIMEOUT_SECONDS,
        max_result_rows: String(PREVIEW_ROW_LIMIT),
        readonly: "1",
        result_overflow_mode: "break"
      }
    });
    const body = await result.json<ClickHouseJsonResponse>();

    return {
      columns: (body.meta ?? []).map((column) => column.name),
      rows: (body.data ?? []).slice(0, PREVIEW_ROW_LIMIT)
    };
  }

  private async executeCountQuery(sql: string): Promise<number> {
    const result = await this.clickhouse.query({
      query: sql,
      format: "JSONEachRow",
      clickhouse_settings: {
        max_execution_time: PREVIEW_TIMEOUT_SECONDS,
        readonly: "1"
      }
    });
    const rows = await result.json<CountRow>();

    return countValue(rows[0]?.sample_size ?? 0);
  }

  private async countEligibleUsers(projectId: string, timeRange: SegmentPreviewTimeRange) {
    const result = await this.clickhouse.query({
      query: `
        SELECT countDistinct(user_id) AS sample_size
        FROM funnel_step_events
        WHERE project_id = ${sqlString(projectId)}
          AND event_time >= parseDateTimeBestEffort(${sqlString(timeRange.from)})
          AND event_time < parseDateTimeBestEffort(${sqlString(timeRange.to)})
      `,
      format: "JSONEachRow",
      clickhouse_settings: {
        max_execution_time: PREVIEW_TIMEOUT_SECONDS,
        readonly: "1"
      }
    });
    const rows = await result.json<CountRow>();

    return countValue(rows[0]?.sample_size ?? 0);
  }
}

type SegmentPreviewTimeRange = {
  from: string;
  to: string;
};

type PlannedSegmentQuery = {
  generatedSql: string;
  previewSql: string;
  countSql: string;
};

function planSegmentQuery(
  projectId: string,
  naturalLanguageQuery: string,
  timeRange: SegmentPreviewTimeRange
): PlannedSegmentQuery {
  const condition = inferSegmentCondition(naturalLanguageQuery);
  const baseWhere = [
    `project_id = ${sqlString(projectId)}`,
    `event_time >= parseDateTimeBestEffort(${sqlString(timeRange.from)})`,
    `event_time < parseDateTimeBestEffort(${sqlString(timeRange.to)})`
  ].join("\n    AND ");
  const having = condition.having.join("\n    AND ");
  const selectCounters = condition.eventNames
    .map((eventName) => `countIf(event_name = ${sqlString(eventName)}) AS ${eventName}_count`)
    .join(",\n    ");
  const generatedSql = `
SELECT
  user_id,
  ${selectCounters},
  max(event_time) AS last_event_at
FROM funnel_step_events
WHERE ${baseWhere}
GROUP BY user_id
HAVING ${having}
ORDER BY last_event_at DESC
LIMIT ${PREVIEW_ROW_LIMIT}
`.trim();
  const countSql = `
SELECT count() AS sample_size
FROM (
  SELECT user_id
  FROM funnel_step_events
  WHERE ${baseWhere}
  GROUP BY user_id
  HAVING ${having}
)
`.trim();

  return {
    countSql,
    generatedSql,
    previewSql: generatedSql
  };
}

function inferSegmentCondition(naturalLanguageQuery: string) {
  const text = naturalLanguageQuery.toLowerCase();
  const eventNames = [
    matchEvent(text, ["상세", "detail"], "hotel_detail_view"),
    matchEvent(text, ["숙소 클릭", "hotel_click"], "hotel_click"),
    matchEvent(text, ["검색", "search"], "hotel_search"),
    matchEvent(text, ["프로모션 클릭", "promotion_click"], "promotion_click"),
    matchEvent(text, ["노출", "impression"], "promotion_impression"),
    matchEvent(text, ["예약 시작", "booking_start"], "booking_start"),
    matchEvent(text, ["예약 완료", "booking_complete"], "booking_complete")
  ].filter((eventName): eventName is string => Boolean(eventName));
  const selectedEventNames = [...new Set(eventNames.length > 0 ? eventNames : ["hotel_detail_view"])];
  const positiveEventName = selectedEventNames.find((eventName) => eventName !== "booking_complete")
    ?? selectedEventNames[0];
  const minimumCount = inferMinimumCount(text);
  const having = [`${positiveEventName}_count >= ${minimumCount}`];

  if (text.includes("미예약") || text.includes("예약하지") || text.includes("booking_complete가 없는")) {
    if (!selectedEventNames.includes("booking_complete")) {
      selectedEventNames.push("booking_complete");
    }
    having.push("booking_complete_count = 0");
  }

  return {
    eventNames: selectedEventNames,
    having
  };
}

function matchEvent(text: string, keywords: string[], eventName: string) {
  return keywords.some((keyword) => text.includes(keyword)) ? eventName : null;
}

function inferMinimumCount(text: string) {
  const digitMatch = text.match(/(\d+)\s*(회|번|times?)/);
  if (digitMatch?.[1]) {
    return Math.max(1, Number.parseInt(digitMatch[1], 10));
  }
  if (text.includes("2회") || text.includes("두 번")) {
    return 2;
  }
  if (text.includes("3회") || text.includes("세 번")) {
    return 3;
  }
  return 1;
}

function normalizeTimeRange(
  timeRange: DashboardSegmentQueryPreviewRequest["base_time_range"]
): SegmentPreviewTimeRange {
  if (timeRange) {
    return timeRange;
  }
  const to = new Date();
  const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);

  return {
    from: from.toISOString(),
    to: to.toISOString()
  };
}

function getSampleSizeStatus(
  sampleSize: number,
  sampleRatio: number
): DashboardSegmentSampleSizeStatus {
  return sampleSize >= MIN_SEGMENT_USER_COUNT && sampleRatio >= MIN_SEGMENT_RATIO
    ? "valid"
    : "too_small";
}

function toSegmentQueryPreview(
  row: IInsertDashboardSegmentQueryPreviewResult
): DashboardSegmentQueryPreview {
  return {
    query_preview_id: row.queryPreviewId,
    generated_sql: row.generatedSql,
    sample_size: countValue(row.sampleSize),
    total_eligible_user_count: countValue(row.totalEligibleUserCount),
    sample_ratio: numberValue(row.sampleRatio),
    sample_size_status: row.sampleSizeStatus as DashboardSegmentSampleSizeStatus,
    columns: stringArray(row.resultColumnsJson),
    rows: previewRows(row.resultPreviewJson)
  };
}

function toSavedSegment(
  row:
    | IInsertDashboardCustomSegmentDefinitionResult
    | IListDashboardSavedSegmentsResult
    | IUpdateDashboardSavedSegmentResult
): DashboardSavedSegment {
  return {
    segment_id: row.segmentId,
    project_id: row.projectId,
    segment_name: row.segmentName,
    source: "custom_chatkit",
    query_preview_id: row.queryPreviewId ?? "",
    natural_language_query: row.naturalLanguageQuery,
    generated_sql: row.generatedSql,
    sample_size: countValue(row.sampleSize),
    total_eligible_user_count: countValue(row.totalEligibleUserCount),
    sample_ratio: numberValue(row.sampleRatio),
    status: savedSegmentStatus(row.status)
  };
}

function toDeleteSavedSegmentResult(
  row: IArchiveDashboardSavedSegmentResult
): DashboardDeleteSavedSegmentResult {
  return {
    segment_id: row.segmentId,
    status: "archived"
  };
}

function previewRows(value: unknown): PreviewRow[] {
  return Array.isArray(value)
    ? value.filter((row): row is PreviewRow => row !== null && typeof row === "object" && !Array.isArray(row))
    : [];
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function roundRatio(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function countValue(value: number | string | null): number {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : 0;
}

function savedSegmentStatus(value: string): DashboardSavedSegment["status"] {
  return value === "archived" ? "archived" : "active";
}

function numberValue(value: number | string | null): number {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}
