import type { DataExplorerSource, DataExplorerSourceId } from "@loopad/shared";

export const DATA_EXPLORER_SOURCES = [
  {
    source_id: "postgres_contract",
    kind: "postgres",
    display_name: "PostgreSQL Contract DB",
    purpose: "AI Decision 결과, Dashboard read model, serving assignment, Dashboard metadata",
    capabilities: ["schema_browser"]
  },
  {
    source_id: "clickhouse_events",
    kind: "clickhouse",
    display_name: "ClickHouse Event Store",
    purpose: "raw event source, hotel event analytics view",
    capabilities: ["schema_browser"]
  }
] as const satisfies readonly DataExplorerSource[];

export const DataExplorerDomain = {
  sourceById(sourceId: DataExplorerSourceId): DataExplorerSource | null {
    return DATA_EXPLORER_SOURCES.find((source) => source.source_id === sourceId) ?? null;
  },

  sources(): DataExplorerSource[] {
    return DATA_EXPLORER_SOURCES.map((source) => ({ ...source }));
  },

  freshLiveMetadata() {
    return {
      cache_hit: false,
      ddl_fetched_at: new Date().toISOString(),
      ddl_source: "live" as const
    };
  }
} as const;
