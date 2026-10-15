import { start, open, T, out } from "./lib.mjs";
const file = process.argv[2];
const { browser, page } = await start(false);
await open(page, process.env.TABLE ?? T.clients);
await page.getByRole("button", { name: "Table menu" }).first().click(); await page.waitForTimeout(500);
await page.getByRole("menuitem", { name: /^Import…/ }).click(); await page.waitForTimeout(2500);
await page.screenshot({ path: "/tmp/airtable-walk/imp0.png" });
const panel = page.locator("body");
const txt = async () => (await page.locator("text=Import").last().locator("xpath=ancestor::*[contains(@class,'border-l') or self::aside or self::section][1]").innerText().catch(() => "")).replace(/\n+/g, " | ");
await page.locator("input[type=file]").first().setInputFiles(file); await page.waitForTimeout(4000);
out("step2:", (await page.innerText("body")).replace(/\n+/g, " | ").split("Import")[1]?.slice(0, 900));
await page.screenshot({ path: "/tmp/airtable-walk/imp1.png" });
await page.waitForTimeout(2500); const anyway = page.getByText("Import the rest anyway").first(); if (await anyway.count()) { await anyway.click(); await page.waitForTimeout(800); }
await page.locator("text=Import the rest anyway").first().scrollIntoViewIfNeeded().catch(() => {}); await page.screenshot({ path: "/tmp/airtable-walk/imp3.png" });
out("import buttons:", JSON.stringify(await page.$$eval("button", (b) => b.map((x) => [x.textContent.trim(), x.disabled]).filter((x) => /^Import/.test(x[0])))));
const go = page.getByRole("button", { name: /^Import \d|^Import$|Import \d+ records|Add \d+/ }).last(); out("go btn", await go.count(), await go.innerText().catch(()=>""));
out("disabled?", await go.isDisabled(), await go.getAttribute("title"), await go.getAttribute("aria-describedby"));
out("tail:", (await page.innerText("body")).replace(/\n+/g, " | ").slice(-700));
if (process.argv[3] === "go" && !(await go.isDisabled())) { await go.click(); await page.waitForTimeout(6000); await page.screenshot({ path: "/tmp/airtable-walk/imp2.png" }); }
await page.screenshot({ path: "/tmp/airtable-walk/imp1.png" });
await browser.close();
