# Squid

A personal tracker for bodyweight, food, cardio and strength, built for a phone's home screen. It runs on Cloudflare: one Worker serves the app and a small API, and each account's records live in its own Durable Object, synced live to every open device over a WebSocket. See [docs/architecture.md](docs/architecture.md).

## Develop

Node 22.

```sh
npm install
printf 'ENV=dev\nDEV_EMAIL=you@example.com\n' > .dev.vars   # local sign-in; never used in production
npm run dev                                                  # http://localhost:8787
npm test                                                     # Worker tests (workerd)
npm run test:e2e                                             # Chromium against wrangler dev, synthetic data
```

## First deploy

The repo deploys from GitHub Actions on every push to `main` once Cloudflare credentials are in place. Until then the Deploy workflow runs the tests and skips the deploy with a warning.

1. **API token.** Cloudflare dashboard → My Profile → API Tokens → Create Token → template "Edit Cloudflare Workers", limited to your account. In GitHub → Settings → Secrets and variables → Actions, add `CLOUDFLARE_API_TOKEN` (the token) and `CLOUDFLARE_ACCOUNT_ID` (Workers & Pages → Account details).
2. **First deploy.** GitHub → Actions → Deploy → Run workflow (or push to `main`). This creates the `squidfit` Worker at `https://squidfit.<your-subdomain>.workers.dev`. The API answers 503 until step 4 is done, so nothing is reachable yet.
3. **Access.** Workers & Pages → squidfit → Settings → Domains & Routes → workers.dev → Enable Cloudflare Access. Then, in Zero Trust → Access → Applications → the squidfit application:
   - Narrow it to the sign-in path: set the public hostname's path to `auth`. Squid checks its own session everywhere else; a Home Screen app on iOS cannot finish a sign-in on Access's domain, so Access must not sit in front of the page.
   - Add a login method you can use on a phone: Zero Trust → Settings → Authentication → Login methods → One-time PIN (optionally Google). Make sure the squidfit application offers it. The default "Cloudflare" method signs in with your Cloudflare dashboard account, under whatever email that account uses.
   - Set the policy to Allow → Include → Emails → the exact address you will sign in with. "That account does not have access" on the Access page means the identity you signed in as is not in this policy.
   - Copy the application's AUD tag. (The Access session length no longer matters: Squid's own session lasts 400 days from its last use.)
4. **Worker secrets** (Workers & Pages → squidfit → Settings → Variables and Secrets, type Secret), or `npx wrangler secret put NAME`:
   - `ALLOWED_EMAIL`: the same address as the Access policy (comma-separate to allow more than one)
   - `ACCESS_TEAM_DOMAIN`: your current Zero Trust team name, which is the host of the Access sign-in page (`<team>.cloudflareaccess.com`). If you renamed the team, use the new name.
   - `ACCESS_AUD`: the AUD tag from step 3
   - `ANTHROPIC_API_KEY`: a key from the Anthropic Console, ideally in its own workspace with a monthly spend limit. Without it the AI features stay hidden.
5. **Move your data.** Open the Worker URL, sign in, skip onboarding, then Settings → Data → Restore a Squid backup → choose your Full backup → Replace everything.
6. **Install.** Sign in in Safari first, then Share → Add to Home Screen; the Home Screen app takes Safari's sign-in with it. Re-set the per-device settings (light/dark, text size, density, swipe, dial speed); they don't travel between origins.

Optional: a QA copy (`squidfit-qa`, Haiku on every tier, import/reset endpoints enabled) deploys with the Deploy workflow's `env: qa` input and needs the same Access and secrets steps.

## Layout

```
src/app/        the app, classic scripts concatenated in order
src/host/       window.claude.use(db|sample|downloads) on Cloudflare
src/index.html  page template
worker/         Worker routes, sign-in (Access, then Squid's session), AI proxy, Account Durable Object
public/         manifest, icons, _headers
test/           worker tests and end-to-end
scripts/        build, artifact import
```
