// scripts/lazy-tool-calls-live-walk.mjs — READ-ONLY live proof of lazy tool calls (LAZY-TOOL-CALLS.md).
// Headless, admin@admin.com via the login form (credentials from .env.local, never printed). Sends nothing.
//   node scripts/lazy-tool-calls-live-walk.mjs <outDir> [origin] <conversationId...>
// Per conversation it records: the bundle RPC bytes and whether any tool_calls entry carries
// output/arguments/execution_events; the turn lines ("Used N tools …"); whether a by-id
// chat.tool_call detail read fires only after a click; the plan block; CLS; and whether
// expanding a row moves anything above it. Screenshots go to <outDir>.
import { chromium } from "playwright";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { signIn, sleep } from "./lib/seat-browser.mjs";

const ROOT = resolve(new URL(".", import.meta.url).pathname, "..");
const env = Object.fromEntries(
  readFileSync(resolve(ROOT, ".env.local"), "utf8").split("\n").map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")]),
);
const OUT = process.argv[2] ?? "/tmp/lazy-tool-calls-walk";
const ORIGIN = process.argv[3] ?? "https://www.aimatrx.com";
const IDS = process.argv.slice(4);
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const net = [];
page.on("response", async (r) => {
  const u = r.url();
  if (u.includes("get_cx_conversation_bundle")) {
    let body = "";
    try { body = await r.text(); } catch {}
    let tc = [];
    try { tc = JSON.parse(body)?.tool_calls ?? []; } catch {}
    net.push({
      kind: "bundle", t: Date.now(), bytes: body.length, toolCalls: tc.length,
      withBlobs: tc.filter((e) => "output" in e || "arguments" in e || "execution_events" in e).length,
      withUiHint: tc.filter((e) => "ui_hint" in e).length,
      pinned: tc.filter((e) => e?.ui_hint?.pinned).length,
    });
  } else if (/\/rest\/v1\/tool_call\?/.test(u)) {
    net.push({ kind: "tool_call_read", t: Date.now(), url: u.replace(/\?.*select=([^&]*).*/, "?select=$1 …"), status: r.status() });
  }
});
const consoleErrors = [];
page.on("response", (r) => { if (r.status() >= 400) consoleErrors.push(`HTTP ${r.status()} ${r.request().method()} ${r.url().slice(0, 220)}`); });
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 300)); });

await signIn(page, ORIGIN, env.AI_ADMIN_USERNAME, env.AI_ADMIN_PASSWORD, "admin");
const report = { origin: ORIGIN, at: new Date().toISOString(), conversations: [] };

