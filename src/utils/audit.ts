import { db } from "./db";

export async function createCreditAudit(
  userId: string,
  amount: number,
  action: string,
  metadata?: Record<string, unknown>,
) {
  await db
    .insertInto("credit_audit")
    .values({
      id: crypto.randomUUID(),
      user_id: userId,
      amount,
      action,
      metadata: metadata ? JSON.stringify(metadata) : null,
    })
    .execute();
}
