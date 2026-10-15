import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { signIn } from "../lib/seat-browser.mjs";
export const ORIGIN = process.env.ORIGIN ?? "http://s96c6068c.localhost:3001";
export const OUT = "/tmp/airtable-walk";
export const env = Object.fromEntries(readFileSync(new URL("../../.env.local", import.meta.url), "utf8").split("\n").map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^"|"$/g, "")]));
export const T = { clients: "eb587b2c-5bac-4d5e-9552-eb0bf0d23fc6", events: "2f39d047-f3f5-4fda-926e-6e1dd8bd92b0", view: "ccbc570e-2d35-423e-8244-2ede1eb0af4e" }; // AT-WALK-3 tables; re-run setup.mjs for fresh ones
export async function start(member = false) {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const page = await ctx.newPage();
  const errs = []; page.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 160)));
  const who = await signIn(page, ORIGIN, member ? "test@test.com" : env.AI_ADMIN_USERNAME, member ? env.AI_MEMBER_PASSWORD : env.AI_ADMIN_PASSWORD, member ? "member" : "admin").catch((e) => "ERR " + e.message.slice(0, 100));
  return { browser, ctx, page, who, errs };
}
export const open = async (page, id) => { await page.goto(`${ORIGIN}/data/${id}`, { waitUntil: "domcontentloaded", timeout: 240000 }); await page.waitForSelector("[data-table-toolbar]", { timeout: 240000 }); await page.waitForTimeout(3000); };
export const out = (...a) => console.log(...a);
