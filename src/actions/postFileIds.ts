import { defineAction } from "astro:actions";
import { z } from "astro:schema";
import { checkIfSignedInAndGetUserId } from "@utils/actions";
import { CREDIT_COST_DESCRIBE } from "@/constants/credit-costs";
import { db } from "@utils/db";
import { uploadthing } from "@utils/storage";

export const postFileIds = defineAction({
  input: z.object({
    files: z.array(z.object({
      id: z.string(),
      name: z.string(),
      width: z.number(),
      height: z.number(),
    })),
  }),
  handler: async (input, context) => {
    const userId = await checkIfSignedInAndGetUserId(context.request.headers, context.locals);
    const queue = (context.locals as any).runtime.env.IMAGE_QUEUE;
    const batchId = crypto.randomUUID();

    const record = await db.insertInto("description")
      .values(input.files.map(file => ({
        id: crypto.randomUUID(),
        file_id: file.id,
        user_id: userId,
        batch_id: batchId,
        file_name: file.name,
        width: file.width,
        height: file.height,
      })))
      .returningAll()
      .execute();

    try {
      await Promise.all(record.map((description) =>
        queue.send({
          fileId: description.file_id,
          descriptionId: description.id,
          userId,
          cost: CREDIT_COST_DESCRIBE,
          mode: "generate" as const,
        })
      ));
    }
    catch (e) {
      console.error("batch id", batchId, "user id", userId, e);
      await db.deleteFrom("description")
        .where("batch_id", "=", batchId)
        .where("user_id", "=", userId)
        .execute();
      await uploadthing.deleteFiles(input.files.map(f => f.id));
      throw new Error("Failed to start creating descriptions");
    }

    return batchId;
  },
});
