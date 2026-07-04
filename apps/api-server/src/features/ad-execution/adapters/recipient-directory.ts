import { Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";
import { z } from "zod";
import { DEMO_RECIPIENT_PG_POOL } from "../../../infra/database/index.js";

const requiredStringSchema = z.string().trim().min(1);
const nullableContactSchema = z.string().trim().nullable();
const demoRecipientRowSchema = z.object({
  userId: requiredStringSchema,
  email: nullableContactSchema,
  phoneNumber: nullableContactSchema,
  emailOptedIn: z.boolean(),
  smsOptedIn: z.boolean()
});

export type DispatchRecipient = z.infer<typeof demoRecipientRowSchema>;

/** user_id를 발송 가능한 demo recipient 연락처로 해석하는 directory입니다. */
export abstract class RecipientDirectory {
  abstract findRecipient(userId: string): Promise<DispatchRecipient | null>;
}

/** 별도 read-only DB connection으로 demo recipient view를 조회합니다. */
@Injectable()
export class DemoDbRecipientDirectory extends RecipientDirectory {
  constructor(
    @Inject(DEMO_RECIPIENT_PG_POOL)
    private readonly pool: Pool
  ) {
    super();
  }

  async findRecipient(userId: string): Promise<DispatchRecipient | null> {
    const result = await this.pool.query(
      `
        SELECT
          user_id AS "userId",
          email,
          phone_number AS "phoneNumber",
          COALESCE(email_opted_in, false) AS "emailOptedIn",
          COALESCE(sms_opted_in, false) AS "smsOptedIn"
        FROM demo_recipients
        WHERE user_id = $1
        LIMIT 1
      `,
      [userId]
    );
    const row = result.rows[0];

    return row ? demoRecipientRowSchema.parse(row) : null;
  }
}
