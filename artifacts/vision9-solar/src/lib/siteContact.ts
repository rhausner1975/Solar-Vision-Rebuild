export type Office = {
  id: "south" | "north";
  region: string;
  street?: string;
  locality: string;
  province: string;
  postalCode: string;
  country: string;
  phoneTel?: string;
  phoneDisplay?: string;
  mapShortUrl?: string;
  mapEmbedQuery?: string;
};

export const SITE_CONTACT = {
  primaryPhoneDisplay: "705 570 5034",
  primaryPhoneTel: "7055705034",
  primaryPhoneStructured: "+1-705-570-5034",
  emailDisplay: "info@vision9.biz",
  emailHref: "mailto:info@vision9.biz",
  topBarTagline: "Proudly serving Kirkland Lake, Marmora and surrounding areas!",
} as const;

export const OFFICES: ReadonlyArray<Office> = [
  {
    id: "south",
    region: "Southern Ontario",
    locality: "Marmora",
    province: "ON",
    postalCode: "K0K 2M0",
    country: "CA",
    phoneTel: "6138134305",
    phoneDisplay: "613 813 4305",
  },
  {
    id: "north",
    region: "Northern Ontario",
    street: "519 Government Rd W",
    locality: "Chaput Hughes",
    province: "ON",
    postalCode: "P0K 1A0",
    country: "CA",
    mapShortUrl: "https://maps.app.goo.gl/Xfkd9XMop5tpSULW7",
    mapEmbedQuery: "519 Government Rd W, Chaput Hughes, ON P0K 1A0",
  },
];

export function buildMapsEmbedSrc(query: string): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}
