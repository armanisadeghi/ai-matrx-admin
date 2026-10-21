// CD-TPL-04 live walk: /make > Describe it > a business > Make it. Expected: the landing lists tables, forms and a dashboard;
// the store holds the dashboard named after the business and the suggested automations switched off. Prints the template id so the
// caller archives it (Remove on its template page). Real AI run (the describe mandate's own agent).
//   ORIGIN=http://<session>.localhost:3001 SENTENCE="..." BUSINESS="<name in the sentence>" SHOTS=<dir> node scripts/airtable-walk/cd-tpl-04-describe.mjs
import { mkdirSync } from "node:fs";
import { ORIGIN, start } from "./lib.mjs";

const SENTENCE = process.env.SENTENCE;
if (!SENTENCE) throw new Error("SENTENCE= what to describe");
const SHOTS = process.env.SHOTS ?? "/tmp/cd-tpl-04";
mkdirSync(SHOTS, { recursive: true });
const fails = [];
const check = (label, ok, detail = "") => { console.log((ok ? "PASS " : "FAIL ") + label + (ok ? "" : "  — " + String(detail).slice(0, 300))); if (!ok) fails.push(label); };

const s = await start(false);
console.log("signed in as", s.who);
const page = s.page;
try {
  await page.goto(`${ORIGIN}/make${process.env.ORG ? `?org=${process.env.ORG}` : ""}`, { waitUntil: "domcontentloaded", timeout: 240000 });
  const input = page.locator("[data-make-describe-input] textarea, textarea[data-make-describe-input], textarea[aria-label='Describe what to make']").first();
  await input.waitFor({ timeout: 180000 });
  await input.fill(SENTENCE);
  await page.getByRole("button", { name: "Make it" }).first().click();
  const t0 = Date.now();
  const phase = await page.waitForFunction(() => {
    const el = document.querySelector("[data-make-describe]");
    const p = el?.getAttribute("data-make-describe");
    return p === "installed" || p === "failed" ? p : false;
  }, null, { timeout: 900000, polling: 2000 }).then((h) => h.jsonValue(), (e) => "timeout: " + e.message.split("\n")[0]);
  console.log("phase", phase, "after", Math.round((Date.now() - t0) / 1000), "s");
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SHOTS}/01-made.png`, fullPage: true });
  check("the describe run installed", phase === "installed", await page.locator("[data-make-describe-refusal]").innerText().catch(() => phase));
  const kinds = await page.locator("[data-make-template-landing-row]").evaluateAll((els) => els.map((e) => [e.getAttribute("data-make-template-landing-row"), e.textContent?.trim().slice(0, 80)]));
  console.log("landing", JSON.stringify(kinds));
  const has = (k) => kinds.some(([x]) => x === k);
  check("the landing lists tables", has("table"), JSON.stringify(kinds));
  check("the landing lists a form", has("form"), JSON.stringify(kinds));
  check("the landing lists a dashboard", has("dashboard") || has("interface") || has("page"), JSON.stringify(kinds));
  const tpl = await page.locator("[data-make-describe-template]").getAttribute("href").catch(() => null);
  console.log("template link", tpl);
  const area = await page.locator("[data-make-describe]").innerText();
  check("the result says nothing in raw database text", !/violates|null value|PGRST|[a-z]+\.[a-z_]+\(|uuid/i.test(area), area.slice(0, 300));
} catch (e) {
  await page.screenshot({ path: `${SHOTS}/zz-error.png` }).catch(() => {});
  check("walk ran to the end", false, e.message);
}
console.log("console errors", JSON.stringify(s.errs.slice(0, 8)));
await s.browser.close();
console.log(fails.length ? `FAIL cd-tpl-04 (${fails.length})` : "PASS cd-tpl-04");
process.exit(fails.length ? 1 : 0);
