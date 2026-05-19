import { readFileSync } from "fs";
import { resolve } from "path";
import { Pool } from "pg";
import { Kysely, PostgresDialect } from "kysely";
import { UTApi } from "uploadthing/server";

// Parse .env file since we're outside Astro's build
function loadEnv() {
  const envPath = resolve(import.meta.dirname, "../.env");
  try {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      // Strip surrounding quotes
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  } catch {
    // .env file not found, rely on process.env
  }
}

loadEnv();

const DATABASE_URL = process.env.DATABASE_URL;
const UPLOADTHING_TOKEN = process.env.UPLOADTHING_TOKEN;

if (!DATABASE_URL || !UPLOADTHING_TOKEN) {
  console.error("Missing DATABASE_URL or UPLOADTHING_TOKEN env var");
  process.exit(1);
}

const db = new Kysely({
  dialect: new PostgresDialect({
    pool: new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } }),
  }),
});

const uploadthing = new UTApi({ token: UPLOADTHING_TOKEN });

async function main() {
  const deleteFlag = process.argv.includes("--delete");

  // 1. List all files from UploadThing (paginated)
  console.log("Fetching all UploadThing files...");
  const allFiles: { key: string; name: string; size: number }[] = [];
  let hasMore = true;
  let offset = 0;
  const limit = 100;

  while (hasMore) {
    const result = await uploadthing.listFiles({ limit, offset });
    allFiles.push(
      ...result.files.map((f) => ({ key: f.key, name: f.name, size: f.size })),
    );
    hasMore = result.hasMore;
    offset += limit;
  }

  // 2. Get all known file_ids from DB
  console.log("Fetching known files from DB...");
  const dbFiles = await db
    .withSchema("keyworder")
    .selectFrom("description")
    .select("file_id")
    .execute();
  const knownKeys = new Set(dbFiles.map((r) => r.file_id));

  // 3. Find orphans
  const orphans = allFiles.filter((f) => !knownKeys.has(f.key));
  const totalSize = orphans.reduce((sum, f) => sum + f.size, 0);

  console.log(`\nTotal UploadThing files: ${allFiles.length}`);
  console.log(`Known files (in DB):   ${knownKeys.size}`);
  console.log(`Orphaned files:        ${orphans.length}`);
  console.log(`Orphaned size:         ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

  if (orphans.length === 0) {
    console.log("\nNothing to clean up.");
    await db.destroy();
    return;
  }

  // 4. Show sample
  console.log("\nOrphaned files (first 10):");
  for (const f of orphans.slice(0, 10)) {
    const sizeKB = (f.size / 1024).toFixed(1);
    console.log(`  ${f.key} — ${f.name} (${sizeKB} KB)`);
  }

  // 5. Delete if flagged
  if (deleteFlag) {
    console.log(`\nDeleting ${orphans.length} orphaned files...`);
    const keys = orphans.map((f) => f.key);
    const result = await uploadthing.deleteFiles(keys);
    console.log(`Deleted: ${result.deletedCount} files. Success: ${result.success}`);
  } else {
    console.log("\nRun with --delete to remove these files.");
  }

  await db.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
