import { UPLOADTHING_TOKEN } from "astro:env/server";
import { UTApi, createUploadthing, type FileRouter } from "uploadthing/server";
import { checkIfSignedInAndGetUserId, deductUserCredits } from "./actions";
import { CREDIT_COST_UPLOAD } from "@/constants/credit-costs";

export const uploadthing = new UTApi({
  token: UPLOADTHING_TOKEN,
});

const f = createUploadthing();

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter: FileRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
  imageUploader: f({
    image: {
      /**
       * For full list of options and defaults, see the File Route API reference
       * @see https://docs.uploadthing.com/file-routes#route-config
       */
      maxFileSize: "128MB",
      maxFileCount: 100,
    },
  })
    // Set permissions and file types for this FileRoute
    .middleware(async ({ req }) => {
      // This code runs on your server before upload
      const userId = await checkIfSignedInAndGetUserId(req.headers);

      // Whatever is returned here is accessible in onUploadComplete as `metadata`
      return { userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // This code RUNS ON YOUR SERVER after upload
      await deductUserCredits(metadata.userId, CREDIT_COST_UPLOAD);
      console.log("Upload complete for userId:", metadata.userId, "1 credit deducted");

      // !!! Whatever is returned here is sent to the clientside `onClientUploadComplete` callback
      return { uploadedBy: metadata.userId };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
