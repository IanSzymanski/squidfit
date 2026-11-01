// Cloudflare host: answers window.claude.use("db" | "sample" | "downloads") from the Worker, with the artifact runtime's call shapes.
(() => {
"use strict";

if (window.claude && typeof window.claude.use === "function") return;

const QUEUE_MS = 20000, SENT_MS = 60000, PING_MS = 25000, PONG_MS = 8000, WAKE_PONG_MS = 4000;
const XHR = { "X-Requested-With": "XMLHttpRequest" };
const hostErr = (code, message) => Object.assign(new Error(message || code), { code });

function deepFreeze(v) {
  if (v && typeof v === "object" && !Object.isFrozen(v)) {
    Object.freeze(v);
    for (const k in v) deepFreeze(v[k]);
  }
  return v;
}

function firstJSON(text) {
  const s = String(text || "").replace(/```(?:json)?/gi, "");
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a < 0 || b <= a) return undefined;
  try { return JSON.parse(s.slice(a, b + 1)); } catch (e) { return undefined; }
}

const later = fn => setTimeout(fn, 0);

function emit(l, value) {
  try { l.next(value); } catch (e) { console.error(e); }
}

// Session: Squid's own cookie, issued at /auth/signin (the only path Access covers). /api/session renews it on each launch.
// A 401, or a redirect from Access while it still covers the whole site, means signed out. Signing in leaves the page, and an
// iOS Home Screen app cannot finish a sign-in on Access's domain, so there it gets its cookie from Safari when it is added.
let signedOut = false, probing = false;

async function sessionGone() {
  try {
    const r = await fetch("/api/session", { headers: XHR, redirect: "manual", cache: "no-store", credentials: "same-origin" });
    if (r.type === "opaqueredirect" || r.status === 401) return true;
    if (!r.ok) console.error("Squid sync unavailable:", r.status, await r.text().catch(() => ""));
    return false;
  } catch (e) {
    return false;
  }
}

async function checkSession() {
  if (probing || signedOut) return;
  probing = true;
  try {
    if (await sessionGone()) showSignIn();
  } finally {
    probing = false;
  }
}

function showSignIn() {
  if (signedOut) return;
  signedOut = true;
  clearTimeout(sock.retry);
  const box = document.createElement("div");
  box.id = "signin";
  const wm = document.createElement("span");
  wm.className = "wm";
  wm.textContent = "Squid";
  box.append(wm);
  if (navigator.standalone === true) {
    const p = document.createElement("p");
    p.textContent = "Sign in to Squid in Safari, then add it to your Home Screen again.";
    box.append(p);
  } else {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "btn pri";
    b.textContent = "Sign in";
    b.addEventListener("click", () => location.assign("/auth/signin"));
    box.append(b);
  }
  const mount = () => document.body.append(box);
  if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount, { once: true });
}

// Socket: one per page; subscriptions and unacknowledged requests are replayed after every reconnect.
const sock = { ws: null, open: false, everOpen: false, dropped: 0, attempt: 0, retry: 0, ping: 0, pong: 0, rid: 0 };
const ops = new Map();
const colls = new Map();
const docs = new Map();

function frame(msg) {
  if (!sock.open) return false;
  try {
    sock.ws.send(JSON.stringify(msg));
    return true;
  } catch (e) {
    return false;
  }
}

function arm(op, ms) {
  clearTimeout(op.timer);
  op.timer = setTimeout(() => settle(op.msg.rid, { ok: false, code: "unavailable" }), ms);
}

function transmit(op) {
  if (frame(op.msg)) {
    op.sent = true;
    arm(op, SENT_MS);
  }
}

function request(msg) {
  return new Promise((resolve, reject) => {
    const op = { msg: { ...msg, rid: ++sock.rid }, resolve, reject, sent: false, timer: 0 };
    ops.set(op.msg.rid, op);
    arm(op, QUEUE_MS);
    if (sock.open) transmit(op); else ensureSocket();
  });
}

function settle(rid, m) {
  const op = ops.get(rid);
  if (!op) return;
  ops.delete(rid);
  clearTimeout(op.timer);
  if (m.ok) op.resolve(m); else op.reject(hostErr(m.code || "unavailable"));
}

function ensureSocket() {
  if (!sock.ws && !sock.retry && !signedOut) connect();
}

function connect() {
  clearTimeout(sock.retry);
  sock.retry = 0;
  if (sock.ws) return;
  let ws;
  try {
    ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/api/sync`);
  } catch (e) {
    schedule();
    return;
  }
  sock.ws = ws;
  let opened = false;
  ws.onopen = () => {
    if (sock.ws !== ws) return;
    opened = true;
    sock.open = true;
    sock.attempt = 0;
    colls.forEach((c, coll) => {
      if (!c.listeners.size) return;
      c.building = null;
      frame({ op: "sub", coll });
    });
    docs.forEach((d, path) => {
      if (d.listeners.size) frame({ op: "subdoc", path });
    });
    ops.forEach(op => {
      if (!op.sent) transmit(op);
    });
    heartbeat();
    const again = sock.everOpen;
    sock.everOpen = true;
    if (again) window.dispatchEvent(new CustomEvent("squid:online", { detail: { since: sock.dropped - SENT_MS } }));
  };
  ws.onmessage = e => {
    if (sock.ws !== ws) return;
    if (e.data === "pong") {
      clearTimeout(sock.pong);
      return;
    }
    let m;
    try { m = JSON.parse(e.data); } catch (err) { return; }
    if (m.t === "ack") settle(m.rid, m);
    else if (m.t === "snap") onSnap(m);
    else if (m.t === "chg") onChg(m);
    else if (m.t === "doc") onDoc(m);
  };
  ws.onclose = () => lost(ws, opened);
  ws.onerror = () => {};
}

function lost(ws, opened) {
  if (sock.ws !== ws) return;
  if (sock.open) sock.dropped = Date.now();
  sock.ws = null;
  sock.open = false;
  clearTimeout(sock.ping);
  clearTimeout(sock.pong);
  ws.onopen = ws.onmessage = ws.onclose = null;
  try { ws.close(); } catch (e) {}
  ops.forEach(op => {
    if (!op.sent) return;
    op.sent = false;
    arm(op, QUEUE_MS);
  });
  if (!opened) checkSession();
  schedule();
}

function schedule() {
  if (sock.retry || signedOut) return;
  sock.retry = setTimeout(connect, Math.min(15000, 500 * 2 ** sock.attempt++));
}

function probe(ms) {
  if (!sock.open) return;
  const ws = sock.ws;
  try { ws.send("ping"); } catch (e) {}
  clearTimeout(sock.pong);
  sock.pong = setTimeout(() => lost(ws, true), ms);
}

function heartbeat() {
  clearTimeout(sock.ping);
  sock.ping = setTimeout(() => {
    probe(PONG_MS);
    heartbeat();
  }, PING_MS);
}

function wake() {
  if (document.hidden || signedOut) return;
  if (sock.open) probe(WAKE_PONG_MS);
  else if (colls.size || docs.size || ops.size) {
    sock.attempt = 0;
    connect();
  }
}

document.addEventListener("visibilitychange", wake);
window.addEventListener("online", wake);
window.addEventListener("pageshow", wake);

// Collections: each listener keeps what it last saw, so a reconnect delivers only the difference.
function change(type, id, text) {
  return { type, doc: { id, exists: type !== "removed", data: () => deepFreeze(JSON.parse(text)) } };
}

function snapshot(l, changes) {
  const seen = l.seen;
  return {
    empty: seen.size === 0,
    size: seen.size,
    get docs() {
      return [...seen].map(([id, text]) => change("added", id, text).doc);
    },
    docChanges: () => changes,
    forEach(fn) {
      this.docs.forEach(fn);
    },
  };
}

function deliverColl(c, l, onlyId) {
  if (!c.view) return;
  if (!l.seen) {
    l.seen = new Map(c.view);
    emit(l, snapshot(l, [...c.view].map(([id, text]) => change("added", id, text))));
    return;
  }
  const changes = [];
  const ids = onlyId !== undefined ? [onlyId] : new Set([...l.seen.keys(), ...c.view.keys()]);
  ids.forEach(id => {
    const was = l.seen.get(id), now = c.view.get(id);
    if (was === now) return;
    if (now === undefined) {
      l.seen.delete(id);
      changes.push(change("removed", id, was));
    } else {
      l.seen.set(id, now);
      changes.push(change(was === undefined ? "added" : "modified", id, now));
    }
  });
  if (changes.length) emit(l, snapshot(l, changes));
}

function onSnap(m) {
  const c = colls.get(m.coll);
  if (!c) return;
  if (m.first) c.building = new Map();
  if (!c.building) return;
  m.docs.forEach(([id, body]) => c.building.set(id, JSON.stringify(body)));
  if (!m.last) return;
  c.view = c.building;
  c.building = null;
  c.listeners.forEach(l => deliverColl(c, l));
}

function onChg(m) {
  const c = colls.get(m.coll);
  if (!c) return;
  const text = m.body === null ? undefined : JSON.stringify(m.body);
  const put = map => text === undefined ? map.delete(m.id) : map.set(m.id, text);
  if (c.building) put(c.building);
  if (!c.view) return;
  put(c.view);
  c.listeners.forEach(l => {
    if (l.seen) deliverColl(c, l, m.id);
  });
}

function subscribeColl(coll, next) {
  let c = colls.get(coll);
  if (!c) colls.set(coll, c = { view: null, building: null, listeners: new Set });
  const l = { next, seen: null };
  const first = !c.listeners.size;
  c.listeners.add(l);
  if (first) {
    c.view = null;
    if (sock.open) frame({ op: "sub", coll }); else ensureSocket();
  } else if (c.view) later(() => {
    if (c.listeners.has(l) && !l.seen) deliverColl(c, l);
  });
  return () => {
    if (!c.listeners.delete(l) || c.listeners.size) return;
    c.view = null;
    frame({ op: "unsub", coll });
  };
}

// Single documents.
function docSnap(path, text) {
  return { id: path.slice(path.indexOf("/") + 1), exists: text !== null, data: () => text === null ? undefined : deepFreeze(JSON.parse(text)) };
}

function deliverDoc(path, d, l) {
  if (d.text === undefined || (l.started && l.seen === d.text)) return;
  l.started = true;
  l.seen = d.text;
  emit(l, docSnap(path, d.text));
}

function onDoc(m) {
  const d = docs.get(m.path);
  if (!d) return;
  d.text = m.body === null ? null : JSON.stringify(m.body);
  d.listeners.forEach(l => deliverDoc(m.path, d, l));
}

function subscribeDoc(path, next) {
  let d = docs.get(path);
  if (!d) docs.set(path, d = { text: undefined, listeners: new Set });
  const l = { next, started: false, seen: undefined };
  const first = !d.listeners.size;
  d.listeners.add(l);
  if (first) {
    d.text = undefined;
    if (sock.open) frame({ op: "subdoc", path }); else ensureSocket();
  } else later(() => {
    if (d.listeners.has(l)) deliverDoc(path, d, l);
  });
  return () => {
    if (!d.listeners.delete(l) || d.listeners.size) return;
    d.text = undefined;
    frame({ op: "unsubdoc", path });
  };
}

function docRef(path) {
  return Object.freeze({
    id: path.slice(path.indexOf("/") + 1),
    path,
    get: () => request({ op: "get", path }).then(r => docSnap(path, r.body == null ? null : JSON.stringify(r.body))),
    set: body => request({ op: "set", path, body }).then(() => undefined),
    delete: () => request({ op: "del", path }).then(() => undefined),
    onSnapshot: next => subscribeDoc(path, next),
  });
}

const db = Object.freeze({
  doc: docRef,
  collection: name => Object.freeze({
    id: name,
    doc: id => docRef(name + "/" + id),
    onSnapshot: next => subscribeColl(name, next),
  }),
});

// AI: the Worker holds the key and the daily cap; this keeps the artifact's sample() call shape.
async function ask(input, opts, json) {
  opts = opts || {};
  let r;
  try {
    r = await fetch("/api/ai", {
      method: "POST",
      headers: { ...XHR, "content-type": "application/json" },
      redirect: "manual",
      credentials: "same-origin",
      signal: opts.signal,
      body: JSON.stringify({ input, modelTier: opts.modelTier || "default", json: !!json }),
    });
  } catch (e) {
    throw hostErr(e && e.name === "AbortError" ? "cancelled" : "upstream_error");
  }
  if (r.type === "opaqueredirect" || r.status === 401) {
    showSignIn();
    throw hostErr("session_expired");
  }
  let body = null;
  try { body = await r.json(); } catch (e) {}
  if (!r.ok || !body) throw hostErr(body && body.code || "upstream_error", body && body.message);
  return { text: String(body.text || ""), truncated: !!body.truncated };
}

const sample = (input, opts) => ask(input, opts, false);
sample.json = async (input, opts) => {
  const v = firstJSON((await ask(input, opts, true)).text);
  if (v === undefined) throw hostErr("invalid_json");
  return v;
};
sample.limits = async () => ({ images: false });
Object.freeze(sample);

// Files: the share sheet on touch devices (iOS "Save to Files" in standalone mode), a plain download elsewhere.
const downloads = Object.freeze({
  async save({ filename, data, mimeType }) {
    const type = mimeType || (/\.json$/i.test(filename) ? "application/json" : /\.csv$/i.test(filename) ? "text/csv" : "text/plain");
    const file = new File([data], filename, { type });
    const touch = window.matchMedia && matchMedia("(pointer:coarse)").matches;
    if (touch && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return;
      } catch (e) {
        if (e && e.name === "AbortError") throw hostErr("cancelled");
      }
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  },
});

let health = null;
const healthCheck = () => health || (health = fetch("/api/health", { headers: XHR, cache: "no-store", credentials: "same-origin" })
  .then(r => r.ok ? r.json() : null)
  .catch(() => null));

async function use(name) {
  await new Promise(later);
  if (name === "db") return db;
  if (name === "downloads") return downloads;
  if (name === "sample") {
    const h = await healthCheck();
    return h && h.ai === false ? null : sample;
  }
  return null;
}

checkSession();

try {
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
} catch (e) {}

window.claude = Object.freeze({ use });
})();
