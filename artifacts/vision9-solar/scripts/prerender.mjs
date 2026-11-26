// After `vite build`, writes a ready-made HTML file for each public page so
// crawlers see real text instead of an empty <div id="root">. People get the
// same page: the browser bundle loads and React takes over as before.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const pub = path.resolve(here, "../dist/public");
const server = path.resolve(here, "../dist/server/entry-server.js");

// Keep in step with public/sitemap.xml and the Route list in src/App.tsx.
export const ROUTES = ["/", "/modular-racking", "/services", "/net-metering", "/about", "/galleries", "/estimates", "/contact"];

const template = fs.readFileSync(path.join(pub, "index.html"), "utf8");
// Untouched app shell for every other address (admin, single galleries, 404).
fs.writeFileSync(path.join(pub, "spa.html"), template);

const { render } = await import(pathToFileURL(server).href);
// With React 19, <Helmet> tags come out inline in the body. Lift them into
// <head>; when a tag repeats (the site-wide default, then the page's own),
// the page's own wins because it comes later.
const HEAD_TAG = /<title>[^<]*<\/title>|<meta (?:name|property)="[^"]+"[^>]*\/>|<link rel="canonical"[^>]*\/>|<script type="application\/ld\+json">[\s\S]*?<\/script>/g;
function keyOf(tag) {
  if (tag.startsWith("<title")) return "title";
  if (tag.startsWith("<link")) return "canonical";
  const m = tag.match(/^<meta (?:name|property)="([^"]+)"/);
  return m ? `meta:${m[1]}` : `ld:${tag}`;
}

for (const route of ROUTES) {
  const rendered = render(route);
  const tags = new Map();
  for (const t of rendered.match(HEAD_TAG) ?? []) { tags.delete(keyOf(t)); tags.set(keyOf(t), t); }
  const body = rendered.replace(HEAD_TAG, "");
  if (!/<h[12][ >]/.test(body)) throw new Error(`prerender ${route}: no headings rendered`);
  let page = template.replace('<div id="root"></div>', `<div id="root">${body}</div>`);
  if (tags.has("title")) page = page.replace(/<title>[^<]*<\/title>\s*/, "");
  if (tags.has("meta:description")) page = page.replace(/<meta name="description"[^>]*>\s*/, "");
  // Marked so src/main.tsx can drop them once React takes over the head.
  const headTags = [...tags.values()].map((t) => t.replace(/^<(\w+)/, "<$1 data-prerendered"));
  page = page.replace("</head>", `  ${headTags.join("\n    ")}\n  </head>`);
  const out = route === "/" ? path.join(pub, "index.html") : path.join(pub, route.slice(1), "index.html");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, page);
  console.log(`prerendered ${route} (${Math.round(page.length / 1024)} KB): ${tags.get("title")}`);
}
fs.rmSync(path.resolve(here, "../dist/server"), { recursive: true, force: true });
