#!/usr/bin/env node
// pnpm check:smoke [--route /notes]... [--admin-only|--member-only] [--after 4000] [--tail 18000] [--plant]
//
// THE SMOKE DETECTORS, checked in a real browser (lib/diagnostics/loadTrace.ts has the rules).
// Signs in on the ONE shared preview (port 3001) with `pnpm dev-login` as admin and as member,
// loads each route headless and touches NOTHING (no click, no key), waits for the page to settle
// plus `--after` ms AND until `--tail` ms after navigation start (THE IDLE TAIL: the late idle tier
// runs seconds after settle — the Meet call engine loaded at +13.6 s on /chat/new with no input,
// after the old window closed), prints the page-load timeline, and FAILS when
//   - a `load:heavy:*` marker fired (a heavy module evaluated before anyone engaged);
//   - a `load:lazy:*` marker fired before the page settled;
//   - CLS (every shift not caused by input) is over 0.02.
// Known violations sit in scripts/smoke-baseline.json — a SHRINK-ONLY list: a known one still prints
// (KNOWN) but does not fail; a known one that no longer fires anywhere fails as STALE until it is
// deleted from the file. Never add an entry to get green: fix what loads early.
// --plant proves the guard: it injects a heavy marker at boot, a lazy marker before settle and a
// late block that shifts the page, and the run must go RED.
// Exit 0 green, 1 red, 2 could not run (no server, no sign-in).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";

const root = process.env.SMOKE_ROOT ?? path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const require = createRequire(path.join(root, "package.json"));

const DEFAULT_ROUTES = ["/chat/new", "/notes", "/dashboard"];
const baseline = JSON.parse(fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), "smoke-baseline.json"), "utf8"));
const knownFired = new Set();
function isKnown(kind, name, route) {
  const routesFor = baseline.known?.[kind]?.[name];
  if (!routesFor) return false;
  const hit = routesFor.includes("*") || routesFor.includes(route);
  if (hit) knownFired.add(`${kind}\u0000${name}`);
  return hit;
}
const CLS_MAX = 0.02;
const argv = process.argv.slice(2);
const routes = [];
let roles = ["admin", "member"];
let after = 4_000;
let tail = 18_000;
let plant = false;
for (let i = 0; i < argv.length; i += 1) {
  if (argv[i] === "--route") routes.push(argv[++i]);
  else if (argv[i] === "--admin-only") roles = ["admin"];
  else if (argv[i] === "--member-only") roles = ["member"];
  else if (argv[i] === "--after") after = Number(argv[++i]);
  else if (argv[i] === "--tail") tail = Number(argv[++i]);
  else if (argv[i] === "--plant") plant = true;
  else {
    console.error(`[smoke] unknown argument ${argv[i]}`);
    process.exit(2);
  }
}
const targets = routes.length ? routes : DEFAULT_ROUTES;

function mintLogin(role) {
  try {
    const out = execFileSync("bash", [path.join(root, "scripts/dev-login.sh"), ...(role === "member" ? ["--member"] : []), "/dashboard"], {
      cwd: root,
      encoding: "utf8",
    });
    return /OPEN\s*:\s*(\S+)/.exec(out)?.[1] ?? null;
  } catch (error) {
    console.error(`[smoke] could not mint a ${role} dev-login URL (is the preview running? pnpm preview:status): ${error.message}`);
    return null;
  }
}

// --plant: a heavy module "evaluating" at boot, lazy work before settle, a late unreserved block.
const PLANT = () => {
  performance.mark("load:heavy:PLANTED heavy module");
  setTimeout(() => performance.mark("load:lazy:PLANTED lazy read"), 50);
  // A heavy module that loads with no input deep in the idle tail (the +13 s Meet shape).
  setTimeout(() => performance.mark("load:heavy:PLANTED late heavy module"), 13_000);
  window.addEventListener("load", () => {
    setTimeout(() => {
      const block = document.createElement("div");
      block.style.cssText = "height:240px;width:100%";
      block.textContent = "planted unreserved block";
      (document.querySelector("main") ?? document.body).prepend(block);
    }, 800);
  });
};

const { chromium } = require("playwright");
const browser = await chromium.launch({ headless: true });
let red = 0;
let couldNotRun = false;

