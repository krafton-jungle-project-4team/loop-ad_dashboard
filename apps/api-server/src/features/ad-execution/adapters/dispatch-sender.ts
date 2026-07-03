import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import type { DispatchChannel } from "../domain/index.js";

export interface DispatchSendInput {
  channel: DispatchChannel;
  recipient: string;
  subject: string;
  body: string;
  redirectUrl: string;
}

export interface DispatchSendResult {
  provider: string;
  providerMessageId: string;
}

export abstract class DispatchSender {
  abstract readonly providerName: string;
  abstract send(input: DispatchSendInput): Promise<DispatchSendResult>;
}

@Injectable()
export class MockDispatchSender extends DispatchSender {
  override readonly providerName = "mock";

  async send(input: DispatchSendInput): Promise<DispatchSendResult> {
    if (!input.recipient.trim()) {
      throw new Error("Recipient is empty.");
    }

    return {
      provider: this.providerName,
      providerMessageId: `mock_${input.channel}_${randomUUID()}`
    };
  }
}
