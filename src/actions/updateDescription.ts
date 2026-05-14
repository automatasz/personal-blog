import { defineAction } from "astro:actions";
import { z } from "astro:schema";
import { db } from "@utils/db";
import { checkIfSignedInAndGetUserId, deductUserCredits } from "@utils/actions";
import { CREDIT_COST_REGENERATE } from "@/constants/credit-costs";
import { createCreditAudit } from "@utils/audit";
import { zodTextFormat } from "openai/helpers/zod";
import { openai } from "@utils/ai";

export const updateDescription = defineAction({
  input: z.object({
    descriptionId: z.string().uuid(),
    title: z.string().optional(),
    description: z.string().optional(),
    keywords: z.array(z.string()).optional(),
  }),
  handler: async (input, context) => {
    const userId = await checkIfSignedInAndGetUserId(context.request.headers);

    const updateData: {
      title?: string | null;
      description?: string | null;
      keywords?: string[] | null;
    } = {};

    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.keywords !== undefined) updateData.keywords = input.keywords;

    await db.withSchema("keyworder").updateTable("description")
      .set(updateData)
      .where("id", "=", input.descriptionId)
      .where("user_id", "=", userId)
      .executeTakeFirst();

    return { success: true };
  },
});

export const regenerateDescription = defineAction({
  input: z.object({
    descriptionId: z.string().uuid(),
  }),
  handler: async (input, context) => {
    const userId = await checkIfSignedInAndGetUserId(context.request.headers);

    const record = await db.withSchema("keyworder").selectFrom("description")
      .selectAll()
      .where("id", "=", input.descriptionId)
      .where("user_id", "=", userId)
      .executeTakeFirst();

    if (!record) {
      return { error: "Description not found" };
    }

    const parseResponse = openai.responses.parse.bind(openai.responses);

    const response = await parseResponse({
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
              image_url: record.file_id,
              detail: "low",
            },
          ],
        },
      ],
      text: {
        format: zodTextFormat(
          z.object({
            title: z.string(),
            description: z.string(),
            keywords: z.array(z.string()),
          }),
          "description",
        ),
      },
    });

    if (response.output_parsed) {
      // Deduct credits only after OpenAI succeeds
      await deductUserCredits(userId, CREDIT_COST_REGENERATE);
      await createCreditAudit(userId, -CREDIT_COST_REGENERATE, "regenerate", { descriptionId: input.descriptionId });

      await db.withSchema("keyworder").updateTable("description")
        .set({
          title: response.output_parsed.title,
          description: response.output_parsed.description,
          keywords: response.output_parsed.keywords,
          tokens_used: response.usage?.total_tokens,
          result: "success",
        })
        .where("id", "=", input.descriptionId)
        .executeTakeFirst();
    }

    return { success: true };
  },
});
