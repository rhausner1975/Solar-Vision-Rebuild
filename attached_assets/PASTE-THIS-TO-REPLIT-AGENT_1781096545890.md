# Migration task: production web server with legacy redirects + prerendering

## Context (do not skip)

This project will replace the live WordPress site at **vision9solar.com**. The
domain will be pointed at this Replit deployment. To preserve SEO we need:

1. **Server-side 301 redirects** for the old WordPress query-string URLs
   (`/?page_id=175` etc.). `vite preview` cannot do this — a real server must
   serve the production site.
2. **Build-time prerendering** of the public routes, because the site is a
   client-rendered SPA and currently serves empty HTML to crawlers.

The exact source files to create are given below. Use them as-is unless they
conflict with how this workspace wires deployments — in that case adapt
minimally and explain what you changed.

## Part 1 — Create `artifacts/web-server`

Register it in the pnpm workspace. Production serving must go through this
server instead of `vite preview` — update the deployment run configuration
(web build first, then web-server build + start). Keep api-server exactly as
is. Do NOT change the dev workflow (`vite dev` stays for development).

### File: `artifacts/web-server/package.json`

```json
{
  "name": "@workspace/web-server",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "express": "^4.21.2"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "typescript": "~5.9.2"
  }
}
```

### File: `artifacts/web-server/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "noEmit": false
  },
  "include": ["src"]
}
```

### File: `artifacts/web-server/src/redirects.ts`

```ts
import type { Request, Response, NextFunction } from "express";

/**
 * Legacy WordPress URL → new route map for vision9solar.com.
 * Old site used query-string URLs (/?page_id=NNN). These MUST be
 * 301-redirected server-side; static hosts and SPA routers cannot do this.
 *
 * Extend PAGE_ID_MAP if Google Search Console reveals more indexed page IDs.
 */
const PAGE_ID_MAP: Record<string, string> = {
  "175": "/net-metering",
  "250": "/about",
  "274": "/services",
  "287": "/estimates",
  "327": "/contact",
  "304": "/galleries",
};

/** Old path-style URLs; if any show up in Search Console, add them here. */
const PATH_MAP: Record<string, string> = {
  "/home": "/",
  "/index.php": "/",
};

/** WordPress internals that should be told "gone forever", not redirected. */
const GONE_PREFIXES = [
  "/wp-admin",
  "/wp-login.php",
  "/wp-json",
  "/xmlrpc.php",
  "/wp-includes",
  "/feed",
];

/**
 * Host canonicalization: once vision9solar.com is attached to this
 * deployment, set CANONICAL_HOST=vision9solar.com so that
 * solar.vision9.biz and *.replit.app 301 to the canonical domain.
 * Leave the env var unset before cutover (staging would break otherwise).
 */
export function canonicalHostRedirect(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const canonical = process.env["CANONICAL_HOST"];
  if (!canonical) return next();
  const host = req.hostname;
  if (
    host === canonical ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".replit.dev") // keep Replit workspace previews working
  ) {
    return next();
  }
  res.redirect(301, `https://${canonical}${req.originalUrl}`);
}

