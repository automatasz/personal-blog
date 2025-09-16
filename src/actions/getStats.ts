import { defineAction } from "astro:actions";
import { checkIfSignedInAndGetUserId } from "@utils/actions";
import { db } from "@utils/db";

export const getStats = defineAction({
  handler: async (input, context) => {
    const userId = await checkIfSignedInAndGetUserId(context.request.headers);
    const { batchCount } = await db
      .withSchema("keyworder")
      .selectFrom("description")
      .select(({ fn }) => [
        fn.count<number>("batch_id").distinct().as("batchCount"),
      ])
      .where("user_id", "=", userId)
      .executeTakeFirstOrThrow();

    const { imageCount } = await db
      .withSchema("keyworder")
      .selectFrom("description")
      .select(({ fn }) => [
        fn.count<number>("file_id").as("imageCount"),
      ])
      .where("user_id", "=", userId)
      .executeTakeFirstOrThrow();

    const { tokenSum } = await db
      .withSchema("keyworder")
      .selectFrom("description")
      .select(({ fn }) => [
        fn.sum<number>("tokens_used").as("tokenSum"),
      ])
      .where("user_id", "=", userId)
      .executeTakeFirstOrThrow();

    console.log(tokenSum);

    return {
      batchCount: Number(batchCount),
      imageCount: Number(imageCount),
      tokenSum: Number(tokenSum),
    };
  },
});
