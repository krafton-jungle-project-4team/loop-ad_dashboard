import type {
  DataExplorerSourceId,
  DataExplorerSqlValidation,
  DataExplorerValidationIssue
} from "@loopad/shared";
import { normalizeQueryBounds } from "./query-limiter.js";

type SqlToken = {
  lower: string;
  value: string;
};

const BANNED_KEYWORDS = new Set([
  "alter",
  "call",
  "comment",
  "copy",
  "create",
  "delete",
  "do",
  "drop",
  "grant",
  "insert",
  "kill",
  "optimize",
  "revoke",
  "set",
  "system",
  "truncate",
  "update"
]);

const POSTGRES_BANNED_TOKENS = new Set([
  "copy",
  "dblink",
  "for",
  "into",
  "pg_ls_dir",
  "pg_read_file"
]);

const CLICKHOUSE_BANNED_TOKENS = new Set([
  "cluster",
  "file",
  "hdfs",
  "into",
  "jdbc",
  "mysql",
  "odbc",
  "outfile",
  "postgresql",
  "remote",
  "s3",
  "url"
]);

const PROJECT_SCOPED_TABLES = {
  clickhouse_events: new Set([
    "booking_outcome_events",
    "events",
    "expedia_hotel_events",
    "funnel_step_events",
    "hotel_detail_events",
    "hotel_marketing_profiles",
    "promotion_touch_events",
    "raw_events",
    "user_behavior_vectors"
  ]),
  postgres_contract: new Set([
    "active_ad_serving_rules",
    "ad_creatives",
    "latest_user_primary_segments",
    "projects",
    "recommendation_actions",
    "recommendation_results",
    "segment_ad_mappings",
    "segments"
  ])
} satisfies Record<DataExplorerSourceId, Set<string>>;

export function validateReadOnlySql(input: {
  sourceId: DataExplorerSourceId;
  sqlText: string;
  rowLimit?: number;
  timeoutMs?: number;
}): DataExplorerSqlValidation {
  const bounds = normalizeQueryBounds({
    rowLimit: input.rowLimit,
    timeoutMs: input.timeoutMs
  });
  const errors: DataExplorerValidationIssue[] = [];
  const warnings: DataExplorerValidationIssue[] = [];
  const normalizedSql = normalizeSingleStatement(input.sqlText, errors);
  const tokens = scanSqlTokens(normalizedSql);
  const tokenSet = new Set(tokens.map((token) => token.lower));
  const firstToken = tokens[0]?.lower;

  if (!normalizedSql.trim()) {
    errors.push({ code: "SQL_EMPTY", message: "SQL text is required." });
  }

  if (firstToken && firstToken !== "select" && firstToken !== "with") {
    errors.push({
      code: "SQL_TOP_LEVEL_STATEMENT",
      message: "Only SELECT or WITH ... SELECT statements are allowed."
    });
  }

  if (firstToken === "with" && !tokenSet.has("select")) {
    errors.push({
      code: "SQL_WITH_REQUIRES_SELECT",
      message: "WITH queries must end in a SELECT statement."
    });
  }

  for (const token of tokens) {
    if (BANNED_KEYWORDS.has(token.lower)) {
      errors.push({
        code: "SQL_BANNED_KEYWORD",
        message: `Keyword ${token.value.toUpperCase()} is not allowed in Data Explorer.`
      });
      break;
    }
  }

  if (input.sourceId === "postgres_contract") {
    validatePostgresTokens(tokens, errors);
  } else {
    validateClickHouseTokens(tokens, errors);
  }

  validateProjectScopedTables(input.sourceId, tokenSet, errors);

  return {
    status: errors.length > 0 ? "invalid" : "valid",
    errors,
    warnings,
    normalized_sql: normalizedSql,
    effective_row_limit: bounds.rowLimit,
    effective_timeout_ms: bounds.timeoutMs
  };
}

function normalizeSingleStatement(sqlText: string, errors: DataExplorerValidationIssue[]) {
  const sql = sqlText.trim();
  const semicolonIndexes = findExecutableSemicolons(sql);

  if (semicolonIndexes.length === 0) {
    return sql;
  }

  const lastSemicolon = semicolonIndexes.at(-1) ?? -1;
  if (semicolonIndexes.length > 1 || sql.slice(lastSemicolon + 1).trim().length > 0) {
    errors.push({
      code: "SQL_MULTI_STATEMENT",
      message: "Only a single SQL statement is allowed."
    });
    return sql;
  }

  return sql.slice(0, lastSemicolon).trim();
}

