import { type ClickHouseClient } from "@clickhouse/client";
import { Inject, Injectable } from "@nestjs/common";
import type {
  DataExplorerColumn,
  DataExplorerObjectDdl,
  DataExplorerObjectDetail,
  DataExplorerObjectRef,
  DataExplorerObjectSummary,
  DataExplorerObjectType,
  DataExplorerResultColumn,
  DataExplorerSemanticType
} from "@loopad/shared";
import { CLICKHOUSE_CLIENT } from "../../../infra/database/index.js";
import { env } from "../../../infra/env/env.js";
import { DataExplorerDomain } from "../domain/index.js";
import { dataExplorerErrors } from "../errors.js";
import { applyQueryLimit } from "../sql/query-limiter.js";
import type {
  AdapterQueryExecutionResult,
  DataSourceAdapter,
  ExecuteReadOnlyQueryInput,
  ListObjectsInput
} from "./data-source-adapter.js";

const SCHEMA_QUERY_TIMEOUT_SECONDS = 5;
const LIST_OBJECTS_LIMIT = 1000;

type ClickHouseObjectRow = {
  database_name: string;
  object_name: string;
  engine: string;
  object_type: string;
  column_count: number;
  row_count_estimate: number | null;
};

type ClickHouseColumnRow = {
  column_name: string;
  data_type: string;
  default_value: string | null;
  ordinal_position: number;
  source_comment: string | null;
};

type ClickHouseTableRow = {
  database_name: string;
  object_name: string;
  engine: string;
  partition_key: string;
  sorting_key: string;
  primary_key: string;
  total_rows: number | null;
};

type ClickHouseJsonResponse = {
  meta?: Array<{ name: string; type: string }>;
  data?: Array<Record<string, unknown>>;
};

@Injectable()
export class ClickHouseEventsAdapter implements DataSourceAdapter {
  readonly sourceId = "clickhouse_events" as const;
  readonly source = DataExplorerDomain.sourceById(this.sourceId)!;

  constructor(
    @Inject(CLICKHOUSE_CLIENT)
    private readonly clickhouse: ClickHouseClient
  ) {}

  async listObjects(input: ListObjectsInput): Promise<DataExplorerObjectSummary[]> {
    const databaseName = input.databaseName ?? env.clickhouse.database;
    const result = await this.clickhouse.query({
      query: `
        SELECT
          t.database AS database_name,
          t.name AS object_name,
          t.engine AS engine,
          multiIf(t.engine = 'View', 'view', t.engine = 'MaterializedView', 'materialized_view', 'table') AS object_type,
          t.total_rows AS row_count_estimate,
          count(c.name) AS column_count
        FROM system.tables t
        LEFT JOIN system.columns c ON c.database = t.database AND c.table = t.name
        WHERE t.database = {databaseName:String}
        GROUP BY t.database, t.name, t.engine, t.total_rows
        ORDER BY t.name
        LIMIT {limit:UInt32}
      `,
      format: "JSONEachRow",
      query_params: {
        databaseName,
        limit: LIST_OBJECTS_LIMIT
      },
      clickhouse_settings: {
        max_execution_time: SCHEMA_QUERY_TIMEOUT_SECONDS,
        readonly: "1"
      }
    });
    const rows = await result.json<ClickHouseObjectRow>();

    return rows
      .map(toObjectSummary)
      .filter((object) => objectMatchesInput(object, input))
      .slice(0, LIST_OBJECTS_LIMIT);
  }

  async searchObjects(input: ListObjectsInput): Promise<DataExplorerObjectSummary[]> {
    return this.listObjects(input);
  }

  async getObjectDetail(ref: DataExplorerObjectRef): Promise<DataExplorerObjectDetail> {
    const databaseName = ref.database_name ?? env.clickhouse.database;
    const [table, columns] = await Promise.all([
      this.readTable(databaseName, ref.object_name),
      this.readColumns(databaseName, ref.object_name)
    ]);
    const object = tableToObjectSummary(table, columns.length);

    return {
      object,
      columns,
      indexes: [],
      constraints: [],
      partition_key: splitExpression(table.partition_key),
      order_by: splitExpression(table.sorting_key),
      primary_key: splitExpression(table.primary_key),
      ...DataExplorerDomain.freshLiveMetadata()
    };
  }

  async getObjectDdl(ref: DataExplorerObjectRef): Promise<DataExplorerObjectDdl> {
    const databaseName = ref.database_name ?? env.clickhouse.database;
    const result = await this.clickhouse.query({
      query: `SHOW CREATE TABLE ${quoteIdentifier(databaseName)}.${quoteIdentifier(ref.object_name)}`,
      format: "JSONEachRow",
      clickhouse_settings: {
        max_execution_time: SCHEMA_QUERY_TIMEOUT_SECONDS,
        readonly: "1"
      }
    });
    const rows = await result.json<Record<string, unknown>>();
    const firstRow = rows[0] ?? {};
    const ddl =
      Object.values(firstRow).find((value) => typeof value === "string" && value.trim()) ??
      "SHOW CREATE TABLE result was empty.";

    return {
      ref: {
        ...ref,
        database_name: databaseName
      },
      ddl: String(ddl),
      ...DataExplorerDomain.freshLiveMetadata()
    };
  }

