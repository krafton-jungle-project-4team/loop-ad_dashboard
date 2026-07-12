import type { DataExplorerSqlValidation, DataExplorerValidationIssue } from "@loopad/shared";

const DEFAULT_ROW_LIMIT = 500;
const MAX_ROW_LIMIT = 1000;
const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_TIMEOUT_MS = 30_000;

export function validateSqlInput(input: { sqlText: string }): DataExplorerSqlValidation {
  const errors: DataExplorerValidationIssue[] = [];
  const normalizedSql = input.sqlText.trim();

  if (!normalizedSql) {
    errors.push({ code: "SQL_EMPTY", message: "SQL을 입력해주세요." });
  } else {
    const scan = scanSql(normalizedSql);
    const structuralSql = removeOptionalTrailingSemicolon(scan.structuralSql.trim());
    const firstKeyword = structuralSql.match(/^[A-Za-z_][A-Za-z0-9_]*/)?.[0]?.toUpperCase();

    if (!scan.closed) {
      errors.push({
        code: "SQL_UNTERMINATED_TOKEN",
        message: "닫히지 않은 문자열, 식별자 또는 주석이 있습니다."
      });
    }

    if (structuralSql.includes(";")) {
      errors.push({
        code: "SQL_MULTIPLE_STATEMENTS_NOT_ALLOWED",
        message: "한 번에 하나의 SQL 문장만 실행할 수 있습니다."
      });
    }

    if (firstKeyword !== "SELECT" && firstKeyword !== "WITH") {
      errors.push({
        code: "SQL_STATEMENT_NOT_ALLOWED",
        message: "SELECT 또는 WITH로 시작하는 조회 쿼리만 실행할 수 있습니다."
      });
    }

    if (/\bSETTINGS\b/i.test(structuralSql)) {
      errors.push({
        code: "SQL_SETTINGS_NOT_ALLOWED",
        message: "쿼리에서 ClickHouse 설정을 변경할 수 없습니다."
      });
    }

    if (containsTableFunctionSource(structuralSql)) {
      errors.push({
        code: "SQL_TABLE_FUNCTION_NOT_ALLOWED",
        message: "테이블 함수는 프로젝트 범위를 우회할 수 있어 사용할 수 없습니다."
      });
    }
  }

  return {
    status: errors.length > 0 ? "invalid" : "valid",
    errors,
    normalized_sql: normalizedSql
  };
}

type SqlScanState =
  | "normal"
  | "single_quote"
  | "double_quote"
  | "backtick"
  | "line_comment"
  | "block_comment";

function scanSql(sql: string) {
  let state: SqlScanState = "normal";
  let blockCommentDepth = 0;
  let structuralSql = "";

  for (let index = 0; index < sql.length; index += 1) {
    const character = sql[index] ?? "";
    const nextCharacter = sql[index + 1] ?? "";

    if (state === "normal") {
      if (character === "-" && nextCharacter === "-") {
        structuralSql += "  ";
        state = "line_comment";
        index += 1;
        continue;
      }
      if (character === "#") {
        structuralSql += " ";
        state = "line_comment";
        continue;
      }
      if (character === "/" && nextCharacter === "*") {
        structuralSql += "  ";
        state = "block_comment";
        blockCommentDepth = 1;
        index += 1;
        continue;
      }
      if (character === "'") {
        structuralSql += " ";
        state = "single_quote";
        continue;
      }
      if (character === '"') {
        structuralSql += "Q";
        state = "double_quote";
        continue;
      }
      if (character === "`") {
        structuralSql += "Q";
        state = "backtick";
        continue;
      }

      structuralSql += character;
      continue;
    }

    if (state === "line_comment") {
      structuralSql += character === "\n" ? "\n" : " ";
      if (character === "\n") {
        state = "normal";
      }
      continue;
    }

    if (state === "block_comment") {
      structuralSql += character === "\n" ? "\n" : " ";
      if (character === "/" && nextCharacter === "*") {
        structuralSql += " ";
        blockCommentDepth += 1;
        index += 1;
        continue;
      }
      if (character === "*" && nextCharacter === "/") {
        structuralSql += " ";
        blockCommentDepth -= 1;
        index += 1;
        if (blockCommentDepth === 0) {
          state = "normal";
        }
      }
      continue;
    }

    structuralSql += " ";

    if (character === "\\") {
      if (nextCharacter) {
        structuralSql += nextCharacter === "\n" ? "\n" : " ";
        index += 1;
      }
      continue;
    }

    const quote = state === "single_quote" ? "'" : state === "double_quote" ? '"' : "`";
    if (character !== quote) {
      continue;
    }

    if (nextCharacter === quote) {
      structuralSql += " ";
      index += 1;
      continue;
    }

    state = "normal";
  }

  return {
    closed: state === "normal" || state === "line_comment",
    structuralSql
  };
}

