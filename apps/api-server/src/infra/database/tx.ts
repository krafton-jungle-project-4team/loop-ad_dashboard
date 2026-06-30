import {
  createQueryExecutor,
  getQueryExecutorPgExecutor,
  type PgExecutor,
  type QueryExecutor
} from "./query-executor.js";
import { withQueryResultApi, type QueryResultDb } from "./query-result.js";
import { translateDatabaseError } from "./database-errors.js";

export type TxDb = QueryExecutor & QueryResultDb;

export function createTxDb(executor: PgExecutor): TxDb {
  return withQueryResultApi(
    createQueryExecutor(executor, { translateError: translateDatabaseError })
  );
}

export function getTxDbExecutor(db: TxDb): PgExecutor {
  return getQueryExecutorPgExecutor(db);
}

export type { PgExecutor, QueryExecutor } from "./query-executor.js";
export type {
  QueryResult,
  QueryResultDb,
  QueryResultMethod,
  QueryResultPromise
} from "./query-result.js";
export { QueryResultError } from "./query-result.js";