function validatePostgresTokens(tokens: SqlToken[], errors: DataExplorerValidationIssue[]) {
  const tokenSet = new Set(tokens.map((token) => token.lower));

  if (tokenSet.has("for") && (tokenSet.has("update") || tokenSet.has("share"))) {
    errors.push({
      code: "POSTGRES_LOCKING_CLAUSE",
      message: "PostgreSQL locking clauses are not allowed."
    });
  }

  for (const token of tokens) {
    if (POSTGRES_BANNED_TOKENS.has(token.lower)) {
      errors.push({
        code: "POSTGRES_BANNED_TOKEN",
        message: `PostgreSQL token ${token.value} is not allowed.`
      });
      break;
    }
  }
}

function validateClickHouseTokens(tokens: SqlToken[], errors: DataExplorerValidationIssue[]) {
  for (const token of tokens) {
    if (CLICKHOUSE_BANNED_TOKENS.has(token.lower)) {
      errors.push({
        code: "CLICKHOUSE_BANNED_TOKEN",
        message: `ClickHouse token ${token.value} is not allowed.`
      });
      break;
    }
  }
}

function validateProjectScopedTables(
  sourceId: DataExplorerSourceId,
  tokenSet: Set<string>,
  errors: DataExplorerValidationIssue[]
) {
  const scopedTableNames = PROJECT_SCOPED_TABLES[sourceId];
  const referencesScopedTable = [...scopedTableNames].some((tableName) => tokenSet.has(tableName));

  if (referencesScopedTable && !tokenSet.has("project_id") && !tokenSet.has("projectid")) {
    errors.push({
      code: "PROJECT_ID_FILTER_REQUIRED",
      message: "Known project-scoped tables require a project_id filter or parameter."
    });
  }
}

function findExecutableSemicolons(sql: string) {
  const indexes: number[] = [];
  let quote: "'" | '"' | null = null;

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const next = sql[index + 1];

    if (quote) {
      if (char === quote) {
        if (quote === "'" && next === "'") {
          index += 1;
          continue;
        }
        quote = null;
      }
      continue;
    }

    if (char === "-" && next === "-") {
      index = consumeLineComment(sql, index);
      continue;
    }

    if (char === "/" && next === "*") {
      index = consumeBlockComment(sql, index);
      continue;
    }

    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }

    if (char === ";") {
      indexes.push(index);
    }
  }

  return indexes;
}

export function scanSqlTokens(sql: string): SqlToken[] {
  const tokens: SqlToken[] = [];
  let quote: "'" | '"' | null = null;

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const next = sql[index + 1];

    if (quote) {
      if (char === quote) {
        if (quote === "'" && next === "'") {
          index += 1;
          continue;
        }
        quote = null;
      }
      continue;
    }

    if (char === "-" && next === "-") {
      index = consumeLineComment(sql, index);
      continue;
    }

    if (char === "/" && next === "*") {
      index = consumeBlockComment(sql, index);
      continue;
    }

    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }

    if (isIdentifierStart(char)) {
      const start = index;
      while (index + 1 < sql.length && isIdentifierPart(sql[index + 1])) {
        index += 1;
      }

      const value = sql.slice(start, index + 1);
      tokens.push({ value, lower: value.toLowerCase() });
    }
  }

  return tokens;
}

function consumeLineComment(sql: string, index: number) {
  let cursor = index + 2;
  while (cursor < sql.length && sql[cursor] !== "\n") {
    cursor += 1;
  }
  return cursor;
}

function consumeBlockComment(sql: string, index: number) {
  let cursor = index + 2;
  while (cursor + 1 < sql.length) {
    if (sql[cursor] === "*" && sql[cursor + 1] === "/") {
      return cursor + 1;
    }
    cursor += 1;
  }
  return sql.length;
}

function isIdentifierStart(char: string | undefined) {
  return !!char && /[A-Za-z_]/.test(char);
}

function isIdentifierPart(char: string | undefined) {
  return !!char && /[A-Za-z0-9_$]/.test(char);
}
