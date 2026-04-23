# Vision9 Solar — Project Overview

A faithful rebuild of vision9solar.com on the Replit pnpm-monorepo template.

## Artifacts
- `artifacts/vision9-solar` (web, port 25036) — React + Vite public site + admin
- `artifacts/api-server` (api, port 8080, mounted at `/api`) — Express + Postgres + object storage

## Brand
- Green `#91D120`, Navy `#3E4E72`, Slate `#69727D`, white background
- Outfit font (Google Fonts), border-radius `3px`

## Public routes
`/`, `/net-metering`, `/about`, `/services`, `/estimates`, `/contact`, `/galleries`, `/galleries/:slug`

## Admin routes (gated by session cookie)
`/admin/login`, `/admin`, `/admin/contact`, `/admin/estimates`, `/admin/galleries`, `/admin/galleries/:id`, `/admin/account`

## Backend
- Postgres via `@workspace/db` (Drizzle). Tables: `admin_users`, `admin_sessions`, `contact_submissions`, `estimate_requests`, `galleries`, `gallery_images`.
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
