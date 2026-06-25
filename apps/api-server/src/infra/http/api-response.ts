import crypto from "node:crypto";

export function projectId(value: unknown, defaultProjectId: string) {
  return typeof value === "string" && value ? value : defaultProjectId;
}

export function success<T>(data: T) {
  return { requestId: crypto.randomUUID(), data };
}

export function errorResponse(error: unknown) {
  return {
    requestId: crypto.randomUUID(),
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: error instanceof Error ? error.message : "API request failed."
    }
  };
}
