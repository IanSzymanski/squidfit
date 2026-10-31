import { describe, it, expect, beforeAll } from "vitest";
import { exports } from "cloudflare:workers";
import { generateKeyPair, exportJWK, SignJWT, createLocalJWKSet } from "jose";
import { identify, teamOrigin } from "../../worker/auth.js";
import { handleAI, firstJSON, modelFor } from "../../worker/ai.js";

const api = (path, init) => exports.default.fetch(new Request("http://localhost" + path, init));

describe("HTTP API", () => {
  it("reports health, build and whether AI is configured", async () => {
    const res = await api("/api/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, env: "test", ai: true });
  });

  it("refuses a sync request that is not a WebSocket upgrade", async () => {
    expect((await api("/api/sync")).status).toBe(426);
  });

  it("export returns what import put in, in the app's backup v4 shape", async () => {
    const backup = {
      app: "squid", version: 4, exported: "2026-10-31T00:00:00.000Z",
      settings: { onboarded: true, units: { w: "kg" } },
      days: [{ d: "2026-10-30", wKg: 81.2, entries: [] }, { d: "2026-10-31", wKg: 81, entries: [{ id: "e1", kcal: 300 }] }],
      foods: [{ id: "f1", name: "Oats" }], recipes: [], rides: [{ id: "r1", d: "2026-10-31", kcal: 400 }], presets: [],
      exercises: [{ id: "x1", name: "Squat" }], wplans: [], workouts: [], photos: [{ d: "2026-10-31", shots: { front: { id: "p1" } } }],
      pix: [{ id: "p1", img: "data:image/jpeg;base64,AAAA" }],
    };
    expect((await api("/api/reset", { method: "POST" })).status).toBe(200);
    const imp = await (await api("/api/import?mode=replace", { method: "POST", body: JSON.stringify(backup) })).json();
    expect(imp).toEqual({ ok: true, written: 8 });
    const out = await (await api("/api/export")).json();
    const { exported, ...rest } = out;
    expect(typeof exported).toBe("string");
    const { exported: _, ...want } = backup;
    expect(rest).toEqual(want);
  });

  it("fill mode only adds what is missing", async () => {
    await api("/api/reset", { method: "POST" });
    await api("/api/import?mode=replace", { method: "POST", body: JSON.stringify({ app: "squid", foods: [{ id: "f1", name: "Mine" }] }) });
    const imp = await (await api("/api/import?mode=fill", { method: "POST", body: JSON.stringify({ app: "squid", foods: [{ id: "f1", name: "Theirs" }, { id: "f2", name: "New" }] }) })).json();
    expect(imp.written).toBe(1);
    expect((await (await api("/api/export")).json()).foods).toEqual([{ id: "f1", name: "Mine" }, { id: "f2", name: "New" }]);
  });

  it("returns 404 for unknown routes", async () => {
    expect((await api("/api/nope")).status).toBe(404);
  });
});

describe("Access identity", () => {
  let keys, sign;
  const team = "https://squid-team.cloudflareaccess.com";
  const env = { ENV: "prod", ACCESS_TEAM_DOMAIN: "squid-team", ACCESS_AUD: "aud-1", ALLOWED_EMAIL: "Owner@Example.com" };
  const req = token => new Request("https://squidfit.example.workers.dev/api/health", { headers: token ? { "cf-access-jwt-assertion": token } : {} });

  beforeAll(async () => {
    const { publicKey, privateKey } = await generateKeyPair("RS256");
    const jwk = { ...(await exportJWK(publicKey)), kid: "k1", alg: "RS256" };
    keys = createLocalJWKSet({ keys: [jwk] });
    sign = (claims, opts = {}) => new SignJWT(claims).setProtectedHeader({ alg: "RS256", kid: "k1" }).setIssuer(opts.iss || team).setAudience(opts.aud || "aud-1").setIssuedAt().setExpirationTime(opts.exp || "1h").sign(privateKey);
  });

  it("normalises the team name to its Access origin", () => {
    expect(teamOrigin("squid-team")).toBe(team);
    expect(teamOrigin("squid-team.cloudflareaccess.com/")).toBe(team);
    expect(teamOrigin(team)).toBe(team);
  });

  it("accepts the allowed email, case-insensitively", async () => {
    expect(await identify(req(await sign({ email: "owner@example.com" })), env, keys)).toEqual({ email: "owner@example.com" });
  });

  it("refuses other emails, wrong audiences, other issuers and expired tokens", async () => {
    expect((await identify(req(await sign({ email: "else@example.com" })), env, keys)).status).toBe(403);
    expect((await identify(req(await sign({ email: "owner@example.com" }, { aud: "other" })), env, keys)).status).toBe(401);
    expect((await identify(req(await sign({ email: "owner@example.com" }, { iss: "https://evil.cloudflareaccess.com" })), env, keys)).status).toBe(401);
    expect((await identify(req(await sign({ email: "owner@example.com" }, { exp: Math.floor(Date.now() / 1000) - 60 })), env, keys)).status).toBe(401);
  });

  it("fails closed with no token or no configuration", async () => {
    expect((await identify(req(null), env, keys)).status).toBe(401);
    expect((await identify(req(await sign({ email: "owner@example.com" })), { ENV: "prod" }, keys)).status).toBe(503);
  });

  it("never honours the local dev identity in production or off localhost", async () => {
    const local = new Request("http://localhost/api/health");
    expect(await identify(local, { ENV: "qa", DEV_EMAIL: "dev@example.com" })).toEqual({ email: "dev@example.com" });
    expect((await identify(local, { ...env, DEV_EMAIL: "dev@example.com" }, keys)).status).toBe(401);
    expect((await identify(req(null), { ...env, ENV: "qa", DEV_EMAIL: "dev@example.com" }, keys)).status).toBe(401);
  });

  it("treats a service token as health-only", async () => {
    expect(await identify(req(await sign({ common_name: "ci.access" })), env, keys)).toEqual({ service: "ci.access" });
  });
});

describe("AI proxy", () => {
  const env = { ENV: "test", ANTHROPIC_API_KEY: "k", AI_MODEL_QUICK: "q", AI_MODEL_DEFAULT: "d", AI_MODEL_COMPLEX: "c", AI_DAILY_CALLS: "5" };
  const account = (allow = true) => ({ aiTick: async () => allow });
  const post = body => new Request("http://localhost/api/ai", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) });
  const upstream = (status, body) => async (url, init) => {
    upstream.last = { url, init: { ...init, body: JSON.parse(init.body) } };
    return new Response(JSON.stringify(body), { status });
  };
  const run = async (body, fetchImpl, acct = account()) => {
    const res = await handleAI(post(body), env, acct, fetchImpl);
    return { status: res.status, body: await res.json() };
  };
  const ok = (text, extra = {}) => upstream(200, { content: [{ type: "text", text }], stop_reason: "end_turn", ...extra });

  it("sends the tier's model with the key and returns text", async () => {
    const r = await run({ input: "hi", modelTier: "complex" }, ok("hello"));
    expect(r).toEqual({ status: 200, body: { text: "hello", truncated: false } });
    expect(upstream.last.init.headers["x-api-key"]).toBe("k");
    expect(upstream.last.init.body).toMatchObject({ model: "c", max_tokens: 4096, messages: [{ role: "user", content: "hi" }] });
    expect(modelFor(env, "nonsense")).toBe("d");
  });

  it("maps upstream outcomes to the app's error codes", async () => {
    expect((await run({ input: "x" }, upstream(429, {}))).body.code).toBe("rate_limited");
    expect((await run({ input: "x" }, upstream(529, {}))).body.code).toBe("rate_limited");
    expect((await run({ input: "x" }, upstream(500, {}))).body.code).toBe("upstream_error");
    expect((await run({ input: "x" }, async () => { throw new Error("net"); })).body.code).toBe("upstream_error");
    expect((await run({ input: "x" }, ok("", { stop_reason: "refusal" }))).body.code).toBe("refused");
    expect((await run({ input: "x" }, ok("   "))).body.code).toBe("empty_completion");
    expect((await run({ input: "x", json: true }, ok("no json here"))).body.code).toBe("invalid_json");
    expect((await run({ input: "x" }, ok("t"), account(false))).body.code).toBe("rate_limited");
    expect((await run("x".repeat(101 * 1024), ok("t"))).body.code).toBe("prompt_too_large");
  });

  it("flags truncation and accepts fenced JSON", async () => {
    const r = await run({ input: "x", json: true }, ok('```json\n{"kcal": 120}\n```', { stop_reason: "max_tokens" }));
    expect(r.body.truncated).toBe(true);
    expect(firstJSON(r.body.text)).toEqual({ kcal: 120 });
  });

  it("refuses without a key", async () => {
    const res = await handleAI(post({ input: "x" }), { ...env, ANTHROPIC_API_KEY: "" }, account(), ok("t"));
    expect(res.status).toBe(503);
  });
});
