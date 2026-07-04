import { z } from "zod";

const DASHBOARD_SERVICE_ID = "dashboard-api";

const requiredString = z.string().trim().min(1);
const optionalString = z.preprocess(emptyStringToUndefined, z.string().trim().min(1).optional());
const requiredEmail = z.string().trim().email();
const positivePort = z.coerce.number().int().min(1).max(65535);
const optionalPort = z.preprocess(emptyStringToUndefined, positivePort.optional());
const httpUrl = requiredString.url().refine(
  (value) => {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  },
  { message: "must be an http or https URL" }
);

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
  LOOPAD_OPENAI_API_KEY: requiredString,
  LOOPAD_AWS_REGION: requiredString,
  LOOPAD_AD_EMAIL_FROM_ADDRESS: requiredEmail,
  LOOPAD_AD_EMAIL_SES_CONFIGURATION_SET: optionalString,
  LOOPAD_AD_SMS_CONFIGURATION_SET: optionalString,
  LOOPAD_AD_SMS_ORIGINATION_IDENTITY: optionalString,
  LOOPAD_DEMO_RECIPIENT_DB_HOST: optionalString,
  LOOPAD_DEMO_RECIPIENT_DB_PORT: optionalPort,
  LOOPAD_DEMO_RECIPIENT_DB_DATABASE: optionalString,
  LOOPAD_DEMO_RECIPIENT_DB_USERNAME: optionalString,
  LOOPAD_DEMO_RECIPIENT_DB_PASSWORD: optionalString
});

const parsedEnv = parseEnv(process.env);

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
  openai: {
    apiKey: parsedEnv.LOOPAD_OPENAI_API_KEY
  },
  dispatch: {
    aws: {
      region: parsedEnv.LOOPAD_AWS_REGION,
      emailFromAddress: parsedEnv.LOOPAD_AD_EMAIL_FROM_ADDRESS,
      sesConfigurationSet: parsedEnv.LOOPAD_AD_EMAIL_SES_CONFIGURATION_SET,
      smsConfigurationSet: parsedEnv.LOOPAD_AD_SMS_CONFIGURATION_SET,
      smsOriginationIdentity: parsedEnv.LOOPAD_AD_SMS_ORIGINATION_IDENTITY
    }
  },
  demoRecipientPostgres: {
    host: parsedEnv.LOOPAD_DEMO_RECIPIENT_DB_HOST ?? parsedEnv.LOOPAD_AURORA_HOST,
    port: parsedEnv.LOOPAD_DEMO_RECIPIENT_DB_PORT ?? parsedEnv.LOOPAD_AURORA_PORT,
    database: parsedEnv.LOOPAD_DEMO_RECIPIENT_DB_DATABASE ?? parsedEnv.LOOPAD_AURORA_DATABASE,
    username: parsedEnv.LOOPAD_DEMO_RECIPIENT_DB_USERNAME ?? parsedEnv.LOOPAD_AURORA_USERNAME,
    password: parsedEnv.LOOPAD_DEMO_RECIPIENT_DB_PASSWORD ?? parsedEnv.LOOPAD_AURORA_PASSWORD
  }
});
export type AppEnv = typeof env;

function emptyStringToUndefined(value: unknown) {
  return typeof value === "string" && value.trim() === "" ? undefined : value;
}

function parseEnv(source: NodeJS.ProcessEnv): z.infer<typeof envSchema> {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    throw new Error(`Invalid API server environment:\n${formatEnvErrors(result.error)}`);
  }

  return result.data;
}

function formatEnvErrors(error: z.ZodError) {
  return error.issues
    .map((issue) => {
      const name = issue.path.join(".") || "env";
      return `- ${name}: ${issue.message}`;
    })
    .join("\n");
}
