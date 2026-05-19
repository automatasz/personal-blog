import { inngest } from "./client";
import { uploadthing } from "@utils/storage";
import { db } from "@utils/db";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export default inngest.createFunction(
  {
    id: "cleanup-orphans",
    triggers: [{ cron: "TZ=UTC 0 0 * * *" }],
  },
  async ({ step }) => {
    // 1. List all files from UploadThing (paginated)
    const allFiles = await step.run("list-all-ut-files", async () => {
      const files: { key: string; name: string; size: number; uploadedAt: number }[] = [];
      let hasMore = true;
      let offset = 0;
      const limit = 100;

      while (hasMore) {
        const result = await uploadthing.listFiles({ limit, offset });
        files.push(
          ...result.files.map((f) => ({ key: f.key, name: f.name, size: f.size, uploadedAt: f.uploadedAt })),
        );
        hasMore = result.hasMore;
        offset += limit;
      }

      return files;
    });

    // 2. Get all known file_ids from DB
    const knownFileIds = await step.run("list-known-db-files", async () => {
      const dbFiles = await db
        .withSchema("keyworder")
        .selectFrom("description")
        .select("file_id")
        .execute();

      return dbFiles.map((r) => r.file_id);
    });

    const knownKeys = new Set(knownFileIds);

    // 3. Find orphans older than 1 day
    const cutoff = Date.now() - ONE_DAY_MS;
    const orphans = allFiles.filter(
      (f) => !knownKeys.has(f.key) && f.uploadedAt < cutoff,
    );
    const totalSize = orphans.reduce((sum, f) => sum + f.size, 0);

    // 4. Delete orphaned files
    const deleted = await step.run("delete-orphans", async () => {
      if (orphans.length === 0) {
        return { deletedCount: 0, success: true };
      }

      const keys = orphans.map((f) => f.key);
      const result = await uploadthing.deleteFiles(keys);
      return result;
    });

    return {
      totalUtFiles: allFiles.length,
      knownDbFiles: knownKeys.size,
      orphanedOlderThanOneDay: orphans.length,
      orphanedSizeBytes: totalSize,
      deletedCount: deleted.deletedCount,
      success: deleted.success,
    };
  },
);
