// scripts/editor-review-fixes-walk.mjs — live proof for the 2026-10-19 adversarial review's
// editor / notes / Controls findings (evidence/editor-review-fixes.md in common-docs
// projects/rich-content-unification). Headless, admin@admin.com via the login form
// (credentials from .env.local, never printed). Creates its own notes only; prints their ids
// so they can be trashed. Never types into a note it did not create.
//   node scripts/editor-review-fixes-walk.mjs <outDir> [origin] [width]
import { chromium } from "playwright";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { signIn, sleep } from "./lib/seat-browser.mjs";

const ROOT = resolve(new URL(".", import.meta.url).pathname, "..");
const env = Object.fromEntries(
  readFileSync(resolve(ROOT, ".env.local"), "utf8").split("\n").map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")]),
);
const OUT = process.argv[2] ?? "/tmp/erf";
const ORIGIN = process.argv[3] ?? "https://www.aimatrx.com";
const WIDTH = Number(process.argv[4] ?? 1440);
const PHONE = WIDTH < 768;
mkdirSync(OUT, { recursive: true });
const results = {};
const created = [];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext(
  PHONE ? { viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }
        : { viewport: { width: WIDTH, height: 900 } },
);
await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: ORIGIN });
const page = await context.newPage();
page.on("response", async (res) => {
  if (!/\/rest\/v1\/notes/.test(res.url()) || res.request().method() !== "POST") return;
  try { const j = await res.json(); for (const r of Array.isArray(j) ? j : [j]) if (r?.id && !created.includes(r.id)) created.push(r.id); } catch {}
});
const shot = (n) => page.screenshot({ path: `${OUT}/${PHONE ? "m-" : ""}${n}.png` });

await signIn(page, ORIGIN, env.AI_ADMIN_USERNAME, env.AI_ADMIN_PASSWORD, "admin");
await page.goto(`${ORIGIN}/notes`, { waitUntil: "domcontentloaded", timeout: 120000 });
const newBtn = page.getByRole("button", { name: /^new note$/i }).first();
await newBtn.waitFor({ timeout: 90000 }).catch(async () => {
  await shot("00-no-new-note");
  console.log("buttons:", JSON.stringify(await page.evaluate(() => [...document.querySelectorAll("button")].map((b) => b.getAttribute("aria-label") || b.innerText.trim()).filter(Boolean).slice(0, 60))));
  throw new Error("no New note button");
});
await sleep(4000);
await (PHONE ? newBtn.tap() : newBtn.click());
await sleep(5000);

async function pasteMarkdown(md) {
  const pm = page.locator(".ProseMirror").first();
  await pm.click();
  await page.evaluate((text) => {
    const el = document.querySelector(".ProseMirror");
    const dt = new DataTransfer();
    dt.setData("text/plain", text);
    el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  }, md);
  await sleep(2500);
}
async function plainText() {
  await page.getByRole("button", { name: /^Plain$/ }).first().click();
  await sleep(1500);
  const v = await page.locator("textarea").first().inputValue();
  return v;
}
async function toWrite() { await page.getByRole("button", { name: /^Write$/ }).first().click(); await sleep(2500); }

const SCENARIO = process.env.SCENARIO ?? "all";
export { page, shot, pasteMarkdown, plainText, toWrite, results, created, SCENARIO, OUT, PHONE, sleep };
const mod = await import(resolve(ROOT, process.env.WALK_STEPS ?? "scripts/editor-review-fixes-walk.steps.mjs"));
try { await mod.run({ page, shot, pasteMarkdown, plainText, toWrite, results, sleep, PHONE, OUT }); }
catch (e) { console.log("STEP ERROR", e.message.slice(0, 400)); await shot("error"); }
console.log("CREATED", JSON.stringify(created));
console.log("RESULTS", JSON.stringify(results, null, 1));
writeFileSync(`${OUT}/${PHONE ? "m-" : ""}results.json`, JSON.stringify({ created, results }, null, 1));
await browser.close();
