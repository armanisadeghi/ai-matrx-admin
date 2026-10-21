// scripts/test-reply-chats-archive.mjs — archives admin@admin.com's leftover walk chats through the UI
// only (chat sidebar row → its menu → Organize → Archive). Headless; credentials from .env.local,
// never printed. Only titles matched by the patterns below are touched.
//   node scripts/test-reply-chats-archive.mjs <outDir> [origin] [--dry]
import { chromium } from "playwright";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { signIn, sleep } from "./lib/seat-browser.mjs";

const ROOT = resolve(new URL(".", import.meta.url).pathname, "..");
const env = Object.fromEntries(
  readFileSync(resolve(ROOT, ".env.local"), "utf8").split("\n").map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")]),
);
const OUT = process.argv[2] ?? "/tmp/archive-walk";
const ORIGIN = process.argv[3] && !process.argv[3].startsWith("--") ? process.argv[3] : "https://www.aimatrx.com";
const DRY = process.argv.includes("--dry");
const PATTERNS = (process.env.ARCHIVE_TITLES ?? "Exact XML Tags Echo|Exact XML Echo Request|Echo XML Tags Request|Conversation 71bff9|XML Tag|XMLTAGS|Block Type Label|TYPELABEL")
  .split("|").map((p) => p.trim()).filter(Boolean);
mkdirSync(OUT, { recursive: true });
const results = { archived: [], rows: [] };

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
await signIn(page, ORIGIN, env.AI_ADMIN_USERNAME, env.AI_ADMIN_PASSWORD, "admin");
await page.goto(`${ORIGIN}/chat`, { waitUntil: "domcontentloaded", timeout: 120000 });
await sleep(8000);
const rowTitles = () => page.evaluate(() =>
  [...document.querySelectorAll("a[href*='/chat/']")].map((a) => ({ href: a.getAttribute("href"), text: (a.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80) })).filter((r) => r.text));
results.rows = await rowTitles();
await page.screenshot({ path: `${OUT}/a-00-sidebar.png` });
// ARCHIVE_IDS (comma-separated conversation ids) opens each chat first so its sidebar row is loaded.
const IDS = (process.env.ARCHIVE_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
for (let round = 0; round < 12; round++) {
  if (IDS.length) {
    const id = IDS[round];
    if (!id) break;
    await page.goto(`${ORIGIN}/chat/${id}`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await sleep(7000);
  }
  const rows = await rowTitles();
  const target = IDS.length
    ? rows.find((r) => r.href === `/chat/${IDS[round]}`)
    : rows.find((r) => PATTERNS.some((p) => r.text.includes(p)) && !results.archived.some((a) => a.href === r.href));
  if (!target) { if (IDS.length) { results.archived.push({ href: `/chat/${IDS[round]}`, error: "no sidebar row" }); continue; } break; }
  if (DRY) { results.archived.push({ ...target, dry: true }); continue; }
  const row = page.locator(`a[href='${target.href}']`).first();
  await row.scrollIntoViewIfNeeded();
  await row.hover();
  await sleep(500);
  await row.click({ button: "right" });
  await sleep(1000);
  let organize = page.getByRole("menuitem", { name: /^Organize/ }).first();
  if (!(await organize.isVisible().catch(() => false))) {
    await page.keyboard.press("Escape");
    // The row's own "…" button beside it.
    const more = row.locator("xpath=..").getByRole("button").last();
    await more.click().catch(() => {});
    await sleep(1000);
    organize = page.getByRole("menuitem", { name: /^Organize/ }).first();
  }
  results.menu = await page.evaluate(() => [...document.querySelectorAll("[role='menuitem']")].map((m) => (m.textContent || "").trim()).slice(0, 30));
  await page.screenshot({ path: `${OUT}/a-${round}-menu.png` });
  if (!(await organize.isVisible().catch(() => false))) { results.error = `no Organize for ${target.text}`; break; }
  await organize.hover();
  await organize.click().catch(() => {});
  await sleep(800);
  const archive = page.getByRole("menuitem", { name: /^Archive/ }).first();
  await archive.click();
  await sleep(2500);
  const after = await rowTitles();
  results.archived.push({ ...target, gone: !after.some((r) => r.href === target.href) });
}
results.after = (await rowTitles()).filter((r) => PATTERNS.some((p) => r.text.includes(p)) || IDS.some((id) => r.href === `/chat/${id}`));
await page.screenshot({ path: `${OUT}/a-99-after.png` });
console.log("RESULTS", JSON.stringify(results, null, 1));
writeFileSync(`${OUT}/archive-results.json`, JSON.stringify(results, null, 1));
await browser.close();
