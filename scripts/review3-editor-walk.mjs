// scripts/review3-editor-walk.mjs — live proof for review 3's editor findings (2026-10-20):
// R1 the dock over a Read note's status bar, R2 the table bar on a CSV block, R3 undo after a
// ⌘Z inside Controls and a mode switch, R5/R7 the paste chip's placement.
// Evidence: common-docs projects/rich-content-unification/evidence/review3-editor-fixes.md.
// Headless, admin@admin.com via the login form (credentials from .env.local, never printed).
// Creates its own notes only and moves them to Trash by id at the end (label checked first).
//   node scripts/review3-editor-walk.mjs <outDir> [origin] [width] [light|dark]
import { chromium } from "playwright";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { signIn, sleep } from "./lib/seat-browser.mjs";

const ROOT = resolve(new URL(".", import.meta.url).pathname, "..");
const env = Object.fromEntries(
  readFileSync(resolve(ROOT, ".env.local"), "utf8").split("\n").map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")]),
);
const OUT = process.argv[2] ?? "/tmp/rv3e";
const ORIGIN = process.argv[3] ?? "https://www.aimatrx.com";
const WIDTH = Number(process.argv[4] ?? 1440);
const SCHEME = process.argv[5] === "dark" ? "dark" : "light";
const PHONE = WIDTH < 768;
const TAG = `${PHONE ? "m" : "d"}-${SCHEME}`;
mkdirSync(OUT, { recursive: true });
const results = { width: WIDTH, scheme: SCHEME };
const created = [];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  colorScheme: SCHEME,
  ...(PHONE ? { viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } : { viewport: { width: WIDTH, height: 900 } }),
});
const page = await context.newPage();
page.on("response", async (res) => {
  if (!/\/rest\/v1\/notes/.test(res.url()) || res.request().method() !== "POST") return;
  try { const j = await res.json(); for (const r of Array.isArray(j) ? j : [j]) if (r?.id && !created.includes(r.id)) created.push(r.id); } catch {}
});
const shot = (n) => page.screenshot({ path: `${OUT}/${TAG}-${n}.png` });
const ed = () => page.locator(".ProseMirror").first();
const typeOf = (txt) => (txt.match(/"type":\s*"(\w+)"/) || [])[1];

async function paste(md) {
  await page.evaluate((text) => {
    const el = document.querySelector(".ProseMirror");
    const dt = new DataTransfer();
    dt.setData("text/plain", text);
    el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  }, md);
}
const mode = async (name) => {
  const b = page.getByRole("button", { name: new RegExp(`^${name}$`) }).or(page.getByRole("radio", { name: new RegExp(`^${name}$`) })).first();
  await (PHONE ? b.tap().catch(() => b.click()) : b.click());
  await sleep(2000);
};
async function plainText() {
  await mode("Plain");
  return page.locator("textarea").first().inputValue();
}
const choice = (name) => page.getByRole("radio", { name: new RegExp(`^${name}$`) }).or(page.getByRole("button", { name: new RegExp(`^${name}$`) })).first();

/** What the chip covers: the elements drawn under it that are not the empty editor or its backdrop. */
async function chipReport() {
  return page.evaluate(() => {
    const chip = document.querySelector("[data-testid='paste-converted-notice']");
    if (!chip) return { shown: false };
    const r = chip.getBoundingClientRect();
    const pm = document.querySelector(".ProseMirror");
    const covered = new Set();
    for (const fy of [0.2, 0.5, 0.8]) for (const fx of [0.05, 0.3, 0.5, 0.7, 0.95]) {
      const under = document.elementsFromPoint(r.left + r.width * fx, r.top + r.height * fy).filter((e) => !chip.contains(e));
      const top = under[0];
      if (top && !(top === pm || top.contains(pm))) covered.add(`${top.tagName.toLowerCase()}${top.id ? "#" + top.id : ""}.${String(top.className).slice(0, 40)} "${(top.textContent || "").trim().slice(0, 30)}"`);
    }
    const vh = window.visualViewport?.height ?? innerHeight;
    return { shown: true, box: { top: Math.round(r.top), left: Math.round(r.left), right: Math.round(r.right), bottom: Math.round(r.bottom) }, onScreen: r.top >= 0 && r.bottom <= vh && r.left >= 0 && r.right <= innerWidth, covers: [...covered] };
  });
}

const LONG = Array.from({ length: 26 }, (_, i) => `Line ${i + 1}: the quick brown fox jumps over the lazy dog.`).join("\n\n");
const CHART = '```chart\n{"type": "pie", "title": "RV3E visits", "data": [{"label": "A", "value": 3}, {"label": "B", "value": 5}]}\n```';
const CSV = "```csv\nname,score\nAda,9\nGrace,8\n```";

