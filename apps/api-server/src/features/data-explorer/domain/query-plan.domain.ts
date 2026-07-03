import type { DataExplorerSourceId } from "@loopad/shared";

export function inferDataExplorerSourceId(naturalLanguageQuery: string): DataExplorerSourceId {
  const text = naturalLanguageQuery.toLowerCase();
  if (
    ["event", "events", "이벤트", "추이", "일자", "최근", "예약", "검색", "funnel"].some(
      (keyword) => text.includes(keyword)
    )
  ) {
    return "clickhouse_events";
  }

  return "postgres_contract";
}
