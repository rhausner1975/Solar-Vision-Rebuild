import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { db, galleriesTable, galleryImagesTable } from "@workspace/db";
import { ObjectStorageService } from "../src/lib/objectStorage";

const ASSETS_DIR = resolve(import.meta.dirname, "../../../attached_assets");
const storage = new ObjectStorageService();

interface ImageSpec {
  file: string;
  caption: string;
  altText: string;
}

interface GallerySpec {
  slug: string;
  title: string;
  description: string;
  location: string;
  images: ImageSpec[];
}

const GALLERIES: GallerySpec[] = [
  {
    slug: "residential-net-metering-ground-mount",
    title: "Residential Net Metering — Ground Mount",
    description:
      "Full ground-mount net-metering install at a rural Ontario residence. From site survey and concrete pier foundations through framing, panel install, and SMA inverter commissioning.",
    location: "Rural Ontario",
    images: [
      { file: "NM_20220613_094816_1776899846930.jpg", caption: "Site survey and layout", altText: "Site layout marked out on grass with measurement strings" },
      { file: "NM_20220613_173050_1776899846932.jpg", caption: "Trenching for conduit and base prep", altText: "Tractor preparing gravel base for ground-mount foundations" },
      { file: "NM_20220630_201823_1776900356207.jpg", caption: "Concrete pier foundations set", altText: "Concrete pier blocks aligned and squared on prepared base" },
      { file: "NM_1DF30D1D-0BE8-4F6A-9518-4CB47E27AE4C_1776899846925.jpeg", caption: "Galvanized rack assembly", altText: "Galvanized steel ground-mount rack at golden hour" },
      { file: "NM_9D5BB96D-886F-4BA4-B717-2CB4D1A087CC_1776899846929.jpeg", caption: "Crew assembling rails", altText: "Vision9 Solar crew assembling solar rails on the rack" },
      { file: "NM_20220714_204014_1776900356237.jpg", caption: "Frame complete at sunset", altText: "Completed ground-mount frame against an evening sky" },
      { file: "NM_20220808_153552_1776900356273.jpg", caption: "SMA inverters wired and commissioned", altText: "Pair of SMA inverters mounted on house siding with conduit" },
      { file: "NM_DSC06731.jpeg", caption: "Completed system", altText: "Finished residential ground-mount solar array" },
      { file: "NM_DSC06871.jpeg", caption: "System producing power", altText: "Completed array generating electricity for the home" },
    ],
  },
  {
    slug: "residential-off-grid-install",
    title: "Residential Off-Grid Install",
    description:
      "Off-grid solar package built for a rural cottage — independent power generation, battery storage, and weather-rated mounting. Fully designed and installed by Vision9 Solar.",
    location: "Northern Ontario",
    images: [
      { file: "RO_20211021_085214.jpg", caption: "Site arrival and prep", altText: "Off-grid build site at the start of the install day" },
      { file: "RO_20211021_111004.jpg", caption: "Mounting rails layout", altText: "Solar mounting rails laid out on the roof" },
      { file: "RO_20211022_142501.jpg", caption: "Panel install in progress", altText: "Solar panels being mounted to roof rails" },
      { file: "RO_20211023_135708.jpg", caption: "Array taking shape", altText: "Roof-mounted off-grid solar array partially complete" },
      { file: "RO_20211023_163239.jpg", caption: "Wiring and combiner work", altText: "DC wiring being routed to combiner box" },
      { file: "RO_20211024_171046.jpg", caption: "Array energized", altText: "Completed off-grid solar array energized at end of day" },
      { file: "RO_20211026_163624.jpg", caption: "Finished off-grid system", altText: "Finished off-grid solar installation on rural property" },
      { file: "RO_20211112_163502.jpg", caption: "Cold-weather commissioning", altText: "Off-grid system inspection in late autumn conditions" },
    ],
  },
  {
    slug: "train-station-roof-replacement",
    title: "Train Station Roof Replacement",
    description:
      "Heritage train station roof replacement project — full tear-off, structural re-deck, and weather-tight reinstall completed by the Vision9 Solar field team.",
    location: "Ontario",
    images: [
      { file: "TS_20221023_110003.jpg", caption: "Roof tear-off begins", altText: "Train station roof at the start of tear-off" },
      { file: "TS_20221023_113026.jpg", caption: "Stripping shingles and underlayment", altText: "Crew stripping shingles down to the deck" },
      { file: "TS_20221023_165219.jpg", caption: "Deck inspection", altText: "Roof deck exposed and being inspected" },
      { file: "TS_20221024_134439.jpg", caption: "New decking installed", altText: "Fresh plywood decking on the train station roof" },
      { file: "TS_20221025_104149.jpg", caption: "Underlayment applied", altText: "Synthetic underlayment laid over new roof deck" },
      { file: "TS_20221102_105401.jpg", caption: "Shingling in progress", altText: "Crew installing new shingles on the train station roof" },
      { file: "TS_20221107_155048.jpg", caption: "Edge details and flashing", altText: "Detail work on roof edges and flashing" },
      { file: "TS_20221108_153803.jpg", caption: "Project complete", altText: "Completed train station roof replacement" },
    ],
  },
  {
    slug: "kirkland-lake-commercial-solar",
    title: "Kirkland Lake Solar — Commercial",
    description:
      "Large-scale commercial rooftop solar build in Kirkland Lake, Ontario. Multi-month winter install spanning rack assembly, panel install, DC/AC wiring, and inverter commissioning in challenging cold-weather conditions.",
    location: "Kirkland Lake, Ontario",
    images: [
      { file: "KLS_IMG_20181107_114415.jpg", caption: "Project mobilization", altText: "Kirkland Lake commercial site at project start" },
      { file: "KLS_IMG_20181118_132306.jpg", caption: "Rooftop rack assembly", altText: "Commercial rooftop racking under assembly" },
      { file: "KLS_IMG_20181128_122906.jpg", caption: "Panels staged for install", altText: "Solar panels staged on the commercial rooftop" },
      { file: "KLS_IMG_20181129_114920.jpg", caption: "Crew installing panels", altText: "Crew installing solar panels in winter conditions" },
      { file: "KLS_IMG_20181205_090136.jpg", caption: "Array taking shape", altText: "Commercial array partially complete" },
      { file: "KLS_PANO_20190106_140659.vr.jpg", caption: "Site panorama", altText: "Wide panorama of the Kirkland Lake commercial solar build" },
      { file: "KLS_IMG_20190211_100207.jpg", caption: "DC wiring and combiner work", altText: "DC wiring and combiner installation" },
      { file: "KLS_IMG_20190307_101143.jpg", caption: "Inverter commissioning", altText: "Inverter and electrical commissioning" },
      { file: "KLS_IMG_20190322_110448.jpg", caption: "Project nearing completion", altText: "Commercial array nearing completion" },
    ],
  },
];

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
  return objectPath;
}

