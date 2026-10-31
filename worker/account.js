import { DurableObject } from "cloudflare:workers";

export const MAX_DOC_BYTES = 256 * 1024;
const FRAME_BYTES = 1 << 20;
const COLL_RE = /^[A-Za-z0-9_-]{1,64}$/;
const BACKUP_COLLS = ["days", "foods", "recipes", "rides", "presets", "exercises", "wplans", "workouts", "photos"];
const ID_OF = { days: "d", photos: "d" };
const enc = new TextEncoder();
const q = JSON.stringify;

export function splitPath(path) {
  if (typeof path !== "string" || path.length > 1024) return null;
  const cut = path.indexOf("/");
  if (cut < 1 || cut === path.length - 1) return null;
  const coll = path.slice(0, cut), id = path.slice(cut + 1);
  return COLL_RE.test(coll) ? { coll, id } : null;
}

// One instance per signed-in account: a SQLite doc store with the semantics of the artifact's db capability.
export class Account extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec("CREATE TABLE IF NOT EXISTS docs (coll TEXT NOT NULL, id TEXT NOT NULL, body TEXT NOT NULL, updated INTEGER NOT NULL, PRIMARY KEY (coll, id)) WITHOUT ROWID");
    this.sql.exec("CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL)");
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (request.headers.get("Upgrade") === "websocket") return this.accept();
    if (url.pathname === "/export") return new Response(this.exportText(), { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
    if (url.pathname === "/import" && request.method === "POST") return Response.json(this.importBackup(await request.json(), url.searchParams.get("mode")));
    if (url.pathname === "/reset" && request.method === "POST") return Response.json(this.reset());
    return new Response("Not found", { status: 404 });
  }

  accept() {
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ colls: [], docs: [] });
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, raw) {
    if (typeof raw !== "string") return;
    let m;
    try { m = JSON.parse(raw); } catch { return; }
    if (!m || typeof m !== "object") return;
    const delay = Number(this.env.TEST_LATENCY_MS || 0);
    if (delay > 0 && this.env.ENV !== "prod") await new Promise(r => setTimeout(r, delay));
    switch (m.op) {
      case "sub": return this.subscribe(ws, "colls", m.coll, COLL_RE.test(m.coll || "") && (() => this.sendSnapshot(ws, m.coll)));
      case "unsub": return this.unsubscribe(ws, "colls", m.coll);
      case "subdoc": return this.subscribe(ws, "docs", m.path, splitPath(m.path) && (() => this.send(ws, `{"t":"doc","path":${q(m.path)},"body":${this.read(m.path) ?? "null"}}`)));
      case "unsubdoc": return this.unsubscribe(ws, "docs", m.path);
      case "set": return this.ack(ws, m.rid, this.write(m.path, m.body));
      case "del": return this.ack(ws, m.rid, this.write(m.path, null));
      case "get": {
        const ok = !!splitPath(m.path);
        return this.ack(ws, m.rid, ok ? { ok: true, body: this.read(m.path) ?? "null" } : { ok: false, code: "invalid_argument" });
      }
    }
  }

  webSocketClose(ws, code, reason) {
    try { ws.close(code, reason); } catch {}
  }

  webSocketError() {}

  subscribe(ws, kind, key, start) {
    if (!start) return;
    const att = ws.deserializeAttachment() || { colls: [], docs: [] };
    if (!att[kind].includes(key)) {
      att[kind].push(key);
      ws.serializeAttachment(att);
    }
    start();
  }

  unsubscribe(ws, kind, key) {
    const att = ws.deserializeAttachment();
    if (!att || !att[kind].includes(key)) return;
    att[kind] = att[kind].filter(k => k !== key);
    ws.serializeAttachment(att);
  }

  send(ws, text) {
    try { ws.send(text); } catch {}
  }

  ack(ws, rid, res) {
    if (typeof rid !== "number") return;
    let msg = `{"t":"ack","rid":${rid},"ok":${res.ok}`;
    if (res.code) msg += `,"code":${q(res.code)}`;
    if (res.body !== undefined) msg += `,"body":${res.body}`;
    this.send(ws, msg + "}");
  }

  read(path) {
    const p = splitPath(path);
    if (!p) return null;
    const row = this.sql.exec("SELECT body FROM docs WHERE coll = ? AND id = ?", p.coll, p.id).toArray()[0];
    return row ? row.body : null;
  }

  write(path, body) {
    const p = splitPath(path);
    if (!p) return { ok: false, code: "invalid_argument" };
    let text = null;
    if (body !== null) {
      if (typeof body !== "object" || Array.isArray(body)) return { ok: false, code: "invalid_argument" };
      text = q(body);
      if (enc.encode(text).length > MAX_DOC_BYTES) return { ok: false, code: "invalid_argument" };
    }
    try {
      if (text === null) this.sql.exec("DELETE FROM docs WHERE coll = ? AND id = ?", p.coll, p.id);
      else this.sql.exec("INSERT INTO docs (coll, id, body, updated) VALUES (?, ?, ?, ?) ON CONFLICT (coll, id) DO UPDATE SET body = excluded.body, updated = excluded.updated", p.coll, p.id, text, Date.now());
    } catch (e) {
      return { ok: false, code: /full|quota|exceed/i.test(String(e && e.message)) ? "quota_exceeded" : "unavailable" };
    }
    this.broadcast(p, path, text);
    return { ok: true };
  }

  broadcast(p, path, text) {
    const body = text ?? "null";
    const chg = `{"t":"chg","coll":${q(p.coll)},"id":${q(p.id)},"body":${body}}`;
    const doc = `{"t":"doc","path":${q(path)},"body":${body}}`;
    for (const ws of this.ctx.getWebSockets()) {
      const att = ws.deserializeAttachment();
      if (!att) continue;
      if (att.colls.includes(p.coll)) this.send(ws, chg);
      if (att.docs.includes(path)) this.send(ws, doc);
    }
  }

  sendSnapshot(ws, coll) {
    let items = [], size = 0, first = true;
    const flush = last => {
      this.send(ws, `{"t":"snap","coll":${q(coll)},"first":${first},"last":${last},"docs":[${items.join(",")}]}`);
      items = [];
      size = 0;
      first = false;
    };
    for (const row of this.sql.exec("SELECT id, body FROM docs WHERE coll = ? ORDER BY id", coll)) {
      const item = `[${q(row.id)},${row.body}]`;
      if (size + item.length > FRAME_BYTES && items.length) flush(false);
      items.push(item);
      size += item.length;
    }
    flush(true);
  }

  // The whole account in the app's Full backup shape (format 4), built from stored JSON without re-parsing.
  exportText() {
    const parts = [`"app":"squid"`, `"version":4`, `"exported":${q(new Date().toISOString())}`, `"settings":${this.read("settings/main") ?? "null"}`];
    for (const coll of [...BACKUP_COLLS, "pix"]) {
      const rows = this.sql.exec("SELECT body FROM docs WHERE coll = ? ORDER BY id", coll).toArray().map(r => r.body);
      parts.push(`${q(coll)}:[${rows.join(",")}]`);
    }
    return `{${parts.join(",")}}`;
  }

  // Non-production only (the Worker gates it): seeds an account from a Full backup.
  importBackup(b, mode) {
    if (!b || b.app !== "squid") return { ok: false, code: "invalid_argument" };
    if (mode === "replace") this.sql.exec("DELETE FROM docs");
    const have = (coll, id) => this.sql.exec("SELECT 1 FROM docs WHERE coll = ? AND id = ?", coll, id).toArray().length > 0;
    const put = (coll, id, body) => {
      if (typeof id !== "string" || !id || !body || typeof body !== "object") return 0;
      if (mode === "fill" && have(coll, id)) return 0;
      this.sql.exec("INSERT OR REPLACE INTO docs (coll, id, body, updated) VALUES (?, ?, ?, ?)", coll, id, q(body), Date.now());
      return 1;
    };
    let written = 0;
    if (b.settings) written += put("settings", "main", b.settings);
    for (const coll of BACKUP_COLLS) for (const rec of Array.isArray(b[coll]) ? b[coll] : []) written += put(coll, rec && rec[ID_OF[coll] || "id"], rec);
    for (const px of Array.isArray(b.pix) ? b.pix : []) written += put("pix", px && px.id, px);
    return { ok: true, written };
  }

  reset() {
    this.sql.exec("DELETE FROM docs");
    this.sql.exec("DELETE FROM meta");
    return { ok: true };
  }

  // Counts one AI call against today's (UTC) allowance; false once the cap is reached.
  aiTick(limit) {
    const day = new Date().toISOString().slice(0, 10);
    const row = this.sql.exec("SELECT v FROM meta WHERE k = 'ai'").toArray()[0];
    let st = row ? JSON.parse(row.v) : null;
    if (!st || st.day !== day) st = { day, n: 0 };
    if (st.n >= limit) return false;
    st.n++;
    this.sql.exec("INSERT OR REPLACE INTO meta (k, v) VALUES ('ai', ?)", q(st));
    return true;
  }
}
