// README screenshots: the built app on `wrangler dev`, filled with its own sample data. Synthetic data only.
import { spawn } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { chromium } from "playwright";

const PORT = 8797, ORIGIN = `http://127.0.0.1:${PORT}`, PERSIST = ".wrangler/shots", OUT = "docs/screenshots";
const SHOTS = { light: ["dash", "weight", "energy"], dark: ["food", "workouts", "together"] };
const TABS = ["dash", "food", "workouts"];
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function until(fn, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try { if (await fn()) return; } catch {}
    await sleep(250);
  }
  throw new Error("timed out");
}

rmSync(PERSIST, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const worker = spawn("npx", ["wrangler", "dev", "--env", "qa", "--ip", "127.0.0.1", "--port", String(PORT), "--persist-to", PERSIST,
  "--var", "DEV_EMAIL:shots@example.com", "--var", "BUILD:shots", "--show-interactive-dev-session=false"],
  { stdio: "ignore", detached: true, env: { ...process.env, NO_PROXY: "127.0.0.1,localhost", no_proxy: "127.0.0.1,localhost" } });

try {
  await until(async () => (await fetch(`${ORIGIN}/api/health`)).ok, 60000);
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  for (const [scheme, pages] of Object.entries(SHOTS)) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme });
    const p = await ctx.newPage();
    await p.goto(ORIGIN + "/");
    await until(() => p.evaluate(() => !document.getElementById("splash") && !!DB && BOOTCOLLS.every(c => BOOTSEEN.has(c))), 30000);
    await p.evaluate(async () => {
      if (typeof onbClose === "function") onbClose();
      S.onboarded = true;
      await seedBody("loss");
      await seedWorkouts();
      closeModal();
    });
    await p.addStyleTag({ content: "#toast, .toast { display: none !important }" });
    for (const page of pages) {
      await p.evaluate(([pg, tabs]) => {
        goRoot(tabs.includes(pg) ? pg : "dash");
        if (!tabs.includes(pg)) go(pg);
        window.scrollTo(0, 0);
      }, [page, TABS]);
      await sleep(600);
      await p.screenshot({ path: `${OUT}/${page}-${scheme}.png` });
    }
    await ctx.close();
  }
  await browser.close();
} finally {
  try { process.kill(-worker.pid, "SIGTERM"); } catch {}
}
