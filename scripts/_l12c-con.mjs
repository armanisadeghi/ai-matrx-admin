import { execFileSync } from "node:child_process";
import { chromium } from "playwright";
const printed = execFileSync("pnpm", ["-s", "dev-login", "--member", "/dashboard"], { encoding: "utf8" });
const open = printed.match(/OPEN\s*:\s*(\S+)/)?.[1]; const origin = new URL(open).origin;
const b = await chromium.launch({ headless: true }); const p = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage();
p.on("console", (m) => { if (["error","warning","log"].includes(m.type())) { const t=m.text(); if (/rich-content|kindData|host|unroutable|kind-|no custom/i.test(t)) console.log(m.type(), t.slice(0, 400)); } });
await p.goto(open, { waitUntil: "commit" }).catch(() => {}); await p.waitForTimeout(4000);
await p.goto(`${origin}/marketing/837ba910-a3f8-4cf0-b096-10a9e24be8ce/socials/research?mode=account&source=instagram&calls=0ae45ed7-df5b-4e9b-b532-c8e374e1955f,75ced091-eca1-4135-9efb-4caf6762498a`, { waitUntil: "domcontentloaded", timeout: 180000 });
await p.waitForTimeout(25000); await b.close();
