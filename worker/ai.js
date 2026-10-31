const TIER_VAR = { quick: "AI_MODEL_QUICK", default: "AI_MODEL_DEFAULT", complex: "AI_MODEL_COMPLEX" };
const MAX_INPUT = 100 * 1024;
const MAX_TOKENS = 4096;
const TIMEOUT_MS = 60000;

export const fail = (code, status, message) => Response.json({ code, message: message || code }, { status, headers: { "cache-control": "no-store" } });

export function firstJSON(text) {
  const s = String(text || "").replace(/```(?:json)?/gi, "");
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a < 0 || b <= a) return undefined;
  try { return JSON.parse(s.slice(a, b + 1)); } catch { return undefined; }
}

function messagesOf(input) {
  if (typeof input === "string" && input.trim()) return [{ role: "user", content: input }];
  if (!Array.isArray(input) || !input.length) return null;
  const ok = input.every(t => t && (t.role === "user" || t.role === "assistant") && (typeof t.content === "string" || Array.isArray(t.content)));
  return ok && input.at(-1).role === "user" ? input.map(t => ({ role: t.role, content: t.content })) : null;
}

export function modelFor(env, tier) {
  return env[TIER_VAR[tier] || TIER_VAR.default] || env.AI_MODEL_DEFAULT;
}

// POST /api/ai {input, modelTier, json} -> {text, truncated}; errors use the codes the app's AI_ERR table already shows.
export async function handleAI(request, env, account, fetchImpl = fetch) {
  if (!env.ANTHROPIC_API_KEY) return fail("not_granted", 503, "No API key is set for this Worker.");
  const raw = await request.text();
  if (raw.length > MAX_INPUT) return fail("prompt_too_large", 413);
  let req;
  try { req = JSON.parse(raw); } catch { return fail("invalid_argument", 400); }
  const messages = messagesOf(req && req.input);
  if (!messages) return fail("invalid_argument", 400);
  const limit = Number(env.AI_DAILY_CALLS || 60);
  if (!(await account.aiTick(limit))) return fail("rate_limited", 429, "Daily AI allowance used up.");
  let res;
  try {
    res = await fetchImpl(env.AI_API_URL || "https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: modelFor(env, req.modelTier), max_tokens: MAX_TOKENS, messages }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return fail("upstream_error", 502);
  }
  if (res.status === 429 || res.status === 529) return fail("rate_limited", 429);
  if (res.status === 413) return fail("prompt_too_large", 413);
  if (!res.ok) {
    let detail = "";
    try { detail = (await res.json()).error.message; } catch {}
    if (res.status === 400 && /too long|too large|context/i.test(detail)) return fail("prompt_too_large", 413, detail);
    return fail("upstream_error", 502, detail || `upstream ${res.status}`);
  }
  let data;
  try { data = await res.json(); } catch { return fail("upstream_error", 502); }
  if (env.ENV !== "prod" || env.AI_LOG_USAGE === "1") console.log("ai usage", JSON.stringify({ model: data.model, usage: data.usage, stop: data.stop_reason }));
  if (data.stop_reason === "refusal") return fail("refused", 422);
  const text = (data.content || []).filter(b => b && b.type === "text").map(b => b.text).join("");
  if (!text.trim()) return fail("empty_completion", 502);
  if (req.json && firstJSON(text) === undefined) return fail("invalid_json", 502);
  return Response.json({ text, truncated: data.stop_reason === "max_tokens" }, { headers: { "cache-control": "no-store" } });
}
