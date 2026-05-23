import { defineAction } from "astro:actions";
import { z } from "astro:schema";
import { sql } from "kysely";
import { db } from "@utils/db";
import { checkIfSignedInAndGetUserId, requireAdmin } from "@utils/actions";

const COSTS_KEY = "credit_costs";

export const getAppSettings = defineAction({
  handler: async (input, context) => {
    await checkIfSignedInAndGetUserId(context.request.headers);

    const row = await db
      .withSchema("keyworder")
      .selectFrom("app_settings")
      .select(["key", "value"])
      .where("key", "=", COSTS_KEY)
      .executeTakeFirst();

    if (!row) {
      const fallback = await import("@/constants/credit-costs");
      return {
        creditCosts: {
          upload: fallback.CREDIT_COST_UPLOAD,
          describe: fallback.CREDIT_COST_DESCRIBE,
          regenerate: fallback.CREDIT_COST_REGENERATE,
        },
      };
    }

    const v = row.value as Record<string, number>;

    return {
      creditCosts: {
        upload: typeof v.upload === "number" ? v.upload : 1,
        describe: typeof v.describe === "number" ? v.describe : 7,
        regenerate: typeof v.regenerate === "number" ? v.regenerate : 5,
      },
    };
  },
});

export const updateAppSettings = defineAction({
  input: z.object({
    creditCosts: z.object({
      upload: z.number().int().min(0),
      describe: z.number().int().min(0),
      regenerate: z.number().int().min(0),
    }),
  }),
  handler: async (input, context) => {
    const userId = await requireAdmin(context.request.headers);

    const newValue = {
      upload: input.creditCosts.upload,
      describe: input.creditCosts.describe,
      regenerate: input.creditCosts.regenerate,
    };

    await sql`
      INSERT INTO keyworder."app_settings" ("key", "value", "updated_by", "updated_at")
      VALUES (${COSTS_KEY}, ${JSON.stringify(newValue)}::jsonb, ${userId}, now())
      ON CONFLICT ("key") DO UPDATE SET
        "value" = ${JSON.stringify(newValue)}::jsonb,
        "updated_by" = ${userId},
        "updated_at" = now()
    `.execute(db);

    return { success: true };
  },
});
