// scripts/answer-controls-save-walk.mjs — live proof that a Controls edit in a chat answer
// persists on every surface (review 6 H2: at 375 the bottom-sheet edit reached the message text
// but not the canvas row the chart draws from, so a reload showed the old title and the Controls
// button vanished). Headless, admin@admin.com via the login form (credentials from .env.local,
// never printed). Sends ONE message to the Test Reply agent (cheap test agent, never General Chat)
// holding a chart, then: Controls → Title → blur → close → wait → reload → title + Controls button
// → a second edit → reload. Every chat/canvas write the page makes is logged with its status.
//   node scripts/answer-controls-save-walk.mjs <outDir> [origin] [width] [conversationId]
// Archive the chat afterwards: ARCHIVE_TITLES=RV6H2 node scripts/test-reply-chats-archive.mjs <dir>
import { chromium } from "playwright";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { signIn, sleep } from "./lib/seat-browser.mjs";

const ROOT = resolve(new URL(".", import.meta.url).pathname, "..");
const env = Object.fromEntries(
  readFileSync(resolve(ROOT, ".env.local"), "utf8").split("\n").map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")]),
);
const OUT = process.argv[2] ?? "/tmp/answer-controls-walk";
const ORIGIN = process.argv[3] ?? "https://www.aimatrx.com";
const WIDTH = Number(process.argv[4] ?? 1440);
const EXISTING = process.argv[5] ?? null;
const PHONE = WIDTH < 768;
const TAG = PHONE ? "m" : "d";
const AGENT = process.env.CHAT_AGENT ?? "8a4b7c8e-144f-4391-b5f0-3d2cd2ecee0f";
const STAMP = Date.now().toString(36).slice(-4);
const BASE = `RV6H2 ${TAG}${STAMP} visits`;
mkdirSync(OUT, { recursive: true });

