import { z } from "zod";
import { D1Dialect } from "kysely-d1";
import { Kysely, sql } from "kysely";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";

const descriptionSchema = z.object({
  title: z.string(),
  description: z.string(),
  keywords: z.array(z.string()),
});

const batchSchema = z.object({
  title: z.string(),
});

const AI_MODEL = "gpt-5.4-nano";

const describePrompt = "You are a photography and SEO expert. You must generate 100 short, relevant keywords for an uploaded image. Use 100 popular and descriptive keywords that help rank the image higher in stock websites. In addition, create a compelling title and a long description that suit the image well";

const batchTitlePrompt = "You are a newspaper writer who is an expert at their job. You are given a collection of image titles. Your task is to create a compelling title that suits the collection of these images well";

// Minimal D1 types
interface D1Database {
  prepare(sql: string): D1PreparedStatement;
  dump(): Promise<ArrayBuffer>;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(sql: string): Promise<D1Result>;
  withSession<T>(callback: () => Promise<T>): Promise<T>;
}
interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T>;
  run<T = unknown>(): Promise<D1Result<T>>;
  all<T = unknown>(): Promise<D1Result<T[]>>;
  raw(): Promise<unknown[][]>;
}
interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  error?: string;
  meta?: Record<string, unknown>;
}
interface MessageBatch<T = unknown> {
  readonly messages: Message<T>[];
  readonly queue: string;
}
interface Message<T = unknown> {
  readonly id: string;
  readonly timestamp: Date;
  readonly body: T;
  ack(): void;
  retry(): void;
}

interface Env {
  DB: D1Database;
  OPENAI_API_KEY: string;
  UPLOADTHING_APP_ID: string;
}

interface QueueMessage {
  fileId: string;
  descriptionId: string;
  userId: string;
  cost: number;
  mode: "generate" | "regenerate";
  batchId?: string;
}

export default {
  async queue(batch: MessageBatch<QueueMessage>, env: Env) {
    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    const db = new Kysely<Database>({
      dialect: new D1Dialect({ database: env.DB as any }),
    });

    for (const msg of batch.messages) {
      const payload = msg.body;

      try {
        const response = await openai.responses.parse(
          {
            model: AI_MODEL,
            input: [
              {
                role: "user",
                content: [
                  { type: "input_text", text: describePrompt },
                  {
                    type: "input_image",
                    image_url: `https://${env.UPLOADTHING_APP_ID}.ufs.sh/f/${payload.fileId}`,
                    detail: "low" as const,
                  },
                ],
              },
            ],
            text: { format: zodTextFormat(descriptionSchema, "description") },
          },
        );

        const parsed = descriptionSchema.safeParse(response.output_parsed);

        const descriptionUpdate: Record<string, unknown> = {
          tokens_used: response.usage?.total_tokens ?? null,
          result: "fail",
        };

        if (parsed.success) {
          descriptionUpdate.description = parsed.data.description;
          descriptionUpdate.title = parsed.data.title;
          descriptionUpdate.keywords = JSON.stringify(parsed.data.keywords);
          descriptionUpdate.result = "success";
        }

        const record = await db.updateTable("description")
          .set(descriptionUpdate)
          .where("id", "=", payload.descriptionId)
          .returningAll()
          .executeTakeFirstOrThrow();

        if (payload.mode === "generate") {
          const { successCount, totalCount } = await db
            .selectFrom("description")
            .select(({ fn }) => [
              fn.count<number>(sql<string>`CASE WHEN "result" IS NOT NULL THEN 1 END`).as("successCount"),
              fn.count<number>("id").as("totalCount"),
            ])
            .where("batch_id", "=", record.batch_id)
            .where("user_id", "=", record.user_id)
            .executeTakeFirstOrThrow();

          if (Number(successCount) === Number(totalCount)) {
            const titles = await db
              .selectFrom("description")
              .select("title")
              .where("batch_id", "=", record.batch_id)
              .where("user_id", "=", record.user_id)
              .execute();

            const titleResponse = await openai.responses.parse(
              {
                model: AI_MODEL,
                input: [
                  {
                    role: "user",
                    content: [
                      { type: "input_text", text: batchTitlePrompt },
                      { type: "input_text", text: titles.map(t => t.title).join("\n") },
                    ],
                  },
                ],
                text: { format: zodTextFormat(batchSchema, "title") },
              },
            );

            const batchTitle = batchSchema.safeParse(titleResponse.output_parsed);

            if (batchTitle.success) {
              await db.insertInto("batch")
                .values({ id: record.batch_id, title: batchTitle.data.title })
                .executeTakeFirst();
            }
          }
        }

        msg.ack();
      }
      catch (e) {
        console.error("queue worker error", payload.descriptionId, e);
        msg.retry();
      }
    }
  },
};

interface Database {
  description: DescriptionTable;
  user: AuthUserTable;
  batch: BatchTable;
}

interface BatchTable {
  id: string;
  title: string | null;
  created_at: unknown;
}

interface DescriptionTable {
  id: string;
  file_id: string;
  file_name: string | null;
  keywords: string | null;
  description: string | null;
  title: string | null;
  user_id: string;
  batch_id: string;
  tokens_used: number | null;
  result: string | null;
  width: number | null;
  height: number | null;
  created_at: unknown;
}

interface AuthUserTable {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: unknown;
  updatedAt: unknown;
  role: string;
  credits: number;
}
