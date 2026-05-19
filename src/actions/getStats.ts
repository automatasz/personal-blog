import { defineAction } from "astro:actions";
import { checkIfSignedInAndGetUserId, getCreditCosts } from "@utils/actions";
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

    const user = await db
      .withSchema("keyworder")
      .selectFrom("user")
      .select("credits")
      .where("id", "=", userId)
      .executeTakeFirstOrThrow();

    const creditCosts = await getCreditCosts();

    return {
      batchCount: Number(batchCount),
      imageCount: Number(imageCount),
      tokenSum: Number(tokenSum),
      creditsRemaining: Number(user.credits),
      creditCosts,
    };
  },
});
