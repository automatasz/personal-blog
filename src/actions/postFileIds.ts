import { defineAction } from "astro:actions";
import { z } from "astro:schema";
import { inngest } from "@/inngest";
import { checkIfSignedInAndGetUserId, deductUserCredits } from "@utils/actions";
import { CREDIT_COST_DESCRIBE } from "@/constants/credit-costs";
import { createCreditAudit } from "@utils/audit";
import { db } from "@utils/db";

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

    // Deduct describe credits before inserting rows or dispatching events
    await deductUserCredits(userId, input.files.length * CREDIT_COST_DESCRIBE);
    await createCreditAudit(userId, -(input.files.length * CREDIT_COST_DESCRIBE), "describe", { batchId, imageCount: input.files.length });

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
