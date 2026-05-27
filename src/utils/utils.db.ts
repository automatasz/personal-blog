import { db } from "./db";
import { sql } from "kysely";

export const getBatchSuccessCount = (batchId: string) => {
  return db
    .selectFrom("description")
    .select(({ fn }) => [
      fn.count<number>(sql<string>`CASE WHEN "result" IS NOT NULL THEN 1 END`).as("successCount"),
      fn.count<number>("id").as("totalCount"),
    ])
    .where("batch_id", "=", batchId);
};

export const getBatchTitles = (batchId: string) => {
  return db
    .selectFrom("description")
    .select("title")
    .where("batch_id", "=", batchId);
};
