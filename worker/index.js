import { Account } from "./account.js";
import { identify, signInIdentity } from "./auth.js";
import { handleAI } from "./ai.js";
import { openSession, setCookie } from "./session.js";

export { Account };

const json = (data, status = 200, headers = {}) => Response.json(data, { status, headers: { "cache-control": "no-store", ...headers } });

// Browsers send Origin on every WebSocket handshake and POST; one from another site must not act with this site's cookie.
const foreign = (request, url) => {
  const origin = request.headers.get("origin");
  return !!origin && origin !== url.origin;
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/auth/signin") return signIn(request, env);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    const route = `${request.method} ${url.pathname}`;
    if (route === "GET /api/health") return json({ ok: true, env: env.ENV || "dev", build: env.BUILD || null, ai: !!env.ANTHROPIC_API_KEY });
    if ((request.method !== "GET" || request.headers.has("upgrade")) && foreign(request, url)) return json({ code: "forbidden", message: "Cross-site request refused." }, 403);
    const who = await identify(request, env);
    if (who.status) return json({ code: who.code, message: who.message }, who.status);
    const account = env.ACCOUNT.get(env.ACCOUNT.idFromName(who.email));
    switch (route) {
      case "GET /api/session":
        return session(env, who);
      case "GET /api/sync":
        if (request.headers.get("Upgrade") !== "websocket") return json({ code: "upgrade_required" }, 426);
        return account.fetch(request);
      case "POST /api/ai":
        return handleAI(request, env, account);
      case "GET /api/export":
        return account.fetch(new Request("https://account/export"));
    }
    if (env.ENV !== "prod") {
      if (route === "POST /api/import") return account.fetch(new Request(`https://account/import?mode=${url.searchParams.get("mode") === "fill" ? "fill" : "replace"}`, { method: "POST", body: request.body }));
      if (route === "POST /api/reset") return account.fetch(new Request("https://account/reset", { method: "POST" }));
    }
    return json({ code: "not_found" }, 404);
  },
};

// Access covers this path only. It vouches for the email once; the session cookie does the rest.
async function signIn(request, env) {
  if (request.method !== "GET") return json({ code: "method_not_allowed" }, 405);
  const who = await signInIdentity(request, env);
  if (who.status) return json({ code: who.code, message: who.message }, who.status);
  return new Response(null, { status: 303, headers: { location: "/", "set-cookie": setCookie(await openSession(env, who.email)), "cache-control": "no-store" } });
}

// Called on every launch: restarts the cookie's 400 days at most once a day, and gives a page that came in through
// Access (while Access still covers the whole site) a session of its own.
async function session(env, who) {
  if (who.dev) return json({ ok: true });
  if (who.session && !who.renew) return json({ ok: true });
  return json({ ok: true }, 200, { "set-cookie": setCookie(who.session || await openSession(env, who.email)) });
}