const CHART_LINE = `{"type":"pie","title":"${BASE}","data":[{"label":"Web","value":6},{"label":"App","value":4}]}`;
// CORPUS=full sends review 6's own message (many blocks, minified chart JSON, a thinking model turn).
const MESSAGE =
  process.env.CORPUS === "full"
    ? readFileSync(resolve(ROOT, "scripts/fixtures/review6-chat-corpus.txt"), "utf8").replace("RV6C visits", BASE)
    : ["RV6H2 chat. Repeat everything below back exactly, character for character, with no other words.", "", "```chart", CHART_LINE, "```"].join("\n");

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext(
  PHONE
    ? { viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }
    : { viewport: { width: WIDTH, height: 900 } },
);
const page = await context.newPage();
const writes = [];
const t0 = Date.now();
page.on("request", (req) => {
  const url = req.url();
  if (req.method() === "GET" || !/\/rest\/v1\/(rpc\/(cx_message_edit|cx_canvas_[a-z_]+)|canvas_items|message)/.test(url)) return;
  writes.push({ at: Date.now() - t0, method: req.method(), url: url.replace(/^.*\/rest\/v1\//, "").slice(0, 90), status: null });
});
page.on("response", (res) => {
  const url = res.url().replace(/^.*\/rest\/v1\//, "").slice(0, 90);
  const row = writes.find((w) => w.url === url && w.status === null && w.method === res.request().method());
  if (row) row.status = res.status();
});
const consoleLines = [];
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning" || process.env.ALL_CONSOLE) consoleLines.push(`${Date.now() - t0} ${m.type()}: ${m.text().slice(0, 200)}`);
});

const answer = () => page.locator("[data-record-annotations]").last();
const chartState = () =>
  page.evaluate((base) => {
    const answers = [...document.querySelectorAll("[data-record-annotations]")];
    const a = answers[answers.length - 1];
    if (!a) return { answer: false };
    const text = a.innerText || "";
    const m = text.match(new RegExp(`${base}[^\\n]*`));
    return {
      answer: true,
      title: m ? m[0].trim() : null,
      controlsButtons: a.querySelectorAll("[data-block-controls-button]").length,
    };
  }, BASE);

/** Controls → Title → new value → commit (blur) → close. Returns what the inspector showed. */
async function editTitle(next, shot) {
  // The chart's own Controls: the button whose smallest block holding one Controls button shows the title.
  const index = await answer().evaluate((a, base) => {
    const buttons = [...a.querySelectorAll("[data-block-controls-button]")];
    return buttons.findIndex((b) => {
      let node = b.parentElement;
      while (node && node !== a && node.querySelectorAll("[data-block-controls-button]").length === 1) {
        if ((node.textContent || "").includes(base)) return true;
        node = node.parentElement;
      }
      return false;
    });
  }, BASE);
  const button = answer().locator("[data-block-controls-button]").nth(Math.max(0, index));
  await button.scrollIntoViewIfNeeded();
  await (PHONE ? button.tap() : button.click());
  await sleep(900);
  const input = page.locator("[data-control-input='title']").last();
  await input.waitFor({ timeout: 10000 });
  const box = await page.locator("[data-block-inspector]").last().boundingBox();
  const sheet = await page.locator("[role='dialog']").last().boundingBox().catch(() => null);
  if (PHONE) await input.focus();
  else await input.click();
  await input.fill(next);
  // Commit exactly as a person does on each surface: the phone keyboard's Done (blur), desktop Tab.
  if (PHONE) await input.evaluate((el) => el.blur());
  else await input.press("Tab");
  await sleep(500);
  await page.screenshot({ path: `${OUT}/${TAG}-${shot}-inspector.png` });
  await page.keyboard.press("Escape");
  await sleep(400);
  return { inspector: box, dialog: sheet };
}

await signIn(page, ORIGIN, env.AI_ADMIN_USERNAME, env.AI_ADMIN_PASSWORD, "admin");
const results = { width: WIDTH, base: BASE };
if (EXISTING) {
  await page.goto(`${ORIGIN}/chat/${EXISTING}`, { waitUntil: "domcontentloaded", timeout: 120000 });
} else {
  await page.goto(`${ORIGIN}/chat/a/${AGENT}`, { waitUntil: "domcontentloaded", timeout: 120000 });
  const box = page.locator("textarea").first();
  await box.waitFor({ timeout: 90000 });
  await sleep(3000);
  await box.fill(MESSAGE);
  const send = page.getByRole("button", { name: /^send/i }).first();
  if (await send.isVisible().catch(() => false)) await (PHONE ? send.tap() : send.click());
  else await box.press("Enter");
}
await answer().waitFor({ timeout: 90000 }).catch(() => {});
await page.locator("[data-record-annotations] [data-block-controls-button]").last().waitFor({ timeout: 90000 }).catch(() => {});
await sleep(Number(process.env.WAIT_BEFORE_EDIT ?? 4000));
results.editAt = Date.now() - t0;
results.chatUrl = page.url();
results.settled = await chartState();

const first = `${BASE}2`;
results.edit1 = await editTitle(first, "edit1");
// A person reloads when they like: RELOAD_AFTER_MS=1500 reloads while the save is still landing.
await sleep(Number(process.env.RELOAD_AFTER_MS ?? 5000));
results.afterEdit1 = await chartState();
await page.reload({ waitUntil: "domcontentloaded" });
await answer().waitFor({ timeout: 90000 }).catch(() => {});
await sleep(8000);
results.reload1 = await chartState();
await page.screenshot({ path: `${OUT}/${TAG}-reload1.png` });

if (results.reload1.controlsButtons > 0) {
  const second = `${BASE}3`;
  results.edit2 = await editTitle(second, "edit2");
  await sleep(5000);
  await page.reload({ waitUntil: "domcontentloaded" });
  await answer().waitFor({ timeout: 90000 }).catch(() => {});
  await sleep(8000);
  results.reload2 = await chartState();
  await page.screenshot({ path: `${OUT}/${TAG}-reload2.png` });
}
results.writes = writes;
results.console = consoleLines.filter((l) => !/echo-unguarded|legacy rendering|accounts list/.test(l)).slice(-40);
console.log(JSON.stringify(results, null, 1));
writeFileSync(`${OUT}/${TAG}-results.json`, JSON.stringify(results, null, 1));
await browser.close();
