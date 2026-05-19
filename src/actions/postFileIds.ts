import { defineAction } from "astro:actions";
import { z } from "astro:schema";
import { inngest } from "@/inngest";
import { checkIfSignedInAndGetUserId, deductCredits, getCreditCosts } from "@utils/actions";
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
    const userId = await checkIfSignedInAndGetUserId(context.request.headers);
    const batchId = crypto.randomUUID();

    const record = await db.withSchema("keyworder").insertInto("description")
      .values(input.files.map(file => ({
        file_id: file.id,
        user_id: userId,
        batch_id: batchId,
        file_name: file.name,
        width: file.width,
        height: file.height,
      })))
      .returningAll()
      .execute();

    const events = record.map((description) => {
      return sendEvent(description.file_id, description.id);
    });

    try {
      await Promise.all(events);
    }
    catch (e) {
      console.error("batch id", batchId, "user id", userId, e);
      await db.withSchema("keyworder").deleteFrom("description")
        .where("batch_id", "=", batchId)
        .where("user_id", "=", userId)
        .execute();
      await uploadthing.deleteFiles(input.files.map(f => f.id));
      throw new Error("Failed to start creating descriptions");
    }

    const costs = await getCreditCosts();
    await deductCredits(userId, input.files.length * costs.describe, "describe", {
      batchId,
      imageCount: input.files.length,
    });

    return batchId;
  },
});

async function sendEvent(fileId: string, descriptionId: string) {
  return inngest.send({
    name: "keyworder/image.describe",
    data: {
      fileId,
      descriptionId,
    },
  });
}
