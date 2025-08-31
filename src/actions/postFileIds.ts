import { defineAction } from "astro:actions";
import { z } from "astro:schema";
import { inngest } from "@/inngest";
import { checkIfAdminAndGetUserId } from "@utils/actions";

export const postFileIds = defineAction({
  input: z.object({
    fileIds: z.array(z.string()),
  }),
  handler: async (input, context) => {
    const userId = await checkIfAdminAndGetUserId(context.request.headers);
    const batchId = crypto.randomUUID();

    const events = input.fileIds.map((id) => {
      return sendEvent(id, userId, batchId);
    });

    // make sure events were dispatched
    await Promise.all(events);

    return batchId;
  },
});

async function sendEvent(fileId: string, userId: string, batchId: string) {
  return inngest.send({
    name: "keyworder/image.describe",
    data: {
      fileId,
      userId,
      batchId,
    },
  });
}
