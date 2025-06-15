import { db, type Description, type DescriptionUpdate, type NewDescription } from "./db"

export const findDescriptionByJobId = async (jobId: Description['job_id']) => {
  return db.selectFrom("description")
    .where("job_id", "=", jobId)
    .selectAll()
    .executeTakeFirst();
}

export const createDescription = async (description: NewDescription) => {
  return db.insertInto("description")
    .values(description)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export const updateDescription = async (id: string, updateWith: DescriptionUpdate) => {
  return db.updateTable("description").set(updateWith).where("id", "=", id).execute();
}

export const updateDescriptionByJobId = async (jobId: string, updateWith: DescriptionUpdate) => {
  return db.updateTable("description").set(updateWith).where("job_id", "=", jobId).execute();
}