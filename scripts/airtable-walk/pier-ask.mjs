// ACCEPT-FIX-3: open a shared record as test@test.com, measure the Ask panel, send a question.
// node pier-ask.mjs <tableId> <recordId>
import { start, ORIGIN, out } from "./lib.mjs";
const [tb, rec] = process.argv.slice(2);
const { browser, page, who, errs } = await start(true);
out("who", who);
page.on("response", async (r) => { if (/conversation_scope_bind|\/ai\/(agents|conversations)|403/.test(r.url()) || r.status() >= 400) out("NET", r.status(), r.url().slice(0, 140), (await r.text().catch(() => "")).slice(0, 200)); });
await page.addInitScript(() => { window.__cls = []; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls.push(e.value); }).observe({ type: "layout-shift", buffered: true }); });
await page.goto(`${ORIGIN}/data/${tb}/r/${rec}`, { waitUntil: "domcontentloaded", timeout: 240000 });
await page.waitForTimeout(15000);

await page.getByRole("button", { name: /^Ask$/ }).first().click(); await page.waitForTimeout(12000);
await page.screenshot({ path: "/tmp/airtable-walk/pier-" + rec.slice(0, 4) + ".png" });
const info = await page.evaluate(() => {
  const ta = document.querySelector("textarea, [contenteditable=true]");
  const panel = ta?.closest("aside, section, [data-record-chat], [role=complementary]") ?? ta?.parentElement?.parentElement?.parentElement;
  return { text: document.body.innerText.slice(0, 600), composer: !!ta, panelH: panel?.getBoundingClientRect().height, refused: document.querySelector("[data-record-chat-refused]")?.textContent, cls: window.__cls.reduce((a, b) => a + b, 0) };
});
out(JSON.stringify(info, null, 1));
const ta = page.locator("textarea").first();
if (await ta.count()) {
  await ta.fill("What is the rent?"); await page.keyboard.press("Enter");
  await page.waitForTimeout(40000);
  await page.screenshot({ path: "/tmp/airtable-walk/pier-sent-" + rec.slice(0, 4) + ".png" });
  
  out("AFTER SEND", (await page.evaluate(() => document.body.innerText)).slice(-1800));
}
out("HIT", JSON.stringify(await page.evaluate(() => { const el = [...document.querySelectorAll("*")].filter((e) => e.children.length === 0 && /What is the rent/.test(e.textContent))[0]; const r = el.getBoundingClientRect(); const top = document.elementFromPoint(r.x + 5, r.y + 5); const chain = []; let n = el; while (n) { const cs = getComputedStyle(n); const b = n.getBoundingClientRect(); if (cs.overflowY !== "visible" || cs.position !== "static" || cs.transform !== "none" || cs.contentVisibility !== "visible") chain.push(n.tagName + "." + String(n.className).slice(0, 50) + " y=" + Math.round(b.y) + " h=" + Math.round(b.height) + " ov=" + cs.overflowY + " pos=" + cs.position + " tr=" + cs.transform.slice(0, 20) + " cv=" + cs.contentVisibility); n = n.parentElement; } return { r: [r.x, r.y, r.width, r.height], top: top?.tagName + "." + String(top?.className).slice(0, 80), chain }; }), null, 1));
out("GEOM", JSON.stringify(await page.evaluate(() => { const el = [...document.querySelectorAll("*")].filter((e) => e.children.length === 0 && /What is the rent/.test(e.textContent))[0]; const chain = []; let n = el; while (n && chain.length < 14) { const r = n.getBoundingClientRect(); const cs = getComputedStyle(n); chain.push(n.tagName + "." + String(n.className).slice(0, 70) + " h=" + Math.round(r.height) + " y=" + Math.round(r.y) + " ov=" + cs.overflowY + " disp=" + cs.display + " mh=" + cs.maxHeight + " vis=" + cs.visibility + " op=" + cs.opacity); n = n.parentElement; } return chain; }), null, 1));
await page.screenshot({ path: "/tmp/airtable-walk/pier-final.png" });
out("errs", JSON.stringify(errs.slice(0, 5)));
await browser.close();
