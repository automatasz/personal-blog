import { db } from "./db";

export const getBatchSuccessCount = (batchId: string) => {
  return db
    .withSchema("keyworder")
    .selectFrom("description")
    .select(({ fn }) => [
      fn.count<number>("result").filterWhere("result", "is not", null).as("successCount"),
      fn.count<number>("id").as("totalCount"),
    ])
    .where("batch_id", "=", batchId);
};

export const getBatchTitles = (batchId: string) => {
  return db
    .withSchema("keyworder")
    .selectFrom("description")
    .select("title")
    .where("batch_id", "=", batchId);
};
