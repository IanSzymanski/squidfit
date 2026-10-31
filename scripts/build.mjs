// Assembles src/ into dist/ (the Cloudflare site) and build/artifact.html (the same app in the shape the Claude artifact host serves).
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, cpSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = rel => readFileSync(join(ROOT, rel), "utf8");
const tag = (t, text) => `<${t}>\n${text}</${t}>`;

export const HOST_PREFIX_RE = /^<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>([^<]*)<\/style><\/head><body>/;
export const HOST_SUFFIX = "</body></html>";
const hostPrefix = base => `<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>${base}</style></head><body>`;

export function appParts() {
  return readdirSync(join(ROOT, "src/app")).filter(f => f.endsWith(".js")).sort().map(f => `src/app/${f}`);
}

function guard(rel, text) {
  if (/<\/script/i.test(text) && rel.endsWith(".js")) throw new Error(`${rel} contains a literal </script>`);
  return text;
}

const block = (t, rel) => tag(t, guard(rel, read(rel)));

export function buildArtifactBody({ wrap = false } = {}) {
  const body = '\n<title>Squid</title>\n<meta name="theme-color" content="#ffffff">\n'
    + block("script", "src/boot/theme.js") + "\n"
    + block("style", "src/styles/app.css")
    + read("src/shell/body.html")
    + appParts().map(p => block("script", p)).join("\n") + "\n";
  return wrap ? hostPrefix(read("src/styles/base.css").replace(/\n$/, "")) + body + HOST_SUFFIX : body;
}

export function buildPage() {
  const page = read("src/index.html").replace(/<!-- @(style|script|include|scripts) ([^ ]+) -->/g, (_, kind, rel) => {
    if (kind === "include") return read(rel);
    if (kind === "scripts") return appParts().map(p => block("script", p)).join("\n");
    return block(kind, rel);
  });
  const id = createHash("sha256").update(page).digest("hex").slice(0, 10);
  return { id, html: page.replace("<!-- @build -->", id) };
}

function main() {
  const dist = join(ROOT, "dist");
  rmSync(dist, { recursive: true, force: true });
  mkdirSync(dist, { recursive: true });
  if (existsSync(join(ROOT, "public"))) cpSync(join(ROOT, "public"), dist, { recursive: true });
  const { id, html } = buildPage();
  writeFileSync(join(dist, "index.html"), html);
  mkdirSync(join(ROOT, "build"), { recursive: true });
  writeFileSync(join(ROOT, "build/artifact.html"), buildArtifactBody());
  writeFileSync(join(ROOT, "build/BUILD"), id + "\n");
  console.log(`dist/index.html ${Buffer.byteLength(html)} bytes, build ${id}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
