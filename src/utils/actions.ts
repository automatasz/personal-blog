import { ActionError } from "astro:actions";
import { auth, initAuth } from "./auth";
import { db } from "./db";
import {
  CREDIT_COST_UPLOAD,
  CREDIT_COST_DESCRIBE,
  CREDIT_COST_REGENERATE,
} from "@/constants/credit-costs";
import { GOOGLE_AUTH_CLIENT_ID, GOOGLE_AUTH_CLIENT_SECRET, CF_PAGES_URL } from "astro:env/server";

function ensureAuth(locals?: any) {
  const d1 = locals?.runtime?.env?.DB;
  if (d1) {
    initAuth(d1, {
      GOOGLE_AUTH_CLIENT_ID,
      GOOGLE_AUTH_CLIENT_SECRET,
      CF_PAGES_URL,
    });
  }
}

export async function checkIfSignedInAndGetUserId(headers: Headers, locals?: any) {
  ensureAuth(locals);
  const session = await auth.api.getSession({ headers });

  if (!session?.session) {
    throw new ActionError({
      code: "UNAUTHORIZED",
      message: "You must be signed in",
    });
  }

  return session.user.id;
}

export async function requireAdmin(headers: Headers, locals?: any) {
  ensureAuth(locals);
  const session = await auth.api.getSession({ headers });

  if (!session?.session) {
    throw new ActionError({
      code: "UNAUTHORIZED",
      message: "You must be signed in",
    });
  }

  if ((session.user as any).role !== "admin") {
    throw new ActionError({
      code: "FORBIDDEN",
      message: "You do not have permission to access this resource",
    });
  }

  return session.user.id;
}

export async function getCreditCosts() {
  const row = await db
    .selectFrom("app_settings")
    .select("value")
    .where("key", "=", "credit_costs")
    .executeTakeFirst();

  if (!row) {
    return {
      upload: CREDIT_COST_UPLOAD,
      describe: CREDIT_COST_DESCRIBE,
      regenerate: CREDIT_COST_REGENERATE,
    };
  }

  const value = JSON.parse(row.value) as Record<string, number>;

  return {
    upload: typeof value.upload === "number" ? value.upload : CREDIT_COST_UPLOAD,
    describe: typeof value.describe === "number" ? value.describe : CREDIT_COST_DESCRIBE,
    regenerate: typeof value.regenerate === "number" ? value.regenerate : CREDIT_COST_REGENERATE,
  };
}
export async function deductCredits(
  userId: string,
  amount: number,
  action: string,
  metadata?: Record<string, unknown>,
) {
  await db.transaction().execute(async (trx) => {
    const user = await trx
      .selectFrom("user")
      .select("credits")
      .where("id", "=", userId)
      .executeTakeFirst();

    if (!user || user.credits < amount) {
      throw new ActionError({
        code: "FORBIDDEN",
        message: "Insufficient credits. You need more credits to use this feature.",
      });
    }

    await trx
      .updateTable("user")
      .set(eb => ({
        credits: eb("credits", "-", amount),
      }))
      .where("id", "=", userId)
      .executeTakeFirst();

    await trx
      .insertInto("credit_audit")
      .values({
        id: crypto.randomUUID(),
        user_id: userId,
        amount: -amount,
        action,
        metadata: metadata ? JSON.stringify(metadata) : null,
      })
      .execute();
  });
}
