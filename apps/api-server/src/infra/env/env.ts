export const env = {
  port: Number(process.env.PORT ?? 3000),
  webOrigin: process.env.LOOPAD_WEB_ORIGIN ?? "http://localhost:5173",
  projectId: process.env.LOOPAD_PROJECT_ID ?? "loopad-demo-shop",
  seedDemoData: (process.env.LOOPAD_SEED_DEMO_DATA ?? "true") === "true",
  postgres: {
    host: process.env.LOOPAD_POSTGRES_HOST ?? "localhost",
    port: Number(process.env.LOOPAD_POSTGRES_PORT ?? 5432),
    user: process.env.LOOPAD_POSTGRES_USER ?? "loopad",
    password: process.env.LOOPAD_POSTGRES_PASSWORD ?? "change-me",
    database: process.env.LOOPAD_POSTGRES_DATABASE ?? "loopad"
  },
  clickhouse: {
    url: process.env.LOOPAD_CLICKHOUSE_URL ?? "http://localhost:8123",
    database: process.env.LOOPAD_CLICKHOUSE_DATABASE ?? "loopad",
    username: process.env.LOOPAD_CLICKHOUSE_USER ?? "loopad",
    password: process.env.LOOPAD_CLICKHOUSE_PASSWORD ?? "change-me"
  }
};
