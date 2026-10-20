// AT-FIX-J2 item 4b: open a record in the panel as admin and look for the record share control.
import { open, gotoTable, say } from "./at-fix-j2-lib.mjs";
const { browser, page, who, shot } = await open(false);
say("who", who);
await gotoTable(page, process.env.TABLE);
await shot("s0-grid");
const row = page.getByText("Bravo", { exact: true }).first();
await row.dblclick().catch(() => {});
await page.waitForTimeout(2500);
await shot("s1-after-dbl");
say("buttons", await page.evaluate(() => [...document.querySelectorAll("button,[role=button]")].map((b) => (b.getAttribute("aria-label") || b.title || b.innerText || "").trim().slice(0, 40)).filter(Boolean).slice(0, 80)));
await browser.close();
