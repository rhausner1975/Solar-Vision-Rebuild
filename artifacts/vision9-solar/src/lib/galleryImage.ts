/**
 * Helpers for resolving gallery image variant URLs.
 *
 * The API generates two downscaled WebP variants per uploaded image:
 *   - thumb  (~400px wide)  — `${objectPath}.thumb.webp`
 *   - medium (~1200px wide) — `${objectPath}.medium.webp`
 *
 * The original (full-size, often ~2000px JPEG) lives at the bare objectPath.
 *
 * Variant generation runs in the background after upload, so a brand-new
 * image may briefly only have the original. The browser will fall back to
 * the original if a variant 404s, but we also expose `useThumb` /
 * `useMedium` toggles for callers that prefer to opt out.
 */
const API_PREFIX = "/api/storage";

export type ImageVariant = "thumb" | "medium" | "full";

const SUFFIX: Record<Exclude<ImageVariant, "full">, string> = {
  thumb: ".thumb.webp",
  medium: ".medium.webp",
};

export function imageVariantUrl(objectPath: string, variant: ImageVariant): string {
  if (variant === "full") return `${API_PREFIX}${objectPath}`;
  return `${API_PREFIX}${objectPath}${SUFFIX[variant]}`;
}

/**
 * Build a `srcSet` string covering thumb + medium + full at their
 * approximate intrinsic widths. Browsers will pick the best match for the
 * element's rendered width.
 */
export function imageSrcSet(objectPath: string): string {
  return [
    `${imageVariantUrl(objectPath, "thumb")} 400w`,
    `${imageVariantUrl(objectPath, "medium")} 1200w`,
    `${imageVariantUrl(objectPath, "full")} 2000w`,
  ].join(", ");
}
