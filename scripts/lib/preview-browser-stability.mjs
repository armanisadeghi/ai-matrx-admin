// scripts/lib/preview-browser-stability.mjs — the in-browser half of `pnpm preview:ready`.
//
// A server fetch can answer 200 signed in while every real browser tab on the same route reloads
// about once a second and never finishes loading (2026-10-15 19:30 PT: preview:ready said READY for
// /notes in 2 s while the browser pane's readyState stayed "loading" and its clock reset every
// second — Turbopack was sending "restart" for the client entry 24 times in 30 s). So the route is
// opened signed in in a real headless Chromium and watched: it is stable only when, over the whole
// window, it does not navigate again, reaches readyState "complete", and its clock never resets.
// The server's hot-reload "restart" signals are counted in the same window to name the cause.
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/** The pure verdict over what was observed. Exported for its test. */
export function judgeStability({ navigationsAfterLoad, samples, hmrRestarts, windowSec }) {
  const clockResets = samples.filter((s, i) => i > 0 && s.up < samples[i - 1].up).length;
  const lastState = samples.length ? samples[samples.length - 1].state : "none";
  const unreadable = samples.filter((s) => s.state === "unreadable").length;
  const why = [];
  if (navigationsAfterLoad > 0) why.push(`the page navigated/reloaded ${navigationsAfterLoad} time(s) in ${windowSec} s`);
  if (clockResets > 0) why.push(`its clock reset ${clockResets} time(s) (reloads)`);
  if (lastState !== "complete") why.push(`it never finished loading (readyState "${lastState}")`);
  if (unreadable > samples.length / 2) why.push("the page stopped answering scripts");
  const cause = hmrRestarts > 0 ? ` — the dev server sent ${hmrRestarts} hot-reload "restart" signal(s) meanwhile (a reload storm)` : "";
  return why.length ? { ok: false, why: why.join("; ") + cause } : { ok: true, why: "" };
}

/** Count Turbopack "restart" signals on the shared HMR socket for `ms`. */
function countHmrRestarts(port, ms) {
  return new Promise((resolve) => {
    let n = 0;
    let ws;
    try {
      ws = new WebSocket(`ws://127.0.0.1:${port}/_next/hmr`);
    } catch {
      resolve(0);
      return;
    }
    ws.onmessage = (e) => {
      const s = String(e.data);
      if (s.includes('"turbopack-message"') && s.includes('"restart"')) n++;
    };
    ws.onerror = () => {};
    setTimeout(() => {
      try {
        ws.close();
      } catch {}
      resolve(n);
    }, ms);
  });
}

/**
 * Open `url` (a fresh dev-login URL) headless and watch the landed page for `windowSec`.
 * Returns { ok, why, skipped? }.
 */
export async function browserStability({ url, port, windowSec = 20, timeoutMs = 300000, say = () => {} }) {
  let chromium;
  try {
    ({ chromium } = require("playwright-core"));
  } catch {
    return { ok: true, skipped: true, why: "no headless browser installed (playwright-core)" };
  }
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (e) {
    return { ok: true, skipped: true, why: `headless browser would not start (${String(e).split("\n")[0].slice(0, 120)})` };
  }
  try {
    const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
    await page.goto(url, { waitUntil: "load", timeout: timeoutMs });
    // The dev-login hop chain is over once "load" fires on the route; count main-frame navigations
    // from here on.
    let navigationsAfterLoad = 0;
    page.on("framenavigated", (f) => {
      if (f === page.mainFrame()) navigationsAfterLoad++;
    });
    const hmr = countHmrRestarts(port, windowSec * 1000);
    const samples = [];
    const until = Date.now() + windowSec * 1000;
    while (Date.now() < until) {
      try {
        samples.push(
          await Promise.race([
            page.evaluate(() => ({ up: performance.now(), state: document.readyState, path: location.pathname })),
            new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 4000)),
          ]),
        );
      } catch {
        samples.push({ up: -1, state: "unreadable", path: "" });
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    const hmrRestarts = await hmr;
    const verdict = judgeStability({ navigationsAfterLoad, samples, hmrRestarts, windowSec });
    const last = samples[samples.length - 1];
    if (last?.path && last.path.startsWith("/login")) return { ok: false, why: "the browser landed on /login: the sign-in did not stick in a real browser" };
    return verdict;
  } catch (e) {
    return { ok: false, why: `the route did not load in a real browser (${String(e).split("\n")[0].slice(0, 160)})` };
  } finally {
    await browser.close().catch(() => {});
  }
}
