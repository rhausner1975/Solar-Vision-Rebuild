# Vision9 Solar — Project Overview

A faithful rebuild of vision9solar.com on the Replit pnpm-monorepo template.

## Artifacts
- `artifacts/vision9-solar` (web, port 25036) — React + Vite public site + admin
- `artifacts/api-server` (api, port 8080, mounted at `/api`) — Express + Postgres + object storage

## Brand
- Green `#91D120`, Navy `#3E4E72`, Slate `#69727D`, white background
- Outfit font (Google Fonts), border-radius `3px`

## Public routes
`/`, `/net-metering`, `/about`, `/services`, `/modular-racking`, `/estimates`, `/contact`, `/galleries`, `/galleries/:slug`

## Admin routes (gated by session cookie)
`/admin/login`, `/admin`, `/admin/contact`, `/admin/estimates`, `/admin/galleries`, `/admin/galleries/:id`, `/admin/account`

## Backend
- Postgres via `@workspace/db` (Drizzle). Tables: `admin_users`, `admin_sessions`, `contact_submissions`, `estimate_requests`, `galleries`, `gallery_images`, `notification_settings`, `notification_log`.
- `notification_log` records every outgoing email/SMS attempt (channel, recipients, related lead, success/failure + error message) and powers the "Recent notifications" panel on `/admin/notifications`. Retention: rows older than 90 days are pruned, and the table is capped at the 1000 most recent entries; cleanup runs on boot and every 24h (overridable via `NOTIFICATION_LOG_RETENTION_DAYS`, `NOTIFICATION_LOG_MAX_ROWS`, `NOTIFICATION_LOG_CLEANUP_INTERVAL_MS`).
- Auth: Argon2id password hashing, HTTP-only session cookie `v9_admin_session` (7-day TTL). `requireAdmin` middleware enforces session **and** rejects any privileged call when `mustChangePassword=true` (only `/admin/password` is allowed during forced rotation).
- Password change revokes all *other* sessions for that user.
- Initial admin seeded on boot from `ADMIN_USERNAME` + `ADMIN_INITIAL_PASSWORD` env secrets, with `mustChangePassword=true`.
- Object storage uploads (`POST /api/storage/uploads/request-url`) require admin auth; presigned PUT goes directly to the bucket.

## API contract
`lib/api-spec/openapi.yaml` is the source of truth. Codegen: `pnpm --filter @workspace/api-spec run codegen`.
After codegen, `lib/api-zod/src/index.ts` must be `export * from "./generated/api";` only — orval re-adds a duplicate types export that breaks compilation.

## SEO / AI-agent
- `react-helmet-async` per-page titles + meta descriptions + canonical + OG/Twitter
- Site-wide `Organization` + `LocalBusiness` JSON-LD; `Service` on /services; `ImageGallery` on galleries; `BreadcrumbList` on every page
- `public/robots.txt`, `public/sitemap.xml`, `public/llms.txt`
- Admin shell sets `noindex,nofollow`

## Required secrets
- `ADMIN_USERNAME`, `ADMIN_INITIAL_PASSWORD` (admin seed)
- `DATABASE_URL`, `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PRIVATE_OBJECT_DIR`, `PUBLIC_OBJECT_SEARCH_PATHS` (provisioned)
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, `NOTIFY_SMS_TO` (SMS lead alerts via Twilio REST; missing vars cause SMS to be skipped with a warning, never blocks the form response)
- `NOTIFY_EMAIL_TO` (optional override; defaults to `info@vision9.biz`)

## Contact (matches the real business)
613 813 4305 · info@vision9.biz · Marmora ON K0K 2M0 · Kirkland Lake ON P2N 3C8

## Motion / "premium feel" foundation (Task #71)
- `framer-motion` + `lenis` (smooth scroll). All primitives respect `useReducedMotion`.
- `src/components/motion/`:
  - `Reveal` — fade + translateY on viewport entry (whileInView + once, amount 0.2). Default y=24, duration 0.6s, ease `[0.21,0.47,0.32,0.98]`.
  - `StaggerChildren` + `StaggerItem` — sequential reveals for grids/lists.
  - `Counter` — rAF-driven number ticker; eases out cubic; only animates when in view.
  - `PageTransition` — `AnimatePresence` cross-fade keyed on the wouter `location`. Wraps the public `Switch` inside `Shell`.
  - `SmoothScroll` — Lenis instance mounted once inside the public `Shell` (not on admin routes; admin uses native scroll). Duration 1.05, lerp 0.1, exponential ease. Returns `null`.
- Hero scale: `text-5xl md:text-6xl lg:text-7xl` for H1, `py-20 md:py-28` hero padding, `py-24 md:py-28` for inner sections.
- Home stat strip uses placeholder figures (10+ years field experience, 100+ installations supported, 2 Ontario offices) — confirm with the business and update `STATS` in `src/pages/Home.tsx` when real numbers are provided.
- Nav links use an animated underline accent (`Shell.tsx`) for active/hover state.

## Modular Racking product page (Task #72)
- Route: `/modular-racking` (`src/pages/ModularRacking.tsx`).
- Hero, trust strip, problems, features, sticky-scroll Installation Overview (mobile fallback), Heritage section (uses `Counter` for 4 stats), two-audience split panel, proof gallery (5 photos + 1 placeholder tile), 2 testimonials with "← Replace" markers, Turnstile-gated lead form.
- Lead form posts via `submitContactSubmission` with `name = first + last`, `subject = "Modular Racking inquiry — <audience>"`, `message` prepends `[Audience: X]\nLocation: Y`. Audience CTAs prefill `audience` via `form.setValue` and scroll to the form.
- Photos (`src/assets/source/racking-*.png`): `workshop-twin-frame`, `workshop-garage-build`, `field-cottage-winter` (hero), `field-residential-snow`, `field-low-angle-snow`.
- Placeholder content needing real input from the business: 2 testimonial quotes/names, 1 gallery tile ("Cottage Expansion — Coming Soon"), the 4 Heritage stat numbers (10+, 100s, 2, 0).
- Homepage callout band added between Reliability and Recent Projects sections (`Home.tsx`) linking to `/modular-racking`.
- Nav order: Home, Net Metering, About, Services, **Modular Racking**, Estimates, Galleries, Contact.