  async executeReadOnlyQuery(
    input: ExecuteReadOnlyQueryInput
  ): Promise<AdapterQueryExecutionResult> {
    const startedAt = performance.now();
    const limitedSql = applyQueryLimit(input.sqlText, input.rowLimit);
    const result = await this.clickhouse.query({
      query: limitedSql,
      format: "JSON",
      query_params: input.params,
      clickhouse_settings: {
        max_execution_time: Math.ceil(input.timeoutMs / 1000),
        max_result_rows: String(input.rowLimit),
        result_overflow_mode: "break",
        readonly: "1"
      }
    });
    const body = await result.json<ClickHouseJsonResponse>();
    const rows = body.data ?? [];
    const columns = (body.meta ?? []).map(toResultColumn);

    return {
      columns,
      rows,
      durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
      truncated: rows.length >= input.rowLimit
    };
  }

  private async readTable(databaseName: string, objectName: string): Promise<ClickHouseTableRow> {
    const result = await this.clickhouse.query({
      query: `
        SELECT
          database AS database_name,
          name AS object_name,
          engine,
          partition_key,
          sorting_key,
          primary_key,
          total_rows
        FROM system.tables
        WHERE database = {databaseName:String}
          AND name = {objectName:String}
        LIMIT 1
      `,
      format: "JSONEachRow",
      query_params: { databaseName, objectName },
      clickhouse_settings: {
        max_execution_time: SCHEMA_QUERY_TIMEOUT_SECONDS,
        readonly: "1"
      }
    });
    const rows = await result.json<ClickHouseTableRow>();
    const table = rows[0];
    if (!table) {
      throw dataExplorerErrors.schemaInspectionFailed();
    }
    return table;
  }

  private async readColumns(
    databaseName: string,
    objectName: string
  ): Promise<DataExplorerColumn[]> {
    const result = await this.clickhouse.query({
      query: `
        SELECT
          name AS column_name,
          type AS data_type,
          default_expression AS default_value,
          toUInt32(position) AS ordinal_position,
          comment AS source_comment
        FROM system.columns
        WHERE database = {databaseName:String}
          AND table = {objectName:String}
        ORDER BY position
      `,
      format: "JSONEachRow",
      query_params: { databaseName, objectName },
      clickhouse_settings: {
        max_execution_time: SCHEMA_QUERY_TIMEOUT_SECONDS,
        readonly: "1"
      }
    });
    const rows = await result.json<ClickHouseColumnRow>();

    return rows.map((row) => ({
      column_name: row.column_name,
      data_type: row.data_type,
      nullable: row.data_type.startsWith("Nullable("),
      default_value: row.default_value || null,
      ordinal_position: Number(row.ordinal_position),
      source_comment: row.source_comment || null
    }));
  }
}

function toObjectSummary(row: ClickHouseObjectRow): DataExplorerObjectSummary {
  const objectType = normalizeClickHouseObjectType(row.object_type, row.engine);
  return {
    source_id: "clickhouse_events",
    database_name: row.database_name,
    schema_name: null,
    object_type: objectType,
    object_name: row.object_name,
    column_name: null,
    source_comment: null,
    engine: row.engine || null,
    column_count: Number(row.column_count ?? 0),
    row_count_estimate: row.row_count_estimate === null ? null : Number(row.row_count_estimate)
  };
}

function tableToObjectSummary(
  row: ClickHouseTableRow,
  columnCount: number
): DataExplorerObjectSummary {
  return {
    source_id: "clickhouse_events",
    database_name: row.database_name,
    schema_name: null,
    object_type: normalizeClickHouseObjectType("table", row.engine),
    object_name: row.object_name,
    column_name: null,
    source_comment: null,
    engine: row.engine || null,
    column_count: columnCount,
    row_count_estimate: row.total_rows === null ? null : Number(row.total_rows)
  };
}

function normalizeClickHouseObjectType(
  objectType: string,
  engine: string
): Extract<DataExplorerObjectType, "table" | "view" | "materialized_view"> {
  if (objectType === "view" || engine === "View") {
    return "view";
  }
  if (objectType === "materialized_view" || engine === "MaterializedView") {
    return "materialized_view";
  }
  return "table";
}

function objectMatchesInput(object: DataExplorerObjectSummary, input: ListObjectsInput) {
  const q = input.q?.trim().toLowerCase();
  const matchesType = input.objectType ? object.object_type === input.objectType : true;
  const matchesQuery = q
    ? object.object_name.toLowerCase().includes(q) ||
      (object.engine?.toLowerCase().includes(q) ?? false)
    : true;

  return matchesType && matchesQuery;
}

function toResultColumn(column: { name: string; type: string }): DataExplorerResultColumn {
  return {
    name: column.name,
    type: column.type,
    semantic_type: semanticTypeFromClickHouseType(column.type, column.name)
  };
}

function semanticTypeFromClickHouseType(type: string, name: string): DataExplorerSemanticType {
  const lowerType = type.toLowerCase();
  const lowerName = name.toLowerCase();

  if (
    lowerType.includes("date") ||
    ["date", "time", "timestamp", "day", "hour", "month"].some((part) => lowerName.includes(part))
  ) {
    return "time";
  }
  if (lowerType.includes("int") || lowerType.includes("float") || lowerType.includes("decimal")) {
    return "measure";
  }
  if (lowerType.includes("bool")) {
    return "boolean";
  }
  if (lowerType.includes("json") || lowerType.includes("map") || lowerType.includes("array")) {
    return "json";
  }
  return "dimension";
}

function splitExpression(value: string | null | undefined) {
  if (!value?.trim()) {
    return null;
  }
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function quoteIdentifier(value: string) {
  return `\`${value.replaceAll("`", "``")}\``;
}
