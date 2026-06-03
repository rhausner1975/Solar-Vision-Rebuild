---
name: Screenshot env has reduced motion on
description: The app_preview screenshot/test environment runs with prefers-reduced-motion enabled
---
The `app_preview` screenshot environment (and headless test browser) runs with
`prefers-reduced-motion: reduce` enabled. Framer-motion components that branch on
`useReducedMotion()` render their final/instant state there — scroll-linked
parallax and staggered reveals will NOT animate in screenshots.

**Why:** Confirmed via browser console warning "You have Reduced Motion enabled on
your device." appearing on every screenshot of the vision9-solar homepage.

**How to apply:** When verifying motion work, don't expect to *see* animation in a
screenshot — instead confirm the reduced-motion fallback (content fully visible,
no offset). Also: framer's `useScroll({ target })` logs a benign "ensure the
container has a non-static position" warning even when the section IS relative;
it is not an error.
