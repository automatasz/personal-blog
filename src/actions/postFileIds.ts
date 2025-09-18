import { defineAction } from "astro:actions";
import { z } from "astro:schema";
import { inngest } from "@/inngest";
import { checkIfAdminAndGetUserId } from "@utils/actions";
import { db } from "@utils/db";

export const postFileIds = defineAction({
  input: z.object({
    files: z.array(z.object({
      id: z.string(),
      name: z.string(),
    })),
  }),
  handler: async (input, context) => {
    const userId = await checkIfAdminAndGetUserId(context.request.headers);
    const batchId = crypto.randomUUID();

    const record = await db.withSchema("keyworder").insertInto("description")
      .values(input.files.map(file => ({
        file_id: file.id,
        user_id: userId,
        batch_id: batchId,
        file_name: file.name,
      })))
      .returningAll()
      .execute();

    const events = record.map((description) => {
      return sendEvent(description.file_id, description.id);
    });

    // make sure events were dispatched
    try {
      await Promise.all(events);
    }
    catch (e) {
      // display error in the console for inspection
      console.error("batch id", batchId, "user id", userId, e);
      throw new Error("Failed to start creating descriptions");
    }

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
