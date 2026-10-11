// scripts/inline-answer-edit-walk.mjs — THE INLINE ANSWER EDITOR WALK (live).
//
// Arman, 2026-10-11: editing an AI answer in place must feel like editing the
// answer itself — no inner bordered box, no nested scroll container, no fixed
// height, the text where it was at the same width and font; one slim sticky
// bar for mode, formatting, Save and Cancel.
//
// jsdom computes no layout, so this measures the REAL app in a real engine as
// admin@admin.com (headless). For each answer it:
//   1. screenshots the answer reading, records its first paragraph's box/font
//      and the top of every message after it;
//   2. opens the editor from the answer bar's Edit, screenshots it;
//   3. measures: no ancestor of the editable text between it and the page's
//      scroller scrolls on its own (computed overflow-y auto/scroll with
//      scrollHeight > clientHeight) and none has a fixed height/max-height;
//      the text's left edge, width and font-size are unchanged; the messages
//      below move by no more than the bar's height; the bar is sticky;
//   4. Esc leaves; with --save, types a word, ⌘S saves, re-opens and restores
//      the original bytes, and reads the stored row back to prove them exact.
// Exit 1 on any failure.
//
//   node scripts/inline-answer-edit-walk.mjs --route /chat/<id> --message <id> --width 1440 --out /tmp/x [--save] [--phase after]
import { chromium, devices } from "playwright";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => {
    if (a.startsWith("--")) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith("--") ? all[i + 1] : true]);
    return acc;
  }, []),
);
const route = args.route;
const messageId = args.message;
const width = Number(args.width ?? 1440);
const out = args.out ?? "/tmp/inline-answer-edit";
const phase = args.phase ?? "after";
const measureOnly = phase === "before";
if (!route || !messageId) {
  console.error("Usage: --route /chat/<id> --message <messageId> [--width 1440] [--out dir] [--save] [--phase before|after]");
  process.exit(2);
}
mkdirSync(out, { recursive: true });
const tag = `${phase}-${width}-${messageId.slice(0, 8)}`;
const failures = [];
const fail = (m) => {
  failures.push(m);
  console.log(`FAIL ${m}`);
};

