// Splits a published Squid artifact (index.html as served) into src/ and proves the round trip is byte-identical.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildArtifactBody, HOST_PREFIX_RE, HOST_SUFFIX } from "./build.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export const APP_PARTS = [
  "01-core", "02-theme", "03-store", "04-analytics", "05-ui", "06-shell",
  "07-log", "08-food", "09-plate", "10-photos", "11-strength", "12-workouts",
  "13-data-jobs", "14-cardio", "15-settings", "16-import", "17-summary", "18-boot",
];

function split(html) {
  const m = html.match(HOST_PREFIX_RE);
  if (!m) throw new Error("not a served artifact: host wrapper not found");
  if (!html.endsWith(HOST_SUFFIX)) throw new Error("host suffix not found");
  const base = m[1];
  const body = html.slice(m[0].length, html.length - HOST_SUFFIX.length);
  const toks = [];
  let pos = 0;
  for (const t of body.matchAll(/<(script|style)>([\s\S]*?)<\/\1>/g)) {
    toks.push({ raw: body.slice(pos, t.index) }, { tag: t[1], text: t[2] });
    pos = t.index + t[0].length;
  }
  toks.push({ raw: body.slice(pos) });
  const blocks = toks.filter(t => t.tag);
  const raws = toks.filter(t => "raw" in t).map(t => t.raw);
  if (blocks.length !== 2 + APP_PARTS.length) throw new Error(`expected ${2 + APP_PARTS.length} blocks, got ${blocks.length}`);
  if (raws[0] !== '\n<title>Squid</title>\n<meta name="theme-color" content="#ffffff">\n' || raws[1] !== "\n") throw new Error("unexpected head layout");
  raws.slice(3, -1).forEach((r, i) => { if (r !== "\n") throw new Error(`unexpected gap after part ${i + 1}`); });
  if (raws.at(-1) !== "\n") throw new Error("unexpected tail");
  const strip = (t, what) => {
    if (!t.startsWith("\n") || !t.endsWith("\n")) throw new Error(`${what} is not newline-delimited`);
    return t.slice(1);
  };
  return {
    base,
    theme: strip(blocks[0].text, "theme boot"),
    css: strip(blocks[1].text, "app css"),
    shell: raws[2],
    parts: blocks.slice(2).map((b, i) => strip(b.text, APP_PARTS[i])),
  };
}

function write(rel, text) {
  const p = join(ROOT, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, text);
}

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/import-artifact.mjs <served-artifact.html>");
  process.exit(2);
}
const live = readFileSync(file, "utf8");
const s = split(live);
write("src/styles/base.css", s.base + "\n");
write("src/boot/theme.js", s.theme);
write("src/styles/app.css", s.css);
write("src/shell/body.html", s.shell);
s.parts.forEach((t, i) => write(`src/app/${APP_PARTS[i]}.js`, t));

const rebuilt = buildArtifactBody({ wrap: true });
if (rebuilt !== live) {
  let i = 0;
  while (rebuilt[i] === live[i]) i++;
  console.error(`round trip differs at char ${i}: ${JSON.stringify(live.slice(i, i + 80))} vs ${JSON.stringify(rebuilt.slice(i, i + 80))}`);
  process.exit(1);
}
console.log(`imported ${s.parts.length} app parts; rebuild is byte-identical (${Buffer.byteLength(live)} bytes)`);
