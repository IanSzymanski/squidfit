# Roadmap

Where Squid stood when it moved off the Claude artifact: 0.9.2 (artifact publish v103 and later), with the v0.9 "adaptability update" shipped.

## Unblocked by the move to Cloudflare

Ordered cheapest and most protective first. Proposed, not yet agreed.

1. Sheet sizing against the real keyboard height. The artifact iframe hid the real viewport; this touches every sheet, so it goes in one pass.
2. Restore the fixed full-height add page (reverted as an iOS stopgap inside the artifact).
3. Theme sharing as a file download (the downloads host already supports it).
4. Nutrition lookups through the Worker (USDA FoodData Central, Open Food Facts for branded items and barcodes), cached in KV. Then the embedded seed foods shrink to the user's own foods and recipes.
5. Safe-area and splash-timing tuning against real standalone-mode measurements.
6. Rest-timer notifications via a service worker and Web Push. Largest item; has its own design questions.

Haptics stays blocked: iOS Safari has no Vibration API.

After 1.0: a nightly server backup (Cron Trigger writing `/api/export` to R2). It is the only piece that needs Workers Paid, so it waits.

## v1, "the polish update"

- Themes 2.0: gradient swatches, border radius, width and visibility, shadows, editable animations with a curve editor, Google Fonts (needs a CSP change in `public/_headers`).
- A unifying sweep of every page: re-add labels that are truly necessary, no swipe-only controls.
- Theme-specific micro-animations (minimal in the default theme, can be disabled).
- First paint without theme flicker.
- Import and export finished.

## Backlog (unsequenced)

- Passkey sign-in inside the Home Screen app, so a signed-out Home Screen app can sign itself in with Face ID instead of going back through Safari.
- Bodyweight trend lines with selectable windows (7-day, 14-day rolling average, linear regression), framed as a decision input, not a prediction.
- Export everything for outside analysis (Excel, R) to avoid lock-in.
- Selective wearable sync (Apple Watch, Oura) if feasible; otherwise say plainly that it is not supported.
- Text size and density move into the theme editor in a later theme-editor release.

## Out of scope for now

- Anything involving other users until after v1: the app must be stable, adaptable and efficient first.
- Goal tracking or coaching. The target user reaches their goals from the analytics the app already gives.
- Desktop mode, until after v1.
- Micronutrients. Food data is calories, protein, carbs, fat and alcohol.
- Beyond v1, loose ideas only: app stores with OS health-app integration, a coach portal.
