# Replit prompt — ADD integration pages to the existing Vision9 Solar site

Paste the box below into the Replit agent for your **existing** solar.vision9.biz
project. **Also upload `Vision9_Solar_Site_Content_for_Intuit.md`** to the Repl so
the agent can use it as the content source.

---

> **Add five new pages to this existing Vision9 Solar website. Do NOT rebuild the
> site or change any existing pages, styling, nav, or content. These new pages are
> required for our private QuickBooks Online (Intuit) integration, and they must
> match the look and feel of the current site exactly.**
>
> **Operating entity:** Use **"Vision9 Solar Inc."** as the company name on these
> pages (not "Vision9 Inc.").
>
> **Content source:** I've uploaded `Vision9_Solar_Site_Content_for_Intuit.md`.
> Use it as the single source of truth for ALL text on these pages — verbatim, no
> rewording. Each `## PAGE:` section maps to one route.
>
> **Add these routes to the existing router:**
> - `/privacy` → Privacy Policy page content
> - `/terms` → Terms of Service page content
> - `/launch` → Home / integration overview page content
> - `/connect` → Connect page content
> - `/disconnect` → Disconnect page content
>
> **Match the existing site:** reuse the current layout components — the same top
> banner, header/logo, main navigation, fonts, colors (the current green + navy
> palette), and footer — so these pages look native. Legal pages (`/privacy`,
> `/terms`) should render the text in a clean, readable single-column article
> layout (comfortable line length, clear H1/H2 headings, good spacing).
>
> **Do NOT** add these to the top navigation menu (they aren't marketing pages).
> **Do** add two small links in the existing site footer: "Privacy Policy" →
> `/privacy` and "Terms of Service" → `/terms`.
>
> **CRITICAL — deep links must work:** These exact URLs will be opened directly by
> Intuit and by users typing them in, so `https://solar.vision9.biz/privacy` (and
> the other four) must load correctly on a fresh, direct visit and on refresh —
> not just via in-app navigation. Since this is a client-side–routed app,
> configure the deployment so unknown paths fall back to `index.html` (SPA
> rewrite / catch-all) EXCEPT that the five new routes above must resolve to their
> pages. Confirm that visiting each of the five URLs directly returns the page and
> a 200, not the 404 "add the page to the router" screen.
>
> **Per-page metadata:** set an accurate `<title>` for each page (from the content
> file) and add a self-referencing `<link rel="canonical">` for each of the five
> routes (e.g. canonical `https://solar.vision9.biz/privacy` on the privacy page).
>
> **Do NOT include** any functional "Connect to QuickBooks" / OAuth button, any
> backend logic, any forms, any analytics, or any data collection on these pages.
> They are informational only; the real integration runs on our own server
> elsewhere.
>
> **When done, report:** confirmation that all five routes load on direct visit
> (200, correct content, site styling applied) and that the footer now links to
> Privacy Policy and Terms.

---

## After Replit finishes — what I (Claude) need back from you

Once you've published and the five routes are live, tell me. I'll plug these exact
values into Intuit's App-details section in one pass:

| Intuit field | Value |
|---|---|
| Host domain | `solar.vision9.biz` |
| Launch URL | `https://solar.vision9.biz/launch` |
| Connect/Reconnect URL | `https://solar.vision9.biz/connect` |
| Disconnect URL | `https://solar.vision9.biz/disconnect` |
| Privacy Policy URL | `https://solar.vision9.biz/privacy` |
| EULA / Terms URL | `https://solar.vision9.biz/terms` |

Then the only thing left on the Intuit side is the ~40-minute Compliance
questionnaire (which I can pre-draft for you) before production keys unlock.
