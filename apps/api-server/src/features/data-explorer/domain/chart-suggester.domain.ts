import type { DataExplorerChartSpec, DataExplorerResultColumn } from "@loopad/shared";

export function suggestVisualizations(
  columns: DataExplorerResultColumn[]
): DataExplorerChartSpec[] {
  const timeColumn = columns.find((column) => column.semantic_type === "time");
  const measureColumns = columns.filter((column) => column.semantic_type === "measure");
  const dimensionColumns = columns.filter((column) => column.semantic_type === "dimension");
  const suggestions: DataExplorerChartSpec[] = [];

  if (timeColumn && measureColumns[0]) {
    suggestions.push({
      chart_type: "line",
      x: { column: timeColumn.name, type: timeColumn.semantic_type },
      y: [{ column: measureColumns[0].name, aggregation: "none" }],
      series: dimensionColumns[0] ? { column: dimensionColumns[0].name } : null,
      options: { stack: false, show_legend: !!dimensionColumns[0] }
    });
  }

  if (dimensionColumns[0] && measureColumns[0]) {
    suggestions.push({
      chart_type: "bar",
      x: { column: dimensionColumns[0].name, type: dimensionColumns[0].semantic_type },
      y: [{ column: measureColumns[0].name, aggregation: "none" }],
      series: dimensionColumns[1] ? { column: dimensionColumns[1].name } : null,
      options: { stack: false, show_legend: !!dimensionColumns[1] }
    });
  }

  if (measureColumns[0] && measureColumns[1]) {
    suggestions.push({
      chart_type: "scatter",
      x: { column: measureColumns[0].name, type: measureColumns[0].semantic_type },
      y: [{ column: measureColumns[1].name, aggregation: "none" }],
      series: dimensionColumns[0] ? { column: dimensionColumns[0].name } : null,
      options: { stack: false, show_legend: !!dimensionColumns[0] }
    });
  }

  return suggestions.slice(0, 3);
}
