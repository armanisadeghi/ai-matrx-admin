import { open, gotoTable, say } from "./at-fix-j2-lib.mjs";
const { browser, page, who, shot } = await open(process.env.WHO === "member");
say("who", who);
await gotoTable(page, process.env.TABLE);
await page.waitForTimeout(3000); await shot(process.env.SHOT ?? "grid");
say("body", (await page.evaluate(() => document.body.innerText)).split("\n").filter((l) => /Keyboard|Monitor|Cable|Mouse|Lovelace|Hopper|Turing/.test(l)));
await browser.close();
