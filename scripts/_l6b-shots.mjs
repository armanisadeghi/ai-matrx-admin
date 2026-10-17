import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
const OUT = process.argv[2];
const kinds = process.argv[3].split(",");
const only = process.argv[4];
mkdirSync(OUT, { recursive: true });
const mint = () => execFileSync("pnpm", ["-s", "dev-login", "/dashboard"], { encoding: "utf8" }).match(/OPEN\s*:\s*(\S+)/)?.[1];
let open = mint();
const origin = new URL(open).origin;
const browser = await chromium.launch({ headless: true });
for (const [theme, width] of [["light", 1200], ["dark", 1200], ["light", 420]].filter((x) => !only || only === `${x[0]}-${x[1]}`)) {
  open = mint();
  const context = await browser.newContext({ viewport: { width, height: 1500 }, colorScheme: theme });
  const page = await context.newPage();
  const bad = [];
  page.on("console", (m) => m.type() === "error" && bad.push(m.text().slice(0, 160)));
  await page.goto(open, { waitUntil: "domcontentloaded", timeout: 180000 });
  for (const kind of kinds) {
    let ok = false;
    for (let t = 0; t < 3 && !ok; t++) {
      try { await page.goto(`${origin}/shapes/${kind}`, { waitUntil: "domcontentloaded", timeout: 120000 }); ok = true; } catch (e) { console.log("goto retry", kind); }
    }
    if (!ok) continue;
    await page.getByText("own component rendered").first().waitFor({ timeout: 90000 }).catch(() => {});
    for (const n of (theme === "light" && width === 1200 ? [3, 4] : [3])) {
      const target = n;
      for (let i = 0; i < (target === 3 ? 2 : 1); i++) {
        await page.locator("text=/example \\d+ \\/ \\d+/").first().locator("xpath=preceding::button[1]").click().catch((e) => console.log("click fail", String(e).slice(0, 80)));
        await page.waitForTimeout(1500);
      }
      await page.waitForTimeout(2500);
      const file = `${OUT}/${kind}-real${n - 2}-${theme}-${width}.png`;
      await page.screenshot({ path: file });
      console.log(file, bad.length ? bad.slice(0, 3) : "no console errors");
    }
  }
  await context.close();
}
await browser.close();
