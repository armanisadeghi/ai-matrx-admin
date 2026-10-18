#!/usr/bin/env node
// speed-test-census — what does an EMPTY route cost? Loads every `speed-test` page (lib/perf/SpeedTestPage.tsx:
// shell + one heading, fetches nothing itself) and records every request the shell and the module layout make.
//
//   node scripts/speed-test-census.mjs                         # shared preview, admin + member + signed out, every route
//   node scripts/speed-test-census.mjs --as admin,member /speed-test /marketing/speed-test
//   node scripts/speed-test-census.mjs --base https://www.aimatrx.com      # live, signed out only
//   flags: --base <origin> · --as admin,member,anon · --idle <ms, default 5000> · --out <file.md> · --json <file>
//          --no-callers (skip the CDP async-stack capture; callers make dev timings slower still)
//
// Per load: TTFB (final response headers — never the 103 Early Hints), FCP, LCP, CLS, JS files + KB, and EVERY
// network request: kind (db table / rpc / auth / storage / realtime / functions, Python server, Next/RSC, third
// party, static asset), method, path, ms, bytes, before/after settle (the load trace's PAGE SETTLED,
// `window.__matrxLoadTrace()`), duplicates, and the caller (first app frames of the async initiator stack, from CDP).
// Signed in uses `pnpm dev-login` (one nonce per identity, never printed). Dev-server timings are inflated —
// counts are the point there; timing comes from `--base https://www.aimatrx.com`.
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { readdirSync, statSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
function flag(name, fallback) {
  const i = args.indexOf(name);
  if (i < 0) return fallback;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
}
function bool(name) {
  const i = args.indexOf(name);
  if (i < 0) return false;
  args.splice(i, 1);
  return true;
}
let BASE = flag("--base", null);
const LOCAL = !BASE || /localhost|127\.0\.0\.1/.test(BASE);
const AS = flag("--as", LOCAL ? "admin,member,anon" : "anon").split(",").map((s) => s.trim()).filter(Boolean);
const IDLE_MS = Number(flag("--idle", "5000"));
const OUT = flag("--out", null);
const JSON_OUT = flag("--json", null);
const CALLERS = !bool("--no-callers");

if (!BASE) {
  const status = execFileSync("bash", [join(ROOT, "scripts/agent-dev-server.sh"), "status"], { cwd: ROOT, encoding: "utf8" });
  const m = /YOUR URL: (http:\/\/[^\s]+)/.exec(status);
  if (!m) throw new Error("preview is not running — run: pnpm preview:ready /speed-test");
  BASE = m[1];
}
BASE = BASE.replace(/\/$/, "");

/** Every speed-test page in the app tree (route groups stripped). */
function discoverRoutes() {
  const found = [];
  const walk = (dir, route) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (!statSync(full).isDirectory() || name.startsWith("_") || name === "node_modules") continue;
      const seg = /^\(.*\)$/.test(name) ? route : `${route}/${name}`;
      if (name === "speed-test") {
        try {
          statSync(join(full, "page.tsx"));
          found.push(seg);
        } catch {}
        continue;
      }
      if (name.startsWith("[")) continue;
      walk(full, seg);
    }
  };
  walk(join(ROOT, "app"), "");
  return found.sort((a, b) => (a === "/speed-test" ? -1 : b === "/speed-test" ? 1 : a.localeCompare(b)));
}
const ROUTES = args.length ? args : discoverRoutes();

/** Where a request went — mirrors classifyRequest in lib/diagnostics/loadTrace.ts, plus static assets. */
function classify(url, type, origin) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return { kind: "other", label: url.slice(0, 80), dupKey: url };
  }
  const rsc = u.searchParams.has("_rsc");
  if (rsc) u.searchParams.delete("_rsc");
  const search = u.search ? decodeURIComponent(u.search).slice(0, 90) : "";
  const dupKey = `${u.origin}${u.pathname}${u.search}`;
  if (u.host.startsWith("db.") || u.host.endsWith(".supabase.co")) {
    const rest = /^\/rest\/v1\/(rpc\/)?([^/?]+)/.exec(u.pathname);
    if (rest) return { kind: rest[1] ? "db rpc" : "db table", label: `${rest[2]}${search ? ` ${search}` : ""}`, dupKey };
    const sub = /^\/(auth|storage|realtime|functions)\/v1(.*)$/.exec(u.pathname);
    if (sub) return { kind: `db ${sub[1]}`, label: `${sub[2] || "/"}${search ? ` ${search.slice(0, 50)}` : ""}`, dupKey };
    return { kind: "db other", label: u.pathname, dupKey };
  }
  if (u.host.endsWith("matrxserver.com")) return { kind: "server", label: `${u.host.split(".")[0]} ${u.pathname}${search}`, dupKey };
  if (u.origin === origin) {
    if (/^\/_next\/(static|image)|\.(js|css|woff2?|png|svg|ico|jpg|webp|map)$/.test(u.pathname) || ["Script", "Stylesheet", "Font", "Image"].includes(type))
      return { kind: "static", label: u.pathname, dupKey };
    if (type === "Document") return { kind: "next doc", label: `${u.pathname}${search}`, dupKey };
    return { kind: rsc ? "next rsc" : "next", label: `${u.pathname}${search}`, dupKey };
  }
  if (["Script", "Stylesheet", "Font", "Image"].includes(type)) return { kind: "3p static", label: `${u.host}${u.pathname}`.slice(0, 90), dupKey };
  return { kind: "3p", label: `${u.host}${u.pathname}${search}`.slice(0, 110), dupKey };
}
const isDb = (k) => k.startsWith("db ");

