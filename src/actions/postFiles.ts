import { defineAction } from "astro:actions";
import { z } from "astro:schema";
import { inngest } from "@/inngest";
import { uploadthing } from "@utils/storage";
import { checkIfAdminAndGetUserId } from "@utils/actions";

export const postFiles = defineAction({
  accept: "form",
  input: z.object({
    files: z.instanceof(File).refine(
      file =>
        [
          "image/png",
          "image/jpeg",
          "image/jpg",
          "image/webp",
        ].includes(file.type),
      { message: "Invalid image file type" },
    ).array(),
  }),
  handler: async (input, context) => {
    const userId = await checkIfAdminAndGetUserId(context.request.headers);
    const batchId = crypto.randomUUID();
    const uploadedthings = await uploadthing.uploadFiles(input.files);

    const events = uploadedthings.map((file) => {
      if (file.error) {
        throw file.error;
      }

      return sendEvent(file.data.key, userId, batchId);
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
