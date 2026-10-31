import { env } from "cloudflare:workers";

let n = 0;
export const freshAccount = () => env.ACCOUNT.get(env.ACCOUNT.idFromName(`t${Date.now()}-${++n}`));

// A test-side WebSocket client speaking the sync protocol to one Account object.
export async function connect(target) {
  const res = await target.fetch("http://localhost/api/sync", { headers: { Upgrade: "websocket" } });
  const ws = res.webSocket;
  if (!ws) throw new Error(`no websocket (status ${res.status})`);
  ws.accept();
  const inbox = [], waiters = [];
  const pump = () => {
    for (let i = 0; i < waiters.length; i++) {
      const w = waiters[i], at = inbox.findIndex(w.pred);
      if (at < 0) continue;
      waiters.splice(i--, 1);
      clearTimeout(w.timer);
      w.resolve(inbox.splice(at, 1)[0]);
    }
  };
  ws.addEventListener("message", e => {
    inbox.push(e.data === "pong" ? { t: "pong" } : JSON.parse(e.data));
    pump();
  });
  let rid = 0;
  const next = (pred = () => true, ms = 2000) => new Promise((resolve, reject) => {
    const w = { pred, resolve, timer: setTimeout(() => reject(new Error("timed out waiting for a message; inbox: " + JSON.stringify(inbox).slice(0, 300))), ms) };
    waiters.push(w);
    pump();
  });
  const none = async (pred, ms = 150) => {
    await new Promise(r => setTimeout(r, ms));
    return !inbox.some(pred);
  };
  const call = (op, extra) => {
    const r = ++rid;
    ws.send(JSON.stringify({ op, rid: r, ...extra }));
    return next(m => m.t === "ack" && m.rid === r);
  };
  const sub = async coll => {
    ws.send(JSON.stringify({ op: "sub", coll }));
    const frames = [await next(m => m.t === "snap" && m.coll === coll && m.first)];
    while (!frames.at(-1).last) frames.push(await next(m => m.t === "snap" && m.coll === coll));
    return frames;
  };
  return { ws, next, none, call, sub, send: m => ws.send(typeof m === "string" ? m : JSON.stringify(m)), close: () => ws.close() };
}
