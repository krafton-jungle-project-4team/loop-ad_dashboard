import { Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";
import { z } from "zod";
import { createTxDb, DEMO_RECIPIENT_PG_POOL } from "../../../infra/database/index.js";
import { findDemoDispatchRecipient } from "../database/__generated__/ad-execution.queries.js";

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

/** 별도 read-only DB connection으로 demo recipient read model을 조회합니다. */
@Injectable()
export class DemoDbRecipientDirectory extends RecipientDirectory {
  private readonly db: ReturnType<typeof createTxDb>;

  constructor(
    @Inject(DEMO_RECIPIENT_PG_POOL)
    pool: Pool
  ) {
    super();
    this.db = createTxDb(pool);
  }

  async findRecipient(userId: string): Promise<DispatchRecipient | null> {
    const row = await this.db.query(findDemoDispatchRecipient, { userId }).singleOrNull();

    return row ? dispatchRecipientSchema.parse(row) : null;
  }
}
