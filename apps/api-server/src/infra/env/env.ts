import { config as loadDotenv } from "dotenv";

loadDotenv({ path: ".env.local", quiet: true });

const DASHBOARD_SERVICE_ID = "dashboard-api";

const DASHBOARD_WEB_ORIGINS = Object.freeze([
  "https://dashboard.dev.loop-ad.org",
  "http://localhost:5173"
]);

const DECISION_API_BASE_URL = "http://decision-api.dev.loop-ad.local";
const DEFAULT_PROJECT_ID = "loopad-demo-shop";

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

function requiredS3PrefixEnv(name: string): string {
  const value = requiredEnv(name);
  if (!value.endsWith("/")) {
    throw new Error(`${name} must end with /`);
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
  webOrigins: DASHBOARD_WEB_ORIGINS,
  projectId: DEFAULT_PROJECT_ID,
  postgres: {
    host: requiredEnv("LOOPAD_AURORA_HOST"),
    port: requiredIntegerEnv("LOOPAD_AURORA_PORT"),
    user: requiredEnv("LOOPAD_AURORA_USERNAME"),
    password: requiredEnv("LOOPAD_AURORA_PASSWORD"),
    database: requiredEnv("LOOPAD_AURORA_DATABASE")
  },
  clickhouse: {
    url: requiredHttpUrlEnv("LOOPAD_CLICKHOUSE_URL"),
    username: requiredEnv("LOOPAD_CLICKHOUSE_USERNAME")
  },
  dataStorage: {
    bucket: requiredEnv("LOOPAD_DATA_STORAGE_BUCKET"),
    generatedAssetsPrefix: requiredS3PrefixEnv("LOOPAD_GENAI_GENERATED_ASSETS_PREFIX")
  },
  decisionServer: {
    url: DECISION_API_BASE_URL
  }
});
