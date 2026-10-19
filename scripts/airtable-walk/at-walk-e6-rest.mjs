// AT-WALK-E6 d (duplicate, snapshot+restore, template) and f2 (sync into Holdfast Vault). One fresh admin browser, bounded waits, steps logged.
// ORIGIN=... node at-walk-e6-rest.mjs <baseHome> <boardTable>
import { start, ORIGIN } from "./lib.mjs";
const [, , H, TBL] = process.argv; const S = "/Users/armanisadeghi/lane-resume/atwe6-shots/";
const say = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a.map((x) => (typeof x === "string" ? x : JSON.stringify(x))));
const { browser, page } = await start(false);
const d = page.locator('[role="dialog"]');
const step = async (name, fn) => { try { await fn(); } catch (e) { say("STEP FAIL", name, e.message.split("\n")[0]); await page.screenshot({ path: S + `e6-${name}.png` }).catch(() => {}); } };
const base = async (h) => { await page.goto(`${ORIGIN}/data/bases/${h}`, { waitUntil: "domcontentloaded", timeout: 180000 }); await page.waitForSelector("[data-base-page]", { timeout: 180000 }); };
await step("dup", async () => {
  await base(H);
  await page.locator("[data-base-duplicate]").click(); await page.locator("[data-base-duplicate-go]").click();
  await page.waitForSelector("[data-base-duplicate-done]", { timeout: 240000 });
  say("DUP:", await page.locator("[data-base-duplicate-done]").innerText());
  await page.getByRole("button", { name: "Open the copy" }).click();
  await page.waitForURL((u) => !u.pathname.endsWith(H) && /bases\//.test(u.pathname), { timeout: 120000 });
  await page.waitForSelector("[data-base-page]"); await page.waitForTimeout(3000);
  say("COPY:", page.url(), await page.locator("[data-base-name]").allInnerTexts());
});
await step("snap", async () => {
  await base(H);
  await page.locator("[data-base-snapshots]").click(); await d.getByLabel("Snapshot label").fill("E6 before");
  await page.locator("[data-snapshot-take]").click(); await page.waitForSelector("[data-snapshot]", { timeout: 240000 });
  say("SNAP:", await page.locator("[data-snapshot]").first().innerText());
  await page.locator("[data-snapshot-restore]").first().click();
  await page.waitForURL((u) => /bases\//.test(u.pathname) && !u.pathname.endsWith(H), { timeout: 240000 });
  await page.waitForSelector("[data-base-page]"); await page.waitForTimeout(3000);
  say("RESTORED:", page.url(), await page.locator("[data-base-name]").allInnerTexts());
});
await step("tpl", async () => {
  await page.goto(`${ORIGIN}/data/bases`, { waitUntil: "domcontentloaded", timeout: 180000 });
  await page.getByRole("button", { name: /New base/ }).first().click({ timeout: 120000 });
  await d.getByText("From a template").first().click(); await page.waitForTimeout(4000);
  say("TPL dialog:", (await d.innerText()).replace(/\n+/g, " | ").slice(0, 600));
  await page.screenshot({ path: S + "e6-tpl1.png" });
});
await step("f2", async () => {
  await page.goto(`${ORIGIN}/data/${TBL}`, { waitUntil: "domcontentloaded", timeout: 180000 });
  await page.waitForSelector("[data-sync-into-workspace]", { timeout: 180000 });
  await page.locator("[data-sync-into-workspace]").click(); await page.waitForTimeout(2500);
  say("F2 dialog:", (await d.innerText()).replace(/\n+/g, " | ").slice(0, 400));
  await page.screenshot({ path: S + "e6-f2a.png" });
});
await browser.close();
say("END");
