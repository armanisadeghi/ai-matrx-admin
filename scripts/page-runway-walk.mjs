// THE PAGE RUNWAY WALK (owner, 2026-10-19) — proves on a real browser that every page that scrolls
// lets its last line reach about half the screen (styles/shell.css --matrx-page-runway), that no
// code shrinks that space (the assists pill once cut the notes Read pane to 78px), and that the page
// assistant never rests on a page's own bottom bar ([data-matrx-page-foot]).
//
// It drives the dev guard's own probe (`window.__matrxPageRhythmProbe`, lib/layout/useFloatingClearanceGuard.ts),
// so it needs a development build: the shared preview (`pnpm preview:ready /notes`). Every route ×
// width; /notes also cycles Write · Split · Plain · Read on a note long enough to scroll.
//
// Usage: RUNWAY_ORIGIN=http://<your-session>.localhost:3001 node scripts/page-runway-walk.mjs [outDir]
//   RUNWAY_ROUTES  comma list overriding the default route set
//   RUNWAY_WIDTHS  default 1280,375
// Seat: admin@admin.com through the login form (credentials from .env.local, never printed).
// Exit 1 on any finding; writes <outDir>/page-runway.json and a PNG per failing page.
import { chromium } from "playwright";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { signIn, sleep } from "./lib/seat-browser.mjs";

const ROOT = resolve(new URL(".", import.meta.url).pathname, "..");
const env = Object.fromEntries(
  readFileSync(resolve(ROOT, ".env.local"), "utf8").split("\n").map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")]),
);
const ORIGIN = process.env.RUNWAY_ORIGIN;
if (!ORIGIN) {
  console.error("RUNWAY_ORIGIN is required (the host `pnpm preview:ready` prints).");
  process.exit(2);
}
const OUT = process.argv[2] ?? resolve(ROOT, "tmp/page-runway");
const WIDTHS = (process.env.RUNWAY_WIDTHS ?? "1280,375").split(",").map(Number);
// The census of 2026-10-19: the routes that carry the page assistant, the notes editor, the
// education runway, and a spread of ordinary scrolling pages in (core) and (admin).
const ROUTES = (process.env.RUNWAY_ROUTES ??
  [
    "/notes",
    "/education",
    "/education/study-guides",
    "/agents/all",
    "/board/all",
    "/tasks",
    "/workflows/all",
    "/transcripts",
    "/research/topics",
    "/knowledge/hub",
    "/user-settings",
    "/administration",
  ].join(",")).split(",");
const NOTE_MODES = ["Write", "Split", "Plain", "Read"];
mkdirSync(OUT, { recursive: true });

/** Runs in the page: scroll every scroller to its end, then ask the guard. */
async function probeInPage() {
  const scrollers = [...document.querySelectorAll("*")].filter(
    (el) => el.scrollHeight > el.clientHeight + 4 && /(auto|scroll)/.test(getComputedStyle(el).overflowY),
  );
  for (let pass = 0; pass < 3; pass += 1) {
    for (const el of scrollers) el.scrollTop = el.scrollHeight;
    await new Promise((r) => setTimeout(r, 400));
  }
  const findings = (window.__matrxPageRhythmProbe?.() ?? []).map((f) => ({
    ...f,
    kind: f.endSpacePx < f.allowedPx ? "short" : "double",
  }));
  const problems = findings.filter((f) => f.kind === "short");
  if (!window.__matrxPageRhythmProbe) problems.push({ kind: "no-guard", scroller: "window.__matrxPageRhythmProbe is missing — not a dev build?" });
  // The page assistant rests above a page's own bottom bar, never on it.
  const dock = document.querySelector(".ambient-assistant-dock")?.getBoundingClientRect();
  if (dock && dock.width > 0) {
    for (const foot of document.querySelectorAll("[data-matrx-page-foot]")) {
      const r = foot.getBoundingClientRect();
      if (r.width === 0 || foot.closest("[data-window-panel]")) continue;
      const overlapX = Math.min(r.right, dock.right) - Math.max(r.left, dock.left);
      const overlapY = Math.min(r.bottom, dock.bottom) - Math.max(r.top, dock.top);
      if (overlapX > 2 && overlapY > 2) problems.push({ kind: "dock-on-foot", scroller: `dock overlaps the page bottom bar by ${Math.round(overlapY)}px` });
    }
  }
  return { problems, scrolled: scrollers.length };
}

async function openLongNote(page) {
  const ids = await page.$$eval("[data-note-id]", (els) => [...new Set(els.map((e) => e.getAttribute("data-note-id")))].slice(0, 12));
  for (const id of ids) {
    await page.goto(`${ORIGIN}/notes?tabs=${id}&active=${id}`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await sleep(3500);
    const scrolls = await page.evaluate(() => {
      const root = document.querySelector("[data-matrx-page-runway]");
      return !!root && [...root.querySelectorAll("*")].some((el) => el.scrollHeight > el.clientHeight + 4 && /(auto|scroll)/.test(getComputedStyle(el).overflowY) && el.getBoundingClientRect().height > 200);
    });
    if (scrolls) return id;
  }
  return null;
}

const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const width of WIDTHS) {
    const context = await browser.newContext({ viewport: { width, height: width < 768 ? 812 : 800 } });
    const page = await context.newPage();
    await signIn(page, ORIGIN, env.AI_ADMIN_USERNAME, env.AI_ADMIN_PASSWORD, "admin");
    for (const route of ROUTES) {
      await page.goto(`${ORIGIN}${route}`, { waitUntil: "domcontentloaded", timeout: 180000 });
      await sleep(4000);
      const states = [{ label: route }];
      if (route === "/notes") {
        const id = await openLongNote(page);
        if (!id) {
          results.push({ width, page: route, problems: [{ kind: "no-long-note", scroller: "no note long enough to scroll — the modes were not walked" }] });
        } else {
          states.length = 0;
          for (const mode of NOTE_MODES) states.push({ label: `/notes (${mode})`, mode });
        }
      }
      for (const state of states) {
        if (state.mode) {
          await page.evaluate((m) => [...document.querySelectorAll("button")].find((b) => (b.getAttribute("aria-label") || b.title) === m)?.click(), state.mode);
          await sleep(1500);
        }
        const { problems, scrolled } = await page.evaluate(probeInPage);
        results.push({ width, page: state.label, scrolled, problems });
        const mark = problems.length ? "FAIL" : "ok  ";
        console.log(`${mark} ${String(width).padStart(4)} ${state.label}${problems.map((p) => `\n       ${p.kind}: ${p.scroller}${p.endSpacePx != null ? ` ends ${p.endSpacePx}px, needs ${p.allowedPx}px` : ""}`).join("")}`);
        if (problems.length) await page.screenshot({ path: resolve(OUT, `${width}-${state.label.replace(/[^a-z0-9]+/gi, "_")}.png`) });
      }
      // Leave the person's notes mode as the walk found the default.
      if (route === "/notes") await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => (b.getAttribute("aria-label") || b.title) === "Write")?.click());
    }
    await context.close();
  }
} finally {
  await browser.close();
}
writeFileSync(resolve(OUT, "page-runway.json"), JSON.stringify(results, null, 2));
const failed = results.filter((r) => r.problems.length);
console.log(`\n${results.length - failed.length}/${results.length} pages end with the page runway. Report: ${resolve(OUT, "page-runway.json")}`);
process.exit(failed.length ? 1 : 0);
