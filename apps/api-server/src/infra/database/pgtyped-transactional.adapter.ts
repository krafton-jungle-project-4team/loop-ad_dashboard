import type { TransactionalAdapter, TransactionalAdapterOptions } from "@nestjs-cls/transactional";
import { randomUUID } from "crypto";
import type { Pool } from "pg";
import { PG_POOL } from "./database.tokens.js";
import { createTxDb, getTxDbExecutor, type PgExecutor, type TxDb } from "./tx.js";

export type PgIsolationLevel =
  | "READ COMMITTED"
  | "REPEATABLE READ"
  | "SERIALIZABLE"
  | "READ UNCOMMITTED";

export interface PgTypedTransactionOptions {
  isolationLevel?: PgIsolationLevel;
  readOnly?: boolean;
  deferrable?: boolean;
}

export type PgTypedTransactionDb = TxDb;

export interface TransactionalAdapterPgTypedOptions {
  connectionToken?: unknown;
  poolToken?: unknown;
  connection?: Pool;
  pool?: Pool;
  defaultTxOptions?: Partial<PgTypedTransactionOptions>;
}

export class TransactionalAdapterPgTyped implements TransactionalAdapter<
  Pool,
  PgTypedTransactionDb,
  PgTypedTransactionOptions
> {
  readonly connectionToken?: unknown;
  readonly connection?: Pool;
  readonly defaultTxOptions?: Partial<PgTypedTransactionOptions>;

  constructor(options: TransactionalAdapterPgTypedOptions = {}) {
    this.connectionToken = options.connectionToken ?? options.poolToken ?? PG_POOL;
    this.connection = options.connection ?? options.pool;
    this.defaultTxOptions = options.defaultTxOptions;

    if (this.connectionToken === undefined && this.connection === undefined) {
      throw new Error(
        "TransactionalAdapterPgTyped requires a poolToken, connectionToken, pool, or connection."
      );
    }
  }

  optionsFactory(
    pool: Pool
  ): TransactionalAdapterOptions<PgTypedTransactionDb, PgTypedTransactionOptions> {
    return {
      wrapWithTransaction: async (options, fn, setTx) => {
        const client = await pool.connect();

        try {
          await client.query(getBeginTransactionSql(options));
          const db = createTxDb(client);
          setTx(db);
          const result = await fn();
          await client.query("COMMIT");

          return result;
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        } finally {
          client.release();
        }
      },
      wrapWithNestedTransaction: async (_options, fn, setTx, db) => {
        const executor = getTxDbExecutor(db);
        const savepointName = this.getNextSavepointName();

        await executor.query(`SAVEPOINT ${savepointName}`, []);
        setTx(db);

        try {
          const result = await fn();
          await executor.query(`RELEASE SAVEPOINT ${savepointName}`, []);

          return result;
        } catch (error) {
          await executor.query(`ROLLBACK TO SAVEPOINT ${savepointName}`, []);
          await executor.query(`RELEASE SAVEPOINT ${savepointName}`, []);
          throw error;
        }
      },
      getFallbackInstance: () => createTxDb(pool as unknown as PgExecutor)
    };
  }

  private getNextSavepointName() {
    return `pgtyped_cls_tx_${randomUUID().replace(/-/g, "_")}`;
  }
}

export { TransactionalAdapterPgTyped as PgTypedTransactionalAdapter };

function getBeginTransactionSql(options: PgTypedTransactionOptions | undefined) {
  const clauses: string[] = [];

  if (options?.isolationLevel) {
    clauses.push(`ISOLATION LEVEL ${options.isolationLevel}`);
  }

  if (options?.readOnly !== undefined) {
    clauses.push(options.readOnly ? "READ ONLY" : "READ WRITE");
  }

  if (options?.deferrable !== undefined) {
    clauses.push(options.deferrable ? "DEFERRABLE" : "NOT DEFERRABLE");
  }

  return clauses.length === 0 ? "BEGIN" : `BEGIN ${clauses.join(" ")}`;
}
