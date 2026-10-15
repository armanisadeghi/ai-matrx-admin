import { start, open, T, OUT } from "./at-walk2-lib.mjs";
const { browser, page } = await start();
await open(page, T.events);
await page.getByRole("button", { name: /Event ↑/ }).first().click();
await page.waitForTimeout(800);
await page.screenshot({ path: OUT + "/1a.png", clip:{x:0,y:40,width:900,height:500} });
console.log((await page.locator("[role=dialog],[data-radix-popper-content-wrapper]").last().innerText().catch(()=>"none")).replace(/\s+/g," "));
await browser.close();
