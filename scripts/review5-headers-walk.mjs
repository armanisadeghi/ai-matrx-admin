// scripts/review5-headers-walk.mjs — live proof for adversarial review 5 G1 + G3: stats, comparison,
// tasks, progress tracker, troubleshooting, recipe, decision tree and map pasted into a new note show
// ONE header row with ONE type label and no button twice, in Write, Split and Read; stats and tasks in
// a Test Reply chat answer (live and after a reload, the saved answer) show their type label.
// Evidence: common-docs projects/rich-content-unification/evidence/review5-headers-fixes.md.
// Headless, admin@admin.com via the login form (credentials from .env.local, never printed).
// Creates its own note (trashed by id at the end, content checked first) and its own chat (archived
// through the chat sidebar UI by scripts/test-reply-chats-archive.mjs).
//   node scripts/review5-headers-walk.mjs <outDir> [origin] [width]
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
const OUT = process.argv[2] ?? "/tmp/typelabels";
const ORIGIN = process.argv[3] ?? "https://www.aimatrx.com";
const WIDTH = Number(process.argv[4] ?? 1440);
const PHONE = WIDTH < 768;
const TAG = PHONE ? "m" : "d";
mkdirSync(OUT, { recursive: true });
const results = { width: WIDTH };
const created = [];

const F = "```";
const BLOCKS = [
  `${F}stats`,
  JSON.stringify({ title: "RV5 Totals", stats: [{ label: "Revenue", value: "$1.2M" }, { label: "Users", value: 12 }] }),
  F,
  "",
  `${F}comparison`,
  JSON.stringify({ comparison: { title: "RV5 Plans", items: ["Alpha", "Beta"], criteria: [{ name: "Price", values: [10, 20] }, { name: "Speed", values: [3, 5] }] } }),
  F,
  "",
  `${F}tasks`,
  "## Sprint 12",
  "- [ ] Write the plan",
  "- [x] Book the room",
  F,
  "",
  "<progress_tracker>",
  "### RV5 Launch",
  "- [x] Plan",
  "- [ ] Ship",
  "</progress_tracker>",
  "",
  "<troubleshooting>",
  "### RV5 The app will not start",
  "- Check the cable",
  "- Restart it",
  "</troubleshooting>",
  "",
  "<cooking_recipe>",
  "### RV5 Pancakes",
  "#### Ingredients",
  "- 2 eggs",
  "#### Instructions",
  "1. Mix",
  "</cooking_recipe>",
  "",
  `${F}decision_tree`,
  JSON.stringify({ decision_tree: { title: "RV5 Pick", root: { question: "Ready?", yes: { action: "Go" }, no: { action: "Wait" } } } }),
  F,
  "",
  `${F}map`,
  JSON.stringify({ title: "RV5 Offices", markers: [{ name: "Paris", lat: 48.85, lng: 2.35 }] }),
  F,
];
const CHAT_BLOCKS = BLOCKS.slice(0, BLOCKS.indexOf("<progress_tracker>"));
const NOTE = ["RV5H walk.", "", ...BLOCKS, "", "The end."].join("\n");

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext(
  PHONE ? { viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } : { viewport: { width: WIDTH, height: 900 } },
);
const page = await context.newPage();
page.on("response", async (res) => {
  if (!/\/rest\/v1\/notes/.test(res.url()) || res.request().method() !== "POST") return;
  try { const j = await res.json(); for (const r of Array.isArray(j) ? j : [j]) if (r?.id && !created.includes(r.id)) created.push(r.id); } catch {}
});
const shot = (n) => page.screenshot({ path: `${OUT}/${TAG}-${n}.png`, fullPage: false });
const mode = async (name) => {
  const b = page.getByRole("button", { name: new RegExp(`^${name}$`) }).or(page.getByRole("radio", { name: new RegExp(`^${name}$`) })).first();
  await (PHONE ? b.tap().catch(() => b.click()) : b.click());
  await sleep(2500);
};
/** Every visible type label, the header it sits in, and every kind host with or without one. */
const labels = (scope) => page.evaluate((scope) => {
  const root = scope ? document.querySelector(scope) ?? document : document;
  const visible = (el) => el.getBoundingClientRect().height > 0;
  return {
    labels: [...root.querySelectorAll("[data-block-type-label]")].filter(visible).map((el) => ({
      text: (el.textContent || "").trim(),
      inHeader: !!el.closest("[data-block-header]"),
      inEditor: !!el.closest(".ProseMirror"),
      inSource: !!el.closest(".cm-editor"),
    })),
    kindHostsWithoutLabel: [...root.querySelectorAll("[data-kind-record-host]")].filter(visible)
      .filter((h) => !h.querySelector("[data-block-header] [data-block-type-label]")).map((h) => h.getAttribute("data-kind-record-host")),
    // One header row per block: a kind host holding two of its own header rows (the label row AND the card's header) is a defect.
    kindHostsWithTwoHeaders: [...root.querySelectorAll("[data-kind-record-host]")].filter(visible)
      .filter((h) => [...h.querySelectorAll("[data-block-header]")].filter((x) => x.closest("[data-kind-record-host]") === h).length > 1)
      .map((h) => h.getAttribute("data-kind-record-host")),
    // Per block: its header rows, its labels and any button drawn twice (drag, "</>", trash, Copy).
    perBlock: [...root.querySelectorAll("[data-kind-record-host]")].filter(visible).filter((h) => !h.parentElement?.closest("[data-kind-record-host]")).map((h) => {
      const names = [...h.querySelectorAll("button")].filter(visible).map((b) => b.getAttribute("aria-label") || b.getAttribute("title") || "").filter(Boolean);
      return {
        kind: h.getAttribute("data-kind-record-host") || "",
        headers: [...h.querySelectorAll("[data-block-header]")].filter(visible).length,
        labels: [...h.querySelectorAll("[data-block-type-label]")].filter(visible).map((l) => (l.textContent || "").trim()),
        head: ((h.querySelector("[data-block-header]")?.textContent) || "").trim().slice(0, 50),
        repeated: [...new Set(names.filter((n, i) => names.indexOf(n) !== i))],
      };
    }),
    headersWithoutLabel: [...root.querySelectorAll("[data-block-header]")].filter(visible)
      .filter((h) => !h.querySelector("[data-block-type-label]")).map((h) => (h.textContent || "").trim().slice(0, 40)),
    rawTags: /<progress_tracker>|<\/cooking_recipe>/.test((root.innerText ?? root.body?.innerText) || ""),
  };
}, scope);
const scrollTo = async (sel) => { await page.locator(sel).first().scrollIntoViewIfNeeded().catch(() => {}); await sleep(700); };

