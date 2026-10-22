// scripts/frame-crawl/crawl.mjs — the frame crawl: every signed-in app page, measured the same way, every phase.
//
//   node scripts/frame-crawl/crawl.mjs [--mode classic|frame] [--only /prefix] [--widths 1440,390]
//        [--concurrency 4] [--origin URL] [--out NAME] [--discover-only] [--report] [--retry-errors] [--limit N]
//
// Plan + why: common-docs/projects/app-frame/ROLLOUT-PLAN.md (P0 baseline, "Measuring breakage: the crawl").
// Target is the LIVE site as admin@admin.com (AI_ADMIN_USERNAME / AI_ADMIN_PASSWORD from .env.local, never printed).
// READ-ONLY: only page loads. Nothing is clicked, typed into or submitted (the sign-in form is the one exception).
//
// Route list : features/shell/frame/route-flow.json nodes in groups core + transitional, minus the routes
//              route-homes.tsv files under "Not in the app frame" (test, bake-off, public, portal, ...).
// Dynamic    : ONE record id per pattern prefix, found on the parent list opened with ?scope=mine and accepted ONLY
//              when the page shows its "Mine" tab selected (so the record is one admin@admin.com owns). Resolved ids are
//              kept in ids.json (resumable, reviewable). No such record -> row "skipped: no record" (not a failure).
// Output     : baseline-classic.json (mode classic) / baseline-frame.json (mode frame): one row per route + width,
//              plus a summary block. Screenshots (JPEG q60) go to the scratch folder, never to git.
// Resume     : a row already recorded (same mode, width, route) is skipped. --retry-errors redoes navigation failures.
// frame mode : appends ?frame=new to every URL (the switch is not live yet; rows will then equal classic).
import { chromium } from "playwright";
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { signIn, sleep } from "../lib/seat-browser.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const ORIGIN_ARG = process.argv.includes("--origin") ? process.argv[process.argv.indexOf("--origin") + 1] : "";
const ORIGIN = (ORIGIN_ARG || "https://www.aimatrx.com").replace(/\/$/, ""); // --origin http://<session>.localhost:3001 = the shared preview
const SCRATCH = "/private/tmp/claude-501/-Users-armanisadeghi-code-matrx-frontend/d1322d17-1a7c-4afa-90cf-465dfc366734/scratchpad/crawl-classic";

const args = process.argv.slice(2);
const opt = (k, d) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : d;
};
const flag = (k) => args.includes(`--${k}`);
const MODE = opt("mode", "classic");
if (!["classic", "frame"].includes(MODE)) throw new Error("--mode must be classic or frame");
const ONLY = opt("only", "");
const WIDTHS = opt("widths", "1440,390").split(",").map(Number);
const CONCURRENCY = Math.min(4, Number(opt("concurrency", "4"))); // the live-database walk cap
const LIMIT = Number(opt("limit", "0"));
const OUT_JSON = join(HERE, `baseline-${opt("out", MODE)}.json`);
const IDS_JSON = join(HERE, "ids.json");
const SHOTS = MODE === "classic" ? SCRATCH : SCRATCH.replace("crawl-classic", `crawl-${MODE}`);
const HEIGHT = (w) => (w < 600 ? 844 : 900);
const withFrame = (url) => (MODE === "frame" ? url + (url.includes("?") ? "&" : "?") + "frame=new" : url);

// A page whose GET could change something (sign-out, unsubscribe, OAuth callbacks, deletes) is never loaded.
const UNSAFE = /(^|\/)(logout|log-out|sign-?out|unsubscribe|callback|delete|destroy|revoke|disconnect|cron|webhook)(\/|$)/i;

