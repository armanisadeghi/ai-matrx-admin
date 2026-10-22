/**
 * LAYOUT GATE — the shell header decides its fold before the first paint.
 *
 * THE LIVE DEFECT (CLOSE-PERF, CD-PERF-01, 2026-10-21, /data/<table> at 768px, admin and member):
 * the server-rendered route header (a title and the table's actions) is wider than the 492px
 * the header's center leaves it, so the crowding guard folds the shell's five controls into the
 * one ⋮. The guard started in a React effect after hydration, so the page painted unfolded first
 * and then moved: `.shell-header-right` 195px → 43px (CLS 0.0018), and the route header re-folded
 * its own actions into the wider row (CLS 0.0011). "No shifts in the ui! ever!!"
 *
 * The fix: `HEADER_CROWDING_PREPAINT` installs the same guard while the HTML parses, it measures
 * the route header's ghost (ServerRenderedHeaderSlot), and the ghost script asks it to decide in
 * the frame it draws the ghost. Hydration adopts the installed guard.
 *
 * A STREAMED DOCUMENT can paint the shell before the route's markup arrives (the header is in the
 * layout, the route header in the page's flush). AppShell holds the first paint with
 * `<link rel="expect" href="#shell-first-frame" blocking="render">` until the marker after <main> is
 * parsed; the last two cases stream the two halves 600 ms apart with and without that hold.
 *
 * Proven failing before passing: the first case mounts the stream WITHOUT the pre-paint install
 * (the old order) and measures the shift; remove the `__matrxCrowding.evaluate()` call from
 * HEADER_GHOST_SCRIPT and the second case goes RED (the fold waits for hydration again).
 *
 * Run: pnpm test:shell-layout
 */

import { readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { HEADER_CROWDING_PREPAINT, installHeaderCrowdingGuard } from "../components/header/header-crowding";
import { HEADER_GHOST_SCRIPT } from "../components/header/ServerRenderedHeaderSlot";

const SHELL_CSS = readFileSync(path.join(process.cwd(), "styles", "shell.css"), "utf8");

const BASE_CSS = `
  * { box-sizing: border-box; margin: 0; }
  body { font: 12px/1.2 sans-serif; }
  .flex { display: flex; }
  .items-center { align-items: center; }
  .shrink-0 { flex-shrink: 0; }
  button { height: 32px; min-width: 32px; padding: 0 8px; border: 0; }
  .slot { width: 44px; padding: 0; }
`;

/** The route header as the server sends it: a title and an action row that does not shrink. */
const ROUTE_HEADER = `<div data-page-header-portal="page" class="flex items-center shrink-0" data-testid="route" style="width:600px">
  <span style="flex:1">Deliverables</span><button>Views</button><button>Share</button><button>Add record</button>
</div>`;

/**
 * The first HTML in stream order: the header (with or without its pre-paint install as its last
 * child), then the page's hidden anchor and the ghost script ServerRenderedHeaderSlot emits.
 */
const STREAM = (prepaint: boolean) => `<!doctype html><html><head>
<style>${BASE_CSS}</style><style>${SHELL_CSS}</style>
<script>
  window.__shifts = [];
  window.__foldedAtGhost = null;
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__shifts.push(e.value); })
    .observe({ type: "layout-shift", buffered: true });
  window.__matrxHeaderGhostBorn = () => {
    if (window.__foldedAtGhost === null)
      window.__foldedAtGhost = document.querySelector(".shell-header").hasAttribute("data-header-folded");
  };
</script>
</head><body>
<div class="shell-root">
  <header class="shell-header">
    <button class="slot">=</button>
    <div class="shell-header-center" id="shell-header-center"></div>
    <div class="shell-header-right" data-header-right-set>
      <div class="shell-header-right-inject" id="shell-header-right"></div>
      <div class="shell-header-secondary">
        <button class="slot">S</button><button class="slot">I</button><button class="slot">M</button><button class="slot">N</button><button class="slot">C</button>
      </div>
      <div class="shell-header-overflow"><button class="slot" data-testid="overflow" aria-label="More">V</button></div>
    </div>
    ${prepaint ? `<script>${HEADER_CROWDING_PREPAINT}</script>` : ""}
  </header>
  <main style="height:400px"><p data-testid="body">Rows</p></main>
</div>
<div class="page-header-ssr" data-page-header-ssr="h1" data-header-slot="center" data-header-slot-targets="#shell-header-center">${ROUTE_HEADER}</div>
<script>${HEADER_GHOST_SCRIPT}</script>
</body></html>`;

/** Serve the stream as a real navigation (so the parser runs the inline scripts in order), then hydrate. */
async function load(page: Page, prepaint: boolean) {
  await page.setViewportSize({ width: 768, height: 600 });
  await page.route("http://gate.test/", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: STREAM(prepaint) }),
  );
  await page.goto("http://gate.test/");
  // Two frames: the center ghost is drawn in a frame callback; let it paint.
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null)))));
  // HYDRATION, as ServerRenderedHeaderSlot + HeaderCrowdingGuard do it: the real node moves into the
  // slot and the ghost goes in the same frame; then the component's effect installs (or adopts) the guard.
  await page.evaluate(`(() => {
    const anchor = document.querySelector("[data-page-header-ssr]");
    document.getElementById("shell-header-center").appendChild(anchor.firstElementChild);
    document.querySelectorAll("matrx-header-ghost").forEach((g) => g.remove());
    (${installHeaderCrowdingGuard.toString()})(document.querySelector(".shell-header"));
  })()`);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null)))));
  return page.evaluate(() => ({
    cls: (window as unknown as { __shifts: number[] }).__shifts.reduce((a, b) => a + b, 0),
    foldedAtGhost: (window as unknown as { __foldedAtGhost: boolean | null }).__foldedAtGhost,
    foldedNow: document.querySelector(".shell-header")!.hasAttribute("data-header-folded"),
  }));
}

