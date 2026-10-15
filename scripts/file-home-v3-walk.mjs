#!/usr/bin/env node
// File homes v3 walk (Workbooks / Documents / Presentations, Google Look): screenshots at the top
// and scrolled (sticky header), cards and list, light and dark, 1440 / 1900 / 375, as the admin
// and the member test account; plus layout-shift and sticky measurements printed as JSON.
//   ORIGIN=http://<you>.localhost:3001 OUT=/abs/dir node scripts/file-home-v3-walk.mjs [who=admin,member] [pages=documents]
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { signIn, sleep } from "./lib/seat-browser.mjs";

const ORIGIN = process.env.ORIGIN;
const OUT = process.env.OUT;
if (!ORIGIN || !OUT) throw new Error("ORIGIN and OUT are required");
mkdirSync(OUT, { recursive: true });
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`${k}=`))?.split("=")[1] ?? d).split(",");
const WHO = arg("who", "admin,member");
const PAGES = arg("pages", "documents,workbooks,presentations");
const WIDTHS = arg("widths", "1440,1900,375").map(Number);
const THEMES = arg("themes", "light,dark");
const SEATS = {
  admin: [process.env.AI_ADMIN_USERNAME, process.env.AI_ADMIN_PASSWORD],
  member: [process.env.AI_MEMBER_USERNAME, process.env.AI_MEMBER_PASSWORD],
};

const browser = await chromium.launch({ headless: true });
const results = [];
for (const who of WHO) {
  const [email, password] = SEATS[who];
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await signIn(page, ORIGIN, email, password, who);
  for (const theme of THEMES) {
    await page.emulateMedia({ colorScheme: theme });
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: width === 375 ? 812 : 1000 });
      for (const route of PAGES) {
        await page.goto(`${ORIGIN}/${route}`, { waitUntil: "domcontentloaded", timeout: 120000 });
        await page.waitForSelector("[data-file-home] section[aria-label]", { timeout: 120000 }).catch(() => undefined);
        await sleep(4000);
        // Our dark class follows the page's own setting; make the screenshot's theme explicit.
        await page.evaluate((t) => document.documentElement.classList.toggle("dark", t === "dark"), theme);
        await sleep(400);
        const base = `${OUT}/${who}-${route}-${width}-${theme}`;
        for (const view of width === 375 ? ["phone"] : ["cards", "list"]) {
          if (view !== "phone") {
            const want = view === "list" ? "List view" : "Grid view";
            const btn = page.getByRole("button", { name: want });
            if (await btn.count()) {
              await btn.first().click();
              await sleep(1500);
            }
          }
          await page.evaluate(() => document.querySelector("[data-file-home]")?.scrollTo({ top: 0 }));
          await sleep(300);
          await page.screenshot({ path: `${base}-${view}-top.png` });
          const m = await page.evaluate(async () => {
            const sc = document.querySelector("[data-file-home]");
            const bar = document.querySelector("[data-file-home] section[aria-label] > div.sticky");
            const search = document.querySelector('[data-file-home] input[type="search"]')?.closest("label");
            const s = search?.getBoundingClientRect();
            let cls = 0;
            new PerformanceObserver((l) => l.getEntries().forEach((e) => (cls += e.hadRecentInput ? 0 : e.value))).observe({ type: "layout-shift", buffered: false });
            const top0 = bar?.getBoundingClientRect().top;
            sc?.scrollTo({ top: 900 });
            await new Promise((r) => setTimeout(r, 600));
            const top1 = bar?.getBoundingClientRect().top;
            return {
              search: s ? { w: Math.round(s.width), h: Math.round(s.height) } : null,
              stickyTopBefore: top0,
              stickyTopAfter: top1,
              stuck: bar?.hasAttribute("data-stuck") ?? false,
              title: bar?.querySelector("h2")?.textContent ?? null,
              shellHeader: getComputedStyle(document.documentElement).getPropertyValue("--shell-header-h"),
              clsDuringScroll: cls,
            };
          });
          await page.screenshot({ path: `${base}-${view}-scrolled.png` });
          results.push({ who, theme, width, route, view, ...m });
          console.log(JSON.stringify(results.at(-1)));
        }
        // Leave the person's saved view as cards (the default).
        const grid = page.getByRole("button", { name: "Grid view" });
        if (await grid.count()) await grid.first().click();
      }
    }
  }
  await ctx.close();
}
await browser.close();
