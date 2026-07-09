import { z } from "zod";

const DASHBOARD_SERVICE_ID = "dashboard-api";

const requiredString = z.string().trim().min(1);
const positivePort = z.coerce.number().int().min(1).max(65535);
const httpUrl = requiredString.url().refine(
  (value) => {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  },
  { message: "must be an http or https URL" }
);
const demoDispatchRecipientSchema = z.object({
  userId: requiredString,
  email: z.string().trim().email(),
  phoneNumber: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{1,14}$/)
});

export type DemoDispatchRecipientConfig = z.infer<typeof demoDispatchRecipientSchema>;

const envSchema = z.object({
  LOOPAD_ENV: requiredString,
  LOOPAD_SERVICE_ID: z.literal(DASHBOARD_SERVICE_ID),
  PORT: positivePort,
  LOOPAD_AURORA_HOST: requiredString,
  LOOPAD_AURORA_PORT: positivePort,
  LOOPAD_AURORA_DATABASE: requiredString,
  LOOPAD_AURORA_USERNAME: requiredString,
  LOOPAD_AURORA_PASSWORD: requiredString,
  LOOPAD_CLICKHOUSE_URL: httpUrl,
  LOOPAD_CLICKHOUSE_DATABASE: requiredString,
  LOOPAD_CLICKHOUSE_USERNAME: requiredString,
  LOOPAD_CLICKHOUSE_PASSWORD: requiredString,
  LOOPAD_DECISION_API_BASE_URL: httpUrl,
  LOOPAD_INTERNAL_API_KEY: requiredString,
  LOOPAD_OPEN_PIXEL_SIGNING_SECRET: requiredString,
  LOOPAD_OPENAI_API_KEY: requiredString,
  LOOPAD_DEMO_DISPATCH_RECIPIENTS: requiredString
});

const parsedEnv = parseEnv(process.env);
const demoDispatchRecipients = parseDemoDispatchRecipients(
  parsedEnv.LOOPAD_DEMO_DISPATCH_RECIPIENTS
);

export const env = Object.freeze({
  env: parsedEnv.LOOPAD_ENV,
  serviceId: parsedEnv.LOOPAD_SERVICE_ID,
  port: parsedEnv.PORT,
  postgres: {
    host: parsedEnv.LOOPAD_AURORA_HOST,
    port: parsedEnv.LOOPAD_AURORA_PORT,
    database: parsedEnv.LOOPAD_AURORA_DATABASE,
    username: parsedEnv.LOOPAD_AURORA_USERNAME,
    password: parsedEnv.LOOPAD_AURORA_PASSWORD
  },
  clickhouse: {
    url: parsedEnv.LOOPAD_CLICKHOUSE_URL,
    database: parsedEnv.LOOPAD_CLICKHOUSE_DATABASE,
    username: parsedEnv.LOOPAD_CLICKHOUSE_USERNAME,
    password: parsedEnv.LOOPAD_CLICKHOUSE_PASSWORD
  },
  decision: {
    apiBaseUrl: parsedEnv.LOOPAD_DECISION_API_BASE_URL,
    internalApiKey: parsedEnv.LOOPAD_INTERNAL_API_KEY
  },
  openPixel: {
    signingSecret: parsedEnv.LOOPAD_OPEN_PIXEL_SIGNING_SECRET
  },
  openai: {
    apiKey: parsedEnv.LOOPAD_OPENAI_API_KEY
  },
  demoDispatchRecipients
});
export type AppEnv = typeof env;

function parseEnv(source: NodeJS.ProcessEnv): z.infer<typeof envSchema> {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    throw new Error(`Invalid API server environment:\n${formatEnvErrors(result.error)}`);
  }

  return result.data;
}

function parseDemoDispatchRecipients(source: string): readonly DemoDispatchRecipientConfig[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(source);
  } catch {
    throw new Error(
      "Invalid API server environment:\n- LOOPAD_DEMO_DISPATCH_RECIPIENTS: invalid JSON array"
    );
  }

  const result = z.array(demoDispatchRecipientSchema).safeParse(parsed);

  if (!result.success) {
    throw new Error(
      `Invalid API server environment:\n${formatEnvErrorsFor("LOOPAD_DEMO_DISPATCH_RECIPIENTS", result.error)}`
    );
  }

  assertUniqueDemoRecipientUserIds(result.data);

  return result.data;
}

function assertUniqueDemoRecipientUserIds(recipients: readonly DemoDispatchRecipientConfig[]) {
  const seen = new Set<string>();

  for (const recipient of recipients) {
    if (seen.has(recipient.userId)) {
      throw new Error(
        `Invalid API server environment:\n- LOOPAD_DEMO_DISPATCH_RECIPIENTS: duplicated userId '${recipient.userId}'`
      );
    }

    seen.add(recipient.userId);
  }
}

function formatEnvErrors(error: z.ZodError) {
  return error.issues
    .map((issue) => {
      const name = issue.path.join(".") || "env";
      return `- ${name}: ${issue.message}`;
    })
    .join("\n");
}

function formatEnvErrorsFor(name: string, error: z.ZodError) {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? `${name}.${issue.path.join(".")}` : name;
      return `- ${path}: ${issue.message}`;
    })
    .join("\n");
}
