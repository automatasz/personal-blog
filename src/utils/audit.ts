import { db } from "./db";

export async function createCreditAudit(
  userId: string,
  amount: number,
  action: string,
  metadata?: Record<string, unknown>,
) {
  await db
    .withSchema("keyworder")
    .insertInto("credit_audit")
    .values({
      user_id: userId,
      amount,
      action,
      metadata,
    })
    .execute();
}
