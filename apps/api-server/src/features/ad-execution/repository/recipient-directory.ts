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

const hardcodedDemoContacts = [
  {
    email: "demo-recipient-1@looapd.org",
    phoneNumber: "+821012345001"
  },
  {
    email: "demo-recipient-2@looapd.org",
    phoneNumber: "+821012345002"
  },
  {
    email: "demo-recipient-3@looapd.org",
    phoneNumber: "+821012345003"
  }
] as const;

/** 임시 demo recipient allowlist를 user_id에 매핑합니다. */
@Injectable()
export class HardcodedDemoRecipientDirectory extends RecipientDirectory {
  async findRecipient(userId: string): Promise<DispatchRecipient | null> {
    // TODO: demo recipient table이 분석 DB에 확정되면 PgTyped repository 조회로 교체한다.
    const contact = pickDemoContact(userId);

    return dispatchRecipientSchema.parse({
      userId,
      email: contact.email,
      phoneNumber: contact.phoneNumber,
      emailOptedIn: true,
      smsOptedIn: true
    });
  }
}

function pickDemoContact(userId: string) {
  const index = hashString(userId) % hardcodedDemoContacts.length;

  return hardcodedDemoContacts[index] ?? hardcodedDemoContacts[0];
}

function hashString(value: string) {
  let hash = 0;

  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) % hardcodedDemoContacts.length;
  }

  return hash;
}
