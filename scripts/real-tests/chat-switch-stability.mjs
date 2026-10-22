#!/usr/bin/env node
// Chat open / switch stability — the forcing function for "the room stays still".
//
// Usage: node scripts/real-tests/chat-switch-stability.mjs <origin> [--json <path>]
//   <origin>  your preview host (http://s1234abcd.localhost:3001: signs in with `pnpm dev-login`)
//             or the live site (https://www.aimatrx.com: signs in like pw.mjs `signin`, admin@admin.com)
// The browser lives inside this process (the preview watchdog closes any detached Playwright
// Chrome whose launcher has exited), headless, 1440x900.
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

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
import { execFileSync } from "node:child_process";
import { mintSessionCookies } from "./session-cookies.mjs";

const [originArg, ...rest] = process.argv.slice(2);
if (!originArg) {
  console.error("usage: node chat-switch-stability.mjs <origin> [--json <path>]");
  process.exit(2);
}
const origin = originArg.replace(/\/$/, "");
const jsonOut = rest[0] === "--json" ? rest[1] : null;
const SAMPLE_MS = 2500;
const isLocal = /^http:\/\/[a-z0-9-]+\.localhost:\d+$/.test(origin);

async function signedInContext(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  if (isLocal) {
    // The shared preview restarts under load (watchdog recycles): mint a fresh nonce per try.
    let lastError = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const out = execFileSync("pnpm", ["-s", "dev-login", "/chat/new"], {
          cwd: new URL("../..", import.meta.url).pathname,
          encoding: "utf8",
        });
        const url = out.match(/OPEN\s*:\s*(\S+)/)?.[1];
        if (!url || !url.startsWith(origin)) throw new Error(`dev-login did not print a URL for ${origin}`);
        const p = await ctx.newPage();
        try {
          await p.goto(url, { waitUntil: "load", timeout: 420000 });
          // The preview parks an idle walk (`/__dev-walk?parked=1`): resume it, as a person would.
          if (p.url().includes("/__dev-walk")) {
            await p.getByRole("button", { name: /resume/i }).first().click({ timeout: 30000 }).catch(() => {});
            await p.waitForURL((u) => !u.pathname.startsWith("/__dev-walk"), { timeout: 300000 });
          }
        } finally {
          await p.close();
        }
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        await new Promise((r) => setTimeout(r, 30000));
      }
    }
    if (lastError) throw lastError;
  } else {
    const { cookies } = await mintSessionCookies();
    await ctx.addCookies(cookies);
  }
  return ctx;
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
            return `${d} x${Math.round(s.previousRect.x)}->${Math.round(s.currentRect.x)} y${Math.round(s.previousRect.y)}->${Math.round(s.currentRect.y)} h${Math.round(s.previousRect.height)}->${Math.round(s.currentRect.height)}`;
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
    if (ed) {
      const box = boxOf(ed);
      const text = [...box.querySelectorAll("*")].filter((n) => n.children.length === 0 && n.textContent.trim() && !n.contains(ed) && !ed.contains(n)).map((n) => n.textContent.trim().slice(0, 30)).slice(0, 5).join(" | ");
      composer = { kind: "real", y: Math.round(box.getBoundingClientRect().top), h: Math.round(box.getBoundingClientRect().height), text };
    }
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
      footerRows: footer ? [...footer.querySelectorAll(".shell-nav-label")].map((n) => n.textContent.trim()).join(",") : null,
      // The route menu's bottom block (Archived) sits right above the footer.
      archiveRow: (() => { const a = document.querySelector(".shell-sidebar-route-nav .shrink-0.border-t"); return a ? Math.round(a.getBoundingClientRect().height) : null; })(),
      scroll: scroller && scroller.scrollHeight > scroller.clientHeight
        ? Math.round(scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop)
        : null,
      messages: scroller ? scroller.querySelectorAll("[data-message-id],[data-chat-message]").length : 0,
      rowActive: !!row,
      dockH: dock ? Math.round(dock.getBoundingClientRect().height) : null,
      // What sits above the composer box when the dock is taller than the composer alone.
      dockExtra: dock && dock.getBoundingClientRect().height > 150
        ? [...dock.querySelectorAll("*")].filter((n) => n.children.length === 0 && n.textContent.trim() && !(ed && boxOf(ed).contains(n))).map((n) => n.textContent.trim().slice(0, 50)).slice(0, 4).join(" | ")
        : null,
    });
    requestAnimationFrame(afterPaint);
  };
  // Sample what was PAINTED: a rAF callback runs before the frame's layout and resize
  // observers, so reading there sees content that grew before the scroll pin answers it.
  // A message posted from rAF is handled after that frame is painted.
  const channel = new MessageChannel();
  channel.port1.onmessage = sample;
  const afterPaint = () => channel.port2.postMessage(0);
  requestAnimationFrame(afterPaint);
  window.__chatStabilityReset = (clickedId) => {
    S.t0 = performance.now();
    S.frames = [];
    S.shifts = [];
    S.clicked = clickedId || null;
  };
};

