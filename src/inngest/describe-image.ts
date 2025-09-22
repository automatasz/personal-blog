import { inngest } from "./client";
import { zodTextFormat } from "openai/helpers/zod";
import { batchSchema, descriptionSchema } from "@/inngest/types";
import { db, type DescriptionUpdate } from "@utils/db";
import { openai } from "@utils/ai";
import { UPLOADTHING_APP_ID } from "astro:env/server";
import { getBatchSuccessCount, getBatchTitles } from "@utils/utils.db";

export default inngest.createFunction(
  {
    id: "image-describe",
    retries: 1,
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

      const { successCount, totalCount } = await getBatchSuccessCount(record.batch_id)
        .where("user_id", "=", record.user_id)
        .executeTakeFirstOrThrow();

      let titles: { title: string | null }[] | null = null;
      if (successCount === totalCount) {
        titles = await getBatchTitles(record.batch_id)
          .where("user_id", "=", record.user_id)
          .execute();
      }

      return {
        description: record,
        successCount,
        totalCount,
        titles,
      };
    });

    if (output.successCount === output.totalCount && output.titles) {
      const createTitleResponse = await step.ai.wrap(
        "openai.wrap.batch.title",
        parseResponse,
        {
          model: "gpt-4.1-nano",
          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: "You are a newspaper writer who is an expert at their job. You are given a collection of image titles. Your task is to create a compelling title that suits the collection of these images well",
                },
                {
                  type: "input_text",
                  text: output.titles?.map(title => title.title).join("\n"),
                },
              ],
            },
          ],
          text: {
            format: zodTextFormat(batchSchema, "title"),
          },
        },
      );

      await step.run("batch.complete", async () => {
        const batchTitle = batchSchema.safeParse(createTitleResponse.output_parsed);

        if (batchTitle.success) {
          await db.withSchema("keyworder").insertInto("batch")
            .values({
              id: output.description.batch_id,
              title: batchTitle.data.title,
            })
            .executeTakeFirstOrThrow();
          return batchTitle.data.title;
        }
        return "No title was created";
      });
    }

    return output;
  },
);
