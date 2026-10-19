// AT-FIX-F item 1 probe: hover a URL cell in the grid and a link in the record panel; report /web/link-preview requests and the card.
import { start, open, out } from "./lib.mjs";
const T = process.argv[2];
const { browser, page, who } = await start();
out("who", who);
const reqs = []; page.on("request", (r) => /link-preview/i.test(r.url()) && reqs.push(r.url().slice(-60)));
await open(page, T);
const info = await page.evaluate(() => [...document.querySelectorAll('a[href^="https://example.com"]')].map((a) => a.outerHTML.slice(0, 200) + " || parents: " + [a.parentElement, a.parentElement?.parentElement].map((p) => p?.tagName + "." + (p?.className || "").toString().slice(0, 60) + " " + (p?.getAttributeNames().join(","))).join(" > ")));
out("links", JSON.stringify(info, null, 1));
const link = page.locator('a[href^="https://example.com"]').first();
const b = await link.boundingBox(); out("box", JSON.stringify(b));
await page.mouse.move(5, 500); await page.waitForTimeout(300); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 6 });
for (let i = 0; i < 8; i++) { await page.waitForTimeout(1500); const c = await page.evaluate(() => (document.querySelector("[data-records-link-preview]") || {}).innerText || ""); if (c) { out("GRID CARD", c.replace(/\s+/g, " ")); break; } }
out("grid reqs", JSON.stringify(reqs));
await page.screenshot({ path: "/tmp/atff/grid.png" });
await browser.close();
