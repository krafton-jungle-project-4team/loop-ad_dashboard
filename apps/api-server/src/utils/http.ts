import crypto from "node:crypto";
import type express from "express";

export function projectId(request: express.Request, defaultProjectId: string) {
  return typeof request.query.projectId === "string" && request.query.projectId
    ? request.query.projectId
    : defaultProjectId;
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