// Frames that never explain WHY a request happened: transport, frameworks, the trace itself.
const NOISE = /node_modules|@supabase|postgrest|supabase-js|gotrue|realtime-js|react-dom|react-server-dom|next\/dist|next_dist|loadTrace|resilientFetch|turbopack|webpack|<anonymous>|^$/i;
function fileOf(url) {
  const last = (url || "").split("?")[0].split("/").pop() || "";
  return last.replace(/_[0-9a-f]{6,}\._\.js$|\._\.js$|\.js$/, "");
}
function callerOf(initiator) {
  if (!initiator) return "";
  const frames = [];
  for (let st = initiator.stack; st && frames.length < 3; st = st.parent) {
    for (const f of st.callFrames || []) {
      if (frames.length >= 3) break;
      if (NOISE.test(f.url) || !f.functionName) continue;
      const label = `${f.functionName}@${fileOf(f.url)}`;
      if (!frames.includes(label)) frames.push(label);
    }
  }
  if (frames.length) return frames.join(" < ");
  if (initiator.type === "parser") return `html ${fileOf(initiator.url)}`;
  return initiator.type || "";
}

async function signIn(browser, who) {
  if (who === "anon") return undefined;
  const out = execFileSync("bash", [join(ROOT, "scripts/dev-login.sh"), ...(who === "member" ? ["--member"] : []), "/speed-test"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  const url = /OPEN\s*:\s*(\S+)/.exec(out)?.[1];
  if (!url) throw new Error(`dev-login printed no URL for ${who}`);
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const resp = await page.goto(url, { waitUntil: "load", timeout: 180000 });
  await page.waitForTimeout(3000);
  if (!resp || resp.status() >= 400) throw new Error(`dev-login for ${who} answered ${resp?.status()} (walk cap or build error — run pnpm preview:ready /speed-test)`);
  const landed = new URL(page.url()).pathname;
  if (/login|sign-in|auth/.test(landed)) throw new Error(`dev-login for ${who} landed on ${landed}`);
  const state = await ctx.storageState();
  await ctx.close();
  return state;
}

async function measure(browser, storageState, route) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, storageState });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    window.__lcp = 0;
    window.__cls = 0;
    try {
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) window.__lcp = e.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
      }).observe({ type: "layout-shift", buffered: true });
    } catch {}
  });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  if (CALLERS) {
    await cdp.send("Debugger.enable");
    await cdp.send("Debugger.setAsyncCallStackDepth", { maxDepth: 32 });
  }
  const reqs = new Map();
  cdp.on("Network.requestWillBeSent", (e) => {
    const prev = reqs.get(e.requestId);
    if (prev && e.redirectResponse) prev.redirects = (prev.redirects || 0) + 1;
    reqs.set(e.requestId, {
      ...(prev || {}),
      url: e.request.url,
      method: e.request.method,
      type: e.type,
      wall: e.wallTime * 1000,
      ts: e.timestamp,
      caller: prev?.caller || callerOf(e.initiator),
    });
  });
  cdp.on("Network.responseReceived", (e) => {
    const r = reqs.get(e.requestId);
    if (r) {
      r.status = e.response.status;
      r.fromCache = e.response.fromDiskCache || e.response.fromServiceWorker;
    }
  });
  cdp.on("Network.loadingFinished", (e) => {
    const r = reqs.get(e.requestId);
    if (r) {
      r.end = e.timestamp;
      r.bytes = e.encodedDataLength;
    }
  });
  cdp.on("Network.loadingFailed", (e) => {
    const r = reqs.get(e.requestId);
    if (r) {
      r.end = e.timestamp;
      r.failed = e.canceled ? "canceled" : e.errorText;
    }
  });
  cdp.on("Network.webSocketCreated", (e) => {
    reqs.set(`ws-${e.requestId}`, { url: e.url, method: "WS", type: "WebSocket", wall: Date.now(), ts: null, caller: callerOf(e.initiator), ws: true });
  });

  const url = BASE + route + (route.includes("?") ? "&" : "?") + "trace=load";
  let error = null;
  try {
    await page.goto(url, { waitUntil: "load", timeout: 180000 });
  } catch (e) {
    error = String(e.message || e).split("\n")[0];
  }
  // Settle = the trace's PAGE SETTLED (it caps itself at 15 s); then IDLE_MS of network quiet.
  const t0 = Date.now();
  let settledAt = null;
  while (Date.now() - t0 < 30000) {
    settledAt = await page.evaluate(() => window.__matrxLoadTrace?.()?.settledAt ?? null).catch(() => null);
    if (settledAt !== null) break;
    await page.waitForTimeout(250);
  }
  const quietStart = Date.now();
  let lastCount = -1;
  let quietSince = Date.now();
  while (Date.now() - quietStart < 30000) {
    const open = [...reqs.values()].filter((r) => !r.ws && r.end === undefined).length;
    if (reqs.size !== lastCount || open > 0) {
      lastCount = reqs.size;
      if (open > 0 || Date.now() - quietSince > 0) quietSince = Date.now();
    }
    if (Date.now() - quietSince >= IDLE_MS) break;
    await page.waitForTimeout(250);
  }
  const m = await page
    .evaluate(() => {
      const n = performance.getEntriesByType("navigation")[0];
      const fcp = performance.getEntriesByType("paint").find((p) => p.name === "first-contentful-paint");
      const js = performance.getEntriesByType("resource").filter((r) => r.initiatorType === "script" || /\.m?js(\?|$)/.test(r.name));
      const trace = window.__matrxLoadTrace?.();
      return {
        timeOrigin: performance.timeOrigin,
        // finalResponseHeadersStart is the real first byte; responseStart is the 103 Early Hints when one is sent.
        ttfb: Math.round(n?.finalResponseHeadersStart || n?.responseStart || -1),
        early103: n?.firstInterimResponseStart ? Math.round(n.firstInterimResponseStart) : null,
        fcp: Math.round(fcp?.startTime ?? -1),
        lcp: Math.round(window.__lcp),
        cls: +window.__cls.toFixed(3),
        jsFiles: js.length,
        jsWireKB: Math.round(js.reduce((a, r) => a + (r.transferSize || 0), 0) / 1024),
        jsKB: Math.round(js.reduce((a, r) => a + (r.decodedBodySize || 0), 0) / 1024),
        traceOn: !!trace,
        traceDuplicates: trace?.duplicates?.length ?? null,
        finalPath: location.pathname,
      };
    })
    .catch((e) => ({ error: String(e) }));
  await ctx.close();

  const origin = new URL(BASE).origin;
  const rows = [...reqs.values()]
    .filter((r) => r.url && !r.url.startsWith("data:") && !r.url.startsWith("blob:"))
    .map((r) => {
      const c = classify(r.url, r.type, origin);
      const at = Math.round(r.wall - (m.timeOrigin || 0));
      return {
        ...c,
        method: r.method,
        at,
        ms: r.end !== undefined && r.ts !== null ? Math.round((r.end - r.ts) * 1000) : null,
        bytes: r.bytes ?? null,
        status: r.failed || r.status || (r.ws ? "ws" : ""),
        phase: settledAt === null ? "?" : at < settledAt ? "before" : "after",
        caller: r.caller,
      };
    })
    .sort((a, b) => a.at - b.at);
  const counts = new Map();
  for (const r of rows) if (r.kind !== "static" && r.kind !== "3p static") counts.set(`${r.method} ${r.dupKey}`, (counts.get(`${r.method} ${r.dupKey}`) || 0) + 1);
  for (const r of rows) r.times = counts.get(`${r.method} ${r.dupKey}`) || 1;
  return { route, error, settledAt, ...m, rows };
}

