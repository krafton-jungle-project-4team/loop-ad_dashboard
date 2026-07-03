import { Inject, Injectable } from "@nestjs/common";
import type {
  DataExplorerColumn,
  DataExplorerConstraint,
  DataExplorerIndex,
  DataExplorerObjectDdl,
  DataExplorerObjectDetail,
  DataExplorerObjectRef,
  DataExplorerObjectSummary
} from "@loopad/shared";
import type { Pool, PoolClient } from "pg";
import { PG_POOL } from "../../../infra/database/index.js";
import { DataExplorerDomain } from "../domain/index.js";
import { dataExplorerErrors } from "../errors.js";
import type { DataExplorerSourceReader, ListObjectsInput } from "./data-explorer-source-reader.js";

const SCHEMA_QUERY_TIMEOUT_MS = 5000;
const LIST_OBJECTS_LIMIT = 1000;

type PgObjectRow = {
  database_name: string;
  schema_name: string;
  object_name: string;
  object_type: "table" | "view" | "materialized_view";
  source_comment: string | null;
  column_count: string | number;
  row_count_estimate: string | number | null;
};

type PgColumnRow = {
  column_name: string;
  data_type: string;
  nullable: boolean;
  default_value: string | null;
  ordinal_position: number;
  source_comment: string | null;
};

type PgIndexRow = {
  index_name: string;
  definition: string;
};

type PgConstraintRow = {
  constraint_name: string;
  constraint_type: string;
  definition: string;
};

/**
 * Reads PostgreSQL contract schema metadata for Data Explorer.
 *
 * This reader uses fixed catalog queries inside a readonly transaction and does
 * not expose user-provided SQL execution.
 */
@Injectable()
export class PostgresContractReader implements DataExplorerSourceReader {
  readonly sourceId = "postgres_contract" as const;
  readonly source = DataExplorerDomain.sourceById(this.sourceId)!;

  constructor(
    @Inject(PG_POOL)
    private readonly pool: Pool
  ) {}

  async listObjects(input: ListObjectsInput): Promise<DataExplorerObjectSummary[]> {
    const rows = await this.withReadOnlyClient(SCHEMA_QUERY_TIMEOUT_MS, async (client) => {
      const result = await client.query<PgObjectRow>(
        `
          SELECT
            current_database() AS database_name,
            n.nspname AS schema_name,
            c.relname AS object_name,
            CASE c.relkind
              WHEN 'v' THEN 'view'
              WHEN 'm' THEN 'materialized_view'
              ELSE 'table'
            END AS object_type,
            obj_description(c.oid, 'pg_class') AS source_comment,
            COUNT(a.attnum) FILTER (WHERE a.attnum > 0 AND NOT a.attisdropped) AS column_count,
            GREATEST(c.reltuples::bigint, 0) AS row_count_estimate
          FROM pg_catalog.pg_class c
          JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
          LEFT JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid
          WHERE c.relkind IN ('r', 'p', 'v', 'm')
            AND n.nspname NOT IN ('pg_catalog', 'information_schema')
            AND ($1::text IS NULL OR n.nspname = $1)
          GROUP BY c.oid, n.nspname, c.relname, c.relkind
          ORDER BY n.nspname, c.relname
          LIMIT $2
        `,
        [input.schemaName ?? null, LIST_OBJECTS_LIMIT]
      );
      return result.rows;
    });

    return rows
      .map(toObjectSummary)
      .filter((object) => objectMatchesInput(object, input))
      .slice(0, LIST_OBJECTS_LIMIT);
  }

  async getObjectDetail(ref: DataExplorerObjectRef): Promise<DataExplorerObjectDetail> {
    const object = await this.getObjectSummary(ref);
    const [columns, indexes, constraints] = await this.withReadOnlyClient(
      SCHEMA_QUERY_TIMEOUT_MS,
      async (client) =>
        Promise.all([
          this.readColumns(client, ref),
          this.readIndexes(client, ref),
          this.readConstraints(client, ref)
        ])
    );

    return {
      object,
      columns,
      indexes,
      constraints,
      partition_key: null,
      order_by: null,
      primary_key: primaryKeyColumns(constraints),
      ...DataExplorerDomain.freshLiveMetadata()
    };
  }

