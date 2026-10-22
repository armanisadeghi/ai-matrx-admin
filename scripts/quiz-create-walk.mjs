/**
 * Headless walk of /education/<quizzes|practice-tests>/new on the shared preview (LIVE database), as
 * admin@admin.com. Steps come from a JSON file so one run = one scripted pass:
 *   node scripts/quiz-create-walk.mjs <steps.json>
 * env: LOGIN_URL (a `pnpm dev-login` URL, first run only), OUT (evidence dir), WIDTH/HEIGHT.
 * Step shapes: {goto}, {click:{role,name,exact?,nth?}|{text}|{css}}, {fill:{label|css|placeholder, value}},
 * {press}, {wait:ms}, {waitText}, {shot:name}, {reload:true}, {aria:true}, {eval:"js"}, {upload:{css,file}}.
 */
import { chromium } from "playwright";
import { mkdirSync, readFileSync, existsSync, writeFileSync } from "node:fs";

const steps = JSON.parse(readFileSync(process.argv[2], "utf8"));
const OUT = process.env.OUT ?? "/tmp/quiz-walk";
mkdirSync(OUT, { recursive: true });
const STATE = `${OUT}/storage.json`;
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: Number(process.env.WIDTH ?? 1440), height: Number(process.env.HEIGHT ?? 1000) },
  ...(existsSync(STATE) ? { storageState: STATE } : {}),
});
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 300)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 300)));
if (process.env.LOGIN_URL) await page.goto(process.env.LOGIN_URL, { waitUntil: "domcontentloaded", timeout: 180000 });
const loc = (t) =>
  t.role ? page.getByRole(t.role, { name: t.name, exact: !!t.exact }).nth(t.nth ?? 0)
  : t.text ? page.getByText(t.text, { exact: !!t.exact }).nth(t.nth ?? 0)
  : t.label ? page.getByLabel(t.label).nth(t.nth ?? 0)
  : t.placeholder ? page.getByPlaceholder(t.placeholder).nth(t.nth ?? 0)
  : page.locator(t.css).nth(t.nth ?? 0);
let i = 0;
for (const s of steps) {
  i++;
  try {
    if (s.goto) await page.goto(new URL(s.goto, process.env.ORIGIN ?? page.url()).toString(), { waitUntil: "domcontentloaded", timeout: 180000 });
    if (s.click) await loc(s.click).click({ timeout: s.timeout ?? 15000 });
    if (s.fill) await loc(s.fill).fill(s.fill.value, { timeout: 15000 });
    if (s.press) await page.keyboard.press(s.press);
    if (s.upload) await page.locator(s.upload.css).first().setInputFiles(s.upload.file);
    if (s.wait) await page.waitForTimeout(s.wait);
    if (s.waitText) await page.getByText(s.waitText).first().waitFor({ timeout: s.timeout ?? 60000 });
    if (s.waitUrl) await page.waitForURL(new RegExp(s.waitUrl), { timeout: s.timeout ?? 300000 });
    if (s.reload) await page.reload({ waitUntil: "domcontentloaded", timeout: 180000 });
    if (s.eval) console.log(`[${i}] eval:`, JSON.stringify(await page.evaluate(s.eval)).slice(0, 3000));
    if (s.aria) console.log(`[${i}] aria:\n` + (await (s.aria === true ? page.locator("main") : s.aria.startsWith("role:") ? page.getByRole("region", { name: s.aria.slice(5) }) : page.locator(s.aria)).first().ariaSnapshot()).slice(s.from ?? 0, s.max ?? 6000));
    if (s.shot) await page.screenshot({ path: `${OUT}/${s.shot}.png`, fullPage: !!s.full });
    console.log(`[${i}] ok ${JSON.stringify(s).slice(0, 120)}`);
  } catch (e) {
    console.log(`[${i}] FAIL ${JSON.stringify(s).slice(0, 120)} — ${String(e).split("\n")[0].slice(0, 300)}`);
    await page.screenshot({ path: `${OUT}/fail-${i}.png` }).catch(() => {});
    if (!s.optional) break;
  }
}
console.log("url:", page.url());
console.log("errors:", JSON.stringify(errors.slice(0, 8)));
await ctx.storageState({ path: STATE });
await browser.close();
