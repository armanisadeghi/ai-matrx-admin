// Steps for scripts/editor-review-fixes-walk.mjs — the 2026-10-19 review's editor / notes / Controls
// findings on live: #6 #7 #8 #9 #10 #12-#18 #24 (desktop) and #17 #18 (375px).
const CHART = '```chart\n{"type": "pie", "title": "ERF visits", "data": [{"label": "A", "value": 3}, {"label": "B", "value": 5}]}\n```';
const QUIZ = '```quiz\n{"quiz_title": "ERF Quiz", "multiple_choice": [{"id": 1, "question": "Capital of France?", "options": ["Paris", "Rome", "Oslo"], "correctAnswer": 0, "explanation": "Paris."}, {"id": 2, "question": "2+2?", "options": ["3", "4", "5"], "correctAnswer": 1, "explanation": "Four."}]}\n```';
const COMPARISON = '```comparison\n{"title": "Phones", "items": ["A", "B"], "criteria": [{"name": "Price", "values": ["$1", "$2"]}]}\n```';
const MERMAID = '```mermaid\ngraph TD\n  A-->B\n```';
const FLASH = '<flashcards>\nFront: Capital of France\nBack: Paris\n\nFront: Capital of Italy\nBack: Rome\n</flashcards>';
const TIMELINE = '<timeline>\n### Plan\n\n**Phase 1**\n- **Kickoff** (Jan 5)\n  Everyone meets.\n- **Architecture spike** (Feb 1)\n</timeline>';
const SVG = '```svg\n<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60"><rect width="120" height="60" fill="#6366f1"/></svg>\n```';
const typeOf = (txt) => (txt.match(/"type":\s*"(\w+)"/) || [])[1];
const ed = (page) => page.locator(".ProseMirror").first();
const choice = (page, name) => page.getByRole("radio", { name: new RegExp(`^${name}$`) }).or(page.getByRole("button", { name: new RegExp(`^${name}$`) })).first();

