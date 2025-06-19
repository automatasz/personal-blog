import { auth } from "@utils/auth";
import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";
import { inngest } from "@/inngest";
import { uploadthing } from "@utils/storage";

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

    for (const file of uploadedthings) {
      if (file.error) {
        throw file.error;
      }

      sendEvent(file.data.key, userId, batchId);
    }

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

async function checkIfAdminAndGetUserId(headers: Headers) {
  const session = await auth.api.getSession({ headers });

  if (!session?.session) {
    throw new ActionError({
      code: "UNAUTHORIZED",
      message: "You must be signed in",
    });
  }

  if (session.user.role !== "admin") {
    throw new ActionError({
      code: "FORBIDDEN",
      message: "You must have access to this feature",
    });
  }

  return session.user.id;
}
