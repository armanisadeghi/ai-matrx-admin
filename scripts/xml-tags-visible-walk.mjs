// scripts/xml-tags-visible-walk.mjs — live proof that an XML section is never hidden in a note
// (Arman 2026-10-20: "our UI CANNOT LIE"): an empty <info>, an <info> holding text, and the same
// two for an unknown <foo>, pasted into a new note's Write, then seen in Write, Split and Read.
// Evidence: common-docs projects/rich-content-unification/evidence/xml-tags-visible.md.
// Headless, admin@admin.com via the login form (credentials from .env.local, never printed).
// Creates its own note only and moves it to Trash by id at the end (content checked first).
//   node scripts/xml-tags-visible-walk.mjs <outDir> [origin] [width]
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
const OUT = process.argv[2] ?? "/tmp/xmltags";
const ORIGIN = process.argv[3] ?? "https://www.aimatrx.com";
const WIDTH = Number(process.argv[4] ?? 1440);
const PHONE = WIDTH < 768;
const TAG = PHONE ? "m" : "d";
mkdirSync(OUT, { recursive: true });
const results = { width: WIDTH };
const created = [];

const NOTE = [
  "XMLTAGS walk. Here is the information I got about them:",
  "",
  "<info>",
  "",
  "</info>",
  "",
  "**Technology Evaluation one**",
  "",
  "<info>",
  "test",
  "</info>",
  "",
  "**Technology Evaluation two**",
  "",
  "<foo>",
  "",
  "</foo>",
  "",
  "<foo>",
  "foo body",
  "</foo>",
  "",
  "The end.",
].join("\n");

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
/** Every visible XML section on the page: its tag label, whether it says empty, and its text. */
const sections = () => page.evaluate(() =>
  [...document.querySelectorAll("[data-xml-section]")].filter((el) => el.getBoundingClientRect().height > 0).map((el) => ({
    tag: el.getAttribute("data-xml-section"),
    label: el.querySelector("[data-testid='xml-section-tag']")?.textContent ?? null,
    empty: !!el.querySelector("[data-xml-section-empty]"),
    text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80),
    inEditor: !!el.closest(".ProseMirror"),
    inSource: !!el.closest(".cm-editor"),
  })),
);
const scrollTo = async (sel) => { await page.locator(sel).first().scrollIntoViewIfNeeded().catch(() => {}); await sleep(600); };

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
  await sleep(6000);
  await page.keyboard.press("Escape").catch(() => {});
  results.write = await sections();
  // An empty section is one compact row: its height, and what its inside holds.
  results.writeEmptyRows = await page.evaluate(() =>
    [...document.querySelectorAll(".ProseMirror [data-xml-section][data-empty]")].map((el) => ({
      tag: el.getAttribute("data-xml-section"),
      height: Math.round(el.getBoundingClientRect().height),
      body: (el.querySelector(".rich-editor-xml-section-body")?.innerHTML ?? "").slice(0, 300),
    })));
  await scrollTo("[data-xml-section='info']");
  await shot("01-write");
  await mode("Plain");
  results.storedHasAllTags = await page.locator("textarea").first().inputValue().then((v) => ({
    info: (v.match(/<info>/g) || []).length, infoClose: (v.match(/<\/info>/g) || []).length,
    foo: (v.match(/<foo>/g) || []).length, fooClose: (v.match(/<\/foo>/g) || []).length, test: v.includes("test"),
  }));
  if (!PHONE) {
    await mode("Split").catch((e) => { results.splitError = e.message.slice(0, 120); });
    await sleep(2000);
    results.split = (await sections()).filter((s) => !s.inSource);
    await scrollTo("[data-xml-section='info']");
    await shot("02-split");
  }
  if (PHONE) {
    // The phone header is an Edit/Read switch: name what it offers, then take Read.
    results.phoneModes = await page.evaluate(() =>
      [...document.querySelectorAll("header button, [role='radiogroup'] [role='radio']")].map((b) => b.getAttribute("aria-label") || b.textContent.trim()).filter(Boolean).slice(0, 12));
    const read = page.getByRole("button", { name: /^(Read|Reading|Preview|View)/i }).or(page.getByRole("radio", { name: /^(Read|Reading|Preview)/i })).first();
    await read.tap().catch(() => read.click());
  } else {
    await mode("Read");
  }
  await sleep(2000);
  results.read = await sections();
  await scrollTo("[data-xml-section='info']");
  await shot("03-read");
  await scrollTo("[data-xml-section='foo']");
  await shot("04-read-foo");
} catch (e) {
  results.error = e.message.slice(0, 300);
  await shot("error");
}

// The chat: the person's own message (their bubble) and the answer, through the Test Reply agent
// (cheap test agent; never General Chat). `CHAT_AGENT` overrides it.
if (process.env.XMLTAGS_CHAT !== "0") {
  try {
    const agent = process.env.CHAT_AGENT ?? "8a4b7c8e-144f-4391-b5f0-3d2cd2ecee0f";
    await page.goto(`${ORIGIN}/chat/a/${agent}`, { waitUntil: "domcontentloaded", timeout: 120000 });
    const box = page.locator("textarea").first();
    await box.waitFor({ timeout: 90000 });
    await sleep(3000);
    await box.fill(`XMLTAGS chat. Repeat this message back exactly.\n\n<info>\n\n</info>\n\n<plan>\nship it\n</plan>\n\n<foo>\nfoo body\n</foo>`);
    const send = page.getByRole("button", { name: /^send/i }).first();
    if (await send.isVisible().catch(() => false)) await (PHONE ? send.tap() : send.click());
    else await box.press("Enter");
    await sleep(20000);
    results.chat = await page.evaluate(() =>
      [...document.querySelectorAll("[data-xml-section]")].filter((el) => el.getBoundingClientRect().height > 0).map((el) => ({
        tag: el.getAttribute("data-xml-section"),
        shared: el.hasAttribute("data-xml-section-container"),
        empty: !!el.querySelector("[data-xml-section-empty]"),
        inUserBubble: !!el.closest("[data-message-role='user'], [data-role='user'], .user-message, [data-user-message]"),
      })));
    results.chatRawTagText = await page.evaluate(() => /<info>|<\/plan>|<foo>/.test(document.querySelector("main")?.innerText ?? ""));
    results.chatUrl = page.url();
    const first = page.locator("[data-xml-section='info']").first();
    await first.scrollIntoViewIfNeeded().catch(() => {});
    await sleep(800);
    await shot("05-chat");
  } catch (e) {
    results.chatError = e.message.slice(0, 300);
    await shot("chat-error");
  }
}

// Cleanup: only this walk's own note, content checked.
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
await sb.auth.signInWithPassword({ email: env.AI_ADMIN_USERNAME, password: env.AI_ADMIN_PASSWORD });
const trashed = [];
for (const id of created) {
  const { data } = await sb.schema("workbench").from("notes").select("id,label,content").eq("id", id).maybeSingle();
  if (!data || (!/XMLTAGS walk/.test(`${data.label} ${data.content}`) && data.label !== "New Note")) continue;
  const { error } = await sb.schema("workbench").from("notes").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  trashed.push({ id, label: data.label, ok: !error, error: error?.message });
}
results.created = created;
results.trashed = trashed;
console.log("RESULTS", JSON.stringify(results, null, 1));
writeFileSync(`${OUT}/${TAG}-results.json`, JSON.stringify(results, null, 1));
await browser.close();