async function desktop({ page, shot, pasteMarkdown, plainText, toWrite, results, sleep }) {
  await pasteMarkdown(`# ERF review note\n\nIntro line.\n\n${CHART}\n\n${QUIZ}\n\n${COMPARISON}\n\n${MERMAID}\n\n${FLASH}\n\n${TIMELINE}\n\n${SVG}\n\nTail line.\n`);
  await sleep(4000);
  await shot("01-pasted");
  // #6 comparison renders (no code box holding "criteria")
  results.comparisonIsCode = await page.evaluate(() => [...document.querySelectorAll("[data-island-face='code'], .cm-editor")].some((n) => n.textContent.includes("criteria")));
  // Which event revealed the page assistant's dock, if any (#10).
  await page.evaluate(() => {
    window.__erfDock = null; let last = [];
    const note = (e) => { const t = e.target; last.unshift(`${e.type}:${t?.className?.toString?.().slice(0, 60) ?? t?.nodeName}`); last = last.slice(0, 4); };
    document.addEventListener("scroll", note, true); document.addEventListener("pointermove", note, true);
    new MutationObserver(() => { if (!window.__erfDock && document.querySelector(".ambient-assistant-dock")) window.__erfDock = [...last]; }).observe(document.body, { childList: true, subtree: true });
  });
  // #7 the reviewer's case: Controls → Bar, Plain, back to Write, ⌘Z → Pie
  await ed(page).getByRole("button", { name: /^Controls$/ }).first().click(); await sleep(1200);
  await choice(page, "Bar").click(); await sleep(1500);
  await page.keyboard.press("Escape"); await sleep(800);
  results.beforeModeUndo = typeOf(await plainText()); await toWrite();
  await page.locator(".ProseMirror p").first().click(); await sleep(400);
  await page.keyboard.press("Meta+z"); await sleep(1800);
  results.afterModeSwitchCmdZ = typeOf(await plainText()); // want "pie"
  await toWrite();
  // #7 the toolbar's Undo after a mode switch: Bar again, Plain, Write, toolbar Undo → Pie
  await ed(page).getByRole("button", { name: /^Controls$/ }).first().click(); await sleep(1200);
  await choice(page, "Bar").click(); await sleep(1500);
  await page.keyboard.press("Escape"); await sleep(800);
  results.beforeToolbarUndo = typeOf(await plainText()); await toWrite();
  await page.getByRole("button", { name: /^Undo/ }).first().click(); await sleep(1800);
  results.afterModeSwitchToolbarUndo = typeOf(await plainText()); // want "pie"
  await toWrite();
  // #8 ⌘Z inside Controls: Bar, Line, ⌘Z → Bar
  await ed(page).getByRole("button", { name: /^Controls$/ }).first().click(); await sleep(1200);
  await choice(page, "Bar").click(); await sleep(1200);
  await choice(page, "Line").click(); await sleep(1200);
  await page.keyboard.press("Meta+z"); await sleep(1500);
  await shot("02-cmdz-in-controls");
  await page.keyboard.press("Escape"); await sleep(800);
  results.afterCmdZInControls = typeOf(await plainText()); // want "bar"
  await toWrite();
  // #9 quiz Controls popover vs the note toolbar
  const quizCtl = page.locator("[data-island-type='quiz'], [data-island-face='render']").filter({ hasText: "ERF Quiz" }).getByRole("button", { name: /^Controls$/ }).first();
  if (await quizCtl.count()) {
    await quizCtl.scrollIntoViewIfNeeded(); await quizCtl.click(); await sleep(1500);
    await shot("03-quiz-controls");
    results.quizPopover = await page.evaluate(() => {
      const pop = document.querySelector("[data-collision-boundary], [data-radix-popper-content-wrapper]")?.getBoundingClientRect();
      const tb = [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Write")?.getBoundingClientRect();
      return { popTop: pop?.top, toolbarBottom: tb?.bottom, boundary: !!document.querySelector("[data-collision-boundary]") };
    });
    await page.keyboard.press("Escape"); await sleep(600);
  } else results.quizPopover = "no quiz Controls found";
  // #10 the dock: click into blocks, rest near the bottom, scroll the editor
  await ed(page).locator("p").last().scrollIntoViewIfNeeded();
  await ed(page).locator("p").last().click(); await sleep(300);
  await page.mouse.move(700, 880); await sleep(1500);
  await page.mouse.wheel(0, 600); await sleep(1500);
  await shot("04-after-click-and-scroll");
  results.dockShown = await page.evaluate(() => [...document.querySelectorAll(".ambient-assistant-dock")].length);
  results.dockRevealedBy = await page.evaluate(() => window.__erfDock);
  // block screenshots for #12-#15
  for (const [name, text] of [["mermaid", "graph"], ["flashcards", "Capital of Italy"], ["timeline", "Kickoff"], ["svg", "svg"], ["comparison", "Phones"], ["quiz", "ERF Quiz"]]) {
    const el = (name === "mermaid" || name === "svg" ? page.locator(`[data-island-type='${name}']`) : page.locator("[data-island-face='render']").filter({ hasText: text })).first();
    if (await el.count()) { await el.scrollIntoViewIfNeeded(); await sleep(800); await el.screenshot({ path: `${process.argv[2]}/blk-${name}.png` }).catch(() => {}); }
  }
  results.svgFrame = await page.evaluate(() => { const f = [...document.querySelectorAll("[data-island-face='render'] iframe")].find((i) => /svg|illustration/i.test(i.title || "")); const r = f?.getBoundingClientRect(); return r ? { w: Math.round(r.width), h: Math.round(r.height) } : null; });
  results.timelineEcho = await page.evaluate(() => document.body.innerText.split("Architecture spike").length - 1);
}

async function phone({ page, shot, pasteMarkdown, results, sleep }) {
  // The phone opens Plain; Write is the rich editor.
  const write = page.getByRole("button", { name: /^Write$/ }).first();
  if (await write.count()) { await write.tap().catch(() => write.click()); await sleep(2000); }
  await pasteMarkdown(`# ERF phone note\n\n**bold** line\n\n${QUIZ}\n\nTail.\n`);
  await sleep(1500);
  await shot("01-pasted-chip");
  results.chip = await page.evaluate(() => {
    const chip = document.querySelector("[data-testid='paste-converted-notice']")?.getBoundingClientRect();
    const title = [...document.querySelectorAll("h1, [data-note-title], header *")].find((n) => /ERF phone/.test(n.textContent || "") && n.children.length === 0)?.getBoundingClientRect();
    return { chip: chip && { top: chip.top, bottom: chip.bottom, left: chip.left }, title: title && { top: title.top, bottom: title.bottom, right: title.right } };
  });
  await sleep(9000);
  const quiz = page.locator("[data-island-face='render']").filter({ hasText: "ERF Quiz" }).first();
  if (await quiz.count()) { await quiz.scrollIntoViewIfNeeded(); await sleep(800); await quiz.screenshot({ path: `${process.argv[2]}/m-blk-quiz.png` }).catch(() => {}); }
  results.quizTitleBox = await page.evaluate(() => { const t = [...document.querySelectorAll("span")].find((s) => s.textContent.trim() === "ERF Quiz"); const r = t?.getBoundingClientRect(); return r ? { w: Math.round(r.width), h: Math.round(r.height) } : null; });
}

export async function run(ctx) {
  return ctx.PHONE ? phone(ctx) : desktop(ctx);
}