// ───────────────────────────── route list ─────────────────────────────
function buildRoutes() {
  const flow = JSON.parse(readFileSync(join(REPO, "features/shell/frame/route-flow.json"), "utf8"));
  const excluded = new Set();
  for (const line of readFileSync(join(REPO, "features/shell/frame/route-homes.tsv"), "utf8").split("\n")) {
    const p = line.split("\t");
    if (p[1]?.startsWith("Not in the app frame")) excluded.add(p[0]);
  }
  const all = flow.nodes.filter((n) => n.group === "core" || n.group === "transitional");
  const kept = all.map((n) => n.route).filter((r) => !excluded.has(r));
  const unsafe = kept.filter((r) => UNSAFE.test(r));
  const routes = kept.filter((r) => !UNSAFE.test(r)).sort();
  return { routes, unsafe, excludedCount: all.length - kept.length };
}
const isDyn = (seg) => /^\[.*\]$/.test(seg);
const ROUTES = buildRoutes();
const STATIC_AT = new Map(); // "/a/b" -> Set of static child names under it (never a record id)
for (const r of ROUTES.routes) {
  const segs = r.split("/").filter(Boolean);
  for (let i = 0; i < segs.length; i++) {
    if (isDyn(segs[i])) continue;
    const parent = "/" + segs.slice(0, i).join("/");
    (STATIC_AT.get(parent) ?? STATIC_AT.set(parent, new Set()).get(parent)).add(segs[i]);
  }
}

// ───────────────────────────── credentials, auth ─────────────────────────────
const env = {};
for (const f of [".env", ".env.local"]) {
  const p = join(REPO, f);
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}
if (!env.AI_ADMIN_USERNAME || !env.AI_ADMIN_PASSWORD) throw new Error("AI_ADMIN_USERNAME / AI_ADMIN_PASSWORD missing from .env");

let browser;
let state = null; // storageState
let authEpoch = 0;
let reauth = null;
async function doSignIn() {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const who = await signIn(page, ORIGIN, env.AI_ADMIN_USERNAME, env.AI_ADMIN_PASSWORD, "crawl-admin");
  if (who !== "admin@admin.com") throw new Error(`signed in as ${who}, expected admin@admin.com`);
  state = await ctx.storageState();
  authEpoch++;
  await ctx.close();
  console.log(`[auth] signed in as ${who} (epoch ${authEpoch})`);
}
async function reSignIn(seenEpoch) {
  if (seenEpoch !== authEpoch) return; // someone already did
  reauth ??= doSignIn().finally(() => (reauth = null));
  await reauth;
}

// ───────────────────────────── in-page probes ─────────────────────────────
const INIT = () => {
  window.__f = { cls: 0, lastMut: 0, loadAt: 0 };
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) if (!e.hadRecentInput) window.__f.cls += e.value;
    }).observe({ type: "layout-shift", buffered: true });
  } catch {}
  const arm = () => {
    new MutationObserver(() => (window.__f.lastMut = performance.now())).observe(document, { subtree: true, childList: true, characterData: true });
  };
  if (document.documentElement) arm();
  else document.addEventListener("readystatechange", arm, { once: true });
  window.addEventListener("load", () => (window.__f.loadAt = performance.now()));
};

