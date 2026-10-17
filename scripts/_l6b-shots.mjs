import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
const OUT = process.argv[2];
const kinds = process.argv[3].split(",");
mkdirSync(OUT, { recursive: true });
const mint = () => execFileSync("pnpm", ["-s", "dev-login", "/dashboard"], { encoding: "utf8" }).match(/OPEN\s*:\s*(\S+)/)?.[1];
let open = mint();
const origin = new URL(open).origin;
const browser = await chromium.launch({ headless: true });
for (const [theme, width] of [["light", 1200], ["dark", 1200], ["light", 420]]) {
  open = mint();
  const context = await browser.newContext({ viewport: { width, height: 1500 }, colorScheme: theme });
  const page = await context.newPage();
  const bad = [];
  page.on("console", (m) => m.type() === "error" && bad.push(m.text().slice(0, 160)));
  await page.goto(open, { waitUntil: "domcontentloaded", timeout: 180000 });
  for (const kind of kinds) {
    await page.goto(`${origin}/shapes/${kind}`, { waitUntil: "domcontentloaded", timeout: 180000 });
    await page.getByText("own component rendered").first().waitFor({ timeout: 90000 }).catch(() => {});
    for (const n of [3, 4]) {
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
