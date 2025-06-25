import { defineAction } from "astro:actions";
import { checkIfAdminAndGetUserId } from "@utils/actions";
import { db } from "@utils/db";

export const getBatches = defineAction({
  accept: "json",
  handler: async (input, context) => {
    const userId = await checkIfAdminAndGetUserId(context.request.headers);
    return db
      .withSchema("keyworder")
      .selectFrom("description")
      .select(["batch_id", db.fn.min("created_at").as("created_at")])
      .where("user_id", "=", userId)
      .groupBy("batch_id")
      .orderBy("created_at", "desc")
      .execute();
  },
});