const UUID = /^\/chat\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Frames where `value` changes while the transcript (skeleton on/off, message count) does not, in that frame or the one before. */
function loneChanges(frames, value, tolerance) {
  const sig = (f) => `${f.skeletons > 0}|${f.messages}|${f.splash}`;
  const out = [];
  for (let i = 1; i < frames.length; i++) {
    const a = value(frames[i - 1]);
    const b = value(frames[i]);
    if (a == null || b == null || Math.abs(a - b) <= tolerance) continue;
    const transcriptMoved = sig(frames[i]) !== sig(frames[i - 1]) || (i > 1 && sig(frames[i - 1]) !== sig(frames[i - 2]));
    if (!transcriptMoved) out.push(`${a}→${b}@${frames[i].t}ms`);
  }
  return out;
}

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
    // The composer may change only together with the transcript it belongs to (the frame
    // the old conversation leaves or the new one lands), never on its own.
    const lone = loneChanges(after, (f) => (f.composer && !f.splash ? f.composer.y : null), 2);
    step.loneComposerMoves = lone;
    if (kind === "hard" ? ys.length && Math.max(...ys) - Math.min(...ys) > 2 : lone.length) {
      const boxes = [];
      for (const f of after) if (f.composer?.kind === "real" && boxes[boxes.length - 1]?.h !== f.composer.h) boxes.push({ h: f.composer.h, t: f.t, text: f.composer.text });
      fails.push(`composer moved ${step.composerYs.join("→")} (final ${final}; box ${boxes.map((b) => `${b.h}@${b.t}ms[${b.text}]`).join(" → ")})`);
    }
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
  const docks = [];
  for (const f of after) if (f.dockH != null && docks[docks.length - 1] !== f.dockH) docks.push(f.dockH);
  // The strip above the composer follows the same rule; "New chat" is a different screen.
  const loneDock = kind === "toNew" ? [] : loneChanges(after, (f) => f.dockH, 1);
  if (kind === "hard" ? docks.length > 1 : loneDock.length) {
    const extra = after.find((f) => f.dockExtra)?.dockExtra;
    fails.push(`strip above the composer resized ${docks.join("→")}${extra ? ` ("${extra}")` : ""}`);
  }
  const foots = [];
  for (const f of after) if (f.footer && foots[foots.length - 1] !== f.footer) foots.push(f.footer);
  if (foots.length > 1) {
    const rows = [];
    for (const f of after) if (f.footerRows != null && rows[rows.length - 1] !== f.footerRows) rows.push(f.footerRows);
    const arch = [];
    for (const f of after) if (arch[arch.length - 1] !== f.archiveRow) arch.push(f.archiveRow);
    fails.push(`sidebar footer moved ${foots.join("→")} (rows ${rows.join(" ⇒ ")}; archive block ${arch.join("→")})`);
  }

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
    // "/chat/new", or "/chat/a/<agent>" when the conversation's agent is not the default.
    const reacted = frames.find((f) => f.path !== step.fromPath && /^\/chat\/(new|a\/)/.test(f.path));
    step.reactMs = reacted ? reacted.t : null;
    if (!reacted || reacted.t > 300) fails.push(`New chat changed the address after ${reacted ? reacted.t : "never (2.5 s)"} ms`);
  }
  step.fails = fails;
  return step;
}

