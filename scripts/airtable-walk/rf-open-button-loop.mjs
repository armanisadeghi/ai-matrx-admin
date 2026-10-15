import { start, open, out, ORIGIN } from "./lib.mjs";
const TB = process.argv[2];
const { browser, page } = await start(false);
for (let i = 0; i < 5; i++) {
  await open(page, TB);
  const t0 = Date.now();
  let err = "";
  await page.locator("[data-records-open-record]").first().click({ timeout: 8000 }).catch((e) => (err = e.message.replace(/\n+/g, " | ").slice(0, 700)));
  await page.waitForTimeout(3000);
  out(i, "ms", Date.now() - t0, "url", page.url().replace(ORIGIN, "").slice(-40), err ? "ERR " + err : "ok");
}
await browser.close();
