import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { eq, and } from "drizzle-orm";
import { db, galleriesTable, galleryImagesTable } from "@workspace/db";
import { ObjectStorageService } from "../src/lib/objectStorage";

const ASSETS_DIR = resolve(import.meta.dirname, "../../../attached_assets");
const storage = new ObjectStorageService();

interface GallerySpec {
  slug: string;
  title: string;
  description: string;
  location: string;
  prefix: string;
}

const GALLERIES: GallerySpec[] = [
  {
    slug: "kirkland-lake-commercial-solar",
    title: "Kirkland Lake Commercial Solar",
    description:
      "Large-scale commercial rooftop solar build in Kirkland Lake, Ontario. Multi-month winter install spanning rack assembly, panel install, DC/AC wiring, and inverter commissioning in challenging cold-weather conditions.",
    location: "Kirkland Lake, Ontario",
    prefix: "KLS_",
  },
  {
    slug: "net-metering",
    title: "Net Metering",
    description:
      "Residential and commercial net-metering installations across Ontario — site survey, foundations, racking, panels, and inverter commissioning.",
    location: "Ontario",
    prefix: "NM_",
  },
  {
    slug: "residential-off-grid",
    title: "Residential Off-Grid",
    description:
      "Off-grid solar packages for rural cottages and remote homes — independent power generation, battery storage, and weather-rated mounting designed and installed by Vision9 Solar.",
    location: "Rural Ontario",
    prefix: "RO_",
  },
  {
    slug: "train-station-removal-and-rebuild",
    title: "Train Station Removal and Rebuild",
    description:
      "Heritage train station removal and rebuild project — full tear-off, structural re-deck, and weather-tight reinstall completed by the Vision9 Solar field team.",
    location: "Ontario",
    prefix: "TS_",
  },
];

const IMAGE_EXTS = new Set(["jpg", "jpeg", "png"]);

function isImage(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_EXTS.has(ext);
}

async function uploadAsset(file: string): Promise<string> {
  const filePath = resolve(ASSETS_DIR, file);
  const buf = await readFile(filePath);
  const ext = file.split(".").pop()?.toLowerCase() ?? "jpg";
  const contentType = ext === "png" ? "image/png" : "image/jpeg";

  const uploadURL = await storage.getObjectEntityUploadURL();
  const objectPath = storage.normalizeObjectEntityPath(uploadURL);

  const res = await fetch(uploadURL, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: buf,
  });
  if (!res.ok) {
    throw new Error(`Upload failed for ${file}: ${res.status} ${await res.text()}`);
  }
  // Mark as public so the public objects route serves it without auth.
  await storage.trySetObjectEntityAclPolicy(objectPath, {
    owner: "system",
    visibility: "public",
  });
  return objectPath;
}

async function seed() {
  const allFiles = (await readdir(ASSETS_DIR)).filter(isImage).sort();

  for (const spec of GALLERIES) {
    const matching = allFiles.filter((f) => f.startsWith(spec.prefix));
    if (matching.length === 0) {
      console.log(`(no files matching ${spec.prefix}*; skipping ${spec.slug})`);
      continue;
    }

    let [gallery] = await db
      .select()
      .from(galleriesTable)
      .where(eq(galleriesTable.slug, spec.slug));

    if (!gallery) {
      console.log(`→ Creating gallery '${spec.slug}'`);
      [gallery] = await db
        .insert(galleriesTable)
        .values({
          slug: spec.slug,
          title: spec.title,
          description: spec.description,
          location: spec.location,
          published: true,
        })
        .returning();
    } else {
      console.log(`✓ Gallery '${spec.slug}' exists (id=${gallery.id})`);
    }

    // Idempotency: skip files whose filename is already stored in altText for this gallery.
    const existingImages = await db
      .select()
      .from(galleryImagesTable)
      .where(eq(galleryImagesTable.galleryId, gallery.id));
    const existingFilenames = new Set(
      existingImages.map((r) => r.altText).filter((s): s is string => !!s),
    );

    let sortOrder = existingImages.length;
    let added = 0;
    for (const file of matching) {
      if (existingFilenames.has(file)) continue;
      try {
        const objectPath = await uploadAsset(file);
        await db.insert(galleryImagesTable).values({
          galleryId: gallery.id,
          objectPath,
          caption: null,
          altText: file,
          sortOrder: sortOrder++,
        });
        added++;
        if (added % 10 === 0) console.log(`  ... ${added}/${matching.length - existingImages.length}`);
      } catch (err) {
        console.error(`  ✗ failed ${file}:`, err);
      }
    }
    console.log(`  done: added ${added}, total now ${existingImages.length + added}`);
  }

  console.log("\nDone.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
