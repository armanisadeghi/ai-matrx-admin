// RECORD-FIXES: open /data/<table>/r/<row> as admin (default) or test@test.com (member). node rf-open.mjs <table> <row> [member] [shot]
import { start, ORIGIN, out } from "./lib.mjs";
const [TB, ROW, who, shot] = process.argv.slice(2);
const { browser, page, who: w, errs } = await start(who === "member");
out("who", w);
await page.goto(`${ORIGIN}/data/${TB}/r/${ROW}`, { waitUntil: "domcontentloaded", timeout: 240000 });
await page.waitForTimeout(12000);
await page.screenshot({ path: `/tmp/airtable-walk/${shot ?? "rf-open"}.png` });
out((await page.locator("body").innerText()).slice(0, 600).replace(/\n+/g, " | "));
out("errs", errs.slice(0, 5));
await browser.close();