function removeOptionalTrailingSemicolon(sql: string) {
  return sql.endsWith(";") ? sql.slice(0, -1).trimEnd() : sql;
}

type SqlToken = {
  value: string;
};

const FROM_CLAUSE_END_KEYWORDS = new Set([
  "FORMAT",
  "GROUP",
  "HAVING",
  "INTO",
  "LIMIT",
  "ORDER",
  "PREWHERE",
  "QUALIFY",
  "SETTINGS",
  "UNION",
  "WHERE",
  "WINDOW"
]);

function containsTableFunctionSource(sql: string) {
  const tokens = tokenizeSql(sql);
  const inFromClause = new Map<number, boolean>();
  const sourceExpected = new Set<number>();
  let depth = 0;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]?.value ?? "";
    const upperToken = token.toUpperCase();

    if (token === "(") {
      if (sourceExpected.has(depth)) {
        const firstSourceToken = firstTokenInsideParentheses(tokens, index)?.toUpperCase();
        if (firstSourceToken !== "SELECT" && firstSourceToken !== "WITH") {
          return true;
        }
        sourceExpected.delete(depth);
      }

      depth += 1;
      inFromClause.set(depth, false);
      continue;
    }

    if (token === ")") {
      inFromClause.delete(depth);
      sourceExpected.delete(depth);
      depth = Math.max(0, depth - 1);
      continue;
    }

    if (token === "," && inFromClause.get(depth)) {
      sourceExpected.add(depth);
      continue;
    }

    if (upperToken === "FROM") {
      inFromClause.set(depth, true);
      sourceExpected.add(depth);
      continue;
    }

    if (FROM_CLAUSE_END_KEYWORDS.has(upperToken)) {
      inFromClause.set(depth, false);
      sourceExpected.delete(depth);
      continue;
    }

    if (upperToken === "JOIN") {
      const previousToken = tokens[index - 1]?.value.toUpperCase();
      if (previousToken !== "ARRAY") {
        sourceExpected.add(depth);
      }
      continue;
    }

    if (!sourceExpected.has(depth) || !isIdentifierToken(token)) {
      continue;
    }

    let nextIndex = index + 1;
    while (tokens[nextIndex]?.value === "." && isIdentifierToken(tokens[nextIndex + 1]?.value)) {
      nextIndex += 2;
    }

    if (tokens[nextIndex]?.value === "(") {
      return true;
    }

    sourceExpected.delete(depth);
  }

  return false;
}

function tokenizeSql(sql: string): SqlToken[] {
  return Array.from(sql.matchAll(/[A-Za-z_][A-Za-z0-9_]*|[().,]/g), (match) => ({
    value: match[0]
  }));
}

function firstTokenInsideParentheses(tokens: SqlToken[], openingIndex: number) {
  let index = openingIndex + 1;
  while (tokens[index]?.value === "(") {
    index += 1;
  }
  return tokens[index]?.value;
}

function isIdentifierToken(value: string | undefined) {
  return Boolean(value && /^[A-Za-z_][A-Za-z0-9_]*$/.test(value));
}

export function normalizeQueryBounds(input: {
  rowLimit?: number | null;
  timeoutMs?: number | null;
}) {
  return {
    rowLimit: clampPositiveInteger(input.rowLimit, DEFAULT_ROW_LIMIT, MAX_ROW_LIMIT),
    timeoutMs: clampPositiveInteger(input.timeoutMs, DEFAULT_TIMEOUT_MS, MAX_TIMEOUT_MS)
  };
}

function clampPositiveInteger(value: number | null | undefined, fallback: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(Math.max(Math.trunc(value), 1), max);
}
