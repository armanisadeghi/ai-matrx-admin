import { start, ORIGIN } from "./lib.mjs";
export { ORIGIN };
export const D = process.env.D;
export async function boot(member = false) {
  const s = await start(member);
  if (String(s.who).startsWith("ERR")) {
    await s.page.waitForLoadState("domcontentloaded").catch(() => {}); await s.page.waitForTimeout(8000);
    s.who = await s.page.evaluate(async () => { try { return (await (await fetch("/api/whoami")).json())?.email ?? null; } catch { return null; } }).catch(() => null);
  }
  return s;
}
export const goto = async (page, path, sel) => {
  for (let i = 0; i < 3; i++) {
    try { await page.goto(ORIGIN + path, { waitUntil: "domcontentloaded", timeout: 240000 }); if (sel) await page.waitForSelector(sel, { timeout: 240000 }); await page.waitForTimeout(2500); return true; } catch (e) { console.log("goto retry", path, e.message.split("\n")[0]); await page.waitForTimeout(5000); }
  }
  return false;
};
export const labs = async (page, sel) => (await page.locator(sel).evaluateAll((els) => els.map((e) => (e.getAttribute("aria-label") || e.innerText || e.title || "").replace(/\s+/g, " ").trim().slice(0, 60)))).filter(Boolean);
