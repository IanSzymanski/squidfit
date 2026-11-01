// Squid's own sign-in: a random token in an HttpOnly cookie, hashed and held by the account's Durable Object.
// Access vouches for the email once, at /auth/signin; after that the cookie signs the page in, so the app never
// has to leave its own origin (an iOS Home Screen app cannot finish a sign-in on another domain).

export const COOKIE = "__Host-squid";
export const MAX_AGE_S = 400 * 86400; // browsers cap cookie lifetimes at 400 days
export const RENEW_MS = 86400 * 1000;
const VALUE_RE = /^([0-9a-f]{64})\.([A-Za-z0-9_-]{43})$/;

export function readCookie(request) {
  for (const part of (request.headers.get("cookie") || "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === COOKIE) return part.slice(i + 1).trim();
  }
  return "";
}

export const setCookie = value => `${COOKIE}=${value}; Path=/; Max-Age=${MAX_AGE_S}; Secure; HttpOnly; SameSite=Lax`;

const b64url = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export async function hashToken(token) {
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)));
  return [...d].map(b => b.toString(16).padStart(2, "0")).join("");
}

// Creates a session in the email's account and returns the cookie value: "<account id>.<token>".
export async function openSession(env, email) {
  const id = env.ACCOUNT.idFromName(email);
  const token = b64url(crypto.getRandomValues(new Uint8Array(32)));
  await env.ACCOUNT.get(id).openSession(email, await hashToken(token));
  return `${id.toString()}.${token}`;
}

// Resolves a cookie value to {email, renew} or null. Never throws on a malformed or foreign value.
export async function checkSession(env, value) {
  const m = VALUE_RE.exec(value || "");
  if (!m) return null;
  let id;
  try { id = env.ACCOUNT.idFromString(m[1]); } catch { return null; }
  return env.ACCOUNT.get(id).checkSession(await hashToken(m[2]));
}
