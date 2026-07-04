import { createClient, type ClickHouseClient } from "@clickhouse/client";
import { Inject, Module, type OnApplicationShutdown } from "@nestjs/common";
import { Pool } from "pg";
import { env } from "../env/env.js";
import { CLICKHOUSE_CLIENT, DEMO_RECIPIENT_PG_POOL, PG_POOL } from "./database.tokens.js";

@Module({
  providers: [
    {
      provide: PG_POOL,
      useFactory: () =>
        new Pool({
          database: env.postgres.database,
          host: env.postgres.host,
          max: 5,
          password: env.postgres.password,
          port: env.postgres.port,
          user: env.postgres.username
        })
    },
    {
      provide: DEMO_RECIPIENT_PG_POOL,
      useFactory: () =>
        new Pool({
          database: env.demoRecipientPostgres.database,
          host: env.demoRecipientPostgres.host,
          max: 3,
          options: "-c default_transaction_read_only=on",
          password: env.demoRecipientPostgres.password,
          port: env.demoRecipientPostgres.port,
          user: env.demoRecipientPostgres.username
        })
    },
    {
      provide: CLICKHOUSE_CLIENT,
      useFactory: () =>
        createClient({
          password: env.clickhouse.password,
          url: env.clickhouse.url,
          username: env.clickhouse.username,
          database: env.clickhouse.database
        })
    }
  ],
  exports: [PG_POOL, DEMO_RECIPIENT_PG_POOL, CLICKHOUSE_CLIENT]
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(
    @Inject(PG_POOL)
    private readonly postgres: Pool,
    @Inject(DEMO_RECIPIENT_PG_POOL)
    private readonly demoRecipientPostgres: Pool,
    @Inject(CLICKHOUSE_CLIENT)
    private readonly clickhouse: ClickHouseClient
  ) {}

  async onApplicationShutdown() {
    await Promise.all([
      this.postgres.end(),
      this.demoRecipientPostgres.end(),
      this.clickhouse.close()
    ]);
  }
}