  async getObjectDdl(ref: DataExplorerObjectRef): Promise<DataExplorerObjectDdl> {
    const detail = await this.getObjectDetail(ref);
    const ddl =
      ref.object_type === "view" || ref.object_type === "materialized_view"
        ? await this.readViewDefinition(ref)
        : buildLiveSchemaSummary(detail);

    return {
      ref,
      ddl,
      ...DataExplorerDomain.freshLiveMetadata()
    };
  }

  private async getObjectSummary(ref: DataExplorerObjectRef): Promise<DataExplorerObjectSummary> {
    const objects = await this.listObjects({
      sourceId: this.sourceId,
      projectId: "",
      databaseName: ref.database_name ?? undefined,
      schemaName: ref.schema_name ?? undefined,
      objectType: ref.object_type,
      q: ref.object_name
    });
    const exactObject = objects.find(
      (object) =>
        object.object_name === ref.object_name &&
        object.object_type === ref.object_type &&
        (ref.schema_name ? object.schema_name === ref.schema_name : true)
    );

    if (!exactObject) {
      throw dataExplorerErrors.schemaInspectionFailed();
    }

    return exactObject;
  }

  private async readColumns(
    client: PoolClient,
    ref: DataExplorerObjectRef
  ): Promise<DataExplorerColumn[]> {
    const result = await client.query<PgColumnRow>(
      `
        SELECT
          a.attname AS column_name,
          pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
          NOT a.attnotnull AS nullable,
          pg_get_expr(ad.adbin, ad.adrelid) AS default_value,
          a.attnum::int AS ordinal_position,
          col_description(a.attrelid, a.attnum) AS source_comment
        FROM pg_catalog.pg_attribute a
        JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        LEFT JOIN pg_catalog.pg_attrdef ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
        WHERE a.attnum > 0
          AND NOT a.attisdropped
          AND c.relname = $1
          AND ($2::text IS NULL OR n.nspname = $2)
        ORDER BY a.attnum
      `,
      [ref.object_name, ref.schema_name]
    );

    return result.rows.map((row) => ({
      column_name: row.column_name,
      data_type: row.data_type,
      nullable: row.nullable,
      default_value: row.default_value,
      ordinal_position: Number(row.ordinal_position),
      source_comment: row.source_comment
    }));
  }

  private async readIndexes(
    client: PoolClient,
    ref: DataExplorerObjectRef
  ): Promise<DataExplorerIndex[]> {
    const result = await client.query<PgIndexRow>(
      `
        SELECT indexname AS index_name, indexdef AS definition
        FROM pg_catalog.pg_indexes
        WHERE tablename = $1
          AND ($2::text IS NULL OR schemaname = $2)
        ORDER BY indexname
      `,
      [ref.object_name, ref.schema_name]
    );

    return result.rows.map((row) => ({
      index_name: row.index_name,
      definition: row.definition
    }));
  }

  private async readConstraints(
    client: PoolClient,
    ref: DataExplorerObjectRef
  ): Promise<DataExplorerConstraint[]> {
    const result = await client.query<PgConstraintRow>(
      `
        SELECT
          con.conname AS constraint_name,
          con.contype::text AS constraint_type,
          pg_get_constraintdef(con.oid) AS definition
        FROM pg_catalog.pg_constraint con
        JOIN pg_catalog.pg_class c ON c.oid = con.conrelid
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = $1
          AND ($2::text IS NULL OR n.nspname = $2)
        ORDER BY con.conname
      `,
      [ref.object_name, ref.schema_name]
    );

    return result.rows.map((row) => ({
      constraint_name: row.constraint_name,
      constraint_type: row.constraint_type,
      definition: row.definition
    }));
  }

