// Steps for scripts/editor-review-fixes-walk.mjs (one file per scenario keeps the harness short).
const CHART = '```chart\n{"type": "pie", "title": "ERF visits", "data": [{"label": "A", "value": 3}, {"label": "B", "value": 5}]}\n```';
const QUIZ = '```quiz\n{"title": "ERF Quiz", "questions": [{"question": "Capital of France?", "options": ["Paris", "Rome", "Oslo"], "correctAnswer": 0}, {"question": "2+2?", "options": ["3", "4"], "correctAnswer": 1}]}\n```';
const COMPARISON = '```comparison\n{"title": "Phones", "items": [{"name": "A"}, {"name": "B"}], "criteria": [{"name": "Price", "values": ["$1", "$2"]}]}\n```';
export async function run({ page, shot, pasteMarkdown, plainText, toWrite, results, sleep, PHONE }) {
  await pasteMarkdown(`# ERF review note\n\nIntro line.\n\n${CHART}\n\n${QUIZ}\n\n${COMPARISON}\n\nTail line.\n`);
  await sleep(3000);
  await shot("01-pasted");
  results.blockButtons = await page.locator(".ProseMirror").first().evaluate((el) => [...el.querySelectorAll("button")].map((b) => b.getAttribute("aria-label") || b.title || b.innerText.trim()).slice(0, 40));
  results.controlsButtons = await page.locator(".ProseMirror").first().getByRole("button", { name: /controls/i }).count();
  results.comparisonIsCode = await page.evaluate(() => !!document.querySelector('[data-language="comparison"], .cm-editor') && document.body.innerText.includes('"criteria"'));
  // Chart Controls → Bar
  const ctl = page.locator(".ProseMirror").first().getByRole("button", { name: /controls/i }).first();
  await ctl.click(); await sleep(1500); await shot("02-chart-controls");
  const bar = page.getByRole("radio", { name: /^Bar$/ }).or(page.getByRole("button", { name: /^Bar$/ })).first();
  await bar.click(); await sleep(1500);
  // ⌘Z while Controls is open
  const line = page.getByRole("radio", { name: /^Line$/ }).or(page.getByRole("button", { name: /^Line$/ })).first();
  await line.click(); await sleep(1200);
  await page.keyboard.press("Meta+z"); await sleep(1500);
  await shot("03-after-cmdz-in-controls");
  await page.keyboard.press("Escape"); await sleep(800);
  let txt = await plainText();
  results.afterCmdZInControls = (txt.match(/"type":\s*"(\w+)"/) || [])[1];
  await toWrite();
  // undo after mode switch
  const ctl2 = page.locator(".ProseMirror").first().getByRole("button", { name: /controls/i }).first();
  await ctl2.click(); await sleep(1200);
  await page.getByRole("radio", { name: /^Pie$/ }).or(page.getByRole("button", { name: /^Pie$/ })).first().click(); await sleep(800);
  await page.getByRole("radio", { name: /^Bar$/ }).or(page.getByRole("button", { name: /^Bar$/ })).first().click(); await sleep(1500);
  await page.keyboard.press("Escape"); await sleep(1000);
  txt = await plainText();
  results.beforeUndo = (txt.match(/"type":\s*"(\w+)"/) || [])[1];
  await toWrite();
  await page.locator(".ProseMirror p").first().click(); await sleep(400);
  await page.keyboard.press("Meta+z"); await sleep(1500);
  txt = await plainText();
  results.afterModeSwitchUndo = (txt.match(/"type":\s*"(\w+)"/) || [])[1];
  await toWrite();
  await shot("04-after-mode-undo");
  // quiz controls placement
  const ctls = page.locator(".ProseMirror").first().getByRole("button", { name: /controls/i });
  results.controlsCount = await ctls.count();
  if (results.controlsCount > 1) {
    await ctls.nth(1).scrollIntoViewIfNeeded(); await ctls.nth(1).click(); await sleep(1500);
    await shot("05-quiz-controls");
    results.popover = await page.evaluate(() => {
      const pop = document.querySelector('[data-radix-popper-content-wrapper]');
      const tb = document.querySelector('[data-note-toolbar], [role="toolbar"]');
      return { pop: pop?.getBoundingClientRect().toJSON(), toolbar: tb?.getBoundingClientRect().toJSON() };
    });
    await page.keyboard.press("Escape"); await sleep(600);
  }
  // floating composer
  await page.locator(".ProseMirror").first().click({ position: { x: 40, y: 400 } }).catch(() => {});
  await sleep(2000);
  await shot("06-click-in-block");
  results.typeYourMessage = await page.evaluate(() => [...document.querySelectorAll("textarea, [contenteditable], input")].filter((e) => /Type your message/i.test(e.getAttribute("placeholder") || e.getAttribute("data-placeholder") || "")).map((e) => { const r = e.getBoundingClientRect(); return { tag: e.tagName, x: r.x, y: r.y, w: r.width, h: r.height, cls: e.className.slice(0, 120), path: (() => { let s = []; let n = e; for (let i = 0; i < 12 && n; i++) { s.push(n.tagName + (n.id ? "#" + n.id : "") + (n.getAttribute && n.getAttribute("data-slot") ? "[" + n.getAttribute("data-slot") + "]" : "") + (n.className && typeof n.className === "string" ? "." + n.className.split(" ").slice(0, 3).join(".") : "")); n = n.parentElement; } return s; })() }; }));
}
