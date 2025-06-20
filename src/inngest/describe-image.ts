import { inngest } from "./client";
import { zodTextFormat } from "openai/helpers/zod";
import { descriptionSchema } from "@/inngest/types";
import { db } from "@utils/db";
import { openai } from "@utils/ai";
import { UPLOADTHING_APP_ID } from "astro:env/server";

export default inngest.createFunction(
  { id: "image-describe" },
  { event: "keyworder/image.describe" },
  async ({ event, step }) => {
    const parseResponse = openai.responses.parse.bind(openai.responses);

    const initialInsert = await step.run("job.save", async () => {
      if (!event.id) {
        throw new Error("event id is not set");
      }
      const record = await db.withSchema("keyworder").insertInto("description")
        .values({
          file_id: event.data.fileId,
          user_id: event.data.userId,
          job_id: event.id,
          batch_id: event.data.batchId,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
      return record;
    });

    const response = await step.ai.wrap(
      "openai.wrap.image.describe",
      parseResponse,
      {
        model: "gpt-4.1-nano",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: "You are a photography and SEO expert. You must generate 50 short, relevant keywords for an uploaded image. Use popular and descriptive keywords that help rank the image higher in stock websites.",
              },
              {
                type: "input_image",
                image_url: `https://${UPLOADTHING_APP_ID}.ufs.sh/f/${event.data.fileId}`,
                detail: "low",
              },
            ],
          },
        ],
        text: {
          format: zodTextFormat(descriptionSchema, "description"),
        },
      },
    );

    const output = await step.run("image.save", async () => {
      const description = descriptionSchema.parse(response.output_parsed);
      const record = await db.withSchema("keyworder").updateTable("description")
        .set({
          description: description.description,
          title: description.title,
          keywords: description.keywords,
        })
        .where("id", "=", initialInsert.id)
        .returningAll()
        .executeTakeFirstOrThrow();
      return record;
    });

    return output;
  },
);
