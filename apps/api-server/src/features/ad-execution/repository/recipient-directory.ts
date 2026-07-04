import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { env, type DemoDispatchRecipientConfig } from "../../../infra/env/env.js";

const requiredStringSchema = z.string().trim().min(1);
const nullableContactSchema = z.string().trim().nullable();
const dispatchRecipientSchema = z.object({
  userId: requiredStringSchema,
  email: nullableContactSchema,
  phoneNumber: nullableContactSchema,
  emailOptedIn: z.boolean(),
  smsOptedIn: z.boolean()
});

export type DispatchRecipient = z.infer<typeof dispatchRecipientSchema>;

/** user_id를 발송 가능한 demo recipient 연락처로 해석하는 directory입니다. */
export abstract class RecipientDirectory {
  abstract findRecipient(userId: string): Promise<DispatchRecipient | null>;
}

/** env로 관리되는 demo recipient Map을 가상의 recipient DB처럼 사용합니다. */
@Injectable()
export class EnvDemoRecipientDirectory extends RecipientDirectory {
  private readonly recipientsByUserId: ReadonlyMap<string, DispatchRecipient>;

  constructor(recipients: readonly DemoDispatchRecipientConfig[] = env.demoDispatchRecipients) {
    super();
    this.recipientsByUserId = toRecipientMap(recipients);
  }

  async findRecipient(userId: string): Promise<DispatchRecipient | null> {
    return this.recipientsByUserId.get(userId) ?? null;
  }
}

function toRecipientMap(recipients: readonly DemoDispatchRecipientConfig[]) {
  return new Map(
    recipients.map((recipient) => [
      recipient.userId,
      dispatchRecipientSchema.parse({
        userId: recipient.userId,
        email: recipient.email,
        phoneNumber: recipient.phoneNumber,
        emailOptedIn: true,
        smsOptedIn: true
      })
    ])
  );
}