const MEASURE = () => {
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const s = getComputedStyle(el);
    return s.visibility !== "hidden" && s.display !== "none" && s.opacity !== "0";
  };
  const portals = [...document.querySelectorAll("[data-page-header-portal]")];
  // a header portal counts when it carries content (the portal node itself is display:contents, so it has no box)
  const portalsVisible = portals.filter((p) => (p.textContent ?? '').trim().length > 0 || p.children.length > 0);
  const center = document.querySelector("#shell-header-center, .shell-header-center");
  const trails = [...document.querySelectorAll('nav[aria-label*="readcrumb" i], [data-crumb-trail]')].filter(vis);
  const de = document.documentElement;
  const main = document.querySelector(".shell-main") ?? document.querySelector("main");
  const overflowPx = Math.max(0, de.scrollWidth - de.clientWidth, main ? main.scrollWidth - main.clientWidth : 0);
  // red captured errors (Error Inspector rows ride this tab's sessionStorage)
  const red = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const k = sessionStorage.key(i);
    if (!k || !/error-inspector/i.test(k)) continue;
    try {
      const v = JSON.parse(sessionStorage.getItem(k) ?? "null");
      const rows = Array.isArray(v) ? v : (v?.rows ?? v?.errors ?? []);
      for (const r of rows) if (r?.tier === "red") red.push(String(r.message ?? r.title ?? r.id ?? "?").slice(0, 160));
    } catch {}
  }
  // scroll to the bottom and look for fixed bottom chrome over the last content element
  const scroller = main && main.scrollHeight > main.clientHeight + 4 ? main : null;
  if (scroller) scroller.scrollTop = scroller.scrollHeight;
  else window.scrollTo(0, document.documentElement.scrollHeight);
  let hidden = false;
  let hiddenBy = null;
  const root = main ?? document.body;
  const leaves = [...root.querySelectorAll("*")].filter((el) => el.children.length === 0 && vis(el) && (el.textContent?.trim() || el.tagName === "IMG" || el.tagName === "SVG" || el.tagName === "CANVAS"));
  let last = null;
  for (const el of leaves) {
    const r = el.getBoundingClientRect();
    if (r.top < innerHeight + 4 && r.bottom > 0 && (!last || r.bottom >= last.r.bottom)) last = { el, r };
  }
  if (last) {
    for (const el of document.querySelectorAll("body *")) {
      const s = getComputedStyle(el);
      if (s.position !== "fixed" && s.position !== "sticky") continue;
      const r = el.getBoundingClientRect();
      if (r.height < 8 || r.height > innerHeight * 0.4 || r.bottom < innerHeight - 6 || r.top < innerHeight * 0.5) continue;
      if (s.pointerEvents === "none" || !vis(el) || el.contains(last.el)) continue;
      const overlapX = Math.min(r.right, last.r.right) - Math.max(r.left, last.r.left);
      if (overlapX > 4 && last.r.bottom > r.top + 1 && last.r.top < r.bottom) {
        hidden = true;
        hiddenBy = `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}.${String(el.className).split(/\s+/).slice(0, 2).join(".")}`;
        break;
      }
    }
  }
  // ---- frame-mode probes (additive; the classic baseline rows simply lack them) ----
  const norm = (t) => (t ?? "").replace(/\s+/g, " ").trim();
  const bodyEl = document.querySelector('[data-mf-region="body"]');
  const sideEl = document.querySelector('[data-mf-region="sidebar"]');
  const hdrEl = document.querySelector('header[data-mf-region="header"], [data-mf-region="header"]');
  const frame = {};
  frame.active = !!sideEl;
  if (bodyEl) {
    const br = bodyEl.getBoundingClientRect();
    const inBody = (el) => bodyEl.contains(el);
    // extra header rows: visible <header>/[role=banner] or header portals with content inside the page body
    frame.bodyHeaders = [...bodyEl.querySelectorAll('header, [role="banner"], [data-page-header-portal]')].filter((e) => vis(e) && (e.textContent ?? "").trim().length > 0).length;
    // extra left rails: tall, narrow, flush-left column inside the body
    const rails = [...bodyEl.querySelectorAll('aside, nav, [role="complementary"], [data-sidebar], [class*="sidebar" i]')].filter((e) => {
      if (!vis(e)) return false;
      const r = e.getBoundingClientRect();
      return r.height >= br.height * 0.55 && r.width >= 120 && r.width <= 460 && r.left - br.left <= 12 && r.right < br.left + br.width * 0.6;
    });
    // keep outermost only
    frame.bodyRails = rails.filter((e) => !rails.some((o) => o !== e && o.contains(e))).length;
    frame.railSamples = rails.slice(0, 2).map((e) => `${e.tagName.toLowerCase()}.${String(e.className).split(/\s+/).slice(0, 2).join(".")}`);
    const text = norm(bodyEl.innerText);
    frame.bodyChars = text.length;
    frame.bodyMedia = bodyEl.querySelectorAll("img, canvas, video, iframe, svg").length;
    frame.bodyEmpty = text.length < 15 && frame.bodyMedia < 2;
    // body content wider than the body box (clipped when the page scroller hides it)
    let wide = 0;
    let worst = 0;
    for (const e of bodyEl.querySelectorAll("*")) {
      if (!vis(e)) continue;
      const r = e.getBoundingClientRect();
      if (r.width === 0) continue;
      if (r.right > br.right + 4 && r.left < br.right) {
        // ignore descendants of a horizontally scrolling box (a deliberate scroller)
        let scr = false;
        for (let a = e.parentElement; a && a !== bodyEl; a = a.parentElement) { const o = getComputedStyle(a).overflowX; if (o === "auto" || o === "scroll") { scr = true; break; } }
        if (!scr) { wide++; worst = Math.max(worst, Math.round(r.right - br.right)); }
      }
    }
    frame.bodyWide = wide;
    frame.bodyWidePx = worst;
    frame.bodyScrollOverflowPx = Math.max(0, bodyEl.scrollWidth - bodyEl.clientWidth);
    // duplicate titles: the same short text twice among visible leaves in header + top of body (sidebar excluded)
    const seen = new Map();
    for (const e of [...(hdrEl?.querySelectorAll("*") ?? []), ...bodyEl.querySelectorAll("*")]) {
      if (e.children.length || !vis(e)) continue;
      const t = norm(e.textContent);
      if (t.length < 4 || t.length > 80) continue;
      const r = e.getBoundingClientRect();
      if (r.top > 150) continue;
      if (e.closest('nav[aria-label*="readcrumb" i]') && e.closest("nav") && !e.closest("h1,h2")) { /* crumb leaves count once below */ }
      seen.set(t, (seen.get(t) ?? 0) + 1);
    }
    frame.dupTitles = [...seen].filter(([, n]) => n > 1).map(([t, n]) => `${t} x${n}`).slice(0, 4);
  }
  if (sideEl) {
    const links = [...sideEl.querySelectorAll('[data-mf-region="product-nav"] a, [data-mf-region="product-nav"] button')].filter(vis);
    frame.navLinks = links.length;
    frame.navLabels = links.slice(0, 12).map((e) => norm(e.textContent).slice(0, 24));
    frame.navHasSubmenuHeading = !!sideEl.querySelector('[data-mf-region="product-nav"] [role="group"], [data-mf-region="product-nav"] h2, [data-mf-region="product-nav"] h3');
  }
  return {
    frame,
    cls: +window.__f.cls.toFixed(4),
    timeToStableMs: Math.round(window.__f.lastMut || 0),
    headerPortals: portalsVisible.length,
    headerPortalsAll: portals.length,
    headerCenterChars: (center?.textContent ?? "").trim().length,
    crumbTrails: trails.length,
    doubleHeader: portalsVisible.length > 1 || trails.length > 1,
    overflowX: overflowPx > 1,
    overflowPx,
    hiddenUnderChrome: hidden,
    hiddenBy,
    redCount: red.length,
    redSamples: red.slice(0, 3),
    title: document.title.slice(0, 80),
    scrollHeight: Math.max(de.scrollHeight, main?.scrollHeight ?? 0),
  };
};

