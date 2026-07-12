import type { DataExplorerObjectSummary } from "@loopad/shared";

type QueryableObject = Pick<DataExplorerObjectSummary, "object_name" | "project_scoped">;

export function buildObjectSampleSql(object: QueryableObject, projectId: string) {
  return [
    "SELECT",
    "  *",
    `FROM ${quoteClickHouseIdentifier(object.object_name)}`,
    ...projectScopeClause(object, projectId),
    "LIMIT 100"
  ].join("\n");
}

export function buildColumnSampleSql(
  object: QueryableObject,
  columnName: string,
  projectId: string
) {
  return [
    "SELECT",
    `  ${quoteClickHouseIdentifier(columnName)}`,
    `FROM ${quoteClickHouseIdentifier(object.object_name)}`,
    ...projectScopeClause(object, projectId),
    "LIMIT 100"
  ].join("\n");
}

function projectScopeClause(object: QueryableObject, projectId: string) {
  return object.project_scoped === true
    ? [`WHERE project_id = '${escapeSqlLiteral(projectId)}'`]
    : [];
}

function escapeSqlLiteral(value: string) {
  return value.replaceAll("'", "''");
}

function quoteClickHouseIdentifier(identifier: string) {
  return `\`${identifier.replaceAll("`", "``")}\``;
}
