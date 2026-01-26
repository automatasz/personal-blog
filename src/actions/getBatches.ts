import { defineAction } from "astro:actions";
import { checkIfAdminAndGetUserId } from "@utils/actions";
import { db } from "@utils/db";

export const getBatches = defineAction({
  accept: "json",
  handler: async (_input, context) => {
    const userId = await checkIfAdminAndGetUserId(context.request.headers);
    return db
      .withSchema("keyworder")
      .selectFrom("description")
      .leftJoin("batch", "batch.id", "description.batch_id")
      .select([
        "description.batch_id as id",
        "batch.title",
        db.fn.min("description.created_at").as("created_at"),
        db.fn.count("description.id").as("number_of_images"),
      ])
      .where("description.user_id", "=", userId)
      .where("batch.title", "is not", null)
      .groupBy(["description.batch_id", "batch.title", "batch.created_at"])
      .orderBy("created_at", "desc")
      .execute();
  },
});
