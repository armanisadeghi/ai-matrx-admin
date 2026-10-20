// AT-FIX-H 4: a public form submitted with the optional Qty left empty. args: formId [requiredQty=0]
import { chromium } from "playwright";
import { ORIGIN } from "./lib.mjs";
const [, , F] = process.argv;
const say = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a.map((x) => (typeof x === "string" ? x : JSON.stringify(x))));
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1300, height: 900 } })).newPage();
page.setDefaultTimeout(120000);
const reqs = [];
page.on("request", (r) => /\/api\/forms\//.test(r.url()) && reqs.push(r.method() + " " + r.url().split("/api/forms/")[1].slice(37)));
page.on("response", (r) => /\/api\/forms\//.test(r.url()) && reqs.push("-> " + r.status() + " " + r.url().split("/api/forms/")[1].slice(37)));
await page.goto(`${ORIGIN}/f/${F}`, { waitUntil: "domcontentloaded", timeout: 240000 });
await page.waitForSelector("[data-records-form-question]", { timeout: 240000 });
say("QUESTION", (await page.locator("[data-records-form-question]").first().innerText()).replace(/\n+/g, " | "));
await page.locator("[data-records-form-question] input, [data-records-form-question] textarea").first().fill("headless empty qty " + Date.now());
const btn = () => page.getByRole("button", { name: /Next|Submit|Send|Sending/ }).last();
for (let i = 0; i < 4; i++) {
  const t = (await btn().innerText().catch(() => "")).trim();
  say("BTN", t, "| q:", (await page.locator("[data-records-form-question]").first().innerText().catch(() => "")).replace(/\n+/g, " | ").slice(0, 80));
  if (/Submit|Send/.test(t) && !/Sending/.test(t)) break;
  await btn().click();
  await page.waitForTimeout(1500);
  const alert = (await page.locator("[role=alert]").allInnerTexts()).join(" / ").trim();
  if (alert) say("ALERT", alert);
}
const t0 = Date.now();
await btn().click().catch((e) => say("CLICK ERR", e.message.slice(0, 100)));
for (let s = 0; s < 40; s++) {
  await page.waitForTimeout(3000);
  const body = (await page.locator("body").innerText()).replace(/\n+/g, " | ");
  const sending = /Sending…/.test(body);
  if (!sending) { say("DONE after", Math.round((Date.now() - t0) / 1000) + "s", body.slice(0, 300)); break; }
  if (s % 5 === 4) say("STILL Sending… after", Math.round((Date.now() - t0) / 1000) + "s");
}
say("REQS", reqs);
await page.screenshot({ path: process.env.HOME + "/lane-resume/atfixh/form-end.png" });
await browser.close();
