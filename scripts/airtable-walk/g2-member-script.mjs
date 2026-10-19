// AT-FIX-G2: test@test.com (a member) runs a table script through Table menu > Automations > Scripting > Run script.
import { start, open, ORIGIN } from "./lib.mjs";
import { openMenu } from "/Users/armanisadeghi/lane-resume/atwf/lib-f.mjs";
const TABLE = process.argv[2];
const { browser, page, who } = await start(true);
console.log("who", who);
await open(page, TABLE);
console.log("menu", await openMenu(page));
const au = page.getByRole("menuitem", { name: /^Automations/ });
if (!(await au.count())) { await page.getByRole("menuitem", { name: /Built on it/ }).click().catch(() => {}); await page.waitForTimeout(1200); }
await au.first().click({ timeout: 8000 }); await page.waitForTimeout(4000);
const ta = page.locator('textarea[aria-label="Table script"]');
await ta.fill('output.set("n", input.rows.length); console.log("member ran", input.rows.length);');
await page.getByRole("button", { name: "Run script" }).click();
for (let i = 0; i < 25; i++) { await page.waitForTimeout(3000); const t = await page.evaluate(() => (document.querySelector('[data-testid="spaces-table-scripting"]') || {}).innerText || ""); if (/Ran|error|did not|could not/i.test(t)) { console.log("RESULT", t.replace(/\s+/g, " ").slice(0, 400)); break; } }
await page.screenshot({ path: "/tmp/g2-member-script.png" });
await browser.close();