async function seed() {
  for (const spec of GALLERIES) {
    const [existing] = await db
      .select()
      .from(galleriesTable)
      .where(eq(galleriesTable.slug, spec.slug));

    if (existing) {
      console.log(`✓ Gallery '${spec.slug}' already exists (id=${existing.id}); skipping`);
      continue;
    }

    console.log(`→ Creating gallery '${spec.slug}' with ${spec.images.length} images`);
    const [gallery] = await db
      .insert(galleriesTable)
      .values({
        slug: spec.slug,
        title: spec.title,
        description: spec.description,
        location: spec.location,
        published: true,
      })
      .returning();

    let sortOrder = 0;
    for (const img of spec.images) {
      try {
        const objectPath = await uploadAsset(img.file);
        await db.insert(galleryImagesTable).values({
          galleryId: gallery.id,
          objectPath,
          caption: img.caption,
          altText: img.altText,
          sortOrder: sortOrder++,
        });
        try {
          const variants = await storage.generateImageVariants(objectPath);
          console.log(`  ✓ ${img.file} → ${objectPath} (variants: ${variants.join(", ") || "none new"})`);
        } catch (variantErr) {
          console.error(`  ! Variants failed for ${img.file}:`, variantErr);
        }
      } catch (err) {
        console.error(`  ✗ Failed to upload ${img.file}:`, err);
      }
    }
  }

  console.log("\nDone.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