const esc = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
function routeMarkdown(who, res) {
  const out = [];
  const nonStatic = res.rows.filter((r) => r.kind !== "static" && r.kind !== "3p static");
  const statics = res.rows.filter((r) => r.kind === "static" || r.kind === "3p static");
  out.push(`### ${res.route} — ${who}`);
  out.push("");
  out.push(
    `final path \`${res.finalPath}\` · settled +${res.settledAt ?? "never"}ms · TTFB ${res.ttfb}ms${res.early103 !== null && res.early103 !== undefined ? ` (103 at ${res.early103}ms)` : ""} · FCP ${res.fcp}ms · LCP ${res.lcp}ms · CLS ${res.cls} · JS ${res.jsFiles} files / ${res.jsKB} KB (${res.jsWireKB} KB wire) · static assets ${statics.length}${res.error ? ` · ERROR ${esc(res.error)}` : ""}`,
  );
  out.push("");
  out.push("| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |");
  out.push("|---|---|---|---|---|---|---|---|---|---|---|");
  nonStatic.forEach((r, i) =>
    out.push(
      `| ${i + 1} | ${r.at} | ${r.phase} | ${r.kind} | ${r.method} | ${esc(r.label)} | ${r.ms ?? ""} | ${r.bytes ?? ""} | ${esc(r.status)} | ${r.times > 1 ? `×${r.times}` : ""} | ${esc(r.caller)} |`,
    ),
  );
  out.push("");
  return out.join("\n");
}
function summaryRow(who, res) {
  const ns = res.rows.filter((r) => r.kind !== "static" && r.kind !== "3p static");
  const dbB = ns.filter((r) => isDb(r.kind) && r.phase === "before").length;
  const dbA = ns.filter((r) => isDb(r.kind) && r.phase !== "before").length;
  const srv = ns.filter((r) => r.kind === "server").length;
  const next = ns.filter((r) => r.kind.startsWith("next") && r.kind !== "next doc").length;
  const tp = ns.filter((r) => r.kind === "3p").length;
  const dups = new Set(ns.filter((r) => r.times > 1).map((r) => `${r.method} ${r.dupKey}`)).size;
  const doc = res.rows.find((r) => r.kind === "next doc");
  return `| ${res.route} | ${who} | ${doc?.status ?? ""} | ${res.finalPath === res.route ? "" : res.finalPath} | ${dbB} | ${dbA} | ${srv} | ${next} | ${tp} | ${dups} | ${res.jsFiles} | ${res.jsKB} | ${res.ttfb} | ${res.fcp} | ${res.lcp} | ${res.cls} | ${res.settledAt ?? "never"} |`;
}

