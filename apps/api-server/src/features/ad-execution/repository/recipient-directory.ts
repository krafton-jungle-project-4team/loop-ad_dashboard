import { Injectable } from "@nestjs/common";
import { z } from "zod";

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

const demoDispatchRecipientsByUserId = toRecipientMap([
  {
    userId: "user-1",
    email: "demo-recipient-1@loop-ad.org",
    phoneNumber: "+821012345001"
  },
  {
    userId: "user-2",
    email: "demo-recipient-2@loop-ad.org",
    phoneNumber: "+821012345002"
  },
  {
    userId: "user-3",
    email: "demo-recipient-3@loop-ad.org",
    phoneNumber: "+821012345003"
  }
] as const);

/** 코드 상수 Map을 가상의 demo recipient DB처럼 사용합니다. */
@Injectable()
export class InMemoryDemoRecipientDirectory extends RecipientDirectory {
  private readonly recipientsByUserId: ReadonlyMap<string, DispatchRecipient>;

  constructor(
    recipientsByUserId: ReadonlyMap<string, DispatchRecipient> = demoDispatchRecipientsByUserId
  ) {
    super();
    this.recipientsByUserId = recipientsByUserId;
  }

  async findRecipient(userId: string): Promise<DispatchRecipient | null> {
    return this.recipientsByUserId.get(userId) ?? null;
  }
}

function toRecipientMap(
  recipients: ReadonlyArray<{
    userId: string;
    email: string;
    phoneNumber: string;
  }>
) {
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
