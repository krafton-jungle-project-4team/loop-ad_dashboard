import type { IDatabaseConnection, PreparedQuery } from "@pgtyped/runtime";
import { createQueryPromise, type QueryErrorTranslator, type QueryPromise } from "./query-error.js";

export type PgExecutor = IDatabaseConnection;
export type QueryRunner<TParams, TResult> = Pick<PreparedQuery<TParams, TResult>, "run">;

export interface QueryExecutor {
  execute: <TParams, TResult>(
    query: QueryRunner<TParams, TResult>,
    params: TParams
  ) => QueryPromise<TResult[]>;
}

interface QueryExecutorOptions {
  translateError?: QueryErrorTranslator;
}

const pgExecutorByQueryExecutor = new WeakMap<QueryExecutor, PgExecutor>();

export function createQueryExecutor(
  executor: PgExecutor,
  options: QueryExecutorOptions = {}
): QueryExecutor {
  const db: QueryExecutor = {
    execute: (query, params) =>
      createQueryPromise(() => query.run(params, executor), {
        translateError: options.translateError
      })
  };

  pgExecutorByQueryExecutor.set(db, executor);

  return db;
}

export function getQueryExecutorPgExecutor(db: QueryExecutor): PgExecutor {
  const executor = pgExecutorByQueryExecutor.get(db);

  if (!executor) {
    throw new Error("QueryExecutor is not backed by a PgExecutor.");
  }

  return executor;
}
