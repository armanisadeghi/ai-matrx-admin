// Board scale bench: a board holding ~10–15 full pages of heavy, live work must not slow down.
//
//   node scripts/board-scale-bench.mjs                       # the shared preview (pnpm preview:ready /board first)
//   node scripts/board-scale-bench.mjs --live                # https://aimatrx.com, signed in as the test admin
//   options: --idle-min 10 (heap re-read after N idle minutes; 0 skips) · --out <file.json> · --keep (no cleanup)
//            --trace (also writes a CDP trace of one pan with invalidation tracking, and summarises it)
//
// What it does (headless Chromium only — never a visible browser):
//   1. Signs in as admin@admin.com (preview: `pnpm dev-login`; live: the env's AI_ADMIN_* through the
//      Supabase password grant — values are never printed).
//   2. Creates a fresh board "Scale bench <date>" owned by that account with 14 heavy tiles over REAL
//      records: 3 long existing chats, a NEW chat on Test Reply (the cheap test agent — never General
//      Chat) that streams a reply during the measurements, one more existing chat, a 25k-row table, a
//      document, an 87k-character note, a project, a task, a meeting, a research topic, a PDF file and
//      a Page tile (/notes).
//   3. Measures, each phase separately: frame times while panning (2 s), dragging a tile, resizing a
//      tile and zooming; open time of the tile context menu and the Add menu; long tasks; JS heap and
//      DOM nodes after 0 and N minutes idle (stream finished, after GC); requests during 30 s idle.
//   4. Writes JSON (numbers + budgets + pass/fail) and prints a table. Exit code 1 on a budget miss.
//   5. Archives (soft-deletes) only what it created: the board and the Test Reply conversation.
//
// Budgets start from the 2026-10-02 measurement (features/board/HANDOFF-stability.md §2).
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const args = process.argv.slice(2);
const flag = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const has = (n) => args.includes(n);
const LIVE = has("--live");
const IDLE_MIN = Number(flag("--idle-min", "10"));
const KEEP = has("--keep");
const TRACE = has("--trace");
const PROFILE = has("--profile"); // CPU profile per gesture phase; top self-time functions go in the JSON
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const OUT = flag("--out", join("tmp", "board-scale-bench", `${LIVE ? "live" : "preview"}-${stamp}.json`));

export const BUDGETS = {
  panP95Ms: 20,
  dragP95Ms: 20,
  resizeP95Ms: 20,
  zoomP95Ms: 20,
  contextMenuOpenMs: 100,
  addMenuOpenMs: 100,
  longestTaskDuringPanMs: 200,
  heapGrowthPct: 15,
  idleRequests30s: 2,
};

// ── env (values read, never printed) ─────────────────────────────────────────
function readEnv(file) {
  const out = {};
  try {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {}
  return out;
}
const ENV = { ...readEnv(".env"), ...readEnv(".env.local"), ...process.env };
const SB_URL = ENV.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = ENV.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!SB_URL || !SB_KEY) throw new Error("NEXT_PUBLIC_SUPABASE_URL / _PUBLISHABLE_KEY missing from .env.local");
const COOKIE = "sb-matrx-auth-v2";

