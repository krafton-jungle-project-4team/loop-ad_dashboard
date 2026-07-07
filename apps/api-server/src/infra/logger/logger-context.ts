import { AsyncLocalStorage } from "node:async_hooks";
import type { LoggerService } from "@nestjs/common";
import pino from "pino";
import { env } from "../env/env.js";

type LoggerContextFields = Record<string, unknown>;
type LogLevel = "debug" | "error" | "info" | "warn";
type LogRecord = Record<string, unknown>;
type LogMethod = (event: string, record?: LogRecord) => void;

const loggerContext = new AsyncLocalStorage<LogRecord>();
const LOG_LEVEL: LogLevel = "debug";

// ECS: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-environment-variables.html
const pinoLogger = pino(
  {
    base: {
      service: env.serviceId,
      environment: env.env,
      version: process.env.npm_package_version,
      region: process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION,
      nodeVersion: process.version,
      runtime: process.env.AWS_EXECUTION_ENV ?? "node"
    },
    formatters: {
      level(label) {
        return { level: label };
      }
    },
    level: LOG_LEVEL,
    messageKey: "message",
    serializers: {
      err: pino.stdSerializers.err
    },
    timestamp: () => `,"timestamp":${JSON.stringify(new Date().toISOString())}`
  },
  {
    write: writePinoLine
  }
);

export const log = Object.freeze({
  assignContext,
  debug: createLogMethod("debug"),
  error: createLogMethod("error"),
  info: createLogMethod("info"),
  warn: createLogMethod("warn")
});

export function createNestLogger(): LoggerService {
  return {
    debug: (message: unknown, ...optionalParams: unknown[]) => {
      writeNestLog("debug", "nest_debug", message, optionalParams);
    },
    error: (message: unknown, ...optionalParams: unknown[]) => {
      writeNestLog("error", "nest_error", message, optionalParams);
    },
    fatal: (message: unknown, ...optionalParams: unknown[]) => {
      writeNestLog("error", "nest_fatal", message, optionalParams);
    },
    log: (message: unknown, ...optionalParams: unknown[]) => {
      writeNestLog("info", "nest_log", message, optionalParams);
    },
    verbose: (message: unknown, ...optionalParams: unknown[]) => {
      writeNestLog("debug", "nest_verbose", message, optionalParams);
    },
    warn: (message: unknown, ...optionalParams: unknown[]) => {
      writeNestLog("warn", "nest_warn", message, optionalParams);
    }
  };
}

export function durationMs(startedAt: number) {
  return Date.now() - startedAt;
}

export function LogContextScope(): MethodDecorator {
  return function (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const original = descriptor.value as
      | ((this: unknown, ...args: unknown[]) => unknown)
      | undefined;

    if (!original) {
      return;
    }

    descriptor.value = function (this: unknown, ...args: unknown[]) {
      const className = target.constructor.name;
      const functionName = String(propertyKey);

      return withContext({ operation: `${className}.${functionName}` }, () => {
        const startedAt = Date.now();

        try {
          const result = original.apply(this, args);

          if (isPromiseLike(result)) {
            return result.catch((error: unknown) => {
              log.error("failed", { err: error, durationMs: durationMs(startedAt) });
              throw error;
            });
          }

          return result;
        } catch (error) {
          log.error("failed", { err: error, durationMs: durationMs(startedAt) });
          throw error;
        }
      });
    };
  };
}

function assignContext(fields: LoggerContextFields) {
  const shouldStartContext = isNonEmptyString(fields.requestId);
  const currentContext = loggerContext.getStore();
  const context = shouldStartContext ? {} : (currentContext ?? {});

  applyContextFields(context, fields);

  if (shouldStartContext || !currentContext) {
    loggerContext.enterWith(context);
  }
}

function withContext<T>(fields: LoggerContextFields, callback: () => T): T {
  const context = { ...(loggerContext.getStore() ?? {}) };
  applyContextFields(context, fields);

  return loggerContext.run(context, callback);
}

function applyContextFields(context: LogRecord, fields: LoggerContextFields) {
  for (const [key, value] of Object.entries(fields)) {
    if (value === null || value === undefined) {
      delete context[key];
    } else {
      context[key] = value;
    }
  }
}

function getLoggerContext() {
  return { ...(loggerContext.getStore() ?? {}) };
}

function createLogMethod(level: LogLevel): LogMethod {
  return (event: string, record: LogRecord = {}) => {
    if (!pinoLogger.isLevelEnabled(level)) {
      return;
    }

    pinoLogger[level]({
      ...getLoggerContext(),
      event,
      ...removeUndefinedFields(record)
    });
  };
}

function removeUndefinedFields(fields: LogRecord): LogRecord {
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));
}

function writeNestLog(level: LogLevel, event: string, message: unknown, optionalParams: unknown[]) {
  const { nestContext, trace, nestParams } = parseNestOptionalParams(level, optionalParams);

  log[level](event, {
    message: formatNestMessage(message),
    nestContext,
    trace,
    nestParams,
    err: message instanceof Error ? message : undefined
  });
}

function parseNestOptionalParams(level: LogLevel, optionalParams: unknown[]) {
  if (optionalParams.length === 0) {
    return {};
  }

  const remaining = [...optionalParams];
  const nestContext = removeTrailingString(remaining);
  const trace = level === "error" ? removeTrailingString(remaining) : undefined;

  return {
    nestContext,
    trace,
    nestParams: remaining.length > 0 ? remaining.map(formatNestMessage) : undefined
  };
}

function removeTrailingString(values: unknown[]): string | undefined {
  const last = values.at(-1);

  if (!isNonEmptyString(last)) {
    return undefined;
  }

  values.pop();
  return last;
}

function formatNestMessage(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (value instanceof Error) {
    return value.message;
  }

  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function isLogLevel(value: unknown): value is LogLevel {
  return value === "debug" || value === "error" || value === "info" || value === "warn";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isPromiseLike(value: unknown): value is Promise<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "catch" in value &&
    typeof value.catch === "function"
  );
}

function writePinoLine(line: string) {
  const output = line.endsWith("\n") ? line.slice(0, -1) : line;
  const level = readLineLevel(output);

  if (level === "error") {
    console.error(output);
    return;
  }

  if (level === "warn") {
    console.warn(output);
    return;
  }

  console.log(output);
}

function readLineLevel(line: string): LogLevel | undefined {
  try {
    const value = JSON.parse(line) as { level?: unknown };
    return isLogLevel(value.level) ? value.level : undefined;
  } catch {
    return undefined;
  }
}
