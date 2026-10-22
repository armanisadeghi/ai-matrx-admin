// CD-TPL-05: the sidebar's Templates > a random pack > Use template makes the pack's pages and linked databases, and
// they open with data. The new top page goes to Trash after.
//   SHOTS=<dir> [WALK_ORIGIN=https://www.aimatrx.com | MATRX_PREVIEW_SESSION=<lane>] [MEMBER=1] node features/spaces/__tests__/walk/template-gallery-use.walk.mjs
import { open, shot, trashPage, chooseOrgIfAsked } from "./lib.mjs";

const OUT = process.env.SHOTS ?? "/tmp";
const member = !!process.env.MEMBER;
const r = { member };
const { browser, page } = await open({ member, width: 1440, height: 1000 });
await page.locator(".spaces-sidebar-head").first().waitFor({ timeout: 240_000 });
// /spaces lands on the last page opened once its tree loads: settle there before noting where we were.
await page.locator(".bn-editor").first().waitFor({ timeout: 120_000 }).catch(() => {});
await page.waitForTimeout(3000);
const before = page.url().match(/\/spaces\/([0-9a-f-]{36})/)?.[1] ?? null;
r.before = before;
await page.locator(".spaces-nav-row").filter({ hasText: /^Templates/ }).first().click();
const cards = page.locator(".spaces-tg-card");
await cards.first().waitFor({ timeout: 120_000 });
// A pack not yet in this organization, picked at random.
const fresh = await cards.evaluateAll((els) => els.map((e, i) => (e.textContent?.includes("In this organization") || e.textContent?.includes("Your template") ? -1 : i)).filter((i) => i >= 0));
r.cards = await cards.count();
const pick = fresh[Math.floor(Math.random() * fresh.length)];
r.picked = (await cards.nth(pick).locator(".spaces-tg-card-title").innerText()).trim();
await cards.nth(pick).click();
const use = page.getByRole("button", { name: "Use template", exact: true });
await use.waitFor({ timeout: 60_000 });
await page.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => b.textContent?.trim() === "Use template" && !b.disabled), null, { timeout: 120_000 });
await shot(page, `${OUT}/05-preview.png`);
await use.click();
await chooseOrgIfAsked(page);
r.opened = await page
  .waitForURL((u) => { const id = u.href.match(/\/spaces\/([0-9a-f-]{36})/)?.[1]; return !!id && id !== before; }, { timeout: 600_000, waitUntil: "commit" })
  .then(() => true, () => false);
r.page = page.url().match(/\/spaces\/([0-9a-f-]{36})/)?.[1] ?? null;
await page.locator(".spaces-editor .bn-editor").first().waitFor({ timeout: 240_000 }).catch(() => {});
await page.waitForFunction(() => document.querySelectorAll(".spaces-editor .spaces-db-frame, .spaces-editor [data-content-type=database]").length > 0 && !document.body.innerText.includes("Adding…"), null, { timeout: 300_000 }).catch(() => {});
await page.waitForTimeout(6000);
r.title = await page.locator(".spaces-title, h1").first().innerText().catch(() => "");
r.databases = await page.locator(".spaces-editor .spaces-db-frame").count();
r.url = page.url();
// Each database's own words beyond its toolbar: rows or cards of sample data.
r.rowsShown = await page.locator(".spaces-editor .spaces-db-frame").evaluateAll((els) => els.map((e) => e.innerText.split("\n").filter((l) => l.trim()).length));
r.withData = r.rowsShown.filter((n) => n > 12).length;
r.subPages = await page.locator(".spaces-editor [data-content-type=page], .spaces-editor .spaces-page-link").count();
r.rawDbText = /violates|PGRST|null value|[a-z]+_[a-z]+\(/.test(await page.locator(".spaces-editor").first().innerText().catch(() => ""));
await shot(page, `${OUT}/05-used${member ? "-member" : ""}.png`);
await page.mouse.wheel(0, 1200);
await page.waitForTimeout(1500);
await shot(page, `${OUT}/05-used-2${member ? "-member" : ""}.png`);
if (r.opened && r.page) r.trashed = await trashPage(page).catch(() => false);
console.log(JSON.stringify(r, null, 1));
const ok = r.opened && r.databases > 0 && r.withData > 0 && !r.rawDbText;
console.log(ok ? "PASS template-gallery-use" : "FAIL template-gallery-use");
await browser.close();
process.exit(ok ? 0 : 1);
