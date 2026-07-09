import { Buffer } from "node:buffer";
import { createHmac, timingSafeEqual } from "node:crypto";
import { LoopAdAttributionSchema } from "@loopad/shared";
import { z } from "zod";
import { env } from "../../../infra/env/env.js";

const OPEN_PIXEL_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

const OpenPixelTokenPayloadSchema = z.object({
  recipient_user_id: z.string().min(1),
  event_name: z.string().trim().min(1),
  attribution: LoopAdAttributionSchema,
  expires_at: z.number().int().positive()
});

export type OpenPixelTokenPayload = z.infer<typeof OpenPixelTokenPayloadSchema>;

export function createOpenPixelTokenPayload(
  input: Omit<OpenPixelTokenPayload, "expires_at">,
  now = new Date()
): OpenPixelTokenPayload {
  return {
    ...input,
    event_name: input.event_name.trim(),
    expires_at: epochSeconds(now) + OPEN_PIXEL_TOKEN_TTL_SECONDS
  };
}

export function encodeOpenPixelToken(payload: OpenPixelTokenPayload, secret = openPixelSecret()) {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${sign(body, secret)}`;
}

export function decodeOpenPixelToken(
  token: string,
  secret = openPixelSecret(),
  now = new Date()
): OpenPixelTokenPayload | null {
  const parts = token.split(".");

  if (parts.length !== 2) {
    return null;
  }

  const [body, signature] = parts;

  if (!body || !signature || !isValidSignature(body, signature, secret)) {
    return null;
  }

  const payload = parsePayload(body);

  if (!payload || payload.expires_at < epochSeconds(now)) {
    return null;
  }

  return payload;
}

export function openPixelSecret() {
  return env.openPixel.signingSecret;
}

function parsePayload(body: string): OpenPixelTokenPayload | null {
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as unknown;
    const result = OpenPixelTokenPayloadSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

function isValidSignature(body: string, signature: string, secret: string) {
  const actual = Buffer.from(signature, "base64url");
  const expected = Buffer.from(sign(body, secret), "base64url");

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function sign(body: string, secret: string) {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

function epochSeconds(date: Date) {
  return Math.floor(date.getTime() / 1000);
}