// ───────────────────────────── one page load ─────────────────────────────
const slug = (s) => s.replace(/^\//, "").replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 120) || "root";

async function settled(page, fn) {
  for (let i = 0; ; i++) {
    try { return await page.evaluate(fn); } catch (e) {
      if (i >= 4 || !/context was destroyed|navigation/i.test(String(e.message))) throw e;
      await page.waitForLoadState("load", { timeout: 30000 }).catch(() => {});
      await sleep(1000);
    }
  }
}

async function loadAndMeasure(ctx, url, shotPath) {
  const page = await ctx.newPage();
  const consoleErrors = [];
  const serverErrors = [];
  page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text().slice(0, 200)));
  page.on("pageerror", (e) => consoleErrors.push(("pageerror: " + e.message).slice(0, 200)));
  page.on("response", (r) => {
    const u = r.url();
    if (r.status() >= 500 && u.startsWith(ORIGIN)) serverErrors.push(`${r.status()} ${new URL(u).pathname}`.slice(0, 120));
  });
  await page.addInitScript(INIT);
  const t0 = Date.now();
  const row = {};
  try {
    const resp = await page.goto(url, { waitUntil: "load", timeout: 60000 });
    row.status = resp?.status() ?? null;
    const chain = [];
    for (let rq = resp?.request().redirectedFrom(); rq; rq = rq.redirectedFrom()) chain.unshift(new URL(rq.url()).pathname);
    row.redirectedFrom = chain;
    row.loadMs = Date.now() - t0;
    // stable = no DOM mutation for 800 ms AND at least 2 s after load (the CLS window); capped at 20 s
    for (;;) {
      // a page that redirects client-side destroys the context mid-probe: wait for the move, then look again
      const { quiet, since } = await settled(page, () => ({ quiet: performance.now() - window.__f.lastMut, since: performance.now() - (window.__f.loadAt || performance.now()) }));
      if ((quiet > 800 && since > 2000) || Date.now() - t0 > 20000) break;
      await sleep(250);
    }
    try {
      await page.screenshot({ path: shotPath, type: "jpeg", quality: 60 });
      row.screenshot = shotPath.startsWith(SHOTS) ? shotPath.slice(SHOTS.length + 1) : shotPath;
    } catch (e) {
      row.screenshotError = String(e.message).slice(0, 80);
    }
    Object.assign(row, await settled(page, MEASURE));
    row.finalUrl = page.url().replace(ORIGIN, "");
  } catch (e) {
    row.navError = String(e.message).split("\n")[0].slice(0, 200);
    row.finalUrl = page.url().replace(ORIGIN, "");
  } finally {
    row.consoleErrors = { count: consoleErrors.length, samples: [...new Set(consoleErrors)].slice(0, 3) };
    row.serverErrors = [...new Set(serverErrors)].slice(0, 5);
    await page.close().catch(() => {});
  }
  return row;
}

