export const DEFAULT_ROW_LIMIT = 500;
export const MAX_ROW_LIMIT = 1000;
export const DEFAULT_TIMEOUT_MS = 10_000;
export const MAX_TIMEOUT_MS = 30_000;

export type QueryBounds = {
  rowLimit: number;
  timeoutMs: number;
};

export function normalizeQueryBounds(input: {
  rowLimit?: number | null;
  timeoutMs?: number | null;
}): QueryBounds {
  return {
    rowLimit: clampPositiveInteger(input.rowLimit, DEFAULT_ROW_LIMIT, MAX_ROW_LIMIT),
    timeoutMs: clampPositiveInteger(input.timeoutMs, DEFAULT_TIMEOUT_MS, MAX_TIMEOUT_MS)
  };
}

export function applyQueryLimit(sqlText: string, rowLimit: number): string {
  const sql = removeTrailingSemicolon(sqlText).trim();
  const matches = [...sql.matchAll(/\blimit\s+(\d+)\b/gi)];
  const lastLimit = matches.at(-1);

  if (!lastLimit?.[1] || lastLimit.index === undefined) {
    return `${sql}\nLIMIT ${rowLimit}`;
  }

  const currentLimit = Number(lastLimit[1]);
  if (Number.isFinite(currentLimit) && currentLimit > 0 && currentLimit <= rowLimit) {
    return sql;
  }

  const start = lastLimit.index;
  const end = start + lastLimit[0].length;
  return `${sql.slice(0, start)}LIMIT ${rowLimit}${sql.slice(end)}`;
}

function clampPositiveInteger(value: number | null | undefined, fallback: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(Math.max(Math.trunc(value), 1), max);
}

function removeTrailingSemicolon(sqlText: string) {
  return sqlText.trim().replace(/;+\s*$/, "");
}
