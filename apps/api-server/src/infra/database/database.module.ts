import { createClient, type ClickHouseClient } from "@clickhouse/client";
import { Inject, Module, type OnApplicationShutdown } from "@nestjs/common";
import { Pool } from "pg";
import { env } from "../env/env.js";
import { CLICKHOUSE_CLIENT, PG_POOL } from "./database.tokens.js";

@Module({
  providers: [
    {
      provide: PG_POOL,
      useFactory: () => new Pool({ connectionString: env.postgres.url, max: 5 })
    },
    {
      provide: CLICKHOUSE_CLIENT,
      useFactory: () =>
        createClient({
          password: env.clickhouse.password,
          url: env.clickhouse.url,
          username: env.clickhouse.username
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
