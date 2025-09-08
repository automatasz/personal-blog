import { defineAction } from "astro:actions";
import { z } from "astro:schema";
import { inngest } from "@/inngest";
import { checkIfAdminAndGetUserId } from "@utils/actions";

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

    const events = input.files.map((file) => {
      return sendEvent(file.id, userId, batchId, file.name);
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

async function sendEvent(fileId: string, userId: string, batchId: string, fileName: string) {
  return inngest.send({
    name: "keyworder/image.describe",
    data: {
      fileId,
      userId,
      batchId,
      fileName,
    },
  });
}
