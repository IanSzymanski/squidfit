# Architecture

Squid is one Cloudflare Worker. Static assets (the built page, manifest, icons) are served from `dist/` without waking the Worker; only `/api/*` runs Worker code. Each signed-in account gets one Durable Object (`Account`, SQLite-backed) that holds every record and pushes changes to open pages over a hibernating WebSocket.

```
phone / laptop ──Access login──▶ Worker squidfit
                                   ├─ dist/*            static assets (free, unmetered)
                                   ├─ /api/health        build, env, whether AI is configured
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
| `GET /api/health` | all | `{ok, env, build, ai}`. Service tokens may call it. |
| `GET /api/sync` | all | WebSocket upgrade |
| `POST /api/ai` | all | `{input, modelTier, json}` → `{text, truncated}` |
| `GET /api/export` | all | The account as a Full backup (format 4) |
| `POST /api/import?mode=replace\|fill` | not prod | Seeds an account from a Full backup |
| `POST /api/reset` | not prod | Empties the account |

Real data goes in through the app's own Settings → Data → Restore, which runs the record migrations and uploads through the same path every write uses.

## Auth

Cloudflare Access sits in front of the whole Worker (pages and API). Because static assets put an internal router in front of the Worker, `ctx.access` is not passed through, so `worker/auth.js` verifies the `Cf-Access-Jwt-Assertion` JWT itself against the team's signing keys, checks issuer and audience, and then requires the email to be in `ALLOWED_EMAIL`. Anything missing fails closed: no configuration is a 503, no or bad token a 401, another email a 403. Service tokens reach `/api/health` only.

Locally, `DEV_EMAIL` stands in for Access, but only when `ENV` is not `prod` and the request is to `localhost` or `127.0.0.1`.

An expired session shows up as a redirect or 401 on `/api`. The host probes `/api/health` when the socket cannot connect and reloads the page into the Access login when that probe says the session is gone (at most once a minute).

## AI

`/api/ai` calls the Messages API with the key from the `ANTHROPIC_API_KEY` secret and the model for the requested tier from the `AI_MODEL_*` vars, so a model change is a config change. `AI_DAILY_CALLS` caps calls per account per UTC day inside the Durable Object. Upstream outcomes map onto the codes the app's `AI_ERR` table already shows: `rate_limited`, `session_expired`, `refused`, `empty_completion`, `invalid_json`, `upstream_error`, `prompt_too_large`.

## Downloads

`downloads.save({filename, data})` uses the share sheet on touch devices (on iOS that is "Save to Files", which works in a home-screen app) and a plain download elsewhere. A dismissed share sheet rejects with `cancelled`, which the app ignores.
