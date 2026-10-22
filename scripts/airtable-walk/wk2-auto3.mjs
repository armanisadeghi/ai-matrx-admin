import { live, gotoTable, openAutomations, say } from "./ba-lib.mjs";
const { browser, page, shot } = await live(false);
await gotoTable(page, process.env.TID);
await openAutomations(page);
await page.mouse.click(1010,445); await page.waitForTimeout(4000);
await shot("wk2-auto-8");
say("RUNS", (await page.locator("[role=dialog]").last().innerText()).replace(/\n+/g," | ").slice(0,1500));
process.exit(0);
