// scripts/answer-xml-sections-walk.mjs — live proof that every XML section in a CHAT ANSWER is the
// one shared section container, while it streams, once it settles and after a reload (review 5, G2),
// and that a tag's name is never cut to a letter. Headless, admin@admin.com via the login form
// (credentials from .env.local, never printed). Sends ONE message to the Test Reply agent (cheap
// test agent, never General Chat); prints the chat id so the caller archives it
// (scripts/test-reply-chats-archive.mjs).
//   node scripts/answer-xml-sections-walk.mjs <outDir> [origin] [width]
import { chromium } from "playwright";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { signIn, sleep } from "./lib/seat-browser.mjs";

const ROOT = resolve(new URL(".", import.meta.url).pathname, "..");
const env = Object.fromEntries(
  readFileSync(resolve(ROOT, ".env.local"), "utf8").split("\n").map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")]),
);
const OUT = process.argv[2] ?? "/tmp/answer-xml";
const ORIGIN = process.argv[3] ?? "https://www.aimatrx.com";
const WIDTH = Number(process.argv[4] ?? 1440);
const PHONE = WIDTH < 768;
const TAG = PHONE ? "m" : "d";
const AGENT = process.env.CHAT_AGENT ?? "8a4b7c8e-144f-4391-b5f0-3d2cd2ecee0f";
mkdirSync(OUT, { recursive: true });

const MESSAGE = [
  "RV5FIX chat. Repeat everything below back exactly, character for character, with no other words.",
  "",
  "<info>",
  "",
  "</info>",
  "",
  "<plan>",
  "ship it",
  "</plan>",
  "",
  "<foo>",
  "foo body",
  "</foo>",
  "",
  // An artifact makes the client save the answer through materialization, which re-serializes
  // every block: the path that fenced <foo> as ```xml.
  "```chart",
  '{"type":"pie","title":"RV5FIX visits","data":[{"label":"Web","value":6},{"label":"App","value":4}]}',
  "```",
].join("\n");

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext(
  PHONE
    ? { viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }
    : { viewport: { width: WIDTH, height: 900 } },
);
const page = await context.newPage();
const shot = (n) => page.screenshot({ path: `${OUT}/${TAG}-${n}.png`, fullPage: false });

/** The answer's sections and any XML source card inside the answer (never the person's bubble). */
const answerState = () =>
  page.evaluate(() => {
    const answers = [...document.querySelectorAll("[data-record-annotations]")];
    const answer = answers[answers.length - 1] ?? null;
    if (!answer) return { answer: false };
    const sections = [...answer.querySelectorAll("[data-xml-section]")].map((el) => {
      const label = el.querySelector("[data-testid='xml-section-tag']");
      const r = label?.getBoundingClientRect();
      return {
        tag: el.getAttribute("data-xml-section"),
        shared: el.hasAttribute("data-xml-section-container"),
        label: label?.textContent ?? null,
        labelFits: label ? label.scrollWidth <= label.clientWidth + 1 : null,
        labelWidth: r ? Math.round(r.width) : null,
      };
    });
    const xmlCards = [...answer.querySelectorAll("[data-block-header]")]
      .filter((h) => /^XML\b/.test(h.querySelector("[data-block-type-label]")?.textContent ?? ""))
      .map((h) => (h.textContent || "").replace(/\s+/g, " ").trim().slice(0, 60));
    return { answer: true, sections, xmlCards, rawTags: /<foo>|<\/plan>|<info>/.test(answer.innerText) };
  });

await signIn(page, ORIGIN, env.AI_ADMIN_USERNAME, env.AI_ADMIN_PASSWORD, "admin");
const results = { width: WIDTH, streamed: [], settled: null, reloaded: null };
await page.goto(`${ORIGIN}/chat/a/${AGENT}`, { waitUntil: "domcontentloaded", timeout: 120000 });
const box = page.locator("textarea").first();
await box.waitFor({ timeout: 90000 });
await sleep(3000);
await box.fill(MESSAGE);
const send = page.getByRole("button", { name: /^send/i }).first();
if (await send.isVisible().catch(() => false)) await (PHONE ? send.tap() : send.click());
else await box.press("Enter");
// While it streams: sample the answer every 400 ms for 25 s.
for (let i = 0; i < 60; i++) {
  await sleep(400);
  const s = await answerState().catch(() => null);
  if (s?.answer && s.sections.length) results.streamed.push(s);
}
await sleep(8000); // artifact materialization rewrites the saved row, and the settled answer renders from it
results.chatUrl = page.url();
results.settled = await answerState();
await page.locator("[data-record-annotations] [data-xml-section='foo']").last().scrollIntoViewIfNeeded().catch(() => {});
await sleep(800);
await shot("01-settled");
await page.reload({ waitUntil: "domcontentloaded" });
await page.locator("[data-record-annotations]").last().waitFor({ timeout: 90000 }).catch(() => {});
await sleep(8000);
results.reloaded = await answerState();
await page.locator("[data-record-annotations] [data-xml-section='foo']").last().scrollIntoViewIfNeeded().catch(() => {});
await sleep(800);
await shot("02-reloaded");
const summary = (s) =>
  s?.answer ? `${s.sections.map((x) => `${x.tag}${x.shared ? "" : "(NOT shared)"}${x.labelFits === false ? "(cut)" : ""}`).join(",")} cards=${s.xmlCards.length} raw=${s.rawTags}` : "no answer";
results.streamedBad = results.streamed.filter((s) => s.xmlCards.length || s.sections.some((x) => !x.shared)).length;
console.log(`${TAG} streamed samples=${results.streamed.length} bad=${results.streamedBad}`);
console.log(`${TAG} settled: ${summary(results.settled)}`);
console.log(`${TAG} reloaded: ${summary(results.reloaded)}`);
console.log(`${TAG} chat: ${results.chatUrl}`);
writeFileSync(`${OUT}/${TAG}-results.json`, JSON.stringify(results, null, 1));
await browser.close();
