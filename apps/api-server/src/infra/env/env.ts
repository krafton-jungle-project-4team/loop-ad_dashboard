const DASHBOARD_SERVICE_ID = "dashboard-api";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function requiredIntegerEnv(name: string): number {
  const value = Number(requiredEnv(name));
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

function requiredHttpUrlEnv(name: string): string {
  const value = requiredEnv(name);
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`${name} must be an http or https URL`);
  }
  return value;
}

function requiredServiceIdEnv(): string {
  const value = requiredEnv("LOOPAD_SERVICE_ID");
  if (value !== DASHBOARD_SERVICE_ID) {
    throw new Error(`LOOPAD_SERVICE_ID must be ${DASHBOARD_SERVICE_ID}`);
  }
  return value;
}

const loopadEnv = requiredEnv("LOOPAD_ENV");

export const env = Object.freeze({
  env: loopadEnv,
  serviceId: requiredServiceIdEnv(),
  port: requiredIntegerEnv("PORT"),
  postgres: {
    host: requiredEnv("LOOPAD_AURORA_HOST"),
    port: requiredIntegerEnv("LOOPAD_AURORA_PORT"),
    database: requiredEnv("LOOPAD_AURORA_DATABASE"),
    username: requiredEnv("LOOPAD_AURORA_USERNAME"),
    password: requiredEnv("LOOPAD_AURORA_PASSWORD")
  },
  clickhouse: {
    url: requiredHttpUrlEnv("LOOPAD_CLICKHOUSE_URL"),
    database: requiredEnv("LOOPAD_CLICKHOUSE_DATABASE"),
    username: requiredEnv("LOOPAD_CLICKHOUSE_USERNAME"),
    password: requiredEnv("LOOPAD_CLICKHOUSE_PASSWORD")
  }
});
