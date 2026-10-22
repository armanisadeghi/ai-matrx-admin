// scripts/remark-cards-walk.mjs — REMARK CARDS walk (Arman, 2026-10-22): every staged remark is a square
// card INSIDE the composer; staging opens nothing; pressing a card opens its canvas view.
//
// Headless, as admin@admin.com, on the shared dev server (:3001). Agent: Content Writing Partner on
// Gemini 3.8 Flash (lib/flash-test-setup.mjs) — never General Chat, never an approved spend. Sends ONE
// message; the cards themselves are never sent (they are removed at the end).
//
//   node scripts/remark-cards-walk.mjs [outDir]
import { setupFlashRun } from "./lib/flash-test-setup.mjs";
import { chromium } from "playwright";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execSync } from "node:child_process";

const OUT = process.argv[2] || mkdtempSync(join(tmpdir(), "remark-cards-"));
const ROOT = new URL("..", import.meta.url).pathname;
console.log("screenshots:", OUT);
const AN = '[data-message-group][aria-label="Assistant answer"]';
const CARD = "[data-remark-card]";
const fails = [];
const ok = (c, msg) => { if (!c) fails.push(msg); console.log(c ? "  PASS" : "  FAIL", msg); return c; };

async function signIn(browser, route, viewport) {
  const login = execSync(`pnpm -s dev-login '${route}'`, { encoding: "utf8", cwd: ROOT });
  const url = login.match(/OPEN\s*:\s*(\S+)/)?.[1];
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  await page.goto(url, { timeout: 180000 });
  if (page.url().includes("__dev-walk")) {
    await page.getByRole("button", { name: "Resume this preview" }).click();
    await page.waitForURL((u) => !u.href.includes("__dev-walk"), { timeout: 180000 });
  }
  return { ctx, page };
}
const cards = (page) => page.evaluate((c) => [...document.querySelectorAll(c)].map((e) => `${e.getAttribute("data-remark-card")}: ${e.innerText.replace(/\s+/g, " ").trim().slice(0, 80)}`), CARD);
const threadOpen = (page) => page.evaluate(() => !!document.querySelector("[data-comment-thread]") || !!document.querySelector("[data-annotation-dock]"));
const canvasTabs = (page) => page.evaluate(() => document.querySelectorAll("[data-comment-thread], [data-context-items-view], [data-canvas-item-id]").length);
const shot = (page, name) => page.screenshot({ path: `${OUT}/${name}.png` });
async function composerShot(page, name) {
  const box = page.locator("[data-remark-cards]").first().locator("xpath=ancestor::*[contains(@class,'border-border')][1]");
  if (await box.count()) await box.screenshot({ path: `${OUT}/${name}-composer.png` }).catch(() => {});
  await shot(page, name);
}

async function settle(page) {
  let last = "", stable = Date.now();
  const start = Date.now();
  while (Date.now() - start < 200000) {
    await page.waitForTimeout(1000);
    const sig = await page.evaluate((an) => [...document.querySelectorAll(an)].map((e) => e.innerText.length).join(","), AN);
    if (!sig || Number(sig.split(",").at(-1)) < 150) { stable = Date.now(); continue; }
    if (sig !== last) { last = sig; stable = Date.now(); } else if (Date.now() - stable > 4000) break;
  }
}
async function selectText(page, nth) {
  return page.evaluate(([an, nth]) => {
    const g = [...document.querySelectorAll(an)].at(-1);
    const ps = [...g.querySelectorAll("[data-message-content] p, [data-message-content] li")].filter((p) => (p.textContent || "").length > 45);
    const p = ps[nth % ps.length];
    if (!p) return null;
    const w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
    let n = w.nextNode();
    while (n && n.length < 30) n = w.nextNode();
    if (!n) return null;
    p.scrollIntoView({ block: "center" });
    const end = Math.min(70, n.length);
    const r = document.createRange();
    r.setStart(n, 0);
    r.setEnd(n, end);
    getSelection().removeAllRanges();
    getSelection().addRange(r);
    document.dispatchEvent(new Event("selectionchange"));
    return n.data.slice(0, end);
  }, [AN, nth]);
}
async function addComment(page, nth, text) {
  const sel = await selectText(page, nth);
  if (!sel) throw new Error("no passage to select");
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: "Comment", exact: true }).click({ timeout: 10000 });
  const panel = page.locator("[data-selection-panel]");
  await panel.locator("textarea").fill(text);
  const sw = panel.getByRole("switch");
  if ((await sw.getAttribute("aria-checked")) !== "true") await sw.click();
  await panel.getByRole("button", { name: "Comment", exact: true }).click();
  await page.waitForTimeout(4000);
  return sel;
}

