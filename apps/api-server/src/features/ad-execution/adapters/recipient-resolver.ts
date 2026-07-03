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
export class UnconfiguredRecipientResolver extends RecipientResolver {
  async resolve(): Promise<RecipientResolution | null> {
    return null;
  }
}