// ── the records the board shows (admin@admin.com's own; read-only except the new chat) ──────────
const TEST_REPLY_AGENT = "8a4b7c8e-144f-4391-b5f0-3d2cd2ecee0f"; // cheap test agent (skill test-model-selection §2b)
const STREAM_TILE = "bench-chat-stream";
const W = 620, H = 760, GAP = 40, COLS = 5;
const TILES = [
  { id: STREAM_TILE, title: "Stream (Test Reply)", source: { kind: "entity", entity: "chat", id: null, meta: { agentId: TEST_REPLY_AGENT, list: "closed" } } },
  { id: "bench-chat-1", title: "Long chat 1", source: { kind: "entity", entity: "chat", id: "5392b5e5-110f-5097-be01-c6e4f4adb165", meta: { list: "closed" } } },
  { id: "bench-chat-2", title: "Long chat 2", source: { kind: "entity", entity: "chat", id: "e70be2d3-7220-54e4-8724-0ccb5b99301f", meta: { list: "closed" } } },
  { id: "bench-chat-3", title: "Long chat 3", source: { kind: "entity", entity: "chat", id: "c65e3669-f198-4c99-b98a-4185ee226808", meta: { list: "closed" } } },
  { id: "bench-chat-4", title: "Chat 4", source: { kind: "entity", entity: "chat", id: "0a7e9939-7232-5bd1-89eb-dbe0de7d7be6", meta: { list: "closed" } } },
  { id: "bench-table", title: "25k-row table", source: { kind: "entity", entity: "data-table", id: "a312f617-a388-41f4-b1ed-37a844827684" } },
  { id: "bench-doc", title: "Document", source: { kind: "entity", entity: "udt_document", id: "2a67c3b5-544d-4673-952e-7fac44047448" } },
  { id: "bench-note", title: "Long note", source: { kind: "entity", entity: "note", id: "83dd0cb5-819d-4050-8e61-83143c504dbc" } },
  { id: "bench-project", title: "Project", source: { kind: "entity", entity: "project", id: "4365d5b1-d697-4186-a165-ba109b80f333" } },
  { id: "bench-task", title: "Task", source: { kind: "entity", entity: "task", id: "2183cc2f-712e-457a-b81d-6ea4008e2ff7" } },
  { id: "bench-meeting", title: "Meeting", source: { kind: "entity", entity: "meeting", id: "714f8d1f-00a5-495d-be91-25be686f61dc" } },
  { id: "bench-research", title: "Research", source: { kind: "entity", entity: "research", id: "719c2408-8cd8-4681-875a-25b374c5b31b" } },
  { id: "bench-file", title: "PDF", source: { kind: "entity", entity: "file", id: "37c9e87d-7a2f-4beb-a1e0-e1a3727808a1" } },
  { id: "bench-page", title: "Notes page", source: { kind: "entity", entity: "page", id: "/notes" } },
];
const nodes = TILES.map((t, i) => ({
  id: t.id,
  title: t.title,
  source: t.source,
  rect: { x: (i % COLS) * (W + GAP), y: Math.floor(i / COLS) * (H + GAP), w: W, h: H },
}));
const Z = 0.75; // above OVERVIEW_ZOOM (≈0.68): every visible tile draws its real body
const CAM0 = { x: 20, y: 70, z: Z };

// ── REST as the signed-in person ─────────────────────────────────────────────
let TOKEN = null;
async function rest(schema, path, { method = "GET", body, prefer } = {}) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      [method === "GET" ? "Accept-Profile" : "Content-Profile"]: schema,
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${schema}.${path} → ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

function sessionFromCookies(cookies) {
  const parts = cookies
    .filter((c) => c.name === COOKIE || c.name.startsWith(`${COOKIE}.`))
    .sort((a, b) => Number(a.name.split(".").pop()) - Number(b.name.split(".").pop()));
  if (!parts.length) return null;
  let raw = parts.map((c) => c.value).join("");
  raw = decodeURIComponent(raw);
  if (raw.startsWith("base64-")) raw = Buffer.from(raw.slice(7), "base64url").toString("utf8");
  return JSON.parse(raw);
}

function cookiesForSession(session, domain) {
  const value = `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`;
  const CHUNK = 3180;
  const base = { domain, path: "/", httpOnly: false, secure: true, sameSite: "Lax" };
  if (value.length <= CHUNK) return [{ ...base, name: COOKIE, value }];
  const out = [];
  for (let i = 0; i * CHUNK < value.length; i++) out.push({ ...base, name: `${COOKIE}.${i}`, value: value.slice(i * CHUNK, (i + 1) * CHUNK) });
  return out;
}

