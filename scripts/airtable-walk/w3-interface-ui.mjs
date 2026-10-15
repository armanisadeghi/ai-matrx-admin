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
await page.getByRole("button", { name: "Choose" }).click(); await page.waitForTimeout(600);
out("filter options", JSON.stringify(await page.$$eval("[role=option],[role=menuitem],[role=menuitemradio],[role=menuitemcheckbox]", (b) => b.map((x) => x.textContent.trim()))));
await page.getByRole("option", { name: "Inquiry" }).or(page.getByRole("menuitem", { name: "Inquiry" })).first().click(); await page.waitForTimeout(2000);
out("after filter Inquiry list:", (await page.locator("main").innerText()).split("\n").filter((l) => /^(Parents night|Open house buffet|Holiday gala|Closing dinner)/.test(l)).join(" / "));
await page.screenshot({ path: `/tmp/airtable-walk/i2${tag}.png` });
await page.keyboard.press("Escape");
// select a row, record panel follows
await page.getByText("Parents night").first().click(); await page.waitForTimeout(1500);
out("panel title has Parents night:", (await page.locator("main").innerText()).includes("Parents night"));
// button
await page.getByRole("button", { name: "Mark served" }).click(); await page.waitForTimeout(2500);
out("after Mark served, text:", (await page.locator("main").innerText()).replace(/\n+/g, " | ").slice(0, 500));
await page.screenshot({ path: `/tmp/airtable-walk/i3${tag}.png` });
// form
const inp = page.locator("main input[type=text], main input:not([type])").last();
await inp.fill("Walk3 form event"); await page.getByRole("button", { name: "Next" }).click(); await page.waitForTimeout(1000);
await page.screenshot({ path: `/tmp/airtable-walk/i4${tag}.png` });
await page.keyboard.type("33"); 
const sub = page.getByRole("button", { name: /Submit|Send|Done|Finish/ }); out("submit btn", await sub.count());
if (await sub.count()) { await sub.first().click(); await page.waitForTimeout(2500); }
await page.screenshot({ path: `/tmp/airtable-walk/i5${tag}.png` });
out("final text:", (await page.locator("main").innerText()).replace(/\n+/g, " | ").slice(-300));
await browser.close();
