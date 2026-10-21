// PARITY B7 (Notion keys) and L3/L4 (phone toolbar, long-press block menu) on a new page, then Trash.
//   SHOTS=/tmp/out MATRX_PREVIEW_SESSION=<lane> node features/spaces/__tests__/walk/notion-keys-mobile.walk.mjs
//   MEMBER=1 … signs in as test@test.com.
// Desktop: Cmd+A selects the line then every block; Esc selects the block, ↑ moves it, Enter writes again;
// Cmd+Shift+H puts the yellow highlight on a selected word; Cmd+/ opens the block menu.
// Phone (375 px, touch): the toolbar sits at the bottom while writing; Turn into → Heading 1 changes the
// block; a long-press on a block opens its block menu.
import { chromium, login, newPage, resumeIfPaused, trashPage, shot } from "./lib.mjs";

const OUT = process.env.SHOTS ?? "/tmp";
const member = !!process.env.MEMBER;
const r = {};
const browser = await chromium.launch({ headless: true });
const desk = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await desk.newPage();
page.on("pageerror", (e) => console.log("[pageerror]", e.message.slice(0, 300)));
await login(page, "/spaces", member);
await resumeIfPaused(page);
const id = await newPage(page);
console.log("page", id);

const blue = () => page.evaluate(() => (document.getElementById("spaces-rubber-band")?.textContent ?? "").match(/data-id="([^"]+)"/g)?.map((m) => m.slice(9, -1)) ?? []);
const ids = () => page.locator(".spaces-editor .bn-block-outer[data-id]").evaluateAll((els) => els.map((e) => e.getAttribute("data-id")));
const lines = page.locator(".bn-editor .bn-block-content[data-content-type=paragraph] .bn-inline-content");

await page.locator(".bn-editor .bn-inline-content").last().click();
await page.keyboard.type("Plan the launch party", { delay: 15 });
await page.keyboard.press("Enter");
await page.keyboard.type("Book the room", { delay: 15 });
await page.waitForTimeout(500);
const [first, second] = await ids();

// Cmd+A: the line, then the page.
await lines.nth(0).click();
await page.keyboard.press("ControlOrMeta+a");
r.cmdA1 = await page.evaluate(() => window.getSelection()?.toString());
await page.keyboard.press("ControlOrMeta+a");
await page.waitForTimeout(200);
r.cmdA2Blocks = (await blue()).length;
await shot(page, `${OUT}/b7-cmd-a-page.png`);
await page.keyboard.press("Escape");
r.escClears = (await blue()).length === 0;

// Esc selects the block; ↑ moves; Enter writes again.
await lines.nth(1).click();
await page.keyboard.press("Escape");
await page.waitForTimeout(200);
r.escSelects = JSON.stringify(await blue()) === JSON.stringify([second]);
await shot(page, `${OUT}/b7-esc-selects.png`);
await page.keyboard.press("ArrowUp");
r.arrowMoves = JSON.stringify(await blue()) === JSON.stringify([first]);
await page.keyboard.press("Enter");
await page.waitForTimeout(200);
r.enterWrites = (await blue()).length === 0 && (await page.evaluate(() => !!document.activeElement?.closest(".bn-editor")));

// Cmd+Shift+H: the last color (none yet in this browser: yellow highlight) on a selected word.
await lines.nth(0).dblclick({ position: { x: 10, y: 8 } });
await page.keyboard.press("ControlOrMeta+Shift+h");
await page.waitForTimeout(300);
r.cmdShiftH = await page.locator('.bn-editor [data-style-type="backgroundColor"][data-value="yellow"]').count();
await shot(page, `${OUT}/b7-cmd-shift-h.png`);

// Cmd+/: the block menu.
await lines.nth(1).click();
await page.keyboard.press("ControlOrMeta+/");
r.cmdSlashMenu = await page.locator(".bn-menu-dropdown").getByText("Turn into", { exact: true }).first().isVisible({ timeout: 4000 }).catch(() => false);
await shot(page, `${OUT}/b7-cmd-slash.png`);
await page.keyboard.press("Escape");

// Phone.
const phone = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const m = await phone.newPage();
m.on("pageerror", (e) => console.log("[pageerror m]", e.message.slice(0, 300)));
await login(m, `/spaces/${id}`, member);
await resumeIfPaused(m);
await m.locator(".bn-editor .bn-block-content[data-content-type=paragraph] .bn-inline-content").nth(1).waitFor({ timeout: 120_000 });
const bar = m.getByRole("toolbar", { name: "Block tools" });
r.barHiddenBeforeWriting = !(await bar.isVisible().catch(() => false));
await m.locator(".bn-editor .bn-block-content[data-content-type=paragraph] .bn-inline-content").nth(1).tap();
await m.waitForTimeout(500);
r.barShows = await bar.isVisible().catch(() => false);
const box = await bar.boundingBox().catch(() => null);
r.barAtBottom = !!box && Math.abs(box.y + box.height - 812) < 2;
await shot(m, `${OUT}/l3-bar.png`);
await bar.getByRole("button", { name: "Turn into" }).tap();
await bar.getByRole("button", { name: "Heading 1" }).tap();
await m.waitForTimeout(400);
r.turnIntoHeading = await m.locator(".bn-editor .bn-block-content[data-content-type=heading]").count();
await shot(m, `${OUT}/l3-turned-heading.png`);
await m.locator(".bn-editor .bn-block-content[data-content-type=paragraph] .bn-inline-content").first().evaluate((el) => el.blur?.());

// Long-press: a touch held still for 700 ms.
const target = await m.locator(".bn-editor .bn-block-content[data-content-type=paragraph]").first().boundingBox();
const cdp = await phone.newCDPSession(m);
const pt = { x: target.x + 30, y: target.y + target.height / 2 };
await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [pt] });
await m.waitForTimeout(700);
await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
r.longPressMenu = await m.locator(".bn-menu-dropdown").getByText("Turn into", { exact: true }).first().isVisible({ timeout: 4000 }).catch(() => false);
await shot(m, `${OUT}/l4-long-press.png`);
await m.keyboard.press("Escape").catch(() => {});

r.trashed = await trashPage(page);
console.log(JSON.stringify({ member, ...r }, null, 1));
const ok =
  r.cmdA1 === "Plan the launch party" && r.cmdA2Blocks === 2 && r.escClears && r.escSelects && r.arrowMoves && r.enterWrites &&
  r.cmdShiftH > 0 && r.cmdSlashMenu && r.barHiddenBeforeWriting && r.barShows && r.barAtBottom && r.turnIntoHeading > 0 && r.longPressMenu;
console.log(ok ? "PASS notion-keys-mobile" : "FAIL notion-keys-mobile");
await browser.close();
process.exit(ok ? 0 : 1);
