#!/usr/bin/env node
// Chat open / switch stability — the forcing function for "the room stays still".
//
// Usage: node scripts/real-tests/chat-switch-stability.mjs <run> <origin> [--json <path>]
//   <run>     a pw.mjs run whose private Chrome is already signed in
//             (python3 scripts/real-tests/signin.py <run> /chat/new <origin>)
//   <origin>  e.g. http://s1234abcd.localhost:3001 or https://www.aimatrx.com
//
// Walk (sends NO chat message): hard-load one conversation, click 6 sidebar
// conversations, browser back + forward, New chat, then a conversation from New chat.
// Every step samples each animation frame for 2.5 s and records: all layout shifts,
// the docked composer's top, the header title, the welcome splash, the clicked row's
// highlight, the floating pills, the sidebar footer and the transcript scroll.
//
// It FAILS (exit 1) when any step shows what the owner saw: the room blanking into a
// skeleton, the composer missing / sliding / painting in the centre, the header going
// blank or naming the agent before the title, a layout shift, a moving overlay, a
// sidebar footer that jumps, or a transcript that lands at the bottom in several jumps.
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const [run, originArg, ...rest] = process.argv.slice(2);
if (!run || !originArg) {
  console.error("usage: node chat-switch-stability.mjs <run> <origin> [--json <path>]");
  process.exit(2);
}
const origin = originArg.replace(/\/$/, "");
const jsonOut = rest[0] === "--json" ? rest[1] : null;
const SAMPLE_MS = 2500;

const activePort = path.join(os.tmpdir(), "matrx-real-test-browsers", run, "profile", "DevToolsActivePort");
async function connectOwn() {
  const [port, wsPath] = fs.readFileSync(activePort, "utf8").trim().split("\n");
  for (const ws of [`ws://127.0.0.1:${port}${wsPath}`, `ws://[::1]:${port}${wsPath}`]) {
    try { return await chromium.connectOverCDP(ws, { timeout: 5000 }); } catch {}
  }
  throw new Error(`no browser for run ${run}: start it with pw.mjs ${run} start and sign in first`);
}

// Runs in every document from its first byte, so a hard load is sampled from navigation.
const RECORDER = () => {
  const S = (window.__chatStability = { t0: performance.now(), frames: [], shifts: [], clicked: null });
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        S.shifts.push({
          t: Math.round(e.startTime - S.t0),
          value: e.value,
          sources: (e.sources || []).map((s) => {
            const n = s.node;
            const d = n && n.nodeType === 1 ? `${n.tagName}.${String(n.className).slice(0, 60)}` : n ? n.nodeName : "?";
            return `${d} ${Math.round(s.previousRect.y)}->${Math.round(s.currentRect.y)} h${Math.round(s.previousRect.height)}->${Math.round(s.currentRect.height)}`;
          }),
        });
      }
    }).observe({ type: "layout-shift", buffered: true });
  } catch {}
  const editableIn = (el) => el && el.querySelector('textarea,[contenteditable="true"]');
  const boxOf = (ed) => {
    for (let n = ed; n && n !== document.body; n = n.parentElement) {
      if (n.classList && n.classList.contains("border")) return n;
    }
    return ed;
  };
  const sample = () => {
    const main = document.querySelector("main.shell-main") || document.querySelector("main");
    const cols = main ? [...main.querySelectorAll("[data-chat-column]")] : [];
    const col = cols[0] || null;
    const dock = col && col.children.length > 1 ? col.children[col.children.length - 1] : null;
    const ed = editableIn(dock);
    const skelBox = main && main.querySelector("[data-chat-skeleton-composer]");
    let composer = null;
    if (ed) composer = { kind: "real", y: Math.round(boxOf(ed).getBoundingClientRect().top) };
    else if (skelBox) composer = { kind: "skeleton", y: Math.round(skelBox.getBoundingClientRect().top) };
    // The welcome splash: an editable in main painted in the upper half (the centred composer).
    let splash = false;
    if (main) {
      for (const e of main.querySelectorAll('textarea,[contenteditable="true"]')) {
        const r = e.getBoundingClientRect();
        if (r.height > 0 && r.top < innerHeight * 0.55 && !(dock && dock.contains(e))) splash = true;
      }
    }
    const titleEl =
      document.querySelector("[data-conversation-title-trigger]") ||
      document.querySelector("[data-chat-header-agent-name]");
    const pill = document.querySelector('button.fixed[class*="bottom-[calc(6rem"]');
    const footer = document.querySelector(".shell-sidebar-footer");
    const scroller = col && col.querySelector(".overflow-y-auto.pt-12");
    const clicked = S.clicked && document.querySelector(`a[href="/chat/${S.clicked}"]`);
    const row = clicked && clicked.closest("[data-active]");
    S.frames.push({
      t: Math.round(performance.now() - S.t0),
      path: location.pathname,
      composer,
      splash,
      skeletons: main ? main.querySelectorAll(".animate-pulse").length : 0,
      title: titleEl ? titleEl.textContent.trim() : "",
      pillY: pill ? Math.round(pill.getBoundingClientRect().top) : null,
      footer: footer ? `${Math.round(footer.getBoundingClientRect().top)}/${Math.round(footer.getBoundingClientRect().height)}` : null,
      scroll: scroller && scroller.scrollHeight > scroller.clientHeight
        ? Math.round(scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop)
        : null,
      messages: scroller ? scroller.querySelectorAll("[data-message-id],[data-chat-message]").length : 0,
      rowActive: !!row,
    });
    requestAnimationFrame(sample);
  };
  requestAnimationFrame(sample);
  window.__chatStabilityReset = (clickedId) => {
    S.t0 = performance.now();
    S.frames = [];
    S.shifts = [];
    S.clicked = clickedId || null;
  };
};

