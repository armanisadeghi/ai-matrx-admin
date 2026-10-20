// Headless proof (375px, touch) that the phone Notes "New note" button creates a NEW note and
// never opens or changes an existing one. Seat: admin@admin.com via the login form
// (credentials from .env.local, never printed). Writes only to the note it creates, and
// trashes that note at the end. Types into nothing.
// Usage: node scripts/notes-new-note-mobile-walk.mjs <outDir> [origin]
import { chromium } from "playwright";
import { readFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { signIn, until } from "./lib/seat-browser.mjs";

const ROOT = resolve(new URL(".", import.meta.url).pathname, "..");
const env = Object.fromEntries(
  readFileSync(resolve(ROOT, ".env.local"), "utf8").split("\n").map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")]),
);
const OUT = process.argv[2] ?? "/tmp";
const ORIGIN = process.argv[3] ?? "https://www.aimatrx.com";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
const page = await context.newPage();
const created = [];
const priorNoteIds = [];
const seen = [];
page.on("request", (r) => { if (/supabase|matrxserver|\/rest\/v1/.test(r.url()) && r.method() !== "GET") seen.push(`${r.method()} ${r.url().slice(0, 110)}`); });
page.on("console", (m) => { if (m.type() === "error" || /New Note|Reusing/i.test(m.text())) console.log("console:", m.text().slice(0, 200)); });
const patched = [];
page.on("response", async (res) => {
  const req = res.request();
  if (!/\/rest\/v1\/notes/.test(res.url())) return;
  if (req.method() === "GET") { try { for (const r of await res.json()) if (r?.id) priorNoteIds.push(r.id); } catch {} }
  if (req.method() === "POST") {
    try { const j = await res.json(); for (const r of Array.isArray(j) ? j : [j]) if (r?.id) created.push(r.id); } catch {}
  }
  if (req.method() === "PATCH") patched.push({ url: res.url(), body: req.postData()?.slice(0, 200) });
});

const who = await signIn(page, ORIGIN, env.AI_ADMIN_USERNAME, env.AI_ADMIN_PASSWORD, "admin");
console.log("signed in as", who);
await page.goto(`${ORIGIN}/notes`, { waitUntil: "domcontentloaded", timeout: 120000 });
const btn = page.locator('button[aria-label="New Note"]').first(); // the + button, never a list row titled "New Note"
await btn.waitFor({ timeout: 90000 });
await page.waitForTimeout(6000); // let the list load
await page.screenshot({ path: `${OUT}/1-list.png` });
const rowsBefore = await page.evaluate(() => document.querySelectorAll("[data-note-id]").length);
const priorIds = new Set(priorNoteIds);
await btn.tap();
const got = await until("a note was created", () => created.length > 0, 30000);
await page.waitForTimeout(3000);
await page.screenshot({ path: `${OUT}/2-after-new-note.png` });
const mode = await page.evaluate(() => ({ rich: !!document.querySelector('[data-note-editor-mode="write"], .ProseMirror, [contenteditable="true"]'), textarea: !!document.querySelector("textarea") }));
console.log("non-GET requests:", JSON.stringify(seen.slice(-8)));
console.log(JSON.stringify({ rowsBefore, createdIds: created, newIdIsBrandNew: created.length === 1 && !priorIds.has(created[0]), priorCount: priorIds.size, newNoteCreated: !!got.v, patchedDuringTap: patched, editor: mode }));

// Trash ONLY the note we created (and only if exactly one was created), through its own menu.
if (created.length === 1) {
  await page.waitForTimeout(3000);
  await page.getByRole("button", { name: /more|menu|options|actions/i }).last().tap().catch(() => {});
  await page.screenshot({ path: `${OUT}/3-menu.png` });
  const del = page.getByRole("menuitem", { name: /delete|trash/i }).first();
  if (await del.count()) {
    await del.tap();
    const confirm = page.getByRole("button", { name: /^(delete|move to trash|trash|confirm)/i }).last();
    if (await confirm.count()) await confirm.tap().catch(() => {});
    await page.waitForTimeout(3000);
    console.log("trash requested for", created[0], JSON.stringify(patched.map((p) => p.body)));
  } else console.log("NO delete item found; note left:", created[0]);
  await page.screenshot({ path: `${OUT}/4-after-trash.png` });
}
await browser.close();
