// The Shape Playground's live test, run headless: every demo in frame and in page.
// Usage: node tests/browser/shape-playground-live-test.mjs [screenshot-dir]   (needs the dev server).
// Prints one line per demo per mode; exit 0 = every demo passed in both modes.
import { chromium } from "playwright";
import { execSync } from "node:child_process";

const shots = process.argv[2] ?? null;
const out = execSync(`pnpm -s dev-login "/shapes/playground"`, { cwd: process.cwd() }).toString();
const url = out.match(/OPEN\s*:\s*(\S+)/)[1];
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 170000 });
// The sign-in redirect can land before the session cookie is read; open the page once more.
await page.goto(new URL("/shapes/playground", url).toString(), { waitUntil: "domcontentloaded", timeout: 170000 });
await page.waitForSelector("[data-playground-summary]", { timeout: 170000 });

async function settle() {
  await page.waitForFunction(
    () => document.querySelector("[data-playground-summary]")?.getAttribute("data-pending") === "0",
    null,
    { timeout: 120000 },
  ).catch(() => {});
  return page.$$eval("[data-playground-demo]", (cards) =>
    cards.map((card) => ({
      slug: card.getAttribute("data-playground-demo"),
      verdict: card.getAttribute("data-verdict"),
      detail: card.querySelector("p.font-mono")?.textContent ?? "",
      checks: [...card.querySelectorAll("span[title]")].map((s) => `${s.textContent}(${s.getAttribute("title")})`).filter((t) => t.includes(":")),
    })),
  );
}

let failed = false;
const summary = page.locator("[data-playground-summary]");
for (const mode of ["Frame", "In page"]) {
  await summary.getByRole("button", { name: mode, exact: true }).click();
  await page.waitForTimeout(1500);
  for (const demo of await settle()) {
    if (demo.verdict !== "pass") failed = true;
    console.log(`${mode.padEnd(7)} ${demo.verdict.padEnd(7)} ${demo.slug}  ${demo.verdict === "pass" ? "" : demo.detail || demo.checks.join(" ")}`);
  }
  if (shots) {
    const tag = mode === "Frame" ? "frame" : "page";
    const cards = page.locator("[data-playground-demo]");
    const snap = async (theme) => {
      for (const i of [0, 2, 4, 6]) await cards.nth(i).screenshot({ path: `${shots}/playground-${tag}-${theme}-${i}.png` });
    };
    await snap("light");
    await summary.getByRole("button", { name: "Dark" }).click();
    await page.waitForTimeout(2500);
    await snap("dark");
    await summary.getByRole("button", { name: "Light" }).click();
    await page.waitForTimeout(1500);
  }
}
await browser.close();
process.exit(failed ? 1 : 0);
