# Architecture

Squid is one Cloudflare Worker. Static assets (the built page, manifest, icons) are served from `dist/` without waking the Worker; only `/api/*` and `/auth/*` run Worker code. Each signed-in account gets one Durable Object (`Account`, SQLite-backed) that holds every record and pushes changes to open pages over a hibernating WebSocket.

```
phone / laptop ──────────────────▶ Worker squidfit
                                   ├─ dist/*            static assets (free, unmetered, public)
                                   ├─ /auth/signin       behind Access: issues Squid's session cookie
                                   ├─ /api/health        build, env, whether AI is configured
                                   ├─ /api/session       renews the session cookie
                                   ├─ /api/sync  ──WS──▶ Account DO (per email): docs table + live subscriptions
                                   ├─ /api/ai    ──────▶ Anthropic Messages API (key in a Worker secret)
                                   └─ /api/export        whole account as a Full backup (format 4)
```

## The host contract

The app was written against the Claude artifact runtime: it only touches its host through `window.claude.use(name)` for `db`, `sample` and `downloads`. `src/host/cloudflare.js` provides the same three with the same call shapes, so the app parts did not have to change. It installs itself only when `window.claude` is missing, so the same parts still run inside an artifact.

Semantics the store keeps, because the app's data safety depends on them (tests in `test/worker/sync.test.js` and `test/e2e/run.mjs`):

| | Behaviour | Why |
|---|---|---|
| HOST-1 | `use()` resolves asynchronously; unknown names give `null` | Boot paints from the local cache before the account answers |
| HOST-2 | A collection's first snapshot arrives on its own tick with every doc as `added`, plus `empty` | `syncColl` treats the first snapshot as the whole record and seeds an empty account |
| HOST-3 | Every write echoes to every subscriber, the writer's own page included | `sameRecord` skips the echo; nothing may depend on it being absent |
| HOST-4 | Delivered bodies are deeply frozen | The thaw-on-entry fix for lost sets assumes it |
| HOST-5 | `set` resolves only after commit and rejects with `{code}` | The pending mark clears on resolve; `dbErr` maps the codes |
| HOST-6 | Deletes arrive as `removed`; last writer wins; no transactions | Tombstones and `WROTE` ordering handle the rest |
| HOST-7 | One document holds at most 256 KiB | Photo splitting (`pix/`) was built around it |
| HOST-8 | After a reconnect each subscription gets only the difference from what that page last saw | A dropped socket neither misses changes nor replays everything |
| HOST-9 | Writes made while disconnected queue for 20 s, then reject `unavailable` | Short blips stay silent; long ones leave the record pending |

After a reconnect the host fires `squid:online` (with `detail.since`, the time the socket dropped). `18-boot.js` answers it by resending every pending write and any tombstone recorded since then. In the artifact the pending set was only flushed on a collection's first snapshot, once per launch; a socket that drops and heals mid-session needs a second trigger.

## Wire protocol

One WebSocket per page at `GET /api/sync`, handed to `ACCOUNT.idFromName(email)`.

| Direction | Messages |
|---|---|
| client → server | `{op:"sub", coll}` · `{op:"unsub", coll}` · `{op:"subdoc", path}` · `{op:"unsubdoc", path}` · `{op:"set", path, body, rid}` · `{op:"del", path, rid}` · `{op:"get", path, rid}` · `"ping"` |
| server → client | `{t:"snap", coll, first, last, docs:[[id, body]]}` (split into frames of about 1 MiB) · `{t:"chg", coll, id, body\|null}` · `{t:"doc", path, body\|null}` · `{t:"ack", rid, ok, code?, body?}` · `"pong"` |

`ping` is answered by the runtime's auto-response, so an idle phone never wakes the object. The client pings every 25 s and on every return to the foreground; no `pong` within a few seconds means the socket is dead and it reconnects with backoff.

