import { live, say } from "./ba-lib.mjs";
const { page } = await live(false);
await page.goto("https://www.aimatrx.com/data/bases/dc452837-7385-4c05-9ec7-4b42b80f5a0a",{waitUntil:"domcontentloaded"}); await page.waitForTimeout(8000);
await page.getByRole("button",{name:"Archive",exact:true}).first().click(); await page.waitForTimeout(1500);
const c = page.getByRole("button",{name:/^(Archive|Confirm|Yes)/}); say("confirm btns", await c.allInnerTexts());
if (await c.count()>1) await c.last().click(); await page.waitForTimeout(4000);
say("BODY", (await page.locator("body").innerText()).replace(/\n+/g," | ").match(/.{0,100}(rchived).{0,100}/)?.[0]);
process.exit(0);