const browser = await chromium.launch();
const results = [];
const started = new Date().toISOString();
for (const who of AS) {
  let state;
  try {
    state = await signIn(browser, who);
  } catch (e) {
    console.error(`[census] ${who}: sign-in failed — ${e.message}`);
    continue;
  }
  for (const route of ROUTES) {
    const res = await measure(browser, state, route);
    results.push({ who, ...res });
    const ns = res.rows.filter((r) => r.kind !== "static" && r.kind !== "3p static");
    console.error(
      `[census] ${who.padEnd(6)} ${route.padEnd(36)} db ${ns.filter((r) => isDb(r.kind) && r.phase === "before").length}/${ns.filter((r) => isDb(r.kind) && r.phase !== "before").length} server ${ns.filter((r) => r.kind === "server").length} js ${res.jsKB}KB fcp ${res.fcp} settle ${res.settledAt}${res.finalPath !== route ? ` -> ${res.finalPath}` : ""}${res.error ? ` ERR ${res.error}` : ""}`,
    );
  }
}
await browser.close();

const md = [];
md.push(`## Speed-test census — ${started}`);
md.push("");
md.push(`base \`${LOCAL ? "shared preview (dev server — timings inflated, counts are what matter)" : BASE}\` · identities ${AS.join(", ")} · idle after settle ${IDLE_MS} ms · callers ${CALLERS ? "on" : "off"}`);
md.push("");
md.push("DB = every request to the database host (tables, rpc, auth, storage, realtime socket, functions). Before/after = request start vs the load trace's PAGE SETTLED.");
md.push("");
md.push("| route | who | doc | landed on | DB before settle | DB after settle | server | Next/RSC | 3rd party | dup keys | JS files | JS KB | TTFB | FCP | LCP | CLS | settled |");
md.push("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|");
for (const r of results) md.push(summaryRow(r.who, r));
md.push("");
for (const r of results) md.push(routeMarkdown(r.who, r));
const text = md.join("\n");
if (OUT) writeFileSync(OUT, text);
else process.stdout.write(text + "\n");
if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify(results, null, 1));
