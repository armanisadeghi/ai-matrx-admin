#!/usr/bin/env node
// node scripts/build-lab/login-hydrates.mjs <base-url> [--export <dir>] [--timeout 30000]
//
// THE PRODUCTION-BUILD SIGN-IN GATE for build-lab exports: before anyone says "this build does/does
// not sign in", prove the server is serving THIS build, then prove /login hydrates.
//
// Born 2026-10-17: a summon change was reverted because /login stayed on "Getting ready…" — but the
// `next start` probed had been started at 16:11 and the export was rebuilt at 16:58; the restart
// failed EADDRINUSE and the old process kept serving HTML from the previous manifest. Every chunk
// it named was gone from disk (500 → ChunkLoadError → React never hydrated). The code was fine.
//
// Checks, in order (exit 1 on the first failure, naming it):
//   1. STALE SERVER — every /_next/static asset the /login HTML references returns 200. If not, the
//      server is not serving the build on disk: restart it (stop YOUR process, then next start).
//      With --export, the asset must also exist under <export>/.next/static.
//   2. HYDRATION — the submit button stops saying data-preparing="true" and enables within --timeout
//      (components/submit-button.tsx shows "Getting ready…" until React hydrates).
// Prints page errors either way. Exit 0 green, 1 red, 2 could not run.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const args = process.argv.slice(2);
const base = args.find((a) => !a.startsWith("--") && /^https?:/.test(a));
const flag = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const exportDir = flag("export", null);
const timeout = Number(flag("timeout", 30000));
if (!base) { console.error("usage: login-hydrates.mjs <base-url> [--export <dir>] [--timeout ms]"); process.exit(2); }

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const { chromium } = createRequire(path.join(root, "package.json"))("playwright");

let html;
try { const r = await fetch(`${base}/login`); html = await r.text(); if (!r.ok) throw new Error(`HTTP ${r.status}`); }
catch (e) { console.error(`could not load ${base}/login: ${e.message}`); process.exit(2); }

const assets = [...new Set([...html.matchAll(/\/_next\/static\/[^"'\s)\\]+/g)].map((m) => m[0]))];
const bad = [];
for (const a of assets) {
  const r = await fetch(`${base}${a}`, { method: "HEAD" }).catch(() => null);
  if (!r || r.status !== 200) bad.push(`${r ? r.status : "ERR"} ${a}`);
  else if (exportDir && !fs.existsSync(path.join(exportDir, ".next", a.replace(/^\/_next\//, "").split("?")[0]))) bad.push(`missing-on-disk ${a}`);
}
if (bad.length) {
  console.error(`RED stale server: ${bad.length}/${assets.length} assets /login references are not served from this build:`);
  for (const b of bad.slice(0, 8)) console.error(`  ${b}`);
  console.error("The process on this port predates the build on disk. Stop YOUR server and next start again.");
  process.exit(1);
}

const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 300)));
await page.goto(`${base}/login`, { waitUntil: "load" });
let ok = true;
try { await page.locator('button[type="submit"]:not([disabled]):not([data-preparing="true"])').first().waitFor({ timeout }); }
catch { ok = false; }
const btn = await page.evaluate(() => { const b = document.querySelector('button[type="submit"]'); return b && { text: b.textContent?.trim(), disabled: b.disabled }; });
await browser.close();
for (const e of errors) console.error(`  pageerror: ${e}`);
if (!ok) { console.error(`RED /login never hydrated in ${timeout} ms (submit: ${JSON.stringify(btn)})`); process.exit(1); }
console.log(`GREEN ${assets.length} assets served from this build; /login hydrated (submit: ${JSON.stringify(btn)})`);
