import { createRemoteJWKSet, jwtVerify } from "jose";
import { readCookie, checkSession } from "./session.js";

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

const devIdentity = (request, env) => env.DEV_EMAIL && env.ENV !== "prod" && LOCAL_HOSTS.has(new URL(request.url).hostname) ? { email: env.DEV_EMAIL.toLowerCase(), dev: true } : null;

// Who is calling /api: the local dev identity, Squid's own session cookie, or (while Access still covers the whole site) an Access
// token. 401 means only "not signed in", which the page answers with its sign-in screen; a Worker that is configured wrong
// answers 403 or 503, because signing in again cannot fix that.
export async function identify(request, env, keys) {
  const dev = devIdentity(request, env);
  if (dev) return dev;
  const allowed = allowedEmails(env.ALLOWED_EMAIL);
  if (!allowed.length) return fail(503, "not_configured", "Set ALLOWED_EMAIL for this Worker.");
  const value = readCookie(request);
  if (value) {
    const s = await checkSession(env, value);
    if (s && allowed.includes(s.email)) return { email: s.email, session: value, renew: s.renew };
  }
  if (request.headers.get("cf-access-jwt-assertion")) return accessIdentity(request, env, keys);
  return fail(401, "signed_out", "Not signed in.");
}

// Who is signing in at /auth/signin: the local dev identity or Access, which must cover that path.
export async function signInIdentity(request, env, keys) {
  return devIdentity(request, env) || accessIdentity(request, env, keys);
}

// Static assets put an internal router in front of this Worker, so ctx.access is never set; the Access JWT is verified here instead.
export async function accessIdentity(request, env, keys) {
  const team = teamOrigin(env.ACCESS_TEAM_DOMAIN);
  const allowed = allowedEmails(env.ALLOWED_EMAIL);
  if (!team || !env.ACCESS_AUD || !allowed.length) return fail(503, "not_configured", "Cloudflare Access is not configured for this Worker: set ACCESS_TEAM_DOMAIN, ACCESS_AUD and ALLOWED_EMAIL.");
  const token = request.headers.get("cf-access-jwt-assertion");
  if (!token) return fail(403, "access_missing", "No Cloudflare Access token: Access does not cover /auth/signin.");
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
    return fail(403, "access_rejected", "The Access token did not verify: check ACCESS_TEAM_DOMAIN (your current Zero Trust team name) and ACCESS_AUD (this application's AUD tag).");
  }
  const email = typeof payload.email === "string" ? payload.email.toLowerCase() : "";
  if (!email) return fail(403, "forbidden", "No email on this Access token.");
  return allowed.includes(email) ? { email } : fail(403, "forbidden", "This account is not allowed here.");
}
