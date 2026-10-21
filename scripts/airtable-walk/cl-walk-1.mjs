// CLOSE-LINK walk 1 (browser, admin): link picker search (CD-LINK-02), several-target chips (04), reverse links (01), link history (12),
// restrict refusal on archive (06). Host: ORIGIN (close-link.localhost:3001). Shots: ~/lane-resume/closelink/shots/.
import { open, say, gotoTable, ORIGIN } from "./at-fix-j2-lib.mjs";
const S = process.env.HOME + "/lane-resume/closelink/shots/";
const T = { clients: "475d36ce-7e0e-4914-bb2e-f9372f999e48", bookings: "7dad23dc-ac4a-46a4-876c-499cdf9b8793", sup: "ee75cc4e-5ec9-4e57-ad89-6e0c80547d1f" };
const HARBOR = "50323490-8204-4385-af5e-61db68972c9e", BOOKING = "29642cec-76a9-4950-8da6-26870c59d725";
const { browser, page, who, errs } = await open(process.env.WHO === "member");
say("who", who, "origin", ORIGIN);
const shot = (n) => page.screenshot({ path: S + n + ".png" }).catch(() => {});
const text = async () => (await page.locator("body").innerText()).replace(/\n+/g, " | ");
try {
  await gotoTable(page, T.bookings);
  await shot("w1-bookings-grid");
  const body = await text();
  say("grid text", body.slice(body.indexOf("Spring order") - 200, body.indexOf("Spring order") + 400));
  await page.waitForTimeout(6000);
  const html = await page.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) => e.childElementCount === 0 && e.textContent?.trim() === "Summer order");
    let r = el; for (let i = 0; i < 6 && r; i++) r = r.parentElement;
    return r ? r.outerHTML.replace(/class="[^"]*"/g, "").slice(0, 4000) : "none";
  });
  say("row html", html);
} catch (e) { say("ERR", String(e).slice(0, 300)); await shot("w1-err"); }
say("console errors", errs.slice(0, 5));
await browser.close();
