import type {
  DataExplorerObjectDetail,
  DataExplorerObjectSummary,
  DataExplorerSource,
  DataExplorerSourceId
} from "@loopad/shared";

export const DATA_EXPLORER_SOURCES = [
  {
    source_id: "postgres_contract",
    kind: "postgres",
    display_name: "PostgreSQL Contract DB",
    purpose: "AI Decision 결과, Dashboard read model, serving assignment, Dashboard metadata",
    capabilities: ["sql_query", "schema_browser", "ai_query"]
  },
  {
    source_id: "clickhouse_events",
    kind: "clickhouse",
    display_name: "ClickHouse Event Store",
    purpose: "raw event source, hotel event analytics view",
    capabilities: ["sql_query", "schema_browser", "ai_query"]
  }
] as const satisfies readonly DataExplorerSource[];

export const DataExplorerDomain = {
  sourceById(sourceId: DataExplorerSourceId): DataExplorerSource | null {
    return DATA_EXPLORER_SOURCES.find((source) => source.source_id === sourceId) ?? null;
  },

  sources(): DataExplorerSource[] {
    return DATA_EXPLORER_SOURCES.map((source) => ({ ...source }));
  },

  createQueryRunId(prefix = "qry_run"): string {
    return `${prefix}_${new Date().toISOString().replace(/\D/g, "").slice(0, 17)}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;
  },

  freshLiveMetadata() {
    return {
      cache_hit: false,
      ddl_fetched_at: new Date().toISOString(),
      ddl_source: "live" as const
    };
  },

  toSchemaContext(detail: DataExplorerObjectDetail) {
    return {
      object_name: detail.object.object_name,
      object_type: detail.object.object_type,
      ddl_fetched_at: detail.ddl_fetched_at,
      ddl_source: detail.ddl_source,
      columns: detail.columns.map((column) => column.column_name)
    };
  },

  pickReferencedObject(objects: DataExplorerObjectSummary[]): DataExplorerObjectSummary | null {
    return (
      objects.find((object) => object.object_name === "raw_events") ??
      objects.find((object) => object.object_name === "events") ??
      objects.find((object) => object.object_type === "table") ??
      objects.find((object) => object.object_type === "view") ??
      objects[0] ??
      null
    );
  }
} as const;
