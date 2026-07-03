import type { DataExplorerSqlValidation, DataExplorerValidationIssue } from "@loopad/shared";

const DEFAULT_ROW_LIMIT = 500;
const MAX_ROW_LIMIT = 1000;
const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_TIMEOUT_MS = 30_000;

export function validateSqlInput(input: { sqlText: string }): DataExplorerSqlValidation {
  const errors: DataExplorerValidationIssue[] = [];
  const normalizedSql = input.sqlText.trim();

  if (!normalizedSql.trim()) {
    errors.push({ code: "SQL_EMPTY", message: "SQL을 입력해주세요." });
  }

  return {
    status: errors.length > 0 ? "invalid" : "valid",
    errors,
    normalized_sql: normalizedSql
  };
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
