import { defineAction } from "astro:actions";
import { z } from "astro:schema";
import { checkIfSignedInAndGetUserId } from "@utils/actions";
import { db } from "@utils/db";

export const getBatch = defineAction({
  accept: "json",
  input: z.object({
    batchId: z.string().uuid(),
  }),
  handler: async (input, context) => {
    const userId = await checkIfSignedInAndGetUserId(context.request.headers);
    const descriptions = await db
      .withSchema("keyworder")
      .selectFrom("description")
      .selectAll()
      .where("batch_id", "=", input.batchId)
      .where("user_id", "=", userId)
      .execute();

    const batch = await db
      .withSchema("keyworder")
      .selectFrom("batch")
      .select("title")
      .where("id", "=", input.batchId)
      .executeTakeFirst();

    return { descriptions,
      batch };
  },
});
