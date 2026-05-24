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
    const rows = await db
      .selectFrom("description")
      .selectAll()
      .where("batch_id", "=", input.batchId)
      .where("user_id", "=", userId)
      .execute();

    const descriptions = rows.map(r => ({
      ...r,
      keywords: r.keywords ? JSON.parse(r.keywords) as string[] : null,
    }));

    const batch = await db
      .selectFrom("batch")
      .select("title")
      .where("id", "=", input.batchId)
      .executeTakeFirst();

    return { descriptions,
      batch };
  },
});
