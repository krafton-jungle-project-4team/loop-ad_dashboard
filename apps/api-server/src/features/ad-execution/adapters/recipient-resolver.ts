import { Injectable } from "@nestjs/common";
import type { DispatchChannel } from "../domain/index.js";

export interface RecipientResolution {
  recipient: string;
}

export interface ResolveRecipientInput {
  projectId: string;
  userId: string;
  channel: DispatchChannel;
}

export abstract class RecipientResolver {
  abstract resolve(input: ResolveRecipientInput): Promise<RecipientResolution | null>;
}

@Injectable()
export class MockRecipientResolver extends RecipientResolver {
  async resolve(input: ResolveRecipientInput): Promise<RecipientResolution | null> {
    if (!input.userId) {
      return null;
    }

    return {
      recipient:
        input.channel === "email"
          ? `${toSafeLocalPart(input.userId)}@example.invalid`
          : toMockPhoneNumber(`${input.projectId}:${input.userId}`)
    };
  }
}

function toSafeLocalPart(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._+-]/g, ".")
    .replace(/\.+/g, ".")
    .replace(/^\.+|\.+$/g, "");

  return normalized || "recipient";
}

function toMockPhoneNumber(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 0x45d9f3b) >>> 0;
  }

  return `+1555${String(hash % 10_000_000).padStart(7, "0")}`;
}
