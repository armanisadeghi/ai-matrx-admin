import { execFileSync } from "node:child_process";
import { chromium } from "playwright";
const printed = execFileSync("pnpm", ["-s", "dev-login", "--member", "/dashboard"], { encoding: "utf8" });
const open = printed.match(/OPEN\s*:\s*(\S+)/)?.[1];
const origin = new URL(open).origin;
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1300, height: 800 } })).newPage();
const log = [];
page.on("console", (m) => { const t = m.text(); if (/kind|component|sandbox|compile|registry/i.test(t) || m.type() === "error") log.push(`${m.type()}: ${t.slice(0, 300)}`); });
page.on("response", (r) => { if (r.status() >= 400) log.push(`HTTP ${r.status()} ${r.url().slice(0, 160)}`); });
page.on("requestfailed", (r) => log.push(`FAILED ${r.url().slice(0, 140)} ${r.failure()?.errorText}`));
await page.goto(open, { waitUntil: "commit", timeout: 180000 }).catch(() => {});
await page.waitForTimeout(4000);
for (let i = 0; i < 60; i++) {
  await page.goto(`${origin}/marketing/837ba910-a3f8-4cf0-b096-10a9e24be8ce/socials/research?mode=account&source=xiaohongshu&calls=cd39ca88-2a50-4744-822c-f8b06ccb5a4c,6d16c93c-d324-48b4-ba54-88e878fa9445`, { waitUntil: "domcontentloaded", timeout: 180000 }).catch(() => {});
  if (await page.getByText("Cost 443 points").count().catch(() => 0)) break;
  await page.waitForTimeout(15000);
}
await page.waitForTimeout(15000);
console.log(log.slice(0, 40).join("\n"));
await browser.close();