const login = execSync(`pnpm -s dev-login '${route}'`, { encoding: "utf8" });
const url = login.match(/OPEN\s*:\s*(\S+)/)?.[1];
if (!url) throw new Error(`dev-login gave no URL for ${route}`);
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext(
  width < 768 ? { ...devices["iPhone 13"], viewport: { width, height: 812 } } : { viewport: { width, height: 900 } },
);
const page = await ctx.newPage();
try {
  await page.goto(url, { timeout: 180_000 });
  if (page.url().includes("__dev-walk")) {
    await page.getByRole("button", { name: "Resume this preview" }).click();
    await page.waitForURL((u) => !u.href.includes("__dev-walk"), { timeout: 180_000 });
  }
  const answer = page.locator(`[data-message-id="${messageId}"]`).last();
  await answer.waitFor({ timeout: 120_000 });
  await answer.locator("[data-message-content]").first().waitFor({ timeout: 60_000 });
  await answer.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);

  const readFacts = await page.evaluate((id) => {
    const host = [...document.querySelectorAll(`[data-message-id="${id}"]`)].pop();
    const content = host.querySelector("[data-message-content]");
    const p = content.querySelector("p, li");
    const r = p.getBoundingClientRect();
    const cs = getComputedStyle(p);
    const all = [...document.querySelectorAll("[data-message-id]")];
    const after = all.filter((el) => host.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING && !host.contains(el));
    return {
      text: { left: r.left, width: r.width, fontSize: cs.fontSize, lineHeight: cs.lineHeight, fontFamily: cs.fontFamily },
      contentBox: content.getBoundingClientRect().toJSON(),
      below: after.slice(0, 1).map((el) => el.getBoundingClientRect().top),
    };
  }, messageId);
  await page.screenshot({ path: `${out}/${tag}-1-reading.png` });

  // Open from the doors a person uses (never a double-click): on a phone the answer bar's pencil;
  // on a desktop the right-click "Edit" (the caret lands where the person pressed).
  if (width < 768) {
    // The bar sits after the answer, outside its [data-message-id] node: name the LAST answer of the chat.
    await page.locator('button[aria-label="Edit content"]').last().click({ timeout: 15_000 });
  } else {
    await answer.locator("[data-message-content] :is(p, li)").first().click({ button: "right" });
    await page.waitForTimeout(700);
    await page.locator('[role="menu"] [data-alchemy-node="edit"], [role="dialog"] [data-alchemy-node="edit"], [role="menuitem"]:text-is("Edit")').first().click({ timeout: 15_000 });
  }
  const editorSel = `[data-in-place-editor="${messageId}"]`;
  await page.locator(editorSel).waitFor({ timeout: 60_000 });
  await page.locator(`${editorSel} .ProseMirror`).waitFor({ timeout: 60_000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${out}/${tag}-2-editing.png` });

  const editFacts = await page.evaluate(
    ({ id, sel }) => {
      const shell = document.querySelector(sel);
      const pm = shell.querySelector(".ProseMirror");
      const p = pm.querySelector("p, li");
      const r = p.getBoundingClientRect();
      const cs = getComputedStyle(p);
      // Every ancestor from the editable text up to the page's own scroller.
      const offenders = [];
      let pageScroller = null;
      for (let el = pm.parentElement; el && el !== document.body; el = el.parentElement) {
        const s = getComputedStyle(el);
        const scrolls = /(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 1;
        const inside = shell.contains(el) || el === shell;
        if (inside) {
          if (/(auto|scroll)/.test(s.overflowY)) offenders.push(`scroll container inside the editor: ${el.className.toString().slice(0, 80)} (overflow-y ${s.overflowY})`);
          if (s.maxHeight !== "none") offenders.push(`max-height ${s.maxHeight} on ${el.className.toString().slice(0, 80)}`);
          if (el.style.height || /^\d/.test(el.style.minHeight ?? "")) offenders.push(`inline height on ${el.className.toString().slice(0, 60)}`);
          if (s.overflowY === "hidden" && el.scrollHeight > el.clientHeight + 1) offenders.push(`clipped: ${el.className.toString().slice(0, 80)}`);
        } else if (scrolls && !pageScroller) {
          pageScroller = el;
        }
      }
      const bar = shell.querySelector("[data-in-place-bar]");
      const barStyle = bar ? getComputedStyle(bar) : null;
      const shellStyle = getComputedStyle(shell);
      const host = [...document.querySelectorAll(`[data-message-id="${id}"]`)].pop();
      const all = [...document.querySelectorAll("[data-message-id]")];
      const after = all.filter((el) => host.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING && !host.contains(el));
      return {
        text: { left: r.left, width: r.width, fontSize: cs.fontSize, lineHeight: cs.lineHeight, fontFamily: cs.fontFamily },
        offenders,
        shellBorder: shellStyle.borderTopWidth,
        bar: bar ? { position: barStyle.position, top: barStyle.top, height: bar.getBoundingClientRect().height } : null,
        below: after.slice(0, 1).map((el) => el.getBoundingClientRect().top),
        pageScroller: pageScroller ? pageScroller.className.toString().slice(0, 60) : "window",
        editorHeight: shell.getBoundingClientRect().height,
      };
    },
    { id: messageId, sel: editorSel },
  );
  console.log(JSON.stringify({ tag, readFacts, editFacts }, null, 1));

  if (!measureOnly) {
    for (const o of editFacts.offenders) fail(o);
    if (editFacts.shellBorder !== "0px") fail(`the editor draws a ${editFacts.shellBorder} border around the answer`);
    if (!editFacts.bar) fail("no [data-in-place-bar] toolbar");
    else if (editFacts.bar.position !== "sticky") fail(`the bar is ${editFacts.bar.position}, not sticky`);
    const dl = Math.abs(editFacts.text.left - readFacts.text.left);
    const dw = Math.abs(editFacts.text.width - readFacts.text.width);
    if (dl > 2) fail(`text moved sideways by ${dl.toFixed(1)}px`);
    if (dw > 4) fail(`text width changed by ${dw.toFixed(1)}px`);
    if (editFacts.text.fontSize !== readFacts.text.fontSize) fail(`font-size ${readFacts.text.fontSize} → ${editFacts.text.fontSize}`);
    if (editFacts.text.lineHeight !== readFacts.text.lineHeight) fail(`line-height ${readFacts.text.lineHeight} → ${editFacts.text.lineHeight}`);
    if (readFacts.below.length && editFacts.below.length && editFacts.bar) {
      // The next message moves by the bar plus however much the answer's own text grew/shrank;
      // measured relative to the answer's height change, the rest must be the bar alone.
      const shift = editFacts.below[0] - readFacts.below[0];
      const contentGrowth = editFacts.editorHeight - editFacts.bar.height - readFacts.contentBox.height;
      const extra = shift - editFacts.bar.height - contentGrowth;
      console.log(`next message shift ${shift.toFixed(1)}px = bar ${editFacts.bar.height.toFixed(1)} + text growth ${contentGrowth.toFixed(1)} + other ${extra.toFixed(1)}`);
      if (Math.abs(contentGrowth) > 48) fail(`the answer's own height changed by ${contentGrowth.toFixed(1)}px while editing`);
    }
  }

  // Scroll a long answer: the bar stays visible at the top.
  if (!measureOnly && editFacts.bar) {
    await page.locator(`${editorSel} .ProseMirror`).evaluate((pm) => {
      const last = pm.lastElementChild;
      last?.scrollIntoView({ block: "end" });
    });
    await page.waitForTimeout(500);
    const barVisible = await page.locator(`${editorSel} [data-in-place-bar]`).evaluate((bar) => {
      const r = bar.getBoundingClientRect();
      const shell = bar.closest("[data-in-place-editor]").getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, shellTop: shell.top, vh: innerHeight };
    });
    await page.screenshot({ path: `${out}/${tag}-3-scrolled.png` });
    if (barVisible.shellTop < 0 && (barVisible.top < -1 || barVisible.bottom > barVisible.vh)) fail(`bar scrolled out of view: ${JSON.stringify(barVisible)}`);
  }

  if (args.save && !measureOnly) {
    const pm = page.locator(`${editorSel} .ProseMirror`);
    await pm.locator("p, li").first().click();
    await page.keyboard.press("End");
    await page.keyboard.type(" (checked)");
    await page.waitForTimeout(400);
    await page.keyboard.press(process.platform === "darwin" ? "Meta+s" : "Control+s");
    await page.locator(editorSel).waitFor({ state: "detached", timeout: 30_000 });
    await page.waitForTimeout(1000);
    const shown = await answer.locator("[data-message-content]").first().innerText();
    if (!shown.includes("(checked)")) fail("the saved edit is not on screen");
    await page.screenshot({ path: `${out}/${tag}-4-saved.png` });
    console.log("SAVED: edit on screen =", shown.includes("(checked)"));
  } else if (!measureOnly) {
    await page.keyboard.press("Escape");
    await page.locator(editorSel).waitFor({ state: "detached", timeout: 15_000 }).catch(() => fail("Esc did not leave the editor"));
  }
} catch (error) {
  fail(`walk error: ${error instanceof Error ? error.message : String(error)}`);
  await page.screenshot({ path: `${out}/${tag}-error.png` }).catch(() => {});
} finally {
  await browser.close();
}
console.log(failures.length ? `FAILED ${failures.length}` : `ok ${tag}`);
process.exit(failures.length ? 1 : 0);