await signIn(page, ORIGIN, env.AI_ADMIN_USERNAME, env.AI_ADMIN_PASSWORD, "admin");
await page.goto(`${ORIGIN}/notes`, { waitUntil: "domcontentloaded", timeout: 120000 });
const newBtn = page.getByRole("button", { name: /^new note$/i }).first();
await newBtn.waitFor({ timeout: 90000 });
await sleep(4000);
await (PHONE ? newBtn.tap() : newBtn.click());
await sleep(5000);
try {
  if (PHONE) await mode("Write").catch(() => {});
  await page.locator(".ProseMirror").first().click();
  await page.evaluate((text) => {
    const el = document.querySelector(".ProseMirror");
    const dt = new DataTransfer();
    dt.setData("text/plain", text);
    el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  }, NOTE);
  await sleep(7000);
  await page.keyboard.press("Escape").catch(() => {});
  results.write = await labels();
  for (let i = 0; i < 6; i++) { await shot(`01-write-${i}`); await page.mouse.wheel(0, 650); await sleep(900); }
  if (!PHONE) {
    await mode("Split").catch(() => { results.splitMissing = true; });
    await sleep(2500);
    results.split = await labels();
    for (let i = 0; i < 4; i++) { await shot(`02-split-${i}`); await page.mouse.wheel(0, 650); await sleep(900); }
  }
  if (PHONE) {
    const read = page.getByRole("button", { name: /^(Read|Reading|Preview|View)/i }).or(page.getByRole("radio", { name: /^(Read|Reading|Preview)/i })).first();
    await read.tap().catch(() => read.click()).catch(() => { results.phoneReadMissing = true; });
  } else {
    await mode("Read");
  }
  await sleep(3000);
  results.read = await labels();
  for (let i = 0; i < 6; i++) { await shot(`03-read-${i}`); await page.mouse.wheel(0, 650); await sleep(900); }
} catch (e) {
  results.error = e.message.slice(0, 300);
  await shot("error");
}

// The chat answer: the Test Reply agent (cheap test agent; never General Chat) repeats the blocks.
try {
  const agent = process.env.CHAT_AGENT ?? "8a4b7c8e-144f-4391-b5f0-3d2cd2ecee0f";
  await page.goto(`${ORIGIN}/chat/a/${agent}`, { waitUntil: "domcontentloaded", timeout: 120000 });
  const box = page.locator("textarea").first();
  await box.waitFor({ timeout: 90000 });
  await sleep(3000);
  await box.fill(["RV5H chat. Repeat everything below back exactly, character for character.", "", ...CHAT_BLOCKS].join("\n"));
  const send = page.getByRole("button", { name: /^send/i }).first();
  if (await send.isVisible().catch(() => false)) await (PHONE ? send.tap() : send.click());
  else await box.press("Enter");
  await sleep(45000);
  results.chatUrl = page.url();
  results.chat = await labels("main");
  for (let i = 0; i < 4; i++) { await shot(`05-chat-${i}`); await page.mouse.wheel(0, 600); await sleep(1000); }
  // The SAVED answer (after a reload) is where stats and tasks lost their label (G3).
  await page.reload({ waitUntil: "domcontentloaded" });
  await sleep(15000);
  results.chatReload = await labels("main");
  await page.mouse.wheel(0, 99999); await sleep(1500);
  for (let i = 0; i < 4; i++) { await shot(`06-reload-${i}`); await page.mouse.wheel(0, -600); await sleep(1000); }
} catch (e) {
  results.chatError = e.message.slice(0, 300);
  await shot("chat-error");
}

// Cleanup: only this walk's own note, content checked.
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
await sb.auth.signInWithPassword({ email: env.AI_ADMIN_USERNAME, password: env.AI_ADMIN_PASSWORD });
const trashed = [];
for (const id of created) {
  const { data } = await sb.schema("workbench").from("notes").select("id,label,content").eq("id", id).maybeSingle();
  if (!data || (!/RV5H walk/.test(`${data.label} ${data.content}`) && data.label !== "New Note")) continue;
  const { error } = await sb.schema("workbench").from("notes").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  trashed.push({ id, label: data.label, ok: !error, error: error?.message });
}
results.created = created;
results.trashed = trashed;
console.log("RESULTS", JSON.stringify(results, null, 1));
writeFileSync(`${OUT}/${TAG}-results.json`, JSON.stringify(results, null, 1));
await browser.close();
