import { createClient } from "@clickhouse/client";
import { env } from "../config/env.js";

export const clickhouse = createClient({
  url: env.clickhouse.url,
  username: env.clickhouse.username,
  password: env.clickhouse.password,
  database: env.clickhouse.database
});
