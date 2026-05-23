import z from "zod";

export const descriptionSchema = z.object({
  title: z.string(),
  description: z.string(),
  keywords: z.array(z.string()),
});

export const batchSchema = z.object({
  title: z.string(),
});

export interface DescribeEventPayload {
  fileId: string;
  descriptionId: string;
  userId: string;
  cost: number;
  mode: "generate" | "regenerate";
}


