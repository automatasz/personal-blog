import { defineAction } from "astro:actions";
import { z } from "astro:schema";
import { checkIfAdminAndGetUserId } from "@utils/actions";
import { db } from "@utils/db";

export const checkEventComplete = defineAction({
  accept: "json",
  input: z.object({
    batchId: z.string().uuid(),
  }),
  handler: async (input, context) => {
    const userId = await checkIfAdminAndGetUserId(context.request.headers);
    const { successCount, totalCount } = await db
      .withSchema("keyworder")
      .selectFrom("description")
      .select(({ fn }) => [
        fn.count<number>("result").filterWhere("result", "is not", null).as("successCount"),
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
