import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";
import { db } from "@utils/db";
import { checkIfSignedInAndGetUserId } from "@utils/actions";
import { CREDIT_COST_REGENERATE } from "@/constants/credit-costs";

export const updateDescription = defineAction({
  input: z.object({
    descriptionId: z.string().uuid(),
    title: z.string().optional(),
    description: z.string().optional(),
    keywords: z.array(z.string()).optional(),
  }),
  handler: async (input, context) => {
    const userId = await checkIfSignedInAndGetUserId(context.request.headers, context.locals);

    const updateData: {
      title?: string | null;
      description?: string | null;
      keywords?: string | null;
    } = {};

    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.keywords !== undefined) updateData.keywords = JSON.stringify(input.keywords);

    const result = await db.updateTable("description")
      .set(updateData)
      .where("id", "=", input.descriptionId)
      .where("user_id", "=", userId)
      .executeTakeFirst();

    if (Number(result.numUpdatedRows) === 0) {
      throw new ActionError({
        code: "FORBIDDEN",
        message: "You do not have permission to edit this description",
      });
    }

    return { success: true };
  },
});

export const regenerateDescription = defineAction({
  input: z.object({
    descriptionId: z.string().uuid(),
  }),
  handler: async (input, context) => {
    const userId = await checkIfSignedInAndGetUserId(context.request.headers, context.locals);
    const { env } = await import("cloudflare:workers");
    const queue = env.IMAGE_QUEUE;

    const record = await db.selectFrom("description")
      .select(["file_id", "user_id"])
      .where("id", "=", input.descriptionId)
      .where("user_id", "=", userId)
      .executeTakeFirst();

    if (!record) {
      return { error: "Description not found" };
    }

    await queue.send({
      fileId: record.file_id,
      descriptionId: input.descriptionId,
      userId,
      cost: CREDIT_COST_REGENERATE,
      mode: "regenerate",
    });

    return { dispatched: true };
  },
});