Storage is one table: `docs(coll, id, body, updated)`, primary key `(coll, id)`. Photos (`pix/*`) live there too; at roughly 200 KB a photo that is about 30 MB a year, well inside a Durable Object's 10 GB.

## HTTP endpoints

| Route | Env | |
|---|---|---|
| `GET /auth/signin` | all | Behind Access. Sets the session cookie, then redirects to `/` |
| `GET /api/health` | all | `{ok, env, build, ai}`. Needs no sign-in. |
| `GET /api/session` | all | `{ok}`, or 401 `signed_out`. Renews the cookie (at most daily) |
| `GET /api/sync` | all | WebSocket upgrade |
| `POST /api/ai` | all | `{input, modelTier, json}` → `{text, truncated}` |
| `GET /api/export` | all | The account as a Full backup (format 4) |
| `POST /api/import?mode=replace\|fill` | not prod | Seeds an account from a Full backup |
| `POST /api/reset` | not prod | Empties the account |

Real data goes in through the app's own Settings → Data → Restore, which runs the record migrations and uploads through the same path every write uses.

## Auth

Access covers one path, `/auth/signin`. Everything else (the page, its assets, `/api/*`) is outside Access, and the Worker checks Squid's own session on every `/api` call except health.

Why: an iOS Home Screen app opens any page on another domain in a Safari sheet with its own cookies. When Access covered the whole site, a launch without a valid Access cookie redirected to `<team>.cloudflareaccess.com`, the sign-in finished inside that sheet, and the app got nothing back ("Invalid login session", with Safari's address bar on top). Now the app never leaves its origin.

Sign-in: `/auth/signin` verifies the `Cf-Access-Jwt-Assertion` JWT (static assets put an internal router in front of the Worker, so `ctx.access` is not passed through; `worker/auth.js` checks the signature against the team's keys, the issuer and the audience), requires the email to be in `ALLOWED_EMAIL`, and sets `__Host-squid` (HttpOnly, Secure, SameSite=Lax). The value is the account's Durable Object id and a 256-bit random token; the object stores only the token's SHA-256 with the email. A session lasts 400 days from its last use; `/api/session`, which the page calls on every launch, restarts that at most once a day. Removing an address from `ALLOWED_EMAIL` ends its sessions at once.

Home Screen: Safari copies its cookies into a Home Screen app when it is added, so signing in once in Safari and then adding Squid is enough. If a Home Screen app is ever signed out, it says to sign in in Safari and add it again, because it cannot complete an Access sign-in itself.

Failures: 401 means only "not signed in" (`signed_out`), and the page answers it with the sign-in screen. Configuration and token problems fail closed as 403 or 503: no configuration is a 503, a missing token at `/auth/signin` (`access_missing`), a token that does not verify (`access_rejected`) or another email (`forbidden`) is a 403. WebSocket handshakes and POSTs whose `Origin` is another site are refused.

While Access still covers the whole site (during setup, or if it is turned on again for all of workers.dev), `/api` also accepts the Access JWT, and `/api/session` gives such a page a session of its own.

Locally, `DEV_EMAIL` stands in for Access and the session, but only when `ENV` is not `prod` and the request is to `localhost` or `127.0.0.1`.

## AI

`/api/ai` calls the Messages API with the key from the `ANTHROPIC_API_KEY` secret and the model for the requested tier from the `AI_MODEL_*` vars, so a model change is a config change. `AI_DAILY_CALLS` caps calls per account per UTC day inside the Durable Object. Upstream outcomes map onto the codes the app's `AI_ERR` table already shows: `rate_limited`, `session_expired`, `refused`, `empty_completion`, `invalid_json`, `upstream_error`, `prompt_too_large`.

## Downloads

`downloads.save({filename, data})` uses the share sheet on touch devices (on iOS that is "Save to Files", which works in a home-screen app) and a plain download elsewhere. A dismissed share sheet rejects with `cancelled`, which the app ignores.
