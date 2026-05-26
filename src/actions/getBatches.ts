import { defineAction } from "astro:actions";
import { checkIfSignedInAndGetUserId } from "@utils/actions";
import { db } from "@utils/db";
import { sql } from "kysely";

export const getBatches = defineAction({
  accept: "json",
  handler: async (_input, context) => {
    const userId = await checkIfSignedInAndGetUserId(context.request.headers, context.locals);
    return db
      .selectFrom("description")
      .leftJoin("batch", "batch.id", "description.batch_id")
      .select([
        "description.batch_id as id",
        "batch.title",
        sql<Date>`min(description.created_at)`.as("created_at"),
        sql<number>`count(description.id)`.as("number_of_images"),
      ])
      .where("description.user_id", "=", userId)
      .groupBy(["description.batch_id", "batch.title", "batch.created_at"])
      .orderBy("created_at", "desc")
      .execute();
  },
});
