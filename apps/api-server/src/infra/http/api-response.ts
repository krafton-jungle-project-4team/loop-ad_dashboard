import crypto from "node:crypto";

export function success<T>(data: T) {
  return { requestId: crypto.randomUUID(), data };
}

export function errorResponse(input: { code: string; message: string }) {
  return {
    requestId: crypto.randomUUID(),
    error: {
      code: input.code,
      message: input.message
    }
  };
}
