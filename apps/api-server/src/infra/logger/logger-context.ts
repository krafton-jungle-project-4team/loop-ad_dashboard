import { AsyncLocalStorage } from "node:async_hooks";
import { env } from "../env/env.js";

type LoggerContextValue = boolean | number | string;
type LoggerContextFields = Record<string, LoggerContextValue | null | undefined>;
type LogLevel = "error" | "info" | "warn";

const loggerContext = new AsyncLocalStorage<Record<string, LoggerContextValue>>();

export function runWithLoggerContext<T>(fields: LoggerContextFields, callback: () => T) {
  return loggerContext.run(removeEmptyFields(fields), callback);
}

export function assignLoggerContext(fields: LoggerContextFields) {
  const context = loggerContext.getStore();

  if (!context) {
    return;
  }

  Object.assign(context, removeEmptyFields(fields));
}

export function getLoggerContext() {
  return { ...(loggerContext.getStore() ?? {}) };
}

export function logWithContext(level: LogLevel, message: string, fields: LoggerContextFields = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service: env.serviceId,
    message,
    ...getLoggerContext(),
    ...removeEmptyFields(fields)
  };
  const line = JSON.stringify(entry);

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}

function removeEmptyFields(fields: LoggerContextFields): Record<string, LoggerContextValue> {
  return Object.fromEntries(
    Object.entries(fields).filter((entry): entry is [string, LoggerContextValue] => {
      const value = entry[1];
      return value !== null && value !== undefined;
    })
  );
}
