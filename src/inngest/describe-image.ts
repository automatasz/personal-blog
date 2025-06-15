import { inngest } from "./client";
import { OpenAI } from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { OPENAI_API_KEY } from "astro:env/server";
import { descriptionSchema } from "@/inngest/types";

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

export default inngest.createFunction(
  { id: "image-describe" },
  { event: "keyworder/image.describe" },
  async ({ event, step }) => {
    const parseResponse = openai.responses.parse.bind(openai.responses);

    const response = await step.ai.wrap("openai.wrap.image.describe",
      parseResponse,
      {
        model: "gpt-4.1-nano",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text", text: "You are a photography and SEO expert. You must generate 50 short, relevant keywords for an uploaded image. Use popular and descriptive keywords that help rank the image higher in stock websites."
              },
              {
                type: "input_image",
                file_id: event.data.fileId,
                detail: "low",
              },
            ],
          },
        ],
        text: {
          format: zodTextFormat(descriptionSchema, "description")
        }
      }
    )

    const output = await step.run("image.save", () => {
      const description = descriptionSchema.parse(response.output_parsed);
      return description;
    })
    return output;
  }
);