// ── browser ──────────────────────────────────────────────────────────────────
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
ctx.setDefaultNavigationTimeout(900000); // a cold preview compile of /board can take minutes
let origin;
if (LIVE) {
  origin = "https://aimatrx.com";
  const res = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SB_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: ENV.AI_ADMIN_USERNAME, password: ENV.AI_ADMIN_PASSWORD }),
  });
  if (!res.ok) throw new Error(`sign-in refused: ${res.status}`);
  const session = await res.json();
  TOKEN = session.access_token;
  await ctx.addCookies(cookiesForSession(session, ".aimatrx.com"));
} else {
  const session = process.env.MATRX_PREVIEW_SESSION;
  const out = execSync(`${session ? `MATRX_PREVIEW_SESSION=${session} ` : ""}bash scripts/dev-login.sh /board`, { encoding: "utf8" });
  const open = out.match(/OPEN\s*:\s*(\S+)/)[1];
  origin = new URL(open).origin;
  const p = await ctx.newPage();
  await p.goto(open, { waitUntil: "domcontentloaded" });
  await p.waitForURL((u) => u.pathname.startsWith("/board"), { timeout: 900000 }); // the dev-login URL itself carries next=/board
  await p.close();
  TOKEN = sessionFromCookies(await ctx.cookies())?.access_token;
}
if (!TOKEN) throw new Error("no session after sign-in");
const me = JSON.parse(Buffer.from(TOKEN.split(".")[1], "base64url").toString("utf8"));
if (me.email !== "admin@admin.com") throw new Error(`signed in as the wrong account`);

// ── the board ────────────────────────────────────────────────────────────────
const [orgRow] = await rest("projects", `boards?select=organization_id&created_by=eq.${me.sub}&deleted_at=is.null&order=updated_at.desc&limit=1`);
if (!orgRow) throw new Error("admin has no board to take an organization from");
const title = `Scale bench ${new Date().toISOString().slice(0, 16).replace("T", " ")}`;
const [board] = await rest("projects", "boards?select=id", {
  method: "POST",
  prefer: "return=representation",
  body: { title, organization_id: orgRow.organization_id, nodes, edges: [], camera: CAM0, settings: {} },
});
console.error(`board: ${origin}/board/${board.id}`);

const created = { board: board.id, conversation: null };
async function cleanup() {
  if (KEEP) return;
  const now = new Date().toISOString();
  try {
    const [row] = await rest("projects", `boards?select=nodes&id=eq.${board.id}`);
    const conv = row?.nodes?.find((n) => n.id === STREAM_TILE)?.source?.id ?? null;
    if (conv) {
      created.conversation = conv;
      await rest("chat", `conversation?id=eq.${conv}&created_by=eq.${me.sub}`, { method: "PATCH", body: { deleted_at: now } });
    }
  } catch (e) {
    console.error("cleanup (conversation):", e.message);
  }
  await rest("projects", `boards?id=eq.${board.id}`, { method: "PATCH", body: { deleted_at: now } }).catch((e) => console.error("cleanup (board):", e.message));
}