test("the fixture reproduces the defect: a guard that starts at hydration folds after the first paint", async ({ page }) => {
  const r = await load(page, false);
  expect(r.foldedAtGhost).toBe(false);
  expect(r.foldedNow).toBe(true);
  expect(r.cls).toBeGreaterThan(0);
});

test("with the pre-paint install the header is folded when the route header is first drawn, and nothing moves", async ({ page }) => {
  const r = await load(page, true);
  expect(r.foldedAtGhost).toBe(true);
  expect(r.foldedNow).toBe(true);
  expect(r.cls).toBe(0);
});

test("hydration adopts the pre-paint guard instead of starting a second one", async ({ page }) => {
  await load(page, true);
  const same = await page.evaluate(`(() => {
    const h = document.querySelector(".shell-header");
    const first = h.__matrxCrowding;
    const dispose = (${installHeaderCrowdingGuard.toString()})(h);
    return first != null && dispose === first.dispose;
  })()`);
  expect(same).toBe(true);
});

// ─── THE STREAM SPLIT: the shell's flush, a pause, then the route's first frame ───────────────────────
const SPLIT_AT = "<!--route-->";
const STREAMED = (hold: boolean) =>
  STREAM(true)
    .replace("<head>", `<head>${hold ? `<link rel="expect" href="#shell-first-frame" blocking="render">` : ""}`)
    .replace('<main style="height:400px">', `${SPLIT_AT}<main style="height:400px">`)
    .replace("</body>", `<span id="shell-first-frame" hidden></span></body>`);

let server: Server;
let origin = "";
test.beforeAll(async () => {
  server = createServer((req, res) => {
    const html = STREAMED(req.url === "/hold");
    const [shell, route] = html.split(SPLIT_AT);
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    // Enough bytes that the browser starts parsing (and may paint) before the route's half arrives.
    res.write(shell + `<!--${" ".repeat(2048)}-->`);
    setTimeout(() => res.end(route), 600);
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
test.afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
});

async function loadStreamed(page: Page, hold: boolean) {
  await page.setViewportSize({ width: 768, height: 600 });
  await page.goto(`${origin}/${hold ? "hold" : "nohold"}`);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null)))));
  return page.evaluate(() => ({
    cls: (window as unknown as { __shifts: number[] }).__shifts.reduce((a, b) => a + b, 0),
    foldedNow: document.querySelector(".shell-header")!.hasAttribute("data-header-folded"),
  }));
}

test("streamed without the hold, the shell paints before the route header and moves when it folds", async ({ page }) => {
  const r = await loadStreamed(page, false);
  expect(r.foldedNow).toBe(true);
  expect(r.cls).toBeGreaterThan(0);
});

test("streamed with the hold, the first paint waits for the route's first frame and nothing moves", async ({ page }) => {
  const r = await loadStreamed(page, true);
  expect(r.foldedNow).toBe(true);
  expect(r.cls).toBe(0);
});

test("AppShell carries the hold and its marker right after <main>", () => {
  const src = readFileSync(path.join(process.cwd(), "features", "shell", "components", "AppShell.tsx"), "utf8");
  expect(src).toMatch(/<link rel="expect" href="#shell-first-frame" blocking="render" \/>\s*<main className="shell-main">\{children\}<\/main>\s*<span id="shell-first-frame" hidden \/>/);
});

// ─── loading.tsx AND the page both draw the route header in the server's HTML ───────────────────────
test("a slot's ghost layer draws only the newest clone of a kind (a streamed page over its loading skeleton)", async ({ page }) => {
  const second = `<div class="page-header-ssr" data-page-header-ssr="h2" data-header-slot="center" data-header-slot-targets="#shell-header-center">${ROUTE_HEADER.replace('data-page-header-portal="page"', 'data-page-header-portal="fallback"').replace('data-testid="route"', 'data-testid="route-2"')}</div><script>${HEADER_GHOST_SCRIPT}</script>`;
  const html = STREAM(true)
    .replace('data-page-header-portal="page" class="flex items-center shrink-0" data-testid="route"', 'data-page-header-portal="fallback" class="flex items-center shrink-0" data-testid="route"')
    .replace("</body>", `${second}</body>`);
  await page.setViewportSize({ width: 768, height: 600 });
  await page.route("http://gate.test/two", (route) => route.fulfill({ status: 200, contentType: "text/html", body: html }));
  await page.goto("http://gate.test/two");
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null)))));
  const drawn = await page.evaluate(() =>
    [...document.querySelectorAll("matrx-header-ghost > *")].filter((n) => (n as HTMLElement).getBoundingClientRect().width > 0).map((n) => n.getAttribute("data-testid") ?? n.querySelector("[data-testid]")?.getAttribute("data-testid")),
  );
  expect(drawn).toEqual(["route-2"]);
  const overdrawn = await page.evaluate(() => document.querySelector(".shell-header")!.hasAttribute("data-header-overdrawn"));
  expect(overdrawn).toBe(false);
});
