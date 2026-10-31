import { createRemoteJWKSet, jwtVerify } from "jose";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
let jwks = null, jwksFor = "";

export function teamOrigin(v) {
  const t = String(v || "").trim().replace(/\/+$/, "");
  if (!t) return "";
  if (/^https:\/\//.test(t)) return t;
  return t.includes(".") ? `https://${t}` : `https://${t}.cloudflareaccess.com`;
}

export const allowedEmails = v => String(v || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);

const fail = (status, code, message) => ({ status, code, message });

// Static assets put an internal router in front of this Worker, so ctx.access is never set; the Access JWT is verified here instead.
export async function identify(request, env, keys) {
  if (env.DEV_EMAIL && env.ENV !== "prod" && LOCAL_HOSTS.has(new URL(request.url).hostname)) return { email: env.DEV_EMAIL.toLowerCase() };
  const team = teamOrigin(env.ACCESS_TEAM_DOMAIN);
  const allowed = allowedEmails(env.ALLOWED_EMAIL);
  if (!team || !env.ACCESS_AUD || !allowed.length) return fail(503, "not_configured", "Cloudflare Access is not configured for this Worker.");
  const token = request.headers.get("cf-access-jwt-assertion");
  if (!token) return fail(401, "session_expired", "Sign in again.");
  if (!keys) {
    if (jwksFor !== team) {
      jwks = createRemoteJWKSet(new URL(`${team}/cdn-cgi/access/certs`));
      jwksFor = team;
    }
    keys = jwks;
  }
  let payload;
  try {
    ({ payload } = await jwtVerify(token, keys, { issuer: team, audience: env.ACCESS_AUD }));
  } catch {
    return fail(401, "session_expired", "Sign in again.");
  }
  if (typeof payload.email === "string" && payload.email) {
    const email = payload.email.toLowerCase();
    return allowed.includes(email) ? { email } : fail(403, "forbidden", "This account is not allowed here.");
  }
  if (typeof payload.common_name === "string" && payload.common_name) return { service: payload.common_name };
  return fail(403, "forbidden", "No identity on this request.");
}
