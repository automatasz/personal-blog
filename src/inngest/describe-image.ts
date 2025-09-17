import { inngest } from "./client";
import { zodTextFormat } from "openai/helpers/zod";
import { descriptionSchema } from "@/inngest/types";
import { db, type DescriptionUpdate } from "@utils/db";
import { openai } from "@utils/ai";
import { UPLOADTHING_APP_ID } from "astro:env/server";

export default inngest.createFunction(
  {
    id: "image-describe",
    retries: 3,
  },
  { event: "keyworder/image.describe" },
  async ({ event, step }) => {
    const parseResponse = openai.responses.parse.bind(openai.responses);

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
                text: "You are a photography and SEO expert. You must generate 100 short, relevant keywords for an uploaded image. Use 100 popular and descriptive keywords that help rank the image higher in stock websites. In addition, create a compelling title and a long description that suit the image well",
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
      const description = descriptionSchema.safeParse(response.output_parsed);

      const descriptionUpdate: DescriptionUpdate = {
        tokens_used: response.usage?.total_tokens,
        result: "fail",
      };

      if (description.success) {
        descriptionUpdate.description = description.data.description;
        descriptionUpdate.title = description.data.title;
        descriptionUpdate.keywords = description.data.keywords;
        descriptionUpdate.result = "success";
      }

      const record = await db.withSchema("keyworder").updateTable("description")
        .set(descriptionUpdate)
        .where("id", "=", event.data.descriptionId)
        .returningAll()
        .executeTakeFirstOrThrow();
      return record;
    });

    return output;
  },
);
