// End-to-end: the built app against `wrangler dev --env qa`, driven in Chromium. Synthetic data only.
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdirSync, rmSync } from "node:fs";
import { strict as assert } from "node:assert";
import { chromium } from "playwright";

const PORT = 8799, AI_PORT = 8798, ORIGIN = `http://127.0.0.1:${PORT}`;
const PERSIST = ".wrangler/e2e", SHOTS = "test-results/e2e";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];

async function until(what, fn, ms = 15000, every = 100) {
  const end = Date.now() + ms;
  let last;
  while (Date.now() < end) {
    try {
      last = await fn();
      if (last) return last;
    } catch (e) {
      last = e;
    }
    await sleep(every);
  }
  throw new Error(`timed out: ${what} (last: ${last instanceof Error ? last.message : JSON.stringify(last)})`);
}

// Mock Anthropic API: records requests, answers with a fixed JSON food.
const aiCalls = [];
const ai = createServer((req, res) => {
  let body = "";
  req.on("data", c => body += c);
  req.on("end", () => {
    aiCalls.push({ headers: req.headers, body: JSON.parse(body) });
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ model: "mock", stop_reason: "end_turn", usage: { input_tokens: 10, output_tokens: 10 }, content: [{ type: "text", text: '```json\n{"name":"Test bar","kcal":210,"p":20,"c":22,"f":7,"unit":"bar","g":60}\n```' }] }));
  });
});

let worker = null;
function startWorker() {
  worker = spawn("npx", ["wrangler", "dev", "--env", "qa", "--ip", "127.0.0.1", "--port", String(PORT), "--persist-to", PERSIST,
    "--var", "DEV_EMAIL:e2e@example.com", "--var", "ANTHROPIC_API_KEY:test-key", "--var", `AI_API_URL:http://127.0.0.1:${AI_PORT}/v1/messages`,
    "--var", "BUILD:e2e", "--show-interactive-dev-session=false"], { stdio: ["ignore", "pipe", "pipe"], detached: true, env: { ...process.env, NO_PROXY: "127.0.0.1,localhost", no_proxy: "127.0.0.1,localhost" } });
  let log = "";
  worker.stdout.on("data", d => log += d);
  worker.stderr.on("data", d => log += d);
  worker.log = () => log;
  return until("worker up", async () => (await fetch(`${ORIGIN}/api/health`)).ok, 60000, 300);
}

async function stopWorker() {
  if (!worker) return;
  const w = worker;
  worker = null;
  try { process.kill(-w.pid, "SIGTERM"); } catch {}
  await new Promise(r => { w.once("exit", r); setTimeout(r, 5000); });
}

const api = (path, init) => fetch(ORIGIN + path, init);
const exportAll = async () => (await api("/api/export")).json();

// Synthetic account shaped like a real one: a year of days with entries, plus photo sessions near the doc size limit.
function synthBackup(imgs) {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const names = ["Chicken breast", "Rice, cooked", "Banana", "Greek yogurt", "Oats", "Eggs", "Pretzels", "Beef, ground", "Potato, baked", "Whey shake"];
  const days = [];
  const start = Date.UTC(2025, 9, 1);
  for (let i = 0; i < 396; i++) {
    const d = new Date(start + i * 864e5).toISOString().slice(0, 10);
    const entries = Array.from({ length: 4 + Math.floor(rnd() * 8) }, (_, k) => {
      const kcal = Math.round(60 + rnd() * 500);
      return { id: `e${i}-${k}`, t: `${String(6 + k * 2).padStart(2, "0")}:00`, name: names[Math.floor(rnd() * names.length)], src: null, g: 100, unit: "g", qty: 100, kcal, p: Math.round(kcal * 0.08), c: Math.round(kcal * 0.1), f: Math.round(kcal * 0.03), alc: 0 };
    });
    days.push({ d, wKg: +(105 - i * 0.03 + rnd()).toFixed(2), wT: "07:00", note: "", entries });
  }
  const photos = imgs.map((_, i) => ({ d: days[i * 60].d, shots: { front: { id: `px${i}` } } }));
  const pix = imgs.map((img, i) => ({ id: `px${i}`, img }));
  return { app: "squid", version: 4, exported: new Date().toISOString(), settings: null, days, foods: [], recipes: [], rides: [], presets: [], exercises: [], wplans: [], workouts: [], photos, pix };
}

async function test(name, fn) {
  const t0 = Date.now();
  try {
    await fn();
    results.push([true, name, Date.now() - t0]);
    console.log(`  ok   ${name} (${Date.now() - t0} ms)`);
  } catch (e) {
    results.push([false, name, Date.now() - t0]);
    console.log(`  FAIL ${name}\n       ${String(e && e.stack || e).split("\n").slice(0, 4).join("\n       ")}`);
  }
}

