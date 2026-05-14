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

export async function deductUserCredits(userId: string, amount: number) {
  const result = await db
    .withSchema("keyworder")
    .updateTable("user")
    .set((eb) => ({
      credits: eb("credits", "-", amount),
    }))
    .where("id", "=", userId)
    .where("credits", ">=", amount)
    .executeTakeFirst();

  if (Number(result.numUpdatedRows) === 0) {
    throw new ActionError({
      code: "FORBIDDEN",
      message: "Insufficient credits. You need more credits to use this feature.",
    });
  }
}
