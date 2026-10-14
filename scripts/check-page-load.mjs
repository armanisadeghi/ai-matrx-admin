#!/usr/bin/env node
// pnpm check:page-load [--route /notes]... [--settle 30000] [--login-url <url>] [--member]
//
// THE LOAD LAW, measured in a real browser (lib/diagnostics/loadLedger.ts has the rule): a page reads
// only what it shows, each thing once, and nothing on-demand-only leaves during a page load.
//
// Signs in on the ONE shared preview (port 3001) with `pnpm dev-login` (or --login-url), loads each
// route headless, and records every Supabase request for `--settle` ms. It FAILS when
//   - a relation in `neverOnLoad` (scripts/page-load-budget.json) is read during the load — those are
//     fetched by the thing that shows them, when it opens (the messaging inbox, the file tree, …);
//   - an (operation, relation) pair leaves more than once and is not in that route's `repeats`
//     allowance (a SHRINK-ONLY baseline: legitimately distinct reads of one relation, e.g. a chunked
//     IN list). A stale allowance — allowed but no longer repeating — fails too, so it only shrinks.
// Exit 0 green, 1 red, 2 could not run (no server, no sign-in).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const require = createRequire(path.join(root, "package.json"));
const budget = JSON.parse(fs.readFileSync(path.join(root, "scripts/page-load-budget.json"), "utf8"));

const argv = process.argv.slice(2);
const routes = [];
let settle = 30_000;
let loginUrl = null;
let member = false;
for (let i = 0; i < argv.length; i += 1) {
  if (argv[i] === "--route") routes.push(argv[++i]);
  else if (argv[i] === "--settle") settle = Number(argv[++i]);
  else if (argv[i] === "--login-url") loginUrl = argv[++i];
  else if (argv[i] === "--member") member = true;
  else {
    console.error(`[page-load] unknown argument ${argv[i]}`);
    process.exit(2);
  }
}
const targets = routes.length ? routes : Object.keys(budget.routes);

if (!loginUrl) {
  try {
    const out = execFileSync("bash", [path.join(root, "scripts/dev-login.sh"), ...(member ? ["--member"] : []), "/dashboard"], {
      cwd: root,
      encoding: "utf8",
    });
    loginUrl = /OPEN\s*:\s*(\S+)/.exec(out)?.[1] ?? null;
  } catch (error) {
    console.error(`[page-load] could not mint a dev-login URL (is the preview running? pnpm preview:start): ${error.message}`);
    process.exit(2);
  }
}
if (!loginUrl) {
  console.error("[page-load] dev-login printed no URL");
  process.exit(2);
}

const { chromium } = require("playwright");
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const origin = new URL(loginUrl).origin;
await page.goto(loginUrl, { waitUntil: "load", timeout: 120_000 });
if (new URL(page.url()).pathname.startsWith("/login")) {
  console.error("[page-load] sign-in failed (landed on /login)");
  process.exit(2);
}

function describe(request) {
  const url = new URL(request.url());
  if (!url.pathname.startsWith("/rest/v1/")) return null;
  const headers = request.headers();
  const schema = headers["content-profile"] ?? headers["accept-profile"] ?? "public";
  const rest = url.pathname.slice("/rest/v1/".length);
  if (rest.startsWith("rpc/")) return { op: "rpc", relation: rest.slice(4), schema };
  return { op: request.method() === "GET" ? "select" : request.method().toLowerCase(), relation: rest, schema };
}

const neverOnLoad = new Set(budget.neverOnLoad);
let red = 0;
for (const route of targets) {
  const seen = new Map();
  const listener = (request) => {
    const d = describe(request);
    if (!d) return;
    const key = `${d.op} ${d.schema}.${d.relation}`;
    seen.set(key, { ...d, count: (seen.get(key)?.count ?? 0) + 1 });
  };
  // A dev server's full reload (a file changed under it) is a second page load: count only the last
  // document, and say how many times it reloaded.
  let navigations = 0;
  const onNavigate = (frame) => {
    if (frame !== page.mainFrame()) return;
    navigations += 1;
    if (navigations > 1) seen.clear();
  };
  page.on("framenavigated", onNavigate);
  page.on("request", listener);
  await page.goto(origin + route, { waitUntil: "load", timeout: 120_000 });
  await page.waitForTimeout(settle);
  page.off("request", listener);
  page.off("framenavigated", onNavigate);
  if (navigations > 1) console.log(`       (reloaded ${navigations - 1}× during the window — counted the last load only)`);

  const allowed = budget.routes[route]?.repeats ?? {};
  const findings = [];
  for (const [key, d] of seen) {
    if (neverOnLoad.has(d.relation)) findings.push(`ON-DEMAND READ ON LOAD  ${key} ×${d.count}`);
    const limit = allowed[key] ?? 1;
    if (d.count > limit) findings.push(`REPEATED  ${key} ×${d.count} (allowed ${limit})`);
  }
  for (const [key, limit] of Object.entries(allowed)) {
    const count = seen.get(key)?.count ?? 0;
    if (count < limit) findings.push(`STALE ALLOWANCE  ${key} allowed ${limit}, now ${count} — lower it in scripts/page-load-budget.json`);
  }
  const total = [...seen.values()].reduce((sum, d) => sum + d.count, 0);
  console.log(`${findings.length ? "RED  " : "ok   "} ${route}  ${total} reads, ${seen.size} distinct`);
  for (const line of findings) console.log(`       ${line}`);
  red += findings.length;
}
await browser.close();
process.exit(red ? 1 : 0);