  private async readViewDefinition(ref: DataExplorerObjectRef): Promise<string> {
    return this.withReadOnlyClient(SCHEMA_QUERY_TIMEOUT_MS, async (client) => {
      const result = await client.query<{ definition: string | null }>(
        `
          SELECT pg_get_viewdef(c.oid, true) AS definition
          FROM pg_catalog.pg_class c
          JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
          WHERE c.relname = $1
            AND ($2::text IS NULL OR n.nspname = $2)
          LIMIT 1
        `,
        [ref.object_name, ref.schema_name]
      );

      return result.rows[0]?.definition ?? "Live view definition is unavailable.";
    });
  }

  private async withReadOnlyClient<T>(
    timeoutMs: number,
    operation: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect();
    let transactionStarted = false;

    try {
      await client.query("BEGIN READ ONLY");
      transactionStarted = true;
      await client.query(`SET LOCAL statement_timeout = '${safeTimeoutMs(timeoutMs)}ms'`);
      await client.query(`SET LOCAL idle_in_transaction_session_timeout = '15000ms'`);
      const result = await operation(client);
      await client.query("ROLLBACK");
      transactionStarted = false;
      return result;
    } catch (error) {
      if (transactionStarted) {
        await rollbackQuietly(client);
      }
      throw error;
    } finally {
      client.release();
    }
  }
}

function toObjectSummary(row: PgObjectRow): DataExplorerObjectSummary {
  return {
    source_id: "postgres_contract",
    database_name: row.database_name,
    schema_name: row.schema_name,
    object_type: row.object_type,
    object_name: row.object_name,
    column_name: null,
    source_comment: row.source_comment,
    engine: null,
    column_count: Number(row.column_count ?? 0),
    row_count_estimate: row.row_count_estimate === null ? null : Number(row.row_count_estimate)
  };
}

function objectMatchesInput(object: DataExplorerObjectSummary, input: ListObjectsInput) {
  const q = input.q?.trim().toLowerCase();
  const matchesType = input.objectType ? object.object_type === input.objectType : true;
  const matchesDatabase = input.databaseName ? object.database_name === input.databaseName : true;
  const matchesSchema = input.schemaName ? object.schema_name === input.schemaName : true;
  const matchesQuery = q
    ? object.object_name.toLowerCase().includes(q) ||
      (object.schema_name?.toLowerCase().includes(q) ?? false)
    : true;

  return matchesType && matchesDatabase && matchesSchema && matchesQuery;
}

function primaryKeyColumns(constraints: DataExplorerConstraint[]) {
  const primaryKey = constraints.find((constraint) => constraint.constraint_type === "p");
  if (!primaryKey) {
    return null;
  }

  const match = primaryKey.definition.match(/\((?<columns>[^)]+)\)/);
  const columnsText = match?.groups?.columns;
  if (!columnsText) {
    return null;
  }

  const columns = columnsText
    .split(",")
    .map((column) => column.trim().replaceAll('"', ""))
    .filter(Boolean);

  return columns && columns.length > 0 ? columns : null;
}

function buildLiveSchemaSummary(detail: DataExplorerObjectDetail) {
  const qualifiedName = [detail.object.schema_name, detail.object.object_name]
    .filter(Boolean)
    .join(".");
  const columns = detail.columns
    .map(
      (column) => `- ${column.column_name} ${column.data_type}${column.nullable ? "" : " NOT NULL"}`
    )
    .join("\n");
  const indexes = detail.indexes.map((index) => `- ${index.definition}`).join("\n") || "- none";
  const constraints =
    detail.constraints.map((constraint) => `- ${constraint.definition}`).join("\n") || "- none";

  return [
    `Live Schema Summary: ${qualifiedName}`,
    "",
    "Columns:",
    columns || "- none",
    "",
    "Indexes:",
    indexes,
    "",
    "Constraints:",
    constraints
  ].join("\n");
}

function safeTimeoutMs(timeoutMs: number) {
  return Math.min(Math.max(Math.trunc(timeoutMs), 1), 30_000);
}

async function rollbackQuietly(client: PoolClient) {
  try {
    await client.query("ROLLBACK");
  } catch {
    // Keep the original query error.
  }
}
