// AT-FIX-G4: follow a record, live. Usage: ORIGIN=... STEP=<explore|follow|edit|comment|unfollow|inbox> node g4-follow-walk.mjs <table> <row>
import { chromium } from "playwright";
import { walkSignIn } from "./walk-signin.mjs";
import { ORIGIN } from "./lib.mjs";
const [TABLE, ROW] = process.argv.slice(2);
const STEP = process.env.STEP ?? "explore";
const member = STEP === "edit" || STEP === "comment" || STEP === "edit2";
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
ctx.setDefaultNavigationTimeout(180000);
const page = await ctx.newPage();
console.log("who", await walkSignIn(page, ORIGIN, { member }), "step", STEP);
const url = `${ORIGIN}/data/${TABLE}/r/${ROW}`;
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 240000 });
await page.waitForSelector("[data-record-follow]", { timeout: 120000 }).catch(() => console.log("no follow control"));
const state = () => page.evaluate(() => ({ follow: document.querySelector("[data-record-follow]")?.getAttribute("data-record-follow"), followers: document.querySelector("[data-record-followers]")?.textContent ?? null, bell: document.body.innerText.match(/\b\d+\b(?=\s*$)/)?.[0] ?? null }));
console.log("state", JSON.stringify(await state()));
if (STEP === "follow") {
  await page.locator("[data-record-follow-button]").click();
  await page.waitForTimeout(3000);
  console.log("after follow", JSON.stringify(await state()));
}
if (STEP === "unfollow") {
  await page.locator("[data-record-follow-button]").click();
  await page.waitForTimeout(3000);
  console.log("after unfollow", JSON.stringify(await state()));
}
if (STEP === "edit") {
  const v = process.env.QTY ?? "7";
  await page.getByText("Qty", { exact: true }).first().locator("xpath=following::*[1]").click();
  await page.waitForTimeout(800);
  await page.keyboard.press("Control+A"); await page.keyboard.press("Meta+A");
  await page.keyboard.type(v);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(3500);
  console.log("qty now", await page.evaluate(() => document.body.innerText.match(/Qty\s+(\S+)/)?.[1]));
}
if (STEP === "comment") {
  const seen = []; page.on("response", (r) => { if (/rpc|rest\/v1/.test(r.url()) && r.request().method() !== "GET") seen.push(r.status() + " " + r.url().split("/").pop().slice(0, 50)); });
  const box = page.locator('textarea[placeholder^="Write a comment"]');
  await box.click(); await box.pressSequentially(process.env.TEXT ?? "G4 member comment", { delay: 15 });
  const btn = page.getByRole("button", { name: /^Comment$/ });
  console.log("comment button disabled after typing", await btn.isDisabled());
  await btn.click();
  await page.waitForTimeout(5000);
  console.log("writes", JSON.stringify(seen));
  console.log("comments", (await page.evaluate(() => document.body.innerText.match(/Comments\s+(\d+)/)?.[1])));
}
await page.screenshot({ path: `/tmp/g4-follow-${STEP}.png` });
console.log("html-hints", JSON.stringify(await page.evaluate(() => [...document.querySelectorAll("input,textarea,[contenteditable=true],[role=textbox]")].slice(0, 12).map((e) => (e.getAttribute("aria-label") || e.getAttribute("placeholder") || e.name || e.tagName) + ":" + (e.value ?? e.textContent ?? "").slice(0, 30)))));
await browser.close();
