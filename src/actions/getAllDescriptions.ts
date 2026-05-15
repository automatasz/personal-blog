import { defineAction } from "astro:actions";
import { checkIfAdminAndGetUserId } from "@utils/actions";
import { db } from "@utils/db";

export const getAllDescriptions = defineAction({
  handler: async (input, context) => {
    const userId = await checkIfAdminAndGetUserId(context.request.headers);
    const results = await db
      .withSchema("keyworder")
      .selectFrom("description")
      .selectAll()
      .where("user_id", "=", userId)
      .orderBy("created_at desc")
      .execute();

    return results;
  },
});
