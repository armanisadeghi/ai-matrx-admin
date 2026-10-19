// AT-FIX-F item 1 live: hover a URL cell in the grid, then the link in the record panel; report /web/link-preview requests and the card.
import { start, open, out } from "./lib.mjs";
const T = process.argv[2];
const { browser, page, who } = await start();
out("who", who);
const reqs = []; page.on("response", (r) => /link-preview/i.test(r.url()) && reqs.push(r.status() + " " + decodeURIComponent(r.url()).slice(-40)));
await open(page, T);
await page.waitForSelector('a[href^="https://example.com"]', { timeout: 90000 });
const hover = async (loc, label) => {
  const b = await loc.boundingBox();
  await page.mouse.move(5, 500); await page.waitForTimeout(300); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 6 });
  for (let i = 0; i < 8; i++) { await page.waitForTimeout(1500); const c = await page.evaluate(() => (document.querySelector("[data-records-link-preview]") || {}).innerText || ""); if (c) { out(label, "CARD", c.replace(/\s+/g, " ").slice(0, 200)); return; } }
  out(label, "no card");
};
await hover(page.locator('a[href^="https://example.com"]').first(), "GRID");
out("grid reqs", JSON.stringify(reqs));
await page.screenshot({ path: "/tmp/atff/grid.png" });
await page.mouse.move(5, 500); await page.waitForTimeout(500);
await page.getByText("Bravo", { exact: true }).first().click(); await page.waitForTimeout(500);
await page.locator("[data-records-open-record]").first().click({ force: true }).catch(() => {}); await page.waitForTimeout(5000);
out("url", page.url());
const link = page.locator('a[href^="https://www.wikipedia.org"]').last();
await hover(link, "PANEL");
out("all reqs", JSON.stringify(reqs));
await page.screenshot({ path: "/tmp/atff/panel.png" });
await browser.close();