// ───────────────────────────── worker pool ─────────────────────────────
async function pool(items, fn) {
  let i = 0;
  const workers = Array.from({ length: CONCURRENCY }, async (_, w) => {
    const ctxs = new Map(); // width -> {ctx, epoch}
    const ctxFor = async (width) => {
      let c = ctxs.get(width);
      if (c && c.epoch !== authEpoch) {
        await c.ctx.close().catch(() => {});
        c = null;
      }
      if (!c) {
        c = { ctx: await browser.newContext({ viewport: { width, height: HEIGHT(width) }, storageState: state }), epoch: authEpoch };
        ctxs.set(width, c);
      }
      return c;
    };
    for (;;) {
      const idx = i++;
      if (idx >= items.length) break;
      await fn(items[idx], ctxFor, w);
      await sleep(350 + Math.random() * 400); // polite
    }
    for (const c of ctxs.values()) await c.ctx.close().catch(() => {});
  });
  await Promise.all(workers);
}

// ───────────────────────────── dynamic segments ─────────────────────────────
const ids = existsSync(IDS_JSON) ? JSON.parse(readFileSync(IDS_JSON, "utf8")) : {};
const saveIds = () => writeFileSync(IDS_JSON, JSON.stringify(ids, null, 2) + "\n");

// Every distinct "prefix up to and including a dynamic segment", shallowest first.
function dynKeys(routes) {
  const keys = new Set();
  for (const r of routes) {
    const segs = r.split("/").filter(Boolean);
    segs.forEach((s, i) => isDyn(s) && keys.add("/" + segs.slice(0, i + 1).join("/")));
  }
  return [...keys].sort((a, b) => a.split("/").length - b.split("/").length || a.localeCompare(b));
}
const concretePrefix = (patternPrefix) => {
  // replace every dynamic segment of a pattern prefix with its resolved value; null if one is unresolved
  const out = [];
  const segs = patternPrefix.split("/").filter(Boolean);
  for (let i = 0; i < segs.length; i++) {
    if (!isDyn(segs[i])) { out.push(segs[i]); continue; }
    const hit = ids["/" + segs.slice(0, i + 1).join("/")];
    if (!hit?.value) return null;
    out.push(hit.value);
  }
  return "/" + out.join("/");
};