async function main() {
  rmSync(PERSIST, { recursive: true, force: true });
  mkdirSync(SHOTS, { recursive: true });
  await new Promise(r => ai.listen(AI_PORT, "127.0.0.1", r));
  await startWorker();
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, deviceScaleFactor: 2, acceptDownloads: true });
  const errors = [];
  const open = async () => {
    const p = await ctx.newPage();
    p.on("pageerror", e => errors.push(String(e)));
    p.on("console", m => { if (m.type() === "error" && !/ERR_CONNECTION_REFUSED/.test(m.text())) errors.push(m.text()); });
    await p.goto(ORIGIN + "/");
    return p;
  };
  const booted = async p => {
    try {
      await until("app booted", () => p.evaluate(() => !document.getElementById("splash") && !!DB && BOOTCOLLS.every(c => BOOTSEEN.has(c))), 20000);
    } catch (e) {
      const state = await p.evaluate(() => ({ splash: !!document.getElementById("splash"), db: !!DB, seen: [...BOOTSEEN], pending: PENDING.size })).catch(err => String(err));
      throw new Error(`${e.message}; page state ${JSON.stringify(state)}`);
    }
  };

  const gen = await browser.newPage();
  const imgs = await gen.evaluate(() => Array.from({ length: 6 }, (_, i) => {
    const c = document.createElement("canvas");
    c.width = 600; c.height = 800;
    const g = c.getContext("2d"), im = g.createImageData(600, 800);
    for (let k = 0; k < im.data.length; k++) im.data[k] = (k * 2654435761 + i * 97) >>> 24;
    g.putImageData(im, 0, 0);
    return c.toDataURL("image/jpeg", 0.5);
  }));
  await gen.close();
  const backup = synthBackup(imgs);

  console.log("e2e: app on Cloudflare (wrangler dev, env qa)");

  await test("serves the page with the home-screen head and security headers", async () => {
    const res = await api("/");
    const html = await res.text();
    assert.equal(res.status, 200);
    assert.match(html, /<link rel="manifest" href="\/manifest.webmanifest" crossorigin="use-credentials">/);
    assert.match(res.headers.get("content-security-policy") || "", /frame-ancestors 'none'/);
    assert.equal((await api("/manifest.webmanifest")).status, 200);
    assert.equal((await api("/icons/apple-touch-icon.png")).status, 200);
  });

  await test("imports a year of synthetic data and the export returns it unchanged", async () => {
    const imp = await (await api("/api/import?mode=replace", { method: "POST", body: JSON.stringify(backup) })).json();
    assert.equal(imp.written, backup.days.length + backup.photos.length + backup.pix.length);
    const out = await exportAll();
    assert.deepEqual(out.days, backup.days);
    assert.deepEqual(out.pix, backup.pix);
    assert.ok(Math.max(...backup.pix.map(p => JSON.stringify(p).length)) > 30000, "photo docs should be realistically large");
  });

  let A, B;
  await test("boots from the account: every day arrives, Data page says the account syncs", async () => {
    A = await open();
    await booted(A);
    assert.equal(await A.evaluate(() => DAYS.size), backup.days.length);
    assert.equal(await A.evaluate(() => PHOTOS.size), backup.photos.length);
    await A.evaluate(() => go("data"));
    await until("sync row", () => A.evaluate(() => document.getElementById("p-data").innerText.includes("your account")));
    const settings = (await exportAll()).settings;
    assert.ok(settings && typeof settings === "object", "the app writes settings/main on first boot");
  });

  await test("HOST-4: delivered documents are deeply frozen", async () => {
    assert.equal(await A.evaluate(async () => {
      const s = await DB.doc("days/" + [...DAYS.keys()][0]).get();
      const v = s.data();
      return Object.isFrozen(v) && Object.isFrozen(v.entries) && Object.isFrozen(v.entries[0]);
    }), true);
  });

  await test("a photo loads from the account, not a device cache", async () => {
    const img = await A.evaluate(async () => {
      PIXMEM.clear();
      return pixGet("px3");
    });
    assert.equal(img, imgs[3]);
  });

  await test("live sync: a write on one page reaches another within a second", async () => {
    B = await open();
    await booted(B);
    await A.evaluate(() => put("days/2099-01-01", migrateDay({ d: "2099-01-01", wKg: 99.5, entries: [] })));
    await until("B sees the day", () => B.evaluate(() => DAYS.has("2099-01-01") && DAYS.get("2099-01-01").wKg === 99.5), 2000, 50);
    assert.equal((await exportAll()).days.find(d => d.d === "2099-01-01").wKg, 99.5);
  });

  await test("a delete propagates, leaves a tombstone, and stays deleted after relaunch", async () => {
    await A.evaluate(() => {
      DAYS.delete("2099-01-01");
      return del("days/2099-01-01");
    });
    await until("B drops the day", () => B.evaluate(() => !DAYS.has("2099-01-01")), 2000, 50);
    const out = await exportAll();
    assert.ok(!out.days.some(d => d.d === "2099-01-01"));
    await B.reload();
    await booted(B);
    assert.equal(await B.evaluate(() => DAYS.has("2099-01-01")), false);
  });

  await test("bulk upload (putMany, two workers) lands every record", async () => {
    const n = await A.evaluate(async () => {
      const items = Array.from({ length: 150 }, (_, i) => {
        const d = new Date(Date.UTC(2030, 0, 1) + i * 864e5).toISOString().slice(0, 10);
        const rec = migrateDay({ d, wKg: 90, entries: [{ name: "Bulk", kcal: 100, g: 100 }] });
        DAYS.set(d, rec);
        return ["days/" + d, rec];
      });
      return putMany(items);
    });
    assert.equal(n, 0, "no failed writes");
    assert.equal((await exportAll()).days.filter(d => d.d.startsWith("2030-")).length, 150);
    assert.equal(await A.evaluate(() => [...PENDING.keys()].filter(p => p.startsWith("days/2030-")).length), 0);
  });

  await test("writes and deletes made while the server is down land after it returns", async () => {
    await stopWorker();
    await A.evaluate(() => {
      const rec = migrateDay({ d: "2099-02-02", wKg: 88, entries: [] });
      DAYS.set("2099-02-02", rec);
      put("days/2099-02-02", rec);
      DAYS.delete("2030-01-01");
      del("days/2030-01-01");
    });
    assert.equal(await A.evaluate(() => PENDING.has("days/2099-02-02")), true);
    await sleep(1500);
    await startWorker();
    await until("pending write flushed", () => A.evaluate(() => !PENDING.has("days/2099-02-02")), 30000, 200);
    const out = await exportAll();
    assert.equal(out.days.find(d => d.d === "2099-02-02").wKg, 88);
    assert.ok(!out.days.some(d => d.d === "2030-01-01"), "the delete made while offline reached the account");
    await until("B caught up", () => B.evaluate(() => DAYS.has("2099-02-02") && !DAYS.has("2030-01-01")), 15000, 200);
  });

  await test("AI goes through the Worker with the tier's model and parses fenced JSON", async () => {
    const r = await A.evaluate(() => AI.json("describe: protein bar", { modelTier: "quick" }));
    assert.deepEqual(r, { name: "Test bar", kcal: 210, p: 20, c: 22, f: 7, unit: "bar", g: 60 });
    const call = aiCalls.at(-1);
    assert.equal(call.headers["x-api-key"], "test-key");
    assert.equal(call.body.model, "claude-haiku-5-5");
    const t = await A.evaluate(() => AI("hello").then(x => x.text));
    assert.match(t, /Test bar/);
  });

  await test("downloads save a file", async () => {
    const [dl] = await Promise.all([A.waitForEvent("download"), A.evaluate(() => download("squid-test.csv", "a,b\n1,2"))]);
    assert.equal(dl.suggestedFilename(), "squid-test.csv");
  });

  await test("a signed-out page offers sign-in (from Safari on the Home Screen), and signing in brings the app back", async () => {
    const c = await browser.newContext({ viewport: { width: 375, height: 667 }, deviceScaleFactor: 2 });
    const out = r => r.fulfill({ status: 401, contentType: "application/json", body: '{"code":"signed_out"}' });
    const home = await c.newPage();
    await home.addInitScript(() => Object.defineProperty(Navigator.prototype, "standalone", { get: () => true }));
    await home.route("**/api/session", out);
    await home.goto(ORIGIN + "/");
    await home.locator("#signin p").waitFor({ timeout: 10000 });
    assert.equal(await home.locator("#signin button").count(), 0, "a Home Screen app never leaves for Access");
    await home.screenshot({ path: `${SHOTS}/signin-home-screen.png` });
    const p = await c.newPage();
    await p.route("**/api/session", out);
    await p.goto(ORIGIN + "/");
    await p.locator("#signin button").waitFor({ timeout: 10000 });
    await p.screenshot({ path: `${SHOTS}/signin.png` });
    await p.unroute("**/api/session");
    await p.locator("#signin button").click();
    await p.waitForURL(ORIGIN + "/");
    const cookie = (await c.cookies()).find(k => k.name === "__Host-squid");
    assert.ok(cookie && cookie.httpOnly && cookie.secure && cookie.sameSite === "Lax", "signing in set the session cookie");
    await until("signed in", () => p.evaluate(() => !document.getElementById("signin") && !!DB && BOOTCOLLS.every(n => BOOTSEEN.has(n))), 20000);
    await c.close();
  });

  await test("pages render without errors, light and dark", async () => {
    for (const scheme of ["light", "dark"]) {
      await A.emulateMedia({ colorScheme: scheme });
      for (const page of ["dash", "food", "weight", "macros", "settings", "data"]) {
        await A.evaluate(p => { go(p); render(); }, page);
        await sleep(250);
        await A.screenshot({ path: `${SHOTS}/${page}-${scheme}.png` });
      }
    }
    assert.deepEqual(errors, [], JSON.stringify(errors, null, 1).slice(0, 1500));
  });

  await browser.close();
  await stopWorker();
  ai.close();
  const failed = results.filter(r => !r[0]);
  console.log(`\n${results.length - failed.length}/${results.length} passed; screenshots in ${SHOTS}/`);
  if (failed.length) process.exitCode = 1;
}

main().catch(async e => {
  console.error(e);
  if (worker) console.error(worker.log().slice(-3000));
  await stopWorker();
  process.exit(1);
});
