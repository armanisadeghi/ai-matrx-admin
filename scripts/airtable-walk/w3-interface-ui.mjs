import { start, out, ORIGIN } from "./lib.mjs";
const member = process.argv[2] === "member"; const tag = member ? "m" : "a";
const PAGE = "6c5e70c9-5cf1-4193-845e-c6e8ff0c0108";
const { browser, page, who } = await start(member);
out("who", who);
await page.goto(`${ORIGIN}/data/pages/${PAGE}`, { waitUntil: "domcontentloaded", timeout: 240000 });
await page.waitForSelector("text=Event desk", { timeout: 120000 }); await page.waitForTimeout(5000);
const rows = () => page.locator("main tbody tr, main [role=row]").count();
out("rows", await rows(), "svg", await page.locator("main svg.recharts-surface, main canvas, main [data-testid*=chart]").count());
// filter
// select a row, record panel follows
await page.getByText("Holiday gala").first().click(); await page.waitForTimeout(1500);
out("panel title has Holiday gala:", (await page.locator("main").innerText()).includes("Holiday gala"));
// button
await page.getByRole("button", { name: "Mark served" }).click(); await page.waitForTimeout(2500);
out("after Mark served, text:", (await page.locator("main").innerText()).replace(/\n+/g, " | ").slice(0, 500));
await page.screenshot({ path: `/tmp/airtable-walk/i3${tag}.png` });
// form
const inp = page.locator("main input[type=text], main input:not([type])").last();
await inp.fill("Walk3 form event"); await page.getByRole("button", { name: "Next" }).click(); await page.waitForTimeout(1000);
await page.screenshot({ path: `/tmp/airtable-walk/i4${tag}.png` });
await page.locator("main input[type=number]").last().fill("33");
await page.getByRole("button", { name: "Submit" }).click(); await page.waitForTimeout(3000);
await page.screenshot({ path: `/tmp/airtable-walk/i5${tag}.png` });
out("final text:", (await page.locator("main").innerText()).replace(/\n+/g, " | ").slice(-260));
await browser.close();
