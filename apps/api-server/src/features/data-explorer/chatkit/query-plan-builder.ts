import type {
  DataExplorerChartSpec,
  DataExplorerObjectDetail,
  DataExplorerSourceId,
  DataExplorerTimeRange
} from "@loopad/shared";

type DataExplorerQueryPlanDraft = {
  generatedSql: string;
  params: Record<string, unknown>;
  suggestedVisualizations: DataExplorerChartSpec[];
};

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

export function buildDataExplorerQueryPlan(input: {
  detail: DataExplorerObjectDetail;
  projectId: string;
  sourceId: DataExplorerSourceId;
  timeRange?: DataExplorerTimeRange;
}): DataExplorerQueryPlanDraft {
  if (input.sourceId === "clickhouse_events") {
    return buildClickHousePlan(input.detail, input.projectId, input.timeRange);
  }

  return buildPostgresPlan(input.detail, input.projectId);
}

function buildClickHousePlan(
  detail: DataExplorerObjectDetail,
  projectId: string,
  timeRange: DataExplorerTimeRange | undefined
): DataExplorerQueryPlanDraft {
  const columnNames = new Set(detail.columns.map((column) => column.column_name));
  const objectName = safeBareIdentifier(detail.object.object_name) ?? "events";
  const params: Record<string, unknown> = { project_id: projectId };

  if (
    columnNames.has("event_time") &&
    columnNames.has("event_name") &&
    columnNames.has("project_id")
  ) {
    if (timeRange) {
      params.from = timeRange.from;
      params.to = timeRange.to;
    }

    const timePredicate = timeRange
      ? [
          "  AND event_time >= parseDateTime64BestEffort({from:String}, 3, 'UTC')",
          "  AND event_time < parseDateTime64BestEffort({to:String}, 3, 'UTC')"
        ]
      : [];

    return {
      generatedSql: [
        "SELECT",
        "  toDate(event_time) AS day,",
        "  event_name,",
        "  count() AS events",
        `FROM ${objectName}`,
        "WHERE project_id = {project_id:String}",
        ...timePredicate,
        "GROUP BY day, event_name",
        "ORDER BY day, event_name",
        "LIMIT 500"
      ].join("\n"),
      params,
      suggestedVisualizations: [
        {
          chart_type: "line",
          x: { column: "day", type: "time" },
          y: [{ column: "events", aggregation: "none" }],
          series: { column: "event_name" },
          options: { stack: false, show_legend: true }
        }
      ]
    };
  }

  return {
    generatedSql: [
      "SELECT *",
      `FROM ${objectName}`,
      columnNames.has("project_id") ? "WHERE project_id = {project_id:String}" : "",
      "LIMIT 500"
    ]
      .filter(Boolean)
      .join("\n"),
    params: columnNames.has("project_id") ? params : {},
    suggestedVisualizations: []
  };
}

function buildPostgresPlan(
  detail: DataExplorerObjectDetail,
  projectId: string
): DataExplorerQueryPlanDraft {
  const columnNames = new Set(detail.columns.map((column) => column.column_name));
  const objectName = quotePostgresIdentifier(detail.object.object_name);
  const qualifiedName = detail.object.schema_name
    ? `${quotePostgresIdentifier(detail.object.schema_name)}.${objectName}`
    : objectName;
  const hasProjectId = columnNames.has("project_id");

  return {
    generatedSql: [
      "SELECT *",
      `FROM ${qualifiedName}`,
      hasProjectId ? "WHERE project_id = :project_id" : "",
      "LIMIT 500"
    ]
      .filter(Boolean)
      .join("\n"),
    params: hasProjectId ? { project_id: projectId } : {},
    suggestedVisualizations: []
  };
}

function safeBareIdentifier(value: string) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(value) ? value : null;
}

function quotePostgresIdentifier(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}
