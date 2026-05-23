import { inngest } from "./client";
import { zodTextFormat } from "openai/helpers/zod";
import { batchSchema, descriptionSchema, type DescribeEventPayload } from "@/inngest/types";
import { db, type DescriptionUpdate } from "@utils/db";
import { openai } from "@utils/ai";
import { AI_MODEL } from "@/constants/ai";
import { UPLOADTHING_APP_ID } from "astro:env/client";
import { getBatchSuccessCount, getBatchTitles } from "@utils/utils.db";

const describePrompt = "You are a photography and SEO expert. You must generate 100 short, relevant keywords for an uploaded image. Use 100 popular and descriptive keywords that help rank the image higher in stock websites. In addition, create a compelling title and a long description that suit the image well";

const batchTitlePrompt = "You are a newspaper writer who is an expert at their job. You are given a collection of image titles. Your task is to create a compelling title that suits the collection of these images well";

export default inngest.createFunction(
  {
    id: "image-describe",
    retries: 1,
    triggers: [{ event: "keyworder/image.describe" }],
  },
  async ({ event, step }) => {
    const payload = event.data as unknown as DescribeEventPayload;
    const parseResponse = openai.responses.parse.bind(openai.responses);

    const response = await step.ai.wrap(
      "openai.wrap.image.describe",
      parseResponse,
      {
        model: AI_MODEL,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: describePrompt,
              },
              {
                type: "input_image",
                image_url: `https://${UPLOADTHING_APP_ID}.ufs.sh/f/${payload.fileId}`,
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
      return db.transaction().execute(async (trx) => {
        const user = await trx
          .withSchema("keyworder")
          .selectFrom("user")
          .select("credits")
          .where("id", "=", payload.userId)
          .forUpdate()
          .executeTakeFirst();

        if (!user || user.credits < payload.cost) {
          throw new Error("Insufficient credits");
        }

        await trx
          .withSchema("keyworder")
          .updateTable("user")
          .set(eb => ({
            credits: eb("credits", "-", payload.cost),
          }))
          .where("id", "=", payload.userId)
          .execute();

        await trx
          .withSchema("keyworder")
          .insertInto("credit_audit")
          .values({
            user_id: payload.userId,
            amount: -payload.cost,
            action: payload.mode === "regenerate" ? "regenerate" : "describe",
            metadata: { fileId: payload.fileId, descriptionId: payload.descriptionId },
          })
          .execute();

        const parsed = descriptionSchema.safeParse(response.output_parsed);

        const descriptionUpdate: DescriptionUpdate = {
          tokens_used: response.usage?.total_tokens,
          result: "fail",
        };

        if (parsed.success) {
          descriptionUpdate.description = parsed.data.description;
          descriptionUpdate.title = parsed.data.title;
          descriptionUpdate.keywords = parsed.data.keywords;
          descriptionUpdate.result = "success";
        }

        const record = await trx
          .withSchema("keyworder")
          .updateTable("description")
          .set(descriptionUpdate)
          .where("id", "=", payload.descriptionId)
          .returningAll()
          .executeTakeFirstOrThrow();

        if (payload.mode === "generate") {
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
            allComplete: successCount === totalCount,
          };
        }

        return { description: record, successCount: 0, totalCount: 0, titles: null, allComplete: false };
      });
    });

    if (output.allComplete && output.titles) {
      const titleResponse = await step.ai.wrap(
        "openai.wrap.batch.title",
        parseResponse,
        {
          model: AI_MODEL,
          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: batchTitlePrompt,
                },
                {
                  type: "input_text",
                  text: (output.titles as { title: string | null }[]).map(title => title.title).join("\n"),
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
        const batchTitle = batchSchema.safeParse(titleResponse.output_parsed);

        if (batchTitle.success) {
          await db.withSchema("keyworder").insertInto("batch")
            .values({
              id: output.description.batch_id,
              title: batchTitle.data.title,
            })
            .executeTakeFirst()
            .catch((e) => {
              if (e.code === "23505") {
                console.error(`Batch ${output.description.batch_id} already exists and its title cannot be created`);
                return;
              }
              throw e;
            });
          return batchTitle.data.title;
        }
        return "No title was created";
      });
    }

    return output;
  },
);
