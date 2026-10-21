// scripts/chat-review6-walk.mjs — live setup + proof for review 6 (H1, H3). Headless,
// admin@admin.com via the login form (credentials from .env.local, never printed). Sends ONE
// message to the Test Reply agent (cheap test agent, never General Chat) holding a prose paragraph
// followed by an XML section (the H1 shape: a triple-click on the paragraph runs into the section)
// and a one-line `<info>test</info>` (H3). Prints the chat id so the caller runs
// scripts/chat-answer-comment-probe.mjs on it and archives it (scripts/test-reply-chats-archive.mjs).
//   node scripts/chat-review6-walk.mjs <outDir> [origin] [width] [conversationId]
// With a conversationId it only opens that chat (no new message) and reports the person's bubble.
import { chromium } from "playwright";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { signIn, sleep } from "./lib/seat-browser.mjs";

const ROOT = resolve(new URL(".", import.meta.url).pathname, "..");
const env = Object.fromEntries(
  readFileSync(resolve(ROOT, ".env.local"), "utf8").split("\n").map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")]),
);
const OUT = process.argv[2] ?? "/tmp/review6-walk";
const ORIGIN = process.argv[3] ?? "https://www.aimatrx.com";
const WIDTH = Number(process.argv[4] ?? 1440);
const EXISTING = process.argv[5] ?? null;
const PHONE = WIDTH < 768;
const TAG = PHONE ? "m" : "d";
const AGENT = process.env.CHAT_AGENT ?? "8a4b7c8e-144f-4391-b5f0-3d2cd2ecee0f";
mkdirSync(OUT, { recursive: true });

const MESSAGE = [
  "RV6FIX chat. Repeat everything below back exactly, character for character, with no other words.",
  "",
  "Green tea is brewed from leaves that are not oxidised, so it tastes fresh and grassy.",
  "",
  "<info>",
  "test",
  "</info>",
  "",
  "Black tea is oxidised, so it tastes stronger.",
  "",
  "<info>test</info>",
  "",
  "<info></info>",
].join("\n");

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext(
  PHONE
    ? { viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }
    : { viewport: { width: WIDTH, height: 900 } },
);
const page = await context.newPage();

/** The person's own bubble: its XML sections and whether any raw tag text shows. */
const bubbleState = () =>
  page.evaluate(() => {
    const own = [...document.querySelectorAll("[data-user-message-style]")].find((b) => (b.textContent || "").includes("RV6FIX")) ?? null;
    if (!own) return { bubble: false };
    const sections = [...own.querySelectorAll("[data-xml-section]")].map((el) => ({
      tag: el.getAttribute("data-xml-section"),
      text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40),
      labelFits: (() => { const l = el.querySelector("[data-testid='xml-section-tag']"); return l ? l.scrollWidth <= l.clientWidth + 1 : null; })(),
    }));
    const r = own.getBoundingClientRect();
    return {
      bubble: true,
      sections,
      rawInfo: /<\/?info>/.test(own.innerText),
      overflow: own.scrollWidth > own.clientWidth + 1,
      width: Math.round(r.width),
    };
  });

await signIn(page, ORIGIN, env.AI_ADMIN_USERNAME, env.AI_ADMIN_PASSWORD, "admin");
const results = { width: WIDTH };
if (EXISTING) {
  await page.goto(`${ORIGIN}/chat/${EXISTING}`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.locator("[data-record-annotations]").last().waitFor({ timeout: 90000 }).catch(() => {});
  await sleep(6000);
} else {
  await page.goto(`${ORIGIN}/chat/a/${AGENT}`, { waitUntil: "domcontentloaded", timeout: 120000 });
  const box = page.locator("textarea").first();
  await box.waitFor({ timeout: 90000 });
  await sleep(3000);
  await box.fill(MESSAGE);
  const send = page.getByRole("button", { name: /^send/i }).first();
  if (await send.isVisible().catch(() => false)) await (PHONE ? send.tap() : send.click());
  else await box.press("Enter");
  await sleep(30000);
}
results.chatUrl = page.url();
const own = page.locator("[data-user-message-style]", { hasText: "RV6FIX" }).first();
// Open the clamped bubble the way a person does (its expand control), so the screenshot shows it all.
const expand = own.locator("button[aria-label*='xpand'], button[title*='xpand'], button[aria-label*='more'], button[title*='more']").first();
if (await expand.isVisible().catch(() => false)) { await (PHONE ? expand.tap() : expand.click()); await sleep(800); }
await own.scrollIntoViewIfNeeded().catch(() => {});
await sleep(800);
results.bubble = await bubbleState();
await page.screenshot({ path: `${OUT}/${TAG}-bubble.png`, fullPage: false });
console.log(`${TAG} chat: ${results.chatUrl}`);
console.log(`${TAG} bubble: ${JSON.stringify(results.bubble)}`);
writeFileSync(`${OUT}/${TAG}-results.json`, JSON.stringify(results, null, 1));
await browser.close();
