import { Account } from "./account.js";
import { identify } from "./auth.js";
import { handleAI } from "./ai.js";

export { Account };

const json = (data, status = 200) => Response.json(data, { status, headers: { "cache-control": "no-store" } });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    const who = await identify(request, env);
    if (who.status) return json({ code: who.code, message: who.message }, who.status);
    const route = `${request.method} ${url.pathname}`;
    if (route === "GET /api/health") return json({ ok: true, env: env.ENV || "dev", build: env.BUILD || null, ai: !!env.ANTHROPIC_API_KEY });
    if (!who.email) return json({ code: "forbidden", message: "Service tokens may only call /api/health." }, 403);
    const account = env.ACCOUNT.get(env.ACCOUNT.idFromName(who.email));
    switch (route) {
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
