/**
 * Backfill thumb (~400px) and medium (~1200px) WebP variants for every
 * gallery image already in the database. Idempotent — variants that already
 * exist on object storage are skipped unless `--force` is passed.
 *
 * Usage:
 *   pnpm --filter @workspace/api-server run backfill:image-variants
 *   pnpm --filter @workspace/api-server run backfill:image-variants -- --force
 */
import { db, galleryImagesTable } from "@workspace/db";
import { ObjectStorageService } from "../src/lib/objectStorage";

const force = process.argv.includes("--force");
const storage = new ObjectStorageService();

async function main() {
  const rows = await db.select().from(galleryImagesTable);
  let processed = 0;
  let generated = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      const v = await storage.generateImageVariants(row.objectPath, { force });
      generated += v.length;
      processed += 1;
      console.log(`  ${row.objectPath}: ${v.join(", ") || "skip"}`);
    } catch (err) {
      failed += 1;
      console.error(`  FAIL ${row.objectPath}:`, (err as Error).message);
    }
  }
  console.log(
    `\nDone. ${processed}/${rows.length} processed, ${generated} variants generated, ${failed} failed.`,
  );
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