async function resolveKey(key, ctxFor) {
  const parentPattern = key.split("/").slice(0, -1).join("/") || "/";
  const parentConcrete = parentPattern === "/" ? "/" : concretePrefix(parentPattern);
  if (!parentConcrete) return { skipped: "parent record unresolved" };
  const listUrl = `${ORIGIN}${parentConcrete === "/" ? "" : parentConcrete}?scope=mine`;
  const c = await ctxFor(1440);
  const page = await c.ctx.newPage();
  try {
    const resp = await page.goto(listUrl, { waitUntil: "load", timeout: 60000 });
    if (!resp || resp.status() >= 400) return { skipped: `parent list answered ${resp?.status()}` };
    const exclude = new Set([...(STATIC_AT.get(parentPattern) ?? []), "new", "create", "all", "browse"]);
    const base = parentConcrete === "/" ? "" : parentConcrete;
    const re = new RegExp("^" + base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "/([^/?#]+)(?:[/?#].*)?$");
    let found = null;
    let proof = null; // "mine-lane" | "no-lane-list" ; null = ownership not provable
    let why = "parent list has no Mine lane (ownership not provable)";
    for (let t = 0; t < 64 && !found; t++) {
      await sleep(250);
      let probe;
      try {
        probe = await page.evaluate(() => {
          const tabs = [...document.querySelectorAll('[role="tab"]')].map((e) => ({ t: e.textContent?.trim(), sel: e.getAttribute("aria-selected") === "true" }));
          return {
            mineSelected: tabs.some((x) => x.t === "Mine" && x.sel),
            laneTabs: tabs.some((x) => ["Mine", "All", "Shared", "Public", "System", "My team", "My Orgs"].includes(x.t ?? "")),
            hrefs: [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")),
          };
        });
      } catch { continue; } // page moved under us (hydration redirect): look again
      // Ownership proof: the list shows ONLY the Mine lane ("Records you created"), or it has no lane control at all
      // (a personal list: the app puts lanes on every list that mixes owners).
      if (probe.mineSelected) proof = "mine-lane";
      else if (!probe.laneTabs) proof = "no-lane-list";
      else { why = "mixed-ownership list and Mine lane did not apply"; continue; }
      for (const h of probe.hrefs) {
        const m = h?.match(re);
        if (m && !exclude.has(m[1])) { found = { value: decodeURIComponent(m[1]), from: h.split("?")[0], ownership: proof }; break; }
      }
      why = proof === "mine-lane" ? "Mine lane is empty" : "list shows no records";
    }
    if (!found) return { skipped: why };
    return found;
  } catch (e) {
    return { skipped: "parent load failed: " + String(e.message).split("\n")[0].slice(0, 80) };
  } finally {
    await page.close().catch(() => {});
  }
}

async function discover(routes) {
  const keys = dynKeys(routes);
  // process by depth so a parent is resolved before its children; within a depth, in parallel
  const byDepth = new Map();
  for (const k of keys) {
    const d = k.split("/").length;
    (byDepth.get(d) ?? byDepth.set(d, []).get(d)).push(k);
  }
  for (const d of [...byDepth.keys()].sort((a, b) => a - b)) {
    const todo = byDepth.get(d).filter((k) => !(k in ids));
    if (!todo.length) continue;
    console.log(`[discover] depth ${d}: ${todo.length} patterns`);
    await pool(todo, async (key, ctxFor) => {
      ids[key] = await resolveKey(key, ctxFor);
      console.log(`[discover] ${key} -> ${ids[key].value ?? "skipped: " + ids[key].skipped}`);
      saveIds();
    });
  }
}

function concreteRoute(pattern) {
  if (!pattern.includes("[")) return { url: pattern };
  const c = concretePrefix(pattern);
  if (c) return { url: c };
  // find the first unresolved dynamic segment for the reason
  const segs = pattern.split("/").filter(Boolean);
  for (let i = 0; i < segs.length; i++) {
    if (!isDyn(segs[i])) continue;
    const hit = ids["/" + segs.slice(0, i + 1).join("/")];
    if (!hit?.value) return { skipped: `no record: ${segs[i]} (${hit?.skipped ?? "not discovered"})` };
  }
  return { skipped: "no record" };
}

// ───────────────────────────── results file ─────────────────────────────
let result = existsSync(OUT_JSON) ? JSON.parse(readFileSync(OUT_JSON, "utf8")) : { rows: [] };
const keyOf = (r) => `${r.width}|${r.route}`;
const done = new Map(result.rows.map((r) => [keyOf(r), r]));

function summarize(rows) {
  const ok = rows.filter((r) => !r.skipped);
  const statusCounts = {};
  for (const r of ok) {
    const k = r.navError ? "nav-error" : String(r.status);
    statusCounts[k] = (statusCounts[k] ?? 0) + 1;
  }
  const per = (w) => ok.filter((r) => r.width === w);
  const pick = (f) => ok.filter(f).length;
  return {
    totalRows: rows.length,
    loaded: ok.length,
    skippedNoRecord: rows.length - ok.length,
    statusCounts,
    redirected: pick((r) => r.redirectedFrom?.length > 0),
    endedOnLogin: pick((r) => /^\/login/.test(r.finalUrl ?? "") && !/^\/login/.test(r.route)),
    pagesWithConsoleErrors: pick((r) => r.consoleErrors?.count > 0),
    pagesWithRedErrors: pick((r) => r.redCount > 0),
    pagesWithServerErrorResponses: pick((r) => r.serverErrors?.length > 0),
    horizontalOverflow: pick((r) => r.overflowX),
    clsOver0_1: pick((r) => r.cls > 0.1),
    doubleHeaders: pick((r) => r.doubleHeader),
    noHeader: pick((r) => !r.navError && r.status < 400 && r.headerPortals === 0 && r.crumbTrails === 0),
    lastElementHiddenUnderChrome: pick((r) => r.hiddenUnderChrome),
    medianTimeToStableMs: (() => {
      const v = ok.map((r) => r.timeToStableMs).filter(Number.isFinite).sort((a, b) => a - b);
      return v[Math.floor(v.length / 2)] ?? null;
    })(),
    byWidth: Object.fromEntries(WIDTHS.map((w) => [w, { loaded: per(w).length, overflow: per(w).filter((r) => r.overflowX).length, cls: per(w).filter((r) => r.cls > 0.1).length, errors: per(w).filter((r) => r.consoleErrors?.count > 0).length }])),
  };
}
const score = (r) =>
  (r.navError || r.status >= 500 ? 100 : 0) + (r.status >= 400 && r.status < 500 ? 40 : 0) + (r.serverErrors?.length ? 25 : 0) +
  (r.redCount > 0 ? 30 : 0) + (r.consoleErrors?.count > 0 ? Math.min(15, 5 + r.consoleErrors.count) : 0) +
  (r.overflowX ? 12 : 0) + Math.min(30, (r.cls ?? 0) * 40) + (r.doubleHeader ? 15 : 0) + (r.hiddenUnderChrome ? 8 : 0) +
  (/^\/login/.test(r.finalUrl ?? "") && !/^\/login/.test(r.route) ? 20 : 0);

function persist() {
  const rows = [...done.values()].sort((a, b) => a.route.localeCompare(b.route) || b.width - a.width);
  const out = {
    meta: {
      mode: MODE, origin: ORIGIN, seat: "admin@admin.com", widths: WIDTHS, recordedAt: new Date().toISOString(),
      routesInList: ROUTES.routes.length, excludedByHome: ROUTES.excludedCount, unsafeSkipped: ROUTES.unsafe,
      screenshots: SHOTS,
    },
    summary: summarize(rows),
    rows,
  };
  const tmp = OUT_JSON + ".tmp";
  writeFileSync(tmp, JSON.stringify(out, null, 1) + "\n");
  renameSync(tmp, OUT_JSON);
}

function report() {
  const rows = [...done.values()].filter((r) => !r.skipped).map((r) => ({ r, s: score(r) })).sort((a, b) => b.s - a.s).slice(0, 20);
  for (const { r, s } of rows) {
    const bits = [
      r.navError ? `NAV ${r.navError.slice(0, 50)}` : `HTTP ${r.status}`,
      r.redCount ? `red=${r.redCount}` : "", r.consoleErrors?.count ? `console=${r.consoleErrors.count}` : "",
      r.serverErrors?.length ? `5xx=${r.serverErrors.length}` : "", r.overflowX ? `overflow=${r.overflowPx}px` : "",
      r.cls > 0.1 ? `cls=${r.cls}` : "", r.doubleHeader ? "double-header" : "", r.hiddenUnderChrome ? "hidden-under-chrome" : "",
      /^\/login/.test(r.finalUrl ?? "") && !/^\/login/.test(r.route) ? "bounced-to-login" : "",
    ].filter(Boolean).join(" ");
    console.log(`${String(Math.round(s)).padStart(4)}  ${ORIGIN}${r.url} @${r.width}  ${bits}`);
  }
}

// ───────────────────────────── main ─────────────────────────────
if (flag("report")) { report(); process.exit(0); }

mkdirSync(SHOTS, { recursive: true });
const routes = ROUTES.routes.filter((r) => !ONLY || r.startsWith(ONLY));
console.log(`[crawl] ${MODE} | ${routes.length} routes (${ROUTES.excludedCount} excluded by route-homes, ${ROUTES.unsafe.length} unsafe-by-name) | widths ${WIDTHS} | concurrency ${CONCURRENCY}`);
browser = await chromium.launch({ headless: true });
await doSignIn();

await discover(routes);
saveIds();
if (flag("discover-only")) {
  const vals = Object.values(ids);
  console.log(`[discover] resolved ${vals.filter((v) => v.value).length} / ${vals.length}`);
  await browser.close();
  process.exit(0);
}

const tasks = [];
for (const route of routes) {
  const c = concreteRoute(route);
  for (const width of WIDTHS) {
    const prev = done.get(`${width}|${route}`);
    if (prev && !(flag("retry-errors") && (prev.navError || prev.status >= 500))) continue;
    tasks.push({ route, width, ...c });
  }
}
console.log(`[crawl] ${tasks.length} page loads to do (${done.size} already recorded)`);
const todo = LIMIT ? tasks.slice(0, LIMIT) : tasks;
let n = 0;
await pool(todo, async (t, ctxFor) => {
  if (t.skipped) {
    done.set(keyOf(t), { mode: MODE, width: t.width, route: t.route, skipped: t.skipped });
    if (++n % 25 === 0) persist();
    return;
  }
  const url = withFrame(t.url);
  const shot = join(SHOTS, String(t.width), slug(t.url) + ".jpg");
  mkdirSync(dirname(shot), { recursive: true });
  let c = await ctxFor(t.width);
  let row = await loadAndMeasure(c.ctx, ORIGIN + url, shot);
  if (/^\/login/.test(row.finalUrl ?? "") && !/^\/login/.test(t.route)) {
    await reSignIn(c.epoch); // session lapsed: sign in once for everyone, retry this page
    c = await ctxFor(t.width);
    row = await loadAndMeasure(c.ctx, ORIGIN + url, shot);
  }
  done.set(keyOf(t), { mode: MODE, width: t.width, route: t.route, url: t.url, ...row, recordedAt: new Date().toISOString() });
  if (++n % 10 === 0) { persist(); console.log(`[crawl] ${n}/${todo.length}`); }
});
persist();
await browser.close();
console.log("[crawl] done");
console.log(JSON.stringify(summarize([...done.values()]), null, 1));
