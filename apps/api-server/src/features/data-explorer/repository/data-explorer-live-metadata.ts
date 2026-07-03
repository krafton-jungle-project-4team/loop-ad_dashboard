export function createDataExplorerLiveMetadata() {
  return {
    cache_hit: false,
    ddl_fetched_at: new Date().toISOString(),
    ddl_source: "live" as const
  };
}
