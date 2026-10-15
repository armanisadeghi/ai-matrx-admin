import { start, open, T, OUT } from "/Users/armanisadeghi/code/matrx-frontend/scripts/at-walk2-lib.mjs";
const { browser, page, who } = await start();
console.log("who", who);
await open(page, T.events);
await page.screenshot({ path: OUT + "/0.png" });
console.log((await page.locator("[data-table-toolbar]").first().innerText()).replace(/\s+/g," ").slice(0,400));
console.log(await page.locator("thead").first().innerText().catch(()=>"nohead"));
await browser.close();
