// scripts/chat-answer-comment-probe.mjs — live diagnosis/proof of right-click Comment on a CHAT
// ANSWER across repeated opens (review 5, G4). Headless, admin@admin.com via the login form
// (credentials from .env.local, never printed). Read-only: it opens menus and presses Esc; it never
// posts a comment.
//   node scripts/chat-answer-comment-probe.mjs <outDir> <conversationId> [origin] [sequence]
// sequence: letters, s = select then right-click, p = plain right-click (default "spsps").
import { chromium } from "playwright";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { signIn, sleep } from "./lib/seat-browser.mjs";

const ROOT = resolve(new URL(".", import.meta.url).pathname, "..");
const env = Object.fromEntries(
  readFileSync(resolve(ROOT, ".env.local"), "utf8").split("\n").map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")]),
);
const OUT = process.argv[2] ?? "/tmp/comment-probe";
const CONV = process.argv[3];
const ORIGIN = process.argv[4] ?? "https://www.aimatrx.com";
const SEQ = (process.argv[5] ?? "spsps").split("");
const RUNS = Number(process.env.RUNS ?? 1);
if (!CONV) throw new Error("conversation id required");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
await signIn(page, ORIGIN, env.AI_ADMIN_USERNAME, env.AI_ADMIN_PASSWORD, "admin");
const all = [];
for (let run = 0; run < RUNS; run++) {
  await page.goto(`${ORIGIN}/chat/${CONV}`, { waitUntil: "domcontentloaded", timeout: 120000 });
  const para = page.locator("[data-record-annotations] [data-message-content] p", { hasText: process.env.PARA ?? "Green tea is" }).first();
  await para.waitFor({ timeout: 90000 });
  await sleep(5000);
  await page.evaluate(() => {
    const log = (window.__probe = []);
    const wrap = () => document.querySelector("[data-record-annotations]");
    let n = 0;
    const tag = (el) => (el ? (el.__probeId ??= ++n) : null);
    for (const type of ["mousedown", "contextmenu"]) {
      document.addEventListener(type, (e) => {
        if (type === "mousedown" && e.button !== 2) return;
        const s = window.getSelection();
        log.push({ type, sel: s?.toString().slice(0, 30) ?? null, collapsed: s?.isCollapsed ?? null, wrapper: tag(wrap()), connected: wrap()?.isConnected ?? null });
      }, true);
    }
  });
  const steps = [];
  for (const [i, step] of SEQ.entries()) {
    await para.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await sleep(400);
    const box = await para.boundingBox();
    if (step === "s") {
      await para.click({ clickCount: 3 });
      await sleep(300);
    } else if (step === "d") {
      // A drag across the first words, as a person selects.
      await page.mouse.move(box.x + 2, box.y + 8);
      await page.mouse.down();
      await page.mouse.move(box.x + 120, box.y + 8, { steps: 8 });
      await page.mouse.move(box.x + 220, box.y + 8, { steps: 8 });
      await page.mouse.up();
      await sleep(300);
    } else {
      await page.mouse.click(box.x + box.width + 40 > 1400 ? box.x - 30 : box.x + box.width + 40, box.y + 5);
      await page.evaluate(() => window.getSelection()?.removeAllRanges());
      await sleep(300);
    }
    const before = await page.evaluate(() => window.getSelection()?.toString().slice(0, 30));
    const rangeInfo = await page.evaluate(() => {
      const s = window.getSelection();
      if (!s || s.rangeCount === 0) return null;
      const r = s.getRangeAt(0);
      const d = (n) => (n.nodeType === 3 ? `#text(${(n.textContent || "").slice(0, 15)})` : `<${n.nodeName.toLowerCase()} ${[...(n.attributes || [])].map((a) => a.name).join(" ")}>`);
      const endEl = r.endContainer.nodeType === 1 ? r.endContainer : r.endContainer.parentElement;
      return { start: d(r.startContainer), so: r.startOffset, end: d(r.endContainer), eo: r.endOffset, text: s.toString().length, tail: JSON.stringify(s.toString().slice(-24)), endHtml: endEl?.outerHTML.slice(0, 300), endParent: endEl?.parentElement?.outerHTML.slice(0, 200) };
    });
    const at = step === "d" ? { x: box.x + 100, y: box.y + 8 } : { x: box.x + 40, y: box.y + box.height / 2 };
    await page.mouse.click(at.x, at.y, { button: "right" });
    await sleep(900);
    const menu = await page.evaluate(() => {
      const m = document.querySelector('[role="menu"]');
      if (!m) return null;
      const items = [...m.querySelectorAll('[role="menuitem"]')].map((x) => (x.textContent || "").trim().slice(0, 40));
      return { heading: (m.textContent || "").trim().slice(0, 40), items: items.slice(0, 12), comment: items.some((t) => /^Comment\b/.test(t)) };
    });
    await page.screenshot({ path: `${OUT}/run${run}-${i}-${step}.png` });
    steps.push({ step, before, rangeInfo, comment: menu?.comment ?? null, heading: menu?.heading ?? null, items: menu?.items ?? null });
    await page.keyboard.press("Escape");
    await sleep(800);
  }
  const probe = await page.evaluate(() => window.__probe);
  all.push({ run, steps, probe });
  console.log(`run ${run}:`, steps.map((s) => `${s.step}:${s.comment === null ? "no menu" : s.comment ? "Present" : "Missing"}`).join(" "));
}
writeFileSync(`${OUT}/result.json`, JSON.stringify(all, null, 2));
await browser.close();