const results = { at: new Date().toISOString(), target: LIVE ? "live" : "preview", origin, board: board.id, tiles: TILES.length, phases: {} };
let exitCode = 0;
try {
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Performance.enable");
  await page.addInitScript(() => {
    window.__phase = "load";
    window.__long = [];
    try {
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) window.__long.push({ phase: window.__phase, ms: Math.round(e.duration) });
      }).observe({ type: "longtask", buffered: true });
    } catch {}
    // Frame recorder: rAF deltas while a phase is being sampled.
    window.__frames = null;
    window.__startFrames = () => {
      window.__frames = [];
      let last = performance.now();
      const tick = (t) => {
        if (!window.__frames) return;
        window.__frames.push(t - last);
        last = t;
        requestAnimationFrame(tick);
      };
      requestAnimationFrame((t) => {
        last = t;
        requestAnimationFrame(tick);
      });
    };
    window.__stopFrames = () => {
      const f = window.__frames || [];
      window.__frames = null;
      return f;
    };
  });
  await page.goto(`${origin}/board/${board.id}#cam=${CAM0.x},${CAM0.y},${CAM0.z}`, { waitUntil: "domcontentloaded" });
  await page.locator('[role=toolbar][aria-label="Board tools"] button').first().waitFor({ timeout: 900000 });
  await page.locator("[data-board-tile]").first().waitFor({ timeout: 120000 });
  await page.waitForTimeout(8000);

  const stats = (arr) => {
    const s = [...arr].sort((a, b) => a - b);
    const q = (p) => (s.length ? Math.round(s[Math.min(s.length - 1, Math.floor(p * s.length))] * 10) / 10 : null);
    return { frames: s.length, p50: q(0.5), p95: q(0.95), max: q(1) };
  };
  const setPhase = (p) => page.evaluate((x) => (window.__phase = x), p);
  const longIn = async (phase) => (await page.evaluate(() => window.__long)).filter((l) => l.phase === phase).map((l) => l.ms);
  async function sample(phase, fn) {
    await setPhase(phase);
    if (PROFILE) {
      await cdp.send("Profiler.enable");
      await cdp.send("Profiler.setSamplingInterval", { interval: 200 });
      await cdp.send("Profiler.start");
    }
    await page.evaluate(() => window.__startFrames());
    await fn();
    const f = await page.evaluate(() => window.__stopFrames());
    if (PROFILE) {
      const { profile } = await cdp.send("Profiler.stop");
      const dt = {};
      const byId = new Map(profile.nodes.map((n) => [n.id, n]));
      for (let i = 0; i < profile.samples.length; i++) dt[profile.samples[i]] = (dt[profile.samples[i]] ?? 0) + (profile.timeDeltas[i] ?? 0);
      const self = {};
      for (const [id, us] of Object.entries(dt)) {
        const cf = byId.get(Number(id))?.callFrame;
        if (!cf) continue;
        const k = `${cf.functionName || "(anon)"} ${cf.url.split("/").pop().split("?")[0]}:${cf.lineNumber + 1}`;
        self[k] = (self[k] ?? 0) + us;
      }
      results.profiles ??= {};
      results.profiles[phase] = Object.entries(self).sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k, us]) => [k, Math.round(us / 1000)]);
      mkdirSync(dirname(OUT), { recursive: true });
      writeFileSync(OUT.replace(/\.json$/, `.${phase}.cpuprofile`), JSON.stringify(profile));
    }
    await setPhase("idle");
    const long = await longIn(phase);
    results.phases[phase] = { ...stats(f.slice(1)), longTasks: long.length, longestTaskMs: long.length ? Math.max(...long) : 0 };
    console.error(phase, JSON.stringify(results.phases[phase]));
  }
  const tileBox = async (id) => page.locator(`[data-board-tile="${id}"]`).boundingBox();
  async function metrics() {
    await cdp.send("HeapProfiler.collectGarbage").catch(() => {});
    const { metrics: m } = await cdp.send("Performance.getMetrics");
    const get = (n) => m.find((x) => x.name === n)?.value ?? null;
    return { heapMB: Math.round((get("JSHeapUsedSize") / 1048576) * 10) / 10, domNodes: get("Nodes"), elements: await page.evaluate(() => document.getElementsByTagName("*").length) };
  }
  async function middlePan(dx, dy, ms) {
    const steps = Math.max(10, Math.round(ms / 16));
    await page.mouse.move(720, 450);
    await page.mouse.down({ button: "middle" });
    for (let i = 1; i <= steps; i++) {
      await page.mouse.move(720 + (dx * i) / steps, 450 + (dy * i) / steps);
      await page.waitForTimeout(ms / steps);
    }
    await page.mouse.up({ button: "middle" });
  }

  // Wake every body once (a tile first seen below full detail mounts none): sweep the camera over the board.
  await setPhase("warm");
  await middlePan(-900, 0, 1200);
  await middlePan(-900, 0, 1200);
  await middlePan(0, -700, 1000);
  await middlePan(900, 0, 1200);
  await middlePan(900, 0, 1200);
  await middlePan(0, 700, 1000);
  await page.waitForTimeout(6000);
  results.mountedBodies = await page.evaluate(() => document.querySelectorAll("[data-board-body]").length);

  // Start the live stream on the Test Reply chat (top-left, in view).
  const streamBox = await tileBox(STREAM_TILE);
  const composer = page.locator(`[data-board-tile="${STREAM_TILE}"] textarea, [data-board-tile="${STREAM_TILE}"] [contenteditable=true]`).first();
  let streamed = false;
  if (streamBox && (await composer.count())) {
    await composer.click();
    await composer.fill("Write a 250-word story about a lighthouse keeper, in plain paragraphs.");
    await page.keyboard.press("Enter");
    streamed = true;
    await page.waitForTimeout(1200);
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
  }
  results.streamStarted = streamed;

  // Pan (2 s, middle-button drag — pans over tiles too), while the reply streams.
  await sample("pan", () => middlePan(-500, -260, 2000));
  await page.waitForTimeout(800);
  await sample("panBack", () => middlePan(500, 260, 2000));
  await page.waitForTimeout(800);

  // Drag a tile by its header.
  let b = await tileBox("bench-chat-1");
  await sample("drag", async () => {
    await page.mouse.move(b.x + 80, b.y + 12);
    await page.mouse.down();
    for (let i = 1; i <= 120; i++) {
      await page.mouse.move(b.x + 80 + i * 2, b.y + 12 + i);
      await page.waitForTimeout(16);
    }
    await page.mouse.up();
  });
  await page.waitForTimeout(800);

  // Resize the same tile from its bottom-right corner (selected → handles show).
  await page.locator('[data-board-tile="bench-chat-1"] [data-board-resize="se"]').first().waitFor({ state: "attached", timeout: 10000 }).catch(() => {});
  const handle = await page.locator('[data-board-tile="bench-chat-1"] [data-board-resize="se"]').first().boundingBox();
  if (handle) {
    await sample("resize", async () => {
      const x0 = handle.x + handle.width / 2, y0 = handle.y + handle.height / 2;
      await page.mouse.move(x0, y0);
      await page.mouse.down();
      for (let i = 1; i <= 120; i++) {
        await page.mouse.move(x0 - i, y0 - i * 0.8);
        await page.waitForTimeout(16);
      }
      await page.mouse.up();
    });
  } else results.phases.resize = { error: "no resize handle found" };
  await page.keyboard.press("Escape");
  await page.waitForTimeout(800);

  // Zoom: ctrl+wheel in and back out (stays above the overview zoom so bodies stay real).
  await sample("zoom", async () => {
    await page.mouse.move(720, 450);
    await page.keyboard.down("Control");
    for (let i = 0; i < 30; i++) {
      await page.mouse.wheel(0, i < 15 ? -20 : 20);
      await page.waitForTimeout(33);
    }
    await page.keyboard.up("Control");
  });
  await page.waitForTimeout(1000);

  // Menu open: event → menu in the DOM → next frame painted.
  async function timeMenu(phase, open, menuSel) {
    await setPhase(phase);
    await page.evaluate((sel) => {
      window.__menu = { t0: 0, t1: 0 };
      const start = () => (window.__menu.t0 = performance.now());
      document.addEventListener("pointerdown", start, { capture: true, once: true });
      const obs = new MutationObserver(() => {
        if (window.__menu.t1 || !document.querySelector(sel)) return;
        obs.disconnect();
        requestAnimationFrame(() => setTimeout(() => (window.__menu.t1 = performance.now()), 0));
      });
      obs.observe(document.body, { childList: true, subtree: true });
    }, menuSel);
    await open();
    await page.waitForFunction(() => window.__menu.t1 > 0, null, { timeout: 30000 }).catch(() => {});
    const m = await page.evaluate(() => window.__menu);
    if (!m.t1) await page.screenshot({ path: OUT.replace(/\.json$/, `.${phase}-fail.png`) }).catch(() => {});
    await setPhase("idle");
    const long = await longIn(phase);
    results.phases[phase] = { openMs: m.t1 ? Math.round(m.t1 - m.t0) : null, longestTaskMs: long.length ? Math.max(...long) : 0 };
    console.error(phase, JSON.stringify(results.phases[phase]));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(600);
  }
  // Back to the opening view, then right-click the header of a tile that is really under the pointer there.
  await page.keyboard.press("Escape");
  await page.evaluate((c) => (location.hash = `cam=${c.x},${c.y},${c.z}`), CAM0);
  await page.waitForTimeout(1500);
  const header = await page.evaluate(() => {
    for (const el of document.querySelectorAll("[data-board-tile]")) {
      const r = el.getBoundingClientRect();
      const x = r.left + 60, y = r.top + 10;
      if (x < 450 || x > 1300 || y < 120 || y > 800) continue; // clear of the toolbar, side panels and the minimap
      if (el.contains(document.elementFromPoint(x, y))) return { x, y, id: el.getAttribute("data-board-tile") };
    }
    return null;
  });
  results.contextMenuTile = header?.id ?? null;
  if (header) await timeMenu("contextMenu", () => page.mouse.click(header.x, header.y, { button: "right" }), "[role=menu]");
  else results.phases.contextMenu = { error: "no tile header under the pointer" };
  await timeMenu("addMenu", () => page.locator('[role=toolbar][aria-label="Board tools"] button').first().click(), "[cmdk-item],[role=menu]");

  // Optional diagnostic trace of one pan.
  if (TRACE) {
    const tracePath = OUT.replace(/\.json$/, ".trace.json");
    const chunks = [];
    cdp.on("Tracing.dataCollected", (e) => chunks.push(...e.value));
    const done = new Promise((r) => cdp.once("Tracing.tracingComplete", r));
    await cdp.send("Tracing.start", {
      categories: "devtools.timeline,disabled-by-default-devtools.timeline,disabled-by-default-devtools.timeline.invalidationTracking,blink.user_timing",
      transferMode: "ReportEvents",
    });
    await middlePan(-400, -200, 2000);
    await cdp.send("Tracing.end");
    await done;
    mkdirSync(dirname(tracePath), { recursive: true });
    writeFileSync(tracePath, JSON.stringify({ traceEvents: chunks }));
    const ult = chunks.filter((e) => e.name === "UpdateLayoutTree" && e.ph === "X");
    const subtree = chunks.filter((e) => e.name === "StyleInvalidatorInvalidationTracking" && /subtree/i.test(e.args?.data?.reason ?? ""));
    const subtreeSel = {};
    for (const e of subtree) {
      const k = `${e.args.data.nodeName ?? "?"} ← ${(e.args.data.invalidationList ?? []).map((i) => i.classes?.join(".") || i.attributes?.join(",") || i.id || i.tagNames?.join(",") || "").join(" | ")}`;
      subtreeSel[k] = (subtreeSel[k] ?? 0) + 1;
    }
    results.trace = {
      file: tracePath,
      updateLayoutTree: ult.length,
      maxElementCount: Math.max(0, ...ult.map((e) => e.args?.elementCount ?? e.args?.data?.elementCount ?? 0)),
      sumUpdateLayoutTreeMs: Math.round(ult.reduce((s, e) => s + (e.dur ?? 0), 0) / 1000),
      subtreeInvalidations: subtree.length,
      topSubtree: Object.entries(subtreeSel).sort((a, b) => b[1] - a[1]).slice(0, 10),
      topTasks: chunks
        .filter((e) => e.ph === "X" && e.name === "RunTask" && e.dur > 30000)
        .map((e) => Math.round(e.dur / 1000))
        .sort((a, b) => b - a)
        .slice(0, 10),
    };
    console.error("trace", JSON.stringify(results.trace));
  }

  // Idle: wait for the stream to finish, then heap/DOM at 0, requests over 30 s, heap/DOM at N min.
  await page.mouse.click(1400, 880).catch(() => {});
  await page.keyboard.press("Escape");
  await page.waitForTimeout(15000);
  await setPhase("idle0");
  results.idle0 = await metrics();
  let requests = [];
  const onReq = (r) => requests.push(r.url().replace(/\?.*$/, "").slice(0, 160));
  page.on("request", onReq);
  await page.waitForTimeout(30000);
  page.off("request", onReq);
  const counts = {};
  for (const u of requests) counts[u] = (counts[u] ?? 0) + 1;
  results.idleRequests = { count: requests.length, top: Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10) };
  console.error("idle requests", JSON.stringify(results.idleRequests));
  if (IDLE_MIN > 0) {
    await page.waitForTimeout(Math.max(0, IDLE_MIN * 60000 - 30000));
    results.idleN = { minutes: IDLE_MIN, ...(await metrics()) };
  }
  const idleLong = (await page.evaluate(() => window.__long)).filter((l) => l.phase === "idle0").map((l) => l.ms);
  results.idleLongTasks = { count: idleLong.length, longestMs: idleLong.length ? Math.max(...idleLong) : 0 };

  // ── verdict ──
  const P = results.phases;
  const checks = [
    ["pan p95 (ms)", Math.max(P.pan?.p95 ?? Infinity, P.panBack?.p95 ?? Infinity), BUDGETS.panP95Ms],
    ["drag p95 (ms)", P.drag?.p95 ?? Infinity, BUDGETS.dragP95Ms],
    ["resize p95 (ms)", P.resize?.p95 ?? Infinity, BUDGETS.resizeP95Ms],
    ["zoom p95 (ms)", P.zoom?.p95 ?? Infinity, BUDGETS.zoomP95Ms],
    ["tile menu open (ms)", P.contextMenu?.openMs ?? Infinity, BUDGETS.contextMenuOpenMs],
    ["Add menu open (ms)", P.addMenu?.openMs ?? Infinity, BUDGETS.addMenuOpenMs],
    ["longest task in pan (ms)", Math.max(P.pan?.longestTaskMs ?? 0, P.panBack?.longestTaskMs ?? 0), BUDGETS.longestTaskDuringPanMs],
    ["idle requests / 30 s", results.idleRequests.count, BUDGETS.idleRequests30s],
  ];
  if (results.idleN) {
    const growth = Math.round(((results.idleN.heapMB - results.idle0.heapMB) / results.idle0.heapMB) * 1000) / 10;
    results.heapGrowthPct = growth;
    checks.push([`heap growth over ${IDLE_MIN} min (%)`, growth, BUDGETS.heapGrowthPct]);
  }
  results.budgets = BUDGETS;
  results.checks = checks.map(([name, value, budget]) => ({ name, value, budget, pass: value <= budget }));
  if (results.checks.some((c) => !c.pass)) exitCode = 1;
  console.log(`\nBoard scale bench — ${results.target}, ${TILES.length} tiles, ${results.mountedBodies} bodies mounted, stream ${streamed ? "on" : "NOT started"}`);
  console.log("| check | value | budget | |\n|---|---|---|---|");
  for (const c of results.checks) console.log(`| ${c.name} | ${c.value} | ≤ ${c.budget} | ${c.pass ? "pass" : "MISS"} |`);
  console.log(`heap/DOM idle 0: ${results.idle0.heapMB} MB / ${results.idle0.domNodes} nodes / ${results.idle0.elements} elements` + (results.idleN ? ` · after ${IDLE_MIN} min: ${results.idleN.heapMB} MB / ${results.idleN.domNodes} nodes` : ""));
} catch (e) {
  results.error = String(e?.stack ?? e);
  console.error(e);
  exitCode = 2;
} finally {
  await cleanup();
  results.cleanedUp = KEEP ? false : created;
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(results, null, 2));
  console.log(`results: ${OUT}`);
  await browser.close();
}
process.exit(exitCode);
