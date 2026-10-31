# Squid

Personal tracker for bodyweight, food, cardio and strength. A single-page app (plain JS, no framework) served by one Cloudflare Worker with a per-account Durable Object store. Read @docs/architecture.md before touching `src/host/`, `worker/`, or the sync code in `src/app/03-store.js` and `src/app/18-boot.js`.

## Layout

- `src/app/NN-name.js`: the app, as classic scripts that share one global scope, concatenated in file-name order. Order matters; a part may only use top-level bindings from earlier parts at load time.
- `src/boot/theme.js`, `src/styles/app.css`, `src/shell/body.html`: theme boot, styles, page markup.
- `src/styles/base.css`: the baseline the Claude artifact host injected (safe-area padding on `:root`); the app's CSS assumes it.
- `src/host/cloudflare.js`: `window.claude.use(db|sample|downloads)` backed by the Worker.
- `src/index.html`: page template. `scripts/build.mjs` writes `dist/` (Cloudflare) and `build/artifact.html` (artifact-shaped, for parity).
- `worker/`: Worker routes, Access auth, AI proxy, the `Account` Durable Object.
- `test/worker/`: Vitest in workerd. `test/e2e/run.mjs`: Chromium against `wrangler dev --env qa`.

`dist/` and `build/` are output. Never edit them.

## Commands

- `npm run build`
- `npm test`: build, then Worker tests
- `npm run test:e2e`: build, then end-to-end (starts its own `wrangler dev`, synthetic data, screenshots in `test-results/e2e/`)
- `npm run dev`: local app at http://localhost:8787. Put `DEV_EMAIL=you@example.com` and `ENV=dev` in `.dev.vars` to sign in locally.

Run only the tests a change needs. A colour tweak does not need the whole suite; a change to the host, the Worker or sync does need both suites. CI runs everything on every PR.

## Rules

- Keys and identities live only in Worker secrets. Nothing secret, and no email address, goes in client code or in this public repo.
- Health data never goes in git: no backups, exports or account dumps (`.gitignore` covers `export/`, `*.backup.json`, `squid-backup-*.json`). Tests use synthetic data.
- The Worker store must keep HOST-1 to HOST-9 (docs/architecture.md). A change to any of them changes its test in the same PR.
- Model IDs are `AI_MODEL_*` vars in `wrangler.jsonc`, not code.
- Production deploys happen from CI on merge to `main`. Use the QA environment (`npm run deploy:qa`, or the Deploy workflow with `env: qa`) for anything destructive.

## Design principles

1. Interface explains itself or doesn't get explained. Subtractive design; verbose UI insults competence.
2. Position belongs to the user. Re-renders are invisible: never auto-scroll, auto-jump or reposition. Scroll positions are stored and restored.
3. State lives in geometry, never in a second colour role: borders, outlines, insets, gradients. Colours only need to be distinct within a data set (the ten plan marks, the ten body parts, the four macros); distinctness is perceptual distance, not hue.
4. Grid before content. Column-strict layouts; row-mates match heights, headers align, content top-justified.
5. Defaults from data, not type. Scales and dials centre on the user's own recent values.
6. A look is not a decision. Temporary view changes (pinch zoom, tweaks) are never persisted.
7. Tapping a thing edits that thing. Every tap's apparent result matches its actual result.
8. Solve once, use everywhere. When a helper fixes a class of problem, it replaces every copy; duplication gets refactored early.

Also: tapping a text field selects its contents so typing replaces the value. Deep customisation is available but users opt into complexity rather than inherit it.

## Palette contract

Colour enters the app one way only: a component uses a role, a role points at a swatch, a theme is a set of swatch values. Nothing below the palette holds a colour of its own.

- 21 stored swatches: 12 hues plus 9 surfaces (bg, panel, alt, ink, ink2, ink3, line, line2, shadow). Every shadow and scrim is the shadow swatch at an opacity.
- The role → swatch mapping is fixed: a theme changes what a colour is, never what it means.
- Four helper colours are derived, not stored (text on the green, red and blue fills, and the active tab label), computed from the fill they sit on.
- The only literals a theme cannot reach are the caption white and crop-canvas black, which sit over a photograph.
- Never auto-correct a user's colour and never block saving; real usability problems show as a warning near Save.

## Context

- @docs/roadmap.md: what is planned and what is deliberately out of scope.
- `docs/history/`: frozen records from the artifact era (the changelog through 0.9.2 / v103).
- The app came from the Claude artifact "Squid"; tag `artifact-baseline` is a byte-identical import of the last published artifact. `npm run import:artifact <served.html>` re-imports a newer artifact version over `src/` if one is ever published again.