for (const id of IDS) {
  net.length = 0;
  consoleErrors.length = 0;
  const r = { id, url: `${ORIGIN}/chat/${id}` };
  await page.addInitScript(() => {
    window.__cls = 0;
    try {
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; })
        .observe({ type: "layout-shift", buffered: true });
    } catch {}
  });
  await page.goto(r.url, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForSelector("[data-testid='agent-work-line'], [data-testid='tool-line']", { timeout: 90000 }).catch(() => {});
  await sleep(6000);
  await page.screenshot({ path: `${OUT}/${id.slice(0, 8)}-1-loaded.png` });
  r.bundle = net.filter((n) => n.kind === "bundle");
  r.detailReadsBeforeClick = net.filter((n) => n.kind === "tool_call_read").length;
  r.turnLines = await page.$$eval("[data-testid='agent-work-line'] [data-inline-item-label]", (els) => els.map((e) => e.textContent.trim()).slice(0, 12));
  r.toolLinesVisible = await page.$$eval("[data-testid='tool-line']", (els) => els.filter((e) => e.getBoundingClientRect().height > 0).length);
  r.rowHeights = await page.$$eval("[data-inline-item-row]", (els) => [...new Set(els.map((e) => Math.round(e.getBoundingClientRect().height)))]);
  r.planBlocks = await page.$$eval("[data-testid='plan-block']", (els) => els.map((e) => ({
    header: e.querySelector("[data-testid='plan-header']")?.textContent?.trim()?.slice(0, 120),
    rows: e.querySelectorAll("[data-testid='plan-row']").length,
    statuses: [...e.querySelectorAll("[data-plan-status]")].map((s) => s.getAttribute("data-plan-status")),
  })));
  r.clsAfterLoad = await page.evaluate(() => window.__cls);

  // Expand the LAST turn line (bottom of the transcript is in view after load).
  const turn = page.locator("[data-testid='agent-work-line'] [data-inline-item-row][role='button']").last();
  if (await turn.count()) {
    await turn.scrollIntoViewIfNeeded();
    const anchorBefore = await turn.boundingBox();
    await turn.click();
    await sleep(1500);
    const anchorAfter = await turn.boundingBox();
    r.expandTurn = { yBefore: anchorBefore?.y, yAfter: anchorAfter?.y, heightBefore: anchorBefore?.height };
    await page.screenshot({ path: `${OUT}/${id.slice(0, 8)}-2-turn-open.png` });
    r.planBlocksAfterExpand = await page.$$eval("[data-testid='plan-block']", (els) => els.map((e) => ({
      header: e.querySelector("[data-testid='plan-header']")?.textContent?.trim()?.slice(0, 120),
      rows: e.querySelectorAll("[data-testid='plan-row']").length,
      statuses: [...new Set([...e.querySelectorAll("[data-plan-status]")].map((s) => s.getAttribute("data-plan-status")))],
    })));
    // The tool lines inside the opened turn: collapsed rows (aria-expanded=false) below the turn
    // line, outside the plan block, that are not "Thought process".
    const candidates = page.locator("[aria-expanded='false']").filter({ hasText: /^(Researched|Searched|Read|Fetched|Looked|Checked|Updated|Ran|Used|Called|Got|Listed|Saved|Scraped)/ });
    const total = await candidates.count();
    let line = null;
    const turnY = (await turn.boundingBox())?.y ?? 0;
    for (let i = 0; i < total && !line; i += 1) {
      const c = candidates.nth(i);
      const inPlan = await c.evaluate((el) => !!el.closest("[data-testid='plan-block']"));
      const box = await c.boundingBox();
      if (!inPlan && box && box.y > turnY + 10 && box.height > 0 && box.height <= 40) line = await c.elementHandle();
    }
    r.toolLinesInTurn = total;
    if (line) {
      const label = (await line.textContent())?.trim()?.slice(0, 100);
      const aboveBefore = await page.evaluate(() => window.scrollY);
      const readsBefore = net.filter((x) => x.kind === "tool_call_read").length;
      const lineBox = await line.boundingBox();
      const yTurnBefore = (await turn.boundingBox())?.y;
      await line.click();
      await sleep(300);
      const loadingSeen = await page.evaluate(() => /Loading/.test(document.body.innerText));
      await sleep(4000);
      const yTurnAfter = (await turn.boundingBox())?.y;
      const lineAfter = await line.boundingBox();
      r.openLine = {
        label, loadingSeen, readsBefore, readsAfter: net.filter((x) => x.kind === "tool_call_read").length,
        reads: net.filter((x) => x.kind === "tool_call_read").map((x) => `${x.status} ${x.url}`),
        turnRowYBefore: yTurnBefore, turnRowYAfter: yTurnAfter, lineYBefore: lineBox?.y, lineYAfter: lineAfter?.y,
        expanded: await line.getAttribute("aria-expanded"),
      };
      await page.screenshot({ path: `${OUT}/${id.slice(0, 8)}-3-line-open.png` });
    }
  }
  r.clsEnd = await page.evaluate(() => window.__cls);
  r.consoleErrors = consoleErrors.slice(0, 12);
  r.consoleErrorCount = consoleErrors.length;
  report.conversations.push(r);
}
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
