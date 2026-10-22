// CLOSE-SHARE CD-SHARE-11 walk: admin shares a Space with someone outside the Space's organization by typing their email;
// the share list row says Guest, and when both have the page open the outsider's presence avatar says Guest.
// SPACE=<content.document id in an org the member is not in> ORIGIN=http://close-share.localhost:3001 node closeshare-guest.mjs
import { open, say, ORIGIN } from "./at-fix-j2-lib.mjs";

const SPACE = process.env.SPACE;
const OUT = process.env.OUT_EMAIL ?? "test@test.com";
const SHOT = process.env.HOME + "/lane-resume/closeshare/shots/";
let bad = 0;
const check = (ok, what, detail) => { if (!ok) bad++; say(ok ? "PASS" : "FAIL", what, detail ?? ""); };

const A = await open(false);
say("admin", A.who);
await A.page.goto(`${ORIGIN}/spaces/${SPACE}`, { waitUntil: "domcontentloaded", timeout: 240000 });
await A.page.getByRole("button", { name: "Share", exact: true }).first().waitFor({ timeout: 240000 });
await A.page.waitForTimeout(2000);
if (!process.env.SKIP_SHARE) {
await A.page.getByRole("button", { name: "Share", exact: true }).first().click();
await A.page.getByRole("button", { name: /Invite/ }).first().click();
const dlg = A.page.getByRole("dialog").last();
await dlg.locator("#user-email").waitFor({ timeout: 120000 });
await dlg.locator("#user-email").fill(OUT);
await A.page.waitForTimeout(1500);
await A.page.screenshot({ path: SHOT + "11-0-typed.png" });
await A.page.getByRole("button", { name: /Share with User/ }).last().click({ timeout: 60000 });
await A.page.waitForTimeout(6000);
const row = await A.page.evaluate((email) => {
  const rows = [...document.querySelectorAll("[role=dialog] li, [role=dialog] [data-permission-row], [role=dialog] div")]
    .filter((n) => n.textContent?.includes(email) && n.textContent.length < 300);
  const best = rows.sort((a, b) => a.textContent.length - b.textContent.length)[0];
  const holder = best?.closest("li") ?? best?.parentElement?.parentElement ?? best;
  return { text: holder?.textContent?.slice(0, 200) ?? null, guest: !!holder?.querySelector("[data-guest-marker]"), anyGuest: document.querySelectorAll("[role=dialog] [data-guest-marker]").length };
}, OUT);
check(row.text && (row.guest || row.anyGuest > 0), "share list marks the outsider Guest", row);
await A.page.screenshot({ path: SHOT + "11-1-share-list.png" });
await A.page.keyboard.press("Escape");
}

const M = await open(true);
say("member", M.who);
await M.page.goto(`${ORIGIN}/spaces/${SPACE}`, { waitUntil: "domcontentloaded", timeout: 240000 });
await M.page.waitForTimeout(8000);
await A.page.reload({ waitUntil: "domcontentloaded" });
await A.page.waitForSelector("[aria-label='People viewing this page']", { timeout: 120000 }).catch(() => {});
await A.page.waitForTimeout(3000);
const pres = await A.page.evaluate(() => [...document.querySelectorAll("[aria-label='People viewing this page'] [data-viewer]")].map((n) => ({ title: n.getAttribute("title"), guest: n.hasAttribute("data-guest-marker") })));
check(pres.some((p) => p.guest && !p.title?.includes("(you)")) && pres.some((p) => !p.guest), "presence avatar marks the outsider Guest (and not the owner)", pres);
await A.page.screenshot({ path: SHOT + "11-2-presence.png" });
await A.browser.close(); await M.browser.close();
say(bad ? `RED: ${bad} failed` : "GREEN");
process.exit(bad ? 1 : 0);
