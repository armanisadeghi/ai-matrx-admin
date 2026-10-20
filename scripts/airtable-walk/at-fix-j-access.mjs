// AT-FIX-J item 2: walk "Who can see and edit" on the Qty column as admin; then read as the member.
import { open, gotoTable, say } from "./at-walk-h-lib.mjs";
import { admin, seedTable } from "./at-fix-j-lib.mjs";
const mode = process.env.MODE ?? "explore";
let id = process.env.TABLE;
if (!id) { const a = await admin(); id = await seedTable(a.client); say("seeded", id); }
const { browser, page, who, shot } = await open(false);
say("who", who);
await gotoTable(page, id);
await page.waitForTimeout(3000);
await page.mouse.move(540, 117); await page.waitForTimeout(500);
await page.mouse.click(515, 117);
await page.waitForTimeout(1200); await shot("fixj-hdr-menu");
await page.getByText("Who can see and edit…").first().click();
await page.waitForSelector("[role=dialog]", { timeout: 60000 }); await page.waitForTimeout(4000); await shot("fixj-access-1");
say("dialog text", (await page.locator("[role=dialog]").first().innerText()).replace(/\s+/g, " ").slice(0, 700));
await browser.close();