async function measure(page, label, kind, { action, clickedId = null, targetIsConversation = true }) {
  const fromTitle = await page.evaluate(() => {
    const el = document.querySelector("[data-conversation-title-trigger]") || document.querySelector("[data-chat-header-agent-name]");
    return el ? el.textContent.trim() : "";
  }).catch(() => "");
  const fromPath = new URL(page.url()).pathname;
  if (kind !== "hard") await page.evaluate((id) => window.__chatStabilityReset(id), clickedId);
  await action();
  await sleep(SAMPLE_MS);
  const data = await page.evaluate(() => ({ frames: window.__chatStability.frames, shifts: window.__chatStability.shifts }));
  return judge({ label, kind, clickedId, targetIsConversation, fromTitle, fromPath, ...data, url: page.url() });
}

async function sidebarIds(page) {
  return page.evaluate(() => {
    const seen = [];
    for (const a of document.querySelectorAll('a[href^="/chat/"]')) {
      const m = a.getAttribute("href").match(/^\/chat\/([0-9a-f-]{36})$/);
      const r = a.getBoundingClientRect();
      // Any listed row (the click scrolls it into view); hidden rows (height 0) never.
      if (m && r.height > 0 && !seen.includes(m[1])) seen.push(m[1]);
    }
    return seen;
  });
}

const browser = await chromium.launch({ headless: true });
const ctx = await signedInContext(browser);
await ctx.addInitScript(RECORDER);
const page = await ctx.newPage();
const steps = [];
try {
  await page.goto(`${origin}/chat/new`, { waitUntil: "load", timeout: 120000 });
  await page.waitForFunction(() => document.querySelectorAll('a[href^="/chat/"]').length > 8, null, { timeout: 180000 });
  await sleep(1500);
  const ids = await sidebarIds(page);
  if (ids.length < 8) throw new Error(`sidebar listed only ${ids.length} conversations`);
  console.log(`conversations: ${ids.slice(0, 8).join(" ")}`);

  // Warm every route once (dev compiles), unmeasured.
  await page.goto(`${origin}/chat/${ids[0]}`, { waitUntil: "load", timeout: 120000 });
  await sleep(4000);
  // The room's geometry, for comparing the skeleton's composer against the real one.
  console.log("geometry:", JSON.stringify(await page.evaluate(() => {
    const r = (e) => { if (!e) return null; const x = e.getBoundingClientRect(); return [Math.round(x.left), Math.round(x.top), Math.round(x.width), Math.round(x.height)]; };
    const col = document.querySelector("main [data-chat-column]");
    const dock = col && col.children[col.children.length - 1];
    const ed = dock && dock.querySelector('textarea,[contenteditable="true"]');
    let box = ed; while (box && !box.classList.contains("border")) box = box.parentElement;
    const chain = []; for (let n = col; n && n.tagName !== "MAIN"; n = n.parentElement) chain.push(`${n.tagName}.${String(n.className).slice(0, 70)} ${r(n)}`);
    return { chain, dock: r(dock), dockKids: dock ? [...dock.children].map((c) => `${String(c.className).slice(0, 60)} ${r(c)}`) : null, box: r(box), boxCls: box && box.className };
  })));

  steps.push(await measure(page, `hard load ${ids[0].slice(0, 8)}`, "hard", {
    action: async () => { await page.reload({ waitUntil: "commit", timeout: 120000 }); },
  }));
  await sleep(1500);
  // The history list is live (other sessions on this account add rows), so each target is
  // read from the list as it is now: the first visible conversation not opened yet.
  const visited = new Set([ids[0]]);
  const nextTarget = async () => (await sidebarIds(page)).find((id) => !visited.has(id) && !page.url().endsWith(id));
  for (let i = 0; i < 6; i++) {
    const id = await nextTarget();
    if (!id) throw new Error("no unvisited conversation in the sidebar");
    visited.add(id);
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
    action: () => page.locator('button[aria-label="New chat"], nav[aria-label="Conversations"] a[href="/chat/new"]').first().click(),
  }));
  await sleep(2500);
  const target = await nextTarget();
  if (!target) throw new Error("no unvisited conversation in the sidebar");
  steps.push(await measure(page, `new chat → ${target.slice(0, 8)}`, "fromNew", {
    clickedId: target,
    action: () => page.locator(`a[href="/chat/${target}"]`).first().click(),
  }));
} catch (error) {
  // Report what was measured before the walk broke, then fail.
  steps.push({ label: "walk", kind: "walk", fails: [`walk stopped: ${error.message.split("\n")[0]}`] });
} finally {
  await browser.close().catch(() => {});
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
