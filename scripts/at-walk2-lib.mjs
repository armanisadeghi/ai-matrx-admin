import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { signIn } from "./lib/seat-browser.mjs";
export const ORIGIN = process.env.ORIGIN ?? "http://s96c6068c.localhost:3001";
export const OUT = "/tmp/atw2";
export const env = Object.fromEntries(readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n").map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^"|"$/g, "")]));
export const T = { clients: "09bf21d2-ac67-457a-adf7-a0e4a6b1ba39", events: "f982a0f7-59ad-4c3a-889e-2c7f704b1c09", view: "0a8de0f1-68ee-4241-b857-9d931b8c9169" };
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
