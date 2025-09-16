import { defineAction } from "astro:actions";
import { z } from "astro:schema";
import { checkIfAdminAndGetUserId } from "@utils/actions";
import { db } from "@utils/db";

export const getBatch = defineAction({
  accept: "json",
  input: z.object({
    batchId: z.string().uuid(),
  }),
  handler: async (input, context) => {
    const userId = await checkIfAdminAndGetUserId(context.request.headers);
    const results = await db
      .withSchema("keyworder")
      .selectFrom("description")
      .selectAll()
      .where("batch_id", "=", input.batchId)
      .where("user_id", "=", userId)
      .execute();

    return results;
  },
});
