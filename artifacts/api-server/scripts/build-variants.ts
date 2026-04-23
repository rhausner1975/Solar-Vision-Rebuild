import { db, galleryImagesTable } from "@workspace/db";
import { ObjectStorageService } from "../src/lib/objectStorage";

const storage = new ObjectStorageService();

async function main() {
  const limit = Number(process.env.LIMIT ?? 50);
  const rows = await db.select().from(galleryImagesTable);

  let done = 0;
  let skipped = 0;
  let failed = 0;
  for (const row of rows) {
    if (done >= limit) break;
    try {
      const status = await storage.checkImageVariants(row.objectPath);
      if (status.thumb && status.medium) {
        skipped++;
        continue;
      }
      const generated = await storage.generateImageVariants(row.objectPath);
      done++;
      console.log(`✓ ${row.objectPath} (+${generated.join(",") || "none"})`);
    } catch (err) {
      failed++;
      console.error(`✗ ${row.objectPath}: ${(err as Error).message}`);
    }
  }
  console.log(`\nGenerated ${done}, skipped ${skipped}, failed ${failed}, of ${rows.length} total.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