const browser = await chromium.launch({ headless: true });
const { ctx, page } = await signIn(browser, "/chat/new", { width: 1400, height: 950 });
try {
  await page.goto(`${new URL(page.url()).origin}/chat/new`);
  await page.waitForTimeout(6000);
  if (!(await setupFlashRun(page, "Content Writing Partner"))) { console.log("ABORT: not on the Flash test agent"); process.exit(2); }
  await page.locator('textarea[placeholder*="How can I help"]').first().fill(
    "Help me pick between three launch channels for my bakery. Then give a three-item launch checklist as markdown task boxes (- [ ]), each item one sentence.",
  );
  await page.keyboard.press("Enter");
  await page.waitForURL(/\/chat\/[0-9a-f-]{36}/, { timeout: 60000 });
  const chatUrl = page.url();
  console.log("chat:", chatUrl);
  await settle(page);

  console.log("\n1) a comment stages a card and opens nothing");
  const tabsBefore = await canvasTabs(page);
  await addComment(page, 0, "Make this warmer and more specific.");
  ok((await cards(page)).length === 1, `one card after the first comment: ${JSON.stringify(await cards(page))}`);
  ok(!(await threadOpen(page)), "commenting did not open the comment thread");
  ok((await canvasTabs(page)) === tabsBefore, "commenting opened no canvas tab");
  await composerShot(page, "01-one-card-light");

  console.log("\n2) more remarks: a choice, ticked boxes, a second comment");
  const option = await page.evaluate((an) => [...document.querySelectorAll(`${an} button[aria-label^='Edit ']`)].map((b) => b.getAttribute("aria-label").slice(5)).find((x) => x !== "content") ?? null, AN);
  if (option) { await page.getByRole("button", { name: option, exact: true }).first().click(); await page.waitForTimeout(3500); }
  const boxes = page.locator(`${AN} [data-message-content] input[type=checkbox], ${AN} [data-message-content] [role=checkbox]`);
  const nBoxes = await boxes.count();
  for (let i = 0; i < Math.min(2, nBoxes); i++) { await boxes.nth(i).click().catch(() => {}); await page.waitForTimeout(1500); }
  await page.waitForTimeout(2500);
  await addComment(page, 1, "Say who this is for.");
  const four = await cards(page);
  console.log("  option:", option, "boxes:", nBoxes, "cards:", JSON.stringify(four));
  ok(four.length >= 3, `three or more mixed cards: ${four.length}`);
  ok(!(await threadOpen(page)), "still nothing opened after four remarks");
  await composerShot(page, "02-mixed-cards-light");

  console.log("\n3) dark");
  await page.emulateMedia({ colorScheme: "dark" });
  await page.evaluate(() => { document.documentElement.classList.add("dark"); document.documentElement.classList.remove("light"); });
  await page.waitForTimeout(800);
  await composerShot(page, "03-mixed-cards-dark");
  await page.emulateMedia({ colorScheme: "light" });
  await page.evaluate(() => { document.documentElement.classList.remove("dark"); });
  await page.waitForTimeout(800);

  console.log("\n4) pressing a comment card opens its thread");
  const firstComment = page.locator(`${CARD}[data-remark-card=comment] button[aria-pressed]`).first();
  await firstComment.hover();
  await page.waitForTimeout(400);
  await composerShot(page, "04-hover-light");
  await firstComment.click();
  await page.waitForTimeout(4000);
  ok(await threadOpen(page), "a comment card press opened the comment thread");
  ok((await firstComment.getAttribute("aria-pressed")) === "true", "the pressed card shows pressed");
  await shot(page, "05-comment-card-opens-thread");

  const other = page.locator(`${CARD}:not([data-remark-card=comment]) button[aria-pressed]`).first();
  if (await other.count()) {
    await other.click();
    await page.waitForTimeout(3500);
    ok((await other.getAttribute("aria-pressed")) === "true", "a non-comment card press opened its view");
    await shot(page, "06-other-card-opens-view");
  }

  console.log("\n5) keyboard: Tab reaches a card, Enter opens it");
  await page.locator("textarea[data-agent-main-input]").first().focus();
  await page.keyboard.press("Shift+Tab");
  const focused = await page.evaluate(() => document.activeElement?.closest("[data-remark-card]")?.getAttribute("data-remark-card") ?? document.activeElement?.tagName);
  console.log("  focus after Shift+Tab:", focused);

  console.log("\n6) phone width");
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, storageState: await ctx.storageState(), isMobile: true, hasTouch: true });
  const pp = await phone.newPage();
  await pp.goto(chatUrl, { timeout: 180000 });
  await pp.waitForTimeout(14000);
  ok((await cards(pp)).length === four.length, `phone shows the same cards: ${(await cards(pp)).length}`);
  await composerShot(pp, "07-phone-light");
  await phone.close();

  console.log("\n7) the X removes a card; the row goes when the last one goes");
  const before = (await cards(page)).length;
  for (let i = 0; i < before; i++) {
    const card = page.locator(CARD).first();
    await card.hover();
    await card.getByRole("button", { name: /^Remove / }).click();
    await page.waitForTimeout(1500);
  }
  ok((await cards(page)).length === 0, "every card removed by its X");
  await shot(page, "08-all-removed");
} catch (e) {
  fails.push("walk error: " + String(e?.message || e).split("\n")[0]);
  await shot(page, "99-error").catch(() => {});
}
await browser.close();
console.log(fails.length ? `\nFAIL (${fails.length}): ${JSON.stringify(fails)}` : "\nALL PASS");
process.exit(fails.length ? 1 : 0);
