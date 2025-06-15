import { EventSchemas } from "inngest";
import z from "zod";

type DemoEventSent = {
  name: "keyworder/image.describe";
  data: {
    fileId: string;
    userId: string;
  };
};

export const descriptionSchema = z.object({
  title: z.string(),
  description: z.string(),
  keywords: z.array(z.string()),
})

export const schemas = new EventSchemas().fromUnion<DemoEventSent>();