await signIn(page, ORIGIN, env.AI_ADMIN_USERNAME, env.AI_ADMIN_PASSWORD, "admin");
await page.goto(`${ORIGIN}/notes`, { waitUntil: "domcontentloaded", timeout: 120000 });
const newBtn = page.getByRole("button", { name: /^new note$/i }).first();
await newBtn.waitFor({ timeout: 90000 });
await sleep(4000);
await (PHONE ? newBtn.tap() : newBtn.click());
await sleep(5000);
try {
  if (PHONE) await mode("Write").catch(() => {});
  await ed().click();
  await page.keyboard.type("RV3E note first line.");
  await sleep(800);
  // R5 / R7: the chip after pasting a long markdown note (desktop: the reviewer's long paste).
  await paste(`# RV3E note\n\n**bold** start.\n\n${CHART}\n\n${CSV}\n\n${LONG}\n`);
  await sleep(900);
  results.chip = await chipReport();
  await shot("01-chip");
  await sleep(8500);
  if (!PHONE) {
    // R2: the pointer over the CSV block's drawn table shows no table bar; its header buttons are on top.
    const td = page.locator("[data-island-face='render'] td").first();
    await td.scrollIntoViewIfNeeded(); await sleep(600);
    await td.hover(); await sleep(900);
    await shot("02-csv-hover");
    results.csv = await page.evaluate(() => {
      const bar = [...document.querySelectorAll("[data-table-handle-bar]")].filter((b) => b.getBoundingClientRect().height > 0).length;
      const face = document.querySelector("[data-island-face='render'] td")?.closest("[data-island-face='render']");
      const buttons = [...(face?.querySelectorAll("[data-block-controls-button], [data-island-edit-source], button[aria-label='Remove'], button[title='Remove']") ?? [])];
      const onTop = buttons.map((b) => { const r = b.getBoundingClientRect(); const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { label: b.getAttribute("aria-label") || b.textContent.trim(), onTop: b === top || b.contains(top) }; });
      return { tableBars: bar, headerButtons: onTop };
    });
    // R3: Pie → Bar → Line, ⌘Z inside Controls, Esc, Plain → Write, toolbar Undo → Pie.
    const ctl = ed().getByRole("button", { name: /^Controls$/ }).first();
    await ctl.scrollIntoViewIfNeeded(); await ctl.click(); await sleep(1200);
    await choice("Bar").click(); await sleep(1500);
    await choice("Line").click(); await sleep(1500);
    await page.keyboard.press("Meta+z"); await sleep(1500);
    await page.keyboard.press("Escape"); await sleep(900);
    results.afterCmdZ = typeOf(await plainText());
    await mode("Write");
    await page.getByRole("button", { name: /^Undo/ }).first().click(); await sleep(2000);
    results.afterToolbarUndo = typeOf(await plainText()); // want pie
    await mode("Write");
    await page.getByRole("button", { name: /^Redo/ }).first().click().catch(() => {}); await sleep(2000);
    results.afterToolbarRedo = typeOf(await plainText()); // want bar
    await mode("Write");
    // R1: Read, scroll the note, rest on the status bar (nothing focused): no dock.
    await mode("Read");
    await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
    await page.mouse.move(700, 400); await page.mouse.wheel(0, 900); await sleep(1500);
    const status = await page.evaluate(() => {
      const el = [...document.querySelectorAll("footer, div, span")].filter((n) => /\b\d+ words\b/.test(n.textContent || "") && n.children.length <= 3).sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top)[0];
      const r = el?.getBoundingClientRect();
      return r ? { x: r.left + Math.min(40, r.width / 2), y: r.top + r.height / 2, text: el.textContent.trim().slice(0, 50) } : null;
    });
    results.statusBar = status;
    if (status) { await page.mouse.move(status.x, status.y - 2); await page.mouse.move(status.x + 6, status.y); await sleep(1800); }
    await shot("03-read-status-dwell");
    results.dockOverRead = await page.evaluate(() => document.querySelectorAll(".ambient-assistant-dock").length);
    // The discovery path stays: the bottom of the notes list beside the note may still reveal it.
    await page.mouse.move(120, 880); await page.mouse.move(124, 884); await sleep(1800);
    results.dockFromListBottom = await page.evaluate(() => document.querySelectorAll(".ambient-assistant-dock").length);
  } else {
    await shot("02-after");
  }
} catch (e) {
  results.error = e.message.slice(0, 300);
  await shot("error");
}

// Cleanup: only this walk's own notes, label checked.
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
await sb.auth.signInWithPassword({ email: env.AI_ADMIN_USERNAME, password: env.AI_ADMIN_PASSWORD });
const trashed = [];
for (const id of created) {
  const { data } = await sb.schema("workbench").from("notes").select("id,label,content").eq("id", id).maybeSingle();
  if (!data || !/RV3E/.test(`${data.label} ${data.content}`) && data.label !== "New Note") continue;
  const { error } = await sb.schema("workbench").from("notes").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  trashed.push({ id, label: data.label, ok: !error, error: error?.message });
}
results.created = created;
results.trashed = trashed;
console.log("RESULTS", JSON.stringify(results, null, 1));
writeFileSync(`${OUT}/${TAG}-results.json`, JSON.stringify(results, null, 1));
await browser.close();
