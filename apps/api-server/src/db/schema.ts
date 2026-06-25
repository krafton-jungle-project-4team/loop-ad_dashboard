import { env } from "../config/env.js";
import { clickhouse } from "./clickhouse.js";
import { postgres } from "./postgres.js";

export async function ensurePostgres() {
  await postgres.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
  await postgres.query(`
    CREATE TABLE IF NOT EXISTS admin_accounts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text NOT NULL UNIQUE,
      display_name text NOT NULL,
      role text NOT NULL DEFAULT 'owner',
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS projects (
      id text PRIMARY KEY,
      owner_email text NOT NULL REFERENCES admin_accounts(email),
      name text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await postgres.query(
    `INSERT INTO admin_accounts (email, display_name) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    ["admin@loopad.local", "LoopAd Admin"]
  );
  await postgres.query(
    `INSERT INTO projects (id, owner_email, name) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
    [env.projectId, "admin@loopad.local", "LoopAd Demo Shop"]
  );
}

export async function ensureClickHouse() {
  await clickhouse.command({ query: `CREATE DATABASE IF NOT EXISTS ${env.clickhouse.database}` });
  await clickhouse.command({
    query: `
      CREATE TABLE IF NOT EXISTS events (
        project_id String,
        user_id String,
        session_id String,
        event_name LowCardinality(String),
        timestamp DateTime64(3, 'Asia/Seoul'),
        channel LowCardinality(String),
        campaign_id String,
        product_id String,
        category LowCardinality(String),
        age_group LowCardinality(String),
        gender LowCardinality(String),
        device LowCardinality(String),
        price Float64,
        inventory_status LowCardinality(String),
        properties String
      )
      ENGINE = MergeTree
      ORDER BY (project_id, timestamp, event_name, session_id)
    `
  });
}
