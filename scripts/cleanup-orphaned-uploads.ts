import { execSync } from "child_process";
import { UTApi } from "uploadthing/server";

const D1_DB = "fuwari-db";
const UPLOADTHING_TOKEN = process.env.UPLOADTHING_TOKEN;

if (!UPLOADTHING_TOKEN) {
  console.error("Missing UPLOADTHING_TOKEN env var");
  process.exit(1);
}

const uploadthing = new UTApi({ token: UPLOADTHING_TOKEN });

function queryD1(sql: string): { file_id: string }[] {
  const out = execSync(
    `pnpm wrangler d1 execute ${D1_DB} --command "${sql}" --json --remote`,
    { encoding: "utf-8" },
  );
  const results = JSON.parse(out);
  return results?.[0]?.results ?? [];
}

async function main() {
  const deleteFlag = process.argv.includes("--delete");

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

  console.log("Fetching known files from D1...");
  const dbFiles = queryD1("SELECT file_id FROM description");
  const knownKeys = new Set(dbFiles.map((r) => r.file_id));

  const orphans = allFiles.filter((f) => !knownKeys.has(f.key));
  const totalSize = orphans.reduce((sum, f) => sum + f.size, 0);

  console.log(`\nTotal UploadThing files: ${allFiles.length}`);
  console.log(`Known files (in DB):   ${knownKeys.size}`);
  console.log(`Orphaned files:        ${orphans.length}`);
  console.log(`Orphaned size:         ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

  if (orphans.length === 0) {
    console.log("\nNothing to clean up.");
    return;
  }

  console.log("\nOrphaned files (first 10):");
  for (const f of orphans.slice(0, 10)) {
    const sizeKB = (f.size / 1024).toFixed(1);
    console.log(`  ${f.key} — ${f.name} (${sizeKB} KB)`);
  }

  if (deleteFlag) {
    console.log(`\nDeleting ${orphans.length} orphaned files...`);
    const keys = orphans.map((f) => f.key);
    const result = await uploadthing.deleteFiles(keys);
    console.log(`Deleted: ${result.deletedCount} files. Success: ${result.success}`);
  } else {
    console.log('\nRun with --delete to remove these files.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
