import { createClient, type ClickHouseClient } from "@clickhouse/client";
import { Inject, Module, type OnApplicationShutdown } from "@nestjs/common";
import { Pool } from "pg";
import { env } from "../env/env.js";
import { CLICKHOUSE_CLIENT, PG_POOL } from "./database.tokens.js";

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
  exports: [PG_POOL, CLICKHOUSE_CLIENT]
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(
    @Inject(PG_POOL)
    private readonly postgres: Pool,
    @Inject(CLICKHOUSE_CLIENT)
    private readonly clickhouse: ClickHouseClient
  ) {}

  async onApplicationShutdown() {
    await Promise.all([this.postgres.end(), this.clickhouse.close()]);
  }
}