const UUID = /^\/chat\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function judge(step) {
  const { kind, frames, shifts, fromTitle, targetIsConversation } = step;
  const fails = [];
  const after = frames.filter((f) => f.t > 0);
  const cls = shifts.reduce((s, e) => s + e.value, 0);
  step.cls = Number(cls.toFixed(4));
  if (cls > 0.01) fails.push(`layout shift ${cls.toFixed(3)} (${shifts.map((s) => s.sources.join(" | ")).filter(Boolean).slice(0, 2).join(" ; ")})`);

  // Composer: present on every frame (skeleton composer counts only on a hard load), never moving.
  if (targetIsConversation) {
    const missing = after.filter((f) => !f.composer && !(kind === "fromNew" && f.splash && f.t < 100));
    const skeletonAfterClick = kind !== "hard" ? after.filter((f) => f.composer?.kind === "skeleton") : [];
    if (kind !== "hard" && missing.length) fails.push(`composer missing for ${missing.length} frames (${missing[0].t}-${missing[missing.length - 1].t} ms)`);
    if (kind === "hard" && missing.filter((f) => f.t > 400).length) fails.push(`composer missing for ${missing.length} frames after first paint`);
    if (skeletonAfterClick.length) fails.push(`room fell back to the skeleton for ${skeletonAfterClick.length} frames`);
    const ys = after.filter((f) => f.composer && !f.splash).map((f) => f.composer.y);
    const final = ys[ys.length - 1];
    step.composerYs = [...new Set(ys)];
    if (ys.length && Math.max(...ys) - Math.min(...ys) > 2) fails.push(`composer moved ${step.composerYs.join("→")} (final ${final})`);
    const splashLate = after.filter((f) => f.splash && f.t > 100);
    if (splashLate.length) fails.push(`new-chat splash visible ${splashLate[0].t}-${splashLate[splashLate.length - 1].t} ms after the click`);
  }

  // Header title: straight from the old title (or blank on a hard load) to the final one.
  const seq = [];
  for (const f of frames) if (seq[seq.length - 1] !== f.title) seq.push(f.title);
  step.titles = seq;
  const finalTitle = seq[seq.length - 1];
  const allowed = new Set([finalTitle, kind === "hard" ? "" : fromTitle]);
  const stray = seq.filter((t) => !allowed.has(t));
  if (!finalTitle) fails.push("header title blank at the end");
  if (stray.length) fails.push(`header title went ${seq.map((t) => JSON.stringify(t || "")).join(" → ")}`);
  const tTitle = frames.find((f) => f.title === finalTitle)?.t;
  step.titleMs = tTitle;

  // The clicked row lights at once.
  if (step.clickedId) {
    const lit = frames.find((f) => f.rowActive);
    step.rowActiveMs = lit ? lit.t : null;
    if (!lit || lit.t > 150) fails.push(`clicked row highlighted after ${lit ? lit.t : "never"} ms`);
  }

  // Overlays and the sidebar footer never move.
  const pills = [...new Set(after.map((f) => f.pillY).filter((y) => y != null))];
  if (pills.length > 1 || (pills.length === 1 && after.some((f) => f.pillY == null) && kind !== "hard")) {
    const trail = [];
    for (const f of after) if (trail[trail.length - 1] !== f.pillY) trail.push(f.pillY);
    fails.push(`floating pill moved ${trail.join("→")}`);
  }
  const foots = [];
  for (const f of after) if (f.footer && foots[foots.length - 1] !== f.footer) foots.push(f.footer);
  if (foots.length > 1) fails.push(`sidebar footer moved ${foots.join("→")}`);

  // The transcript lands at the bottom in one step.
  if (targetIsConversation) {
    const sc = [];
    for (const f of after) if (f.scroll != null && sc[sc.length - 1] !== f.scroll) sc.push(f.scroll);
    step.scrollTrail = sc;
    const jumps = sc.filter((d, i) => i > 0 && Math.abs(d - sc[i - 1]) > 2).length;
    if (jumps > 1) fails.push(`transcript scroll settled in ${jumps + 1} steps (distance from bottom ${sc.join("→")})`);
    if (sc.length && sc[sc.length - 1] > 4) fails.push(`transcript not at the bottom (${sc[sc.length - 1]} px above)`);
  }
  // New chat reacts at once: the address and the splash change within 300 ms.
  if (kind === "toNew") {
    const reacted = frames.find((f) => f.path === "/chat/new" && f.splash);
    step.reactMs = reacted ? reacted.t : null;
    if (!reacted || reacted.t > 300) fails.push(`New chat showed its splash after ${reacted ? reacted.t : "never (2.5 s)"} ms`);
  }
  step.fails = fails;
  return step;
}

