// AT-FIX-J2 item 4d: signed-out view embed. Admin publishes the view (share control > Anyone link); a signed-out context opens /v/<slug> and an iframe of it on a foreign origin.
import { open, gotoTable, say } from "./at-fix-j2-lib.mjs";
const { browser, page, who, shot } = await open(false);
say("who", who);
await gotoTable(page, process.env.TABLE); await page.waitForTimeout(3000);
await page.getByRole("button", { name: /^View: All records/ }).first().click().catch(() => {}); await page.waitForTimeout(1200); await shot("em1-viewmenu");
say("view menu", await page.$$eval("[role=menuitem],[role=option],[role=dialog] button", (e) => e.map((x) => x.innerText.trim().replace(/\n/g, " | ")).slice(0, 30)));
await page.getByText("Share view link…").first().click(); await page.waitForTimeout(3000); await shot("em2-sharelink");
const dlg = async () => (await page.evaluate(() => document.querySelector("[role=dialog]")?.innerText ?? document.body.innerText.slice(-1500))).slice(0, 2000);
say("share view link", await dlg());
await page.getByRole("button", { name: /^Create link$/ }).first().click(); await page.waitForTimeout(5000); await shot("em3-created");
say("created", await dlg());
const link = await page.evaluate(() => { const t = document.body.innerText + " " + [...document.querySelectorAll("input")].map((i) => i.value).join(" "); return t.match(/https?:\/\/[^\s"']*\/v\/[A-Za-z0-9_-]+/)?.[0] ?? null; });
say("LINK", link);
if (link) {
  const { chromium } = await import("playwright");
  const b2 = await chromium.launch({ headless: true }); const ctx2 = await b2.newContext({ viewport: { width: 1300, height: 800 } }); const p2 = await ctx2.newPage();
  const url = link.replace(/^https?:\/\/[^/]+/, process.env.ORIGIN);
  const resp = await p2.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
  say("signed-out status", resp.status(), "xfo", resp.headers()["x-frame-options"] ?? "(none)", "csp", resp.headers()["content-security-policy"]?.slice(0, 120) ?? "(none)");
  await p2.waitForTimeout(4000); await p2.screenshot({ path: process.env.HOME + "/lane-resume/atfj2-shots/em4-signedout.png" });
  say("signed-out body", (await p2.evaluate(() => document.body.innerText)).slice(0, 600));
  const p3 = await ctx2.newPage();
  await p3.setContent(`<html><body><h3>Customer page</h3><iframe id=f src="${url}" width=1100 height=600></iframe></body></html>`);
  await p3.waitForTimeout(9000); await p3.screenshot({ path: process.env.HOME + "/lane-resume/atfj2-shots/em5-iframe.png" });
  const fr = p3.frames().find((f) => f.url().includes("/v/")); say("iframe frame url", fr?.url(), "text", fr ? (await fr.evaluate(() => document.body.innerText).catch((e) => "ERR " + e.message.slice(0, 60))).slice(0, 400) : "(no frame)");
  await b2.close();
}
await browser.close();
