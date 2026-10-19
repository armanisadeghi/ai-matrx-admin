import { start, open, out, ORIGIN } from "./lib.mjs";
const T = process.env.T ?? "f636aadf-d252-4928-80ba-872bb5e1be21";
const { browser, page, who } = await start(false);
out("who", who);
await open(page, T);
await page.screenshot({ path: "/tmp/airtable-walk/i-main.png" });
const btns = await page.$$eval("button,[role=button],[role=menuitem]", (els) => els.map((e) => (e.getAttribute("aria-label") || e.textContent || "").trim().slice(0, 50)).filter(Boolean));
out(JSON.stringify([...new Set(btns)]));
await browser.close();
