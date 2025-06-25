import { ActionError, defineAction } from "astro:actions";
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
      .execute();

    if (results.some(description => description.user_id !== userId)) {
      throw new ActionError({
        code: "UNAUTHORIZED",
        message: "You do not have access to these descriptions",
      });
    }

    return results;
  },
});
