import { chromium } from "playwright";
import { readFileSync } from "node:fs";
const { token } = JSON.parse(readFileSync(process.env.LINK_JSON, "utf8"));
const ORIGIN = "http://close-share.localhost:3001", SHOT = process.env.HOME + "/lane-resume/closeshare/shots/";
const b = await chromium.launch({ headless: true }); const ctx = await b.newContext({ viewport: { width: 1300, height: 900 } }); const p = await ctx.newPage();
const r = await p.goto(`${ORIGIN}/v/${token}`, { waitUntil: "domcontentloaded", timeout: 240000 });
console.log("status", r.status(), "asks password", await p.locator("[data-view-link-unlock]").count(), "rows before password", await p.locator("tbody tr, article").count());
await p.screenshot({ path: SHOT + "07-1-locked.png" });
await p.locator("[data-view-link-unlock] input").first().fill("walkpass-7731");
await Promise.all([p.waitForNavigation({ timeout: 120000 }).catch(() => {}), p.locator("[data-view-link-unlock] button").first().click()]);
await p.waitForTimeout(3000);
const probe = await p.evaluate(() => {
  const region = document.querySelector("[data-public-view-no-copy]");
  const cell = region?.querySelector("td, article");
  const ev = new ClipboardEvent("copy", { bubbles: true, cancelable: true }); cell?.dispatchEvent(ev);
  const ctxm = new MouseEvent("contextmenu", { bubbles: true, cancelable: true }); cell?.dispatchEvent(ctxm);
  return { region: !!region, rows: document.querySelectorAll("tbody tr, article").length, firstCell: cell?.textContent?.slice(0, 40) ?? null,
    userSelect: region ? getComputedStyle(region).userSelect : null, copyRefused: ev.defaultPrevented, menuRefused: ctxm.defaultPrevented,
    footer: document.querySelector("[data-public-view-copy-off]")?.textContent ?? null };
});
console.log("open", JSON.stringify(probe));
await p.screenshot({ path: SHOT + "07-2-open.png", fullPage: true });
await b.close();
console.log(probe.region && probe.rows > 0 && probe.userSelect === "none" && probe.copyRefused && probe.footer ? "PASS" : "FAIL");