async function measure(page, label, kind, { action, clickedId = null, targetIsConversation = true }) {
  const fromTitle = await page.evaluate(() => {
    const el = document.querySelector("[data-conversation-title-trigger]") || document.querySelector("[data-chat-header-agent-name]");
    return el ? el.textContent.trim() : "";
  }).catch(() => "");
  if (kind !== "hard") await page.evaluate((id) => window.__chatStabilityReset(id), clickedId);
  await action();
  await sleep(SAMPLE_MS);
  const data = await page.evaluate(() => ({ frames: window.__chatStability.frames, shifts: window.__chatStability.shifts }));
  return judge({ label, kind, clickedId, targetIsConversation, fromTitle, ...data, url: page.url() });
}

async function sidebarIds(page) {
  return page.evaluate(() => {
    const seen = [];
    for (const a of document.querySelectorAll('a[href^="/chat/"]')) {
      const m = a.getAttribute("href").match(/^\/chat\/([0-9a-f-]{36})$/);
      const r = a.getBoundingClientRect();
      if (m && r.height > 0 && r.top > 0 && r.bottom < innerHeight && !seen.includes(m[1])) seen.push(m[1]);
    }
    return seen;
  });
}

const browser = await connectOwn();
const ctx = browser.contexts()[0];
await ctx.addInitScript(RECORDER);
const page = await ctx.newPage();
await page.setViewportSize({ width: 1440, height: 900 });
const steps = [];
try {
  await page.goto(`${origin}/chat/new`, { waitUntil: "load", timeout: 120000 });
  await page.waitForFunction(() => document.querySelectorAll('a[href^="/chat/"]').length > 8, null, { timeout: 90000 });
  await sleep(1500);
  const ids = await sidebarIds(page);
  if (ids.length < 8) throw new Error(`sidebar listed only ${ids.length} conversations`);
  console.log(`conversations: ${ids.slice(0, 8).join(" ")}`);

  // Warm every route once (dev compiles), unmeasured.
  await page.goto(`${origin}/chat/${ids[0]}`, { waitUntil: "load", timeout: 120000 });
  await sleep(4000);

  steps.push(await measure(page, `hard load ${ids[0].slice(0, 8)}`, "hard", {
    action: async () => { await page.reload({ waitUntil: "commit" }); },
  }));
  await sleep(1500);
  for (const id of ids.slice(1, 7)) {
    steps.push(await measure(page, `switch → ${id.slice(0, 8)}`, "switch", {
      clickedId: id,
      action: () => page.locator(`a[href="/chat/${id}"]`).first().click(),
    }));
    await sleep(800);
  }
  steps.push(await measure(page, "back", "back", { action: () => page.evaluate(() => history.back()) }));
  await sleep(800);
  steps.push(await measure(page, "forward", "forward", { action: () => page.evaluate(() => history.forward()) }));
  await sleep(800);
  steps.push(await measure(page, "New chat", "toNew", {
    targetIsConversation: false,
    action: () => page.locator('button[aria-label="New chat"]').first().click(),
  }));
  await sleep(2500);
  const target = ids[7];
  steps.push(await measure(page, `new chat → ${target.slice(0, 8)}`, "fromNew", {
    clickedId: target,
    action: () => page.locator(`a[href="/chat/${target}"]`).first().click(),
  }));
} finally {
  // Close only our tab: the run's Chrome (and its sign-in) stays up for the next run.
  await page.close().catch(() => {});
}

let failed = 0;
for (const s of steps) {
  const ok = s.fails.length === 0;
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${s.label.padEnd(26)} cls=${s.cls} composer=${(s.composerYs || []).join("→") || "-"} title=${(s.titles || []).map((t) => JSON.stringify(t)).join("→")}${s.rowActiveMs != null ? ` row=${s.rowActiveMs}ms` : ""}`);
  for (const f of s.fails) console.log(`        - ${f}`);
}
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(steps, null, 1));
console.log(`${steps.length - failed}/${steps.length} steps stable`);
process.exit(failed ? 1 : 0);
