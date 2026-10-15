import { start, open, out } from "./lib.mjs";
const TB = "85c830ae-98aa-4e2a-a864-8115e53a1a5d";
const { browser, page, who } = await start(false);
out("who", who);
await open(page, TB);
await page.screenshot({ path: "/tmp/airtable-walk/u1.png" });
out(await page.$$eval("[role=columnheader]", (h) => h.map((x) => x.textContent.trim())));
await browser.close();
