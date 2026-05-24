import { defineAction } from "astro:actions";
import { z } from "astro:schema";
import { checkIfSignedInAndGetUserId } from "@utils/actions";
import { db } from "@utils/db";
import { sql } from "kysely";

export const checkEventComplete = defineAction({
  accept: "json",
  input: z.object({
    batchId: z.string().uuid(),
  }),
  handler: async (input, context) => {
    const userId = await checkIfSignedInAndGetUserId(context.request.headers);
    const { successCount, totalCount } = await db
      .selectFrom("description")
      .select(({ fn }) => [
        fn.count<number>(sql<string>`CASE WHEN "result" IS NOT NULL THEN 1 END`).as("successCount"),
        fn.count<number>("id").as("totalCount"),
      ])
      .where("batch_id", "=", input.batchId)
      .where("user_id", "=", userId)
      .executeTakeFirstOrThrow();

    console.log(input.batchId, "check batch", "total success", successCount, "out of", totalCount);

    return {
      complete: Number(totalCount) > 0 ? successCount === totalCount : false,
    };
  },
});
