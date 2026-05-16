import { ActionError } from "astro:actions";
import { auth } from "./auth";
import { db } from "./db";

export async function checkIfSignedInAndGetUserId(headers: Headers) {
  const session = await auth.api.getSession({ headers });

  if (!session?.session) {
    throw new ActionError({
      code: "UNAUTHORIZED",
      message: "You must be signed in",
    });
  }

  return session.user.id;
}

export async function deductCredits(
  userId: string,
  amount: number,
  action: string,
  metadata?: Record<string, unknown>,
) {
  await db.transaction().execute(async (trx) => {
    const user = await trx
      .withSchema("keyworder")
      .selectFrom("user")
      .select("credits")
      .where("id", "=", userId)
      .forUpdate()
      .executeTakeFirst();

    if (!user || user.credits < amount) {
      throw new ActionError({
        code: "FORBIDDEN",
        message: "Insufficient credits. You need more credits to use this feature.",
      });
    }

    await trx
      .withSchema("keyworder")
      .updateTable("user")
      .set(eb => ({
        credits: eb("credits", "-", amount),
      }))
      .where("id", "=", userId)
      .executeTakeFirst();

    await trx
      .withSchema("keyworder")
      .insertInto("credit_audit")
      .values({
        user_id: userId,
        amount: -amount,
        action,
        metadata: metadata ?? null,
      })
      .execute();
  });
}
