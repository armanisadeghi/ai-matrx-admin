// scripts/xml-fence-repair-check.mjs — opens one repaired chat read-only, headless, as admin@admin.com,
// and counts shared XML sections vs XML source cards inside the answer.
//   node scripts/xml-fence-repair-check.mjs <conversationId> <outDir> [origin]
import { chromium } from "playwright";
import { readFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { signIn, sleep } from "./lib/seat-browser.mjs";
const ROOT = resolve(new URL(".", import.meta.url).pathname, "..");
const env = Object.fromEntries(
  readFileSync(resolve(ROOT, ".env.local"), "utf8").split("\n").map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")]),
);
const [, , CHAT, OUT = "/tmp/xml-fence-repair", ORIGIN = "https://www.aimatrx.com"] = process.argv;
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await signIn(page, ORIGIN, env.AI_ADMIN_USERNAME, env.AI_ADMIN_PASSWORD, "admin");
await page.goto(`${ORIGIN}/chat/${CHAT}`, { waitUntil: "domcontentloaded", timeout: 120000 });
await sleep(9000);
const state = await page.evaluate(() => {
  const answers = [...document.querySelectorAll("[data-record-annotations]")];
  const a = answers[answers.length - 1];
  if (!a) return { answer: false, url: location.pathname };
  return {
    answer: true,
    sections: [...a.querySelectorAll("[data-xml-section]")].map((e) => ({ tag: e.getAttribute("data-xml-section"), shared: e.hasAttribute("data-xml-section-container") })),
    xmlCards: a.querySelectorAll("[data-testid='xml-block'], [data-xml-block]").length,
    hasFenceText: a.textContent.includes("```xml"),
  };
});
await page.screenshot({ path: `${OUT}/repaired.png` });
console.log(JSON.stringify(state));
await browser.close();
