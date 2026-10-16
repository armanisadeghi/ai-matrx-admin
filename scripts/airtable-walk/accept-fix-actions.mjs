// ACCEPT-FIX-3: print the route-header action keys + settled widths on a /data/<table> page (1440, cold storage).
import { chromium } from "playwright";
import { walkSignIn } from "./walk-signin.mjs";
const ORIGIN = process.env.ORIGIN;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await walkSignIn(page, ORIGIN);
for (const id of process.argv.slice(2)) {
  await page.goto(`${ORIGIN}/data/${id}`, { waitUntil: "domcontentloaded", timeout: 180000 });
  await page.waitForTimeout(9000);
  console.log(id.slice(0, 8), JSON.stringify(await page.evaluate(() => ({ cluster: Math.round(document.querySelector("[data-route-header-right]")?.getBoundingClientRect().width ?? 0), actions: [...document.querySelectorAll("[data-route-header-action]")].map((e) => [e.dataset.routeHeaderAction, Math.round(e.offsetWidth), e.dataset.routeHeaderTwin != null])  }))));
}
await browser.close();
