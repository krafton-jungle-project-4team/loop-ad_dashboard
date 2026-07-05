import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { env, type DemoDispatchRecipientConfig } from "../../../infra/env/env.js";

const requiredStringSchema = z.string().trim().min(1);
const dispatchRecipientSchema = z.object({
  userId: requiredStringSchema,
  email: requiredStringSchema,
  phoneNumber: requiredStringSchema
});

export type DispatchRecipient = z.infer<typeof dispatchRecipientSchema>;

/** user_id를 발송 가능한 demo recipient 연락처로 해석하는 directory입니다. */
export abstract class RecipientDirectory {
  abstract listRecipients(): Promise<readonly DispatchRecipient[]>;
  abstract findRecipient(userId: string): Promise<DispatchRecipient | null>;
}

/** env로 관리되는 demo recipient Map을 가상의 demo recipient DB처럼 사용합니다. */
@Injectable()
export class EnvDemoRecipientDirectory extends RecipientDirectory {
  private readonly recipients: readonly DispatchRecipient[];
  private readonly recipientsByUserId: ReadonlyMap<string, DispatchRecipient>;

  constructor() {
    super();
    this.recipients = env.demoDispatchRecipients.map(toDispatchRecipient);
    this.recipientsByUserId = toRecipientMap(this.recipients);
  }

  async listRecipients(): Promise<readonly DispatchRecipient[]> {
    return this.recipients;
  }

  async findRecipient(userId: string): Promise<DispatchRecipient | null> {
    return this.recipientsByUserId.get(userId) ?? null;
  }
}

function toDispatchRecipient(recipient: DemoDispatchRecipientConfig): DispatchRecipient {
  return dispatchRecipientSchema.parse({
    userId: recipient.userId,
    email: recipient.email,
    phoneNumber: recipient.phoneNumber
  });
}

function toRecipientMap(recipients: readonly DispatchRecipient[]) {
  return new Map(recipients.map((recipient) => [recipient.userId, recipient]));
}
