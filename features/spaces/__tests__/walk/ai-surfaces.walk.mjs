// PARITY M1, M2, M4 (Notion AI surfaces) on a new page, then Trash. Real AI runs (the spaces mandates' own agents).
//   SHOTS=<dir> MATRX_PREVIEW_SESSION=<lane> SPACES_WALK_ORG="<org name>" node features/spaces/__tests__/walk/ai-surfaces.walk.mjs
// M1: Space on an empty line opens Ask AI; a typed ask streams an answer; Insert below adds it as blocks.
// M2: a selected line > Ask AI > Make shorter; Replace selection swaps the line; a second run's Discard leaves the page as it was.
// M4: Ask AI about this page > a question about a fact on the page > the side chat answers with that fact.
import { chromium, login, newPage, resumeIfPaused, trashPage, shot } from "./lib.mjs";

const OUT = process.env.SHOTS ?? "/tmp";
const member = !!process.env.MEMBER;
const r = {};
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("[pageerror]", e.message.slice(0, 300)));
await login(page, "/spaces", member);
await resumeIfPaused(page);
const id = await newPage(page);
console.log("page", id);
const paras = page.locator(".bn-editor .bn-block-content[data-content-type=paragraph]");
const lines = page.locator(".bn-editor .bn-block-content[data-content-type=paragraph] .bn-inline-content");
const text = () => page.locator(".bn-editor").innerText();
const box = page.locator(".spaces-ai");
const LONG = "The launch party is on Friday at 6pm in Harbor Hall, and everyone on the team is warmly invited to come along, bring a friend, and enjoy the food and music";

await page.locator(".bn-editor .bn-inline-content").last().click();
await page.keyboard.type(LONG, { delay: 4 });
await page.keyboard.press("Enter");
await page.waitForTimeout(400);

// M1 — Space on the empty line.
await page.keyboard.press(" ");
r.m1Opens = await box.getByRole("textbox", { name: "Ask AI" }).isVisible({ timeout: 6000 }).catch(() => false);
r.m1NotConnected = await box.getByText("AI is not connected yet").isVisible().catch(() => false);
await shot(page, `${OUT}/m1-open.png`);
const before1 = await paras.count();
await box.getByRole("textbox", { name: "Ask AI" }).fill("Write one short sentence inviting people to bring snacks.");
await page.keyboard.press("Enter");
r.m1Answered = await box.getByRole("menuitem", { name: "Insert below" }).waitFor({ timeout: 180_000 }).then(() => true, () => false);
r.m1Failed = await box.locator(".spaces-ai-note[data-tone=error]").innerText().catch(() => "");
await shot(page, `${OUT}/m1-answer.png`);
if (r.m1Answered) {
  await box.getByRole("menuitem", { name: "Insert below" }).click();
  await page.waitForTimeout(800);
  r.m1Inserted = (await paras.count()) > before1 && /snack/i.test(await text());
}
await shot(page, `${OUT}/m1-inserted.png`);

// M2 — select the long line > Ask AI > Make shorter > Replace selection.
await lines.nth(0).click({ clickCount: 3 });
await page.waitForTimeout(500);
const askBtn = page.getByRole("button", { name: "Ask AI", exact: true }).first();
r.m2ToolbarAsk = await askBtn.isVisible({ timeout: 6000 }).catch(() => false);
if (r.m2ToolbarAsk) await askBtn.click();
await box.getByRole("menuitem", { name: "Make shorter" }).click({ timeout: 10_000 }).catch((e) => (r.m2MenuError = e.message.split("\n")[0]));
r.m2Answered = await box.getByRole("menuitem", { name: "Replace selection" }).waitFor({ timeout: 180_000 }).then(() => true, () => false);
await shot(page, `${OUT}/m2-answer.png`);
if (r.m2Answered) {
  r.m2HasDiscard = await box.getByRole("menuitem", { name: "Discard" }).isVisible();
  await box.getByRole("menuitem", { name: "Replace selection" }).click();
  await page.waitForTimeout(800);
  const first = await lines.nth(0).innerText();
  r.m2Replaced = first.length > 0 && first.length < LONG.length && !(await text()).includes(LONG);
  r.m2First = first.slice(0, 120);
}
await shot(page, `${OUT}/m2-replaced.png`);

// M2 Discard — a second run, discarded, changes nothing.
const kept = await text();
await lines.nth(0).click({ clickCount: 3 });
await page.waitForTimeout(500);
if (await askBtn.isVisible({ timeout: 6000 }).catch(() => false)) {
  await askBtn.click();
  await box.getByRole("menuitem", { name: "Make longer" }).click({ timeout: 10_000 }).catch(() => {});
  if (await box.getByRole("menuitem", { name: "Discard" }).waitFor({ timeout: 180_000 }).then(() => true, () => false)) {
    await box.getByRole("menuitem", { name: "Discard" }).click();
    await page.waitForTimeout(600);
    r.m2DiscardKeeps = (await text()) === kept && !(await box.isVisible().catch(() => false));
  }
}

// M4 — ask about this page.
await page.keyboard.press("Escape").catch(() => {});
const countHall = async () => ((await page.locator("body").innerText()).match(/Harbor Hall/g) ?? []).length;
const hallBefore = await countHall();
await page.getByRole("button", { name: "Ask AI about this page" }).first().click();
const q = page.getByRole("textbox", { name: "Ask about this page" });
r.m4Opens = await q.isVisible({ timeout: 6000 }).catch(() => false);
await q.fill("Where is the launch party held?");
await page.keyboard.press("Enter");
r.m4Answered = await page.waitForFunction((n) => ((document.body.innerText.match(/Harbor Hall/g) ?? []).length > n), hallBefore, { timeout: 180_000 }).then(() => true, () => false);
await page.waitForTimeout(3000);
await shot(page, `${OUT}/m4-answer.png`);
r.m4QuestionShown = (await page.locator("body").innerText()).includes("Where is the launch party held?");
r.m4NoRawPageMarkdown = !(await page.locator("body").innerText()).includes("page_markdown");
r.hallCount = [hallBefore, await countHall()];

await page.keyboard.press("Escape").catch(() => {});
r.trashed = await trashPage(page).catch(() => false);
console.log(JSON.stringify({ member, page: id, ...r }, null, 1));
const ok = r.m1Opens && r.m1Answered && r.m1Inserted && r.m2ToolbarAsk && r.m2Answered && r.m2HasDiscard && r.m2Replaced && r.m2DiscardKeeps && r.m4Opens && r.m4Answered && r.m4NoRawPageMarkdown;
console.log(ok ? "PASS ai-surfaces" : "FAIL ai-surfaces");
await browser.close();
process.exit(ok ? 0 : 1);
