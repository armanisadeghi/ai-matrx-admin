// BA- CD-IO-03: paste a header + 8 rows as a new table on the live site; columns in paste order; Open the table opens it.
import { live, say, admin, must } from "./ba-lib.mjs";
const COLS = ["Zeta", "Alpha", "Mid", "Email", "Qty"]; // deliberately not alphabetical
const lines = [COLS.join("\t"), ...Array.from({ length: 8 }, (_, i) => [`z${i + 1}`, `a${i + 1}`, `m${i + 1}`, `p${i + 1}@example.com`, String(i + 1)].join("\t"))];
const NAME = "WK2- Paste " + Math.random().toString(36).slice(2, 6);
const { browser, page, who, shot } = await live(false);
say("who", who, NAME);
await page.goto("https://www.aimatrx.com/data", { waitUntil: "domcontentloaded" });
await page.getByRole("button", { name: /^New table$/ }).first().click({ timeout: 120000 });
await page.waitForTimeout(2000);
await page.getByText("Paste rows", { exact: true }).first().click();
await page.waitForTimeout(800);
await page.locator('[aria-label="Pasted rows"]').fill(lines.join("\n"));
await page.waitForTimeout(800);
const nameBox = page.getByRole("textbox", { name: /name/i }).first();
if (await nameBox.count()) await nameBox.fill(NAME);
await shot("paste-1");
say("STEP1", (await page.locator("[data-new-table-continue]").first().isEnabled().catch(() => "no btn")));
await page.locator("[data-new-table-continue]").first().click();
await page.waitForTimeout(4000);
await shot("paste-2");
say("WIZ", (await page.locator("body").innerText()).replace(/\n+/g, " | ").match(/(Columns|landed|Import).{0,500}/)?.[0]);
for (let i = 0; i < 20; i++) {
  const t = await page.locator("body").innerText();
  if (/landed/.test(t)) break;
  const go = page.getByRole("button", { name: /^(Import|Import \d+ rows?|Add \d+ rows?|Next|Bring them in)/ }).first();
  if (await go.count() && await go.isEnabled().catch(() => false)) { say("press", await go.innerText()); await go.click(); }
  await page.waitForTimeout(3000);
}
await shot("paste-3");
say("RESULT", (await page.locator("body").innerText()).replace(/\n+/g, " | ").match(/.{0,200}landed.{0,200}/)?.[0]);
const before = page.url();
await page.locator("[data-new-table-open]").first().click();
await page.waitForURL(/\/data\/[0-9a-f-]{36}/, { timeout: 60000 }).catch(() => {});
await page.waitForTimeout(5000);
say("URL", before, "->", page.url());
const tid = page.url().match(/\/data\/([0-9a-f-]{36})/)?.[1];
await page.waitForSelector("[data-table-toolbar]", { timeout: 120000 }).catch(() => {});
await page.waitForTimeout(3000);
await shot("paste-4-table");
say("HEADERS", await page.locator('[role="columnheader"]').allInnerTexts());
await browser.close();
if (tid) {
  const A = await admin();
  const f = await A.client.fields?.({ table_id: tid }).catch(() => null);
  say("fields", f?.ok ? f.data.map((x) => [x.label ?? x.name, x.sort]) : f);
  const rows = must(await A.client.list({ table_id: tid }), "rows"); say("rowcount", rows.total ?? rows.rows?.length);
}