export function legacyWordpressRedirects(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // 1) /?page_id=NNN → mapped route (strip the query entirely)
  const pageId = req.query["page_id"];
  if (typeof pageId === "string") {
    res.redirect(301, PAGE_ID_MAP[pageId] ?? "/");
    return;
  }

  // 2) Old post permalinks /?p=NNN — none known to be indexed; send home
  if (typeof req.query["p"] === "string") {
    res.redirect(301, "/");
    return;
  }

  // 3) Exact legacy path matches
  const mapped = PATH_MAP[req.path];
  if (mapped) {
    res.redirect(301, mapped);
    return;
  }

  // 4) WordPress internals → 410 Gone (tells Google to drop them quickly)
  if (GONE_PREFIXES.some((p) => req.path === p || req.path.startsWith(p + "/"))) {
    res.status(410).send("Gone");
    return;
  }

  // 5) Old media library URLs → 410 (images are re-hosted on the new site)
  if (req.path.startsWith("/wp-content/")) {
    res.status(410).send("Gone");
    return;
  }

  next();
}
```

### File: `artifacts/web-server/src/index.ts`

```ts
import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { canonicalHostRedirect, legacyWordpressRedirects } from "./redirects";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const rawPort = process.env["PORT"];
if (!rawPort) throw new Error("PORT environment variable is required.");
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT: "${rawPort}"`);

/** Built SPA output from @workspace/vision9-solar (vite build). */
const DIST = path.resolve(__dirname, "../../vision9-solar/dist/public");
if (!fs.existsSync(path.join(DIST, "index.html"))) {
  throw new Error(`Web build not found at ${DIST}. Run the vision9-solar build first.`);
}

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");

// Order matters: host canonicalization → legacy 301s → static → SPA fallback
app.use(canonicalHostRedirect);
app.use(legacyWordpressRedirects);

// Hashed assets: cache aggressively. Everything else: short cache.
app.use(
  "/assets",
  express.static(path.join(DIST, "assets"), {
    immutable: true,
    maxAge: "1y",
  }),
);
app.use(express.static(DIST, { index: false, maxAge: "1h" }));

// SPA fallback — serve index.html (or the prerendered page if one exists)
app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  // Prerendered routes are written as <route>/index.html at build time
  const prerendered = path.join(DIST, req.path, "index.html");
  const file = fs.existsSync(prerendered)
    ? prerendered
    : path.join(DIST, "index.html");
  res.setHeader("Cache-Control", "no-cache");
  res.sendFile(file);
});

app.listen(port, () => {
  console.log(`web-server listening on ${port}, serving ${DIST}`);
});
```

## Part 2 — Prerender public routes at build time

After `vite build`, generate static HTML snapshots for:

`/`, `/net-metering`, `/about`, `/services`, `/modular-racking`, `/estimates`,
`/contact`, `/galleries`

Write each as `dist/public/<route>/index.html` (root route overwrites
`dist/public/index.html`). Implementation is your choice (puppeteer script
against a temporary local server is acceptable; so is an SSR-based approach
with wouter + react-helmet-async). Requirements:

- The snapshot must contain the route's real text content AND the
  react-helmet-async output (title, meta description, canonical, OG tags,
  JSON-LD) in the raw HTML.
- React must still hydrate/attach correctly after load (no double rendering
  artifacts, forms still work).
- Admin routes must NOT be prerendered.
- If prerendering proves infeasible in the deployment build environment,
  STOP and report back rather than shipping without it.

## Part 3 — Small fixes

- `public/sw.js`: ensure the service worker does NOT cache `index.html` or
  navigation requests in a way that would serve stale pages after deploys
  (network-first for navigations, or remove the SW if it adds no value).
- Confirm `robots.txt` and `sitemap.xml` still reference `https://vision9solar.com`.

## Acceptance criteria (verify each with curl and report results)

```
curl -sI "$BASE/?page_id=175"   → 301, Location: /net-metering
curl -sI "$BASE/?page_id=250"   → 301, Location: /about
curl -sI "$BASE/?page_id=274"   → 301, Location: /services
curl -sI "$BASE/?page_id=287"   → 301, Location: /estimates
curl -sI "$BASE/?page_id=327"   → 301, Location: /contact
curl -sI "$BASE/?page_id=304"   → 301, Location: /galleries
curl -sI "$BASE/?page_id=99999" → 301, Location: /
curl -sI "$BASE/wp-admin/"      → 410
curl -sI "$BASE/wp-content/uploads/x.png" → 410
curl -s  "$BASE/net-metering" | grep -i "<title>"   → real page title in raw HTML
curl -s  "$BASE/about"        | grep -c "<h1"       → ≥ 1
curl -s  "$BASE/"             | grep "application/ld+json" → present in raw HTML
```

Also verify `/admin` still works in a browser and returns
`noindex,nofollow` meta.

## Out of scope — do not do

- Do not set `CANONICAL_HOST` yet (DNS has not been switched).
- Do not change page content, design, or the API.
- Do not touch the database or admin auth.