for (const role of roles) {
  const loginUrl = mintLogin(role);
  if (!loginUrl) {
    couldNotRun = true;
    continue;
  }
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  if (plant) await context.addInitScript(PLANT);
  const page = await context.newPage();
  const origin = new URL(loginUrl).origin;
  await page.goto(loginUrl, { waitUntil: "load", timeout: 120_000 });
  if (new URL(page.url()).pathname.startsWith("/login")) {
    console.error(`[smoke] ${role} sign-in failed (landed on /login)`);
    couldNotRun = true;
    await context.close();
    continue;
  }

  for (const route of targets) {
    const lines = [];
    const onConsole = (msg) => {
      const text = msg.text();
      if (text.includes("[load]")) lines.push(text.replace(/%c/g, "").replace(/\s+color:.*$/, ""));
    };
    let navigations = 0;
    const onNavigate = (frame) => {
      if (frame !== page.mainFrame()) return;
      navigations += 1;
      if (navigations > 1) lines.length = 0;
    };
    page.on("console", onConsole);
    page.on("framenavigated", onNavigate);
    // A fresh document per route: the trace measures a page LOAD, so no client-side navigation.
    await page.goto(origin + route, { waitUntil: "load", timeout: 120_000 });
    let report = null;
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      report = await page
        .evaluate(() => (typeof window.__matrxLoadTrace === "function" ? window.__matrxLoadTrace() : null))
        .catch(() => null);
      if (report?.settledAt != null) break;
      await page.waitForTimeout(500);
    }
    if (report?.settledAt != null) {
      // Settle + `after`, and never less than the idle tail measured from navigation start.
      const sinceNav = await page.evaluate(() => performance.now()).catch(() => 0);
      await page.waitForTimeout(Math.max(after, tail - sinceNav));
      report = await page.evaluate(() => window.__matrxLoadTrace()).catch(() => report);
    }
    page.off("console", onConsole);
    page.off("framenavigated", onNavigate);

    if (!report || report.settledAt == null) {
      console.log(`??    ${role} ${route}  the trace never reported (is it installed? ?trace=off left in this profile?)`);
      couldNotRun = true;
      continue;
    }
    const findings = [];
    const known = [];
    for (const v of report.violations) {
      if (v.kind === "heavy-before-engagement")
        (isKnown("heavy", v.name, route) ? known : findings).push(`HEAVY BEFORE ENGAGEMENT  ${v.name} (+${v.at}ms)`);
      if (v.kind === "lazy-before-settle")
        (isKnown("lazy", v.name, route) ? known : findings).push(`LAZY BEFORE SETTLE  ${v.name} (+${v.at}ms, settled +${report.settledAt}ms)`);
    }
    const clsMax = baseline.cls?.[route] ?? CLS_MAX;
    const shifts = report.violations.filter((v) => v.kind === "shift").map((v) => `${v.name} at +${v.at}ms · ${v.detail}`);
    const clsLine = `CLS ${report.cls} > ${CLS_MAX}${shifts.length ? `\n         ${shifts.join("\n         ")}` : ""}`;
    if (report.cls > clsMax) findings.push(clsLine);
    else if (report.cls > CLS_MAX) known.push(`${clsLine} (allowed ${clsMax} on this route)`);
    console.log(`\n${findings.length ? "RED  " : "ok   "} ${role} ${route}  settled +${report.settledAt}ms · LCP ${report.lcp?.at ?? "?"}ms · CLS ${report.cls} · ${report.requests.length} requests${navigations > 1 ? ` · (dev server reloaded ${navigations - 1}×, last load counted)` : ""}`);
    for (const line of lines) console.log(`       ${line}`);
    for (const f of findings) console.log(`   →   ${f}`);
    for (const k of known) console.log(`   ·   KNOWN ${k}`);
    red += findings.length;
  }
  await context.close();
}
await browser.close();
if (!couldNotRun) {
  for (const [kind, names] of Object.entries(baseline.known ?? {})) {
    for (const [name, routesFor] of Object.entries(names)) {
      if (!routesFor.includes("*") && !routesFor.some((r) => targets.includes(r))) continue;
      if (!knownFired.has(`${kind}\u0000${name}`)) {
        console.log(`STALE baseline  ${kind} "${name}" no longer fires — delete it from scripts/smoke-baseline.json`);
        red += 1;
      }
    }
  }
}
console.log(red ? `\n[smoke] RED — ${red} finding(s)` : "\n[smoke] green");
if (red) process.exit(1);
process.exit(couldNotRun ? 2 : 0);
