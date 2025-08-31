import { EventSchemas } from "inngest";
import z from "zod";

interface ImageDescribeEvent {
  name: "keyworder/image.describe";
  data: {
    fileId: string;
    userId: string;
    batchId: string;
    fileName: string;
  };
}

export const descriptionSchema = z.object({
  title: z.string(),
  description: z.string(),
  keywords: z.array(z.string()),
});

export const schemas = new EventSchemas().fromUnion<ImageDescribeEvent>();
