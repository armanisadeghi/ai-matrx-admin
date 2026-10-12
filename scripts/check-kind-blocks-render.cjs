#!/usr/bin/env node
/**
 * THE RENDERED KIND-BLOCK GATE. Mounts each kind block in the real app (the /shapes/<kind> preview,
 * as admin) through its loading and loaded states and fails on
 *   - any React hook-order error ("Rendered more hooks", "change in the order of Hooks"), or
 *   - the generic key/value dump (a kind with its own component must not fall back to it), or
 *   - a build/runtime error overlay.
 * One FRESH page per kind: hook errors are attributed to the block that threw them, not carried
 * over from the previous page.
 *
 *   node scripts/check-kind-blocks-render.cjs [kind ...]      (needs `pnpm preview:start` running)
 */
const { chromium } = require("playwright");
const { execSync } = require("node:child_process");
const ROOT = require("node:path").resolve(__dirname, "..");
const DEFAULT = [
  "quiz_set", "flashcard_set", "timeline", "task_list", "decision_tree", "presentation_deck",
  "cooking_recipe", "resource_collection", "structured_info", "questionnaire",
  "troubleshooting_guide", "progress_tracker", "comparison_set", "research_report",
];
const MODES = ["Chat — fenced", "Loading state", "Reloaded from a record", "Direct object"];
const HOOKS = /more hooks|fewer hooks|order of Hooks/i;
const DUMP = /The reader gets the generic key\/value view/i;

(async () => {
  const kinds = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT;
  const url = execSync(`cd ${ROOT} && pnpm -s dev-login /shapes/${kinds[0]}`, { encoding: "utf8" }).match(/OPEN\s*:\s*(\S+)/)[1];
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const first = await ctx.newPage();
  await first.goto(url, { waitUntil: "domcontentloaded", timeout: 240000 });
  await first.waitForTimeout(4000);
  const origin = new URL(first.url()).origin;
  await first.close();
  const failures = [];
  for (const kind of kinds) {
    const page = await ctx.newPage();
    let mode = "initial";
    page.on("console", (m) => {
      if (m.type() === "error" && HOOKS.test(m.text())) failures.push(`${kind} [${mode}] hook-order: ${m.text().replace(/\s+/g, " ").slice(0, 160)}`);
    });
    page.on("pageerror", (e) => { if (HOOKS.test(String(e))) failures.push(`${kind} [${mode}] hook-order: ${String(e).slice(0, 160)}`); });
    try {
      await page.goto(`${origin}/shapes/${kind}`, { waitUntil: "domcontentloaded", timeout: 240000 });
      await page.waitForTimeout(10000);
      for (const m of MODES) {
        mode = m;
        const btn = page.getByRole("button", { name: m, exact: true }).first();
        if (!(await btn.count())) continue;
        await btn.click();
        await page.waitForTimeout(2500);
        const text = await page.locator("body").innerText();
        if (/Build Error|Module not found/.test(text)) failures.push(`${kind} [${m}] build error overlay`);
        if (m !== "Loading state" && DUMP.test(text)) failures.push(`${kind} [${m}] generic key/value dump`);
      }
    } catch (e) {
      failures.push(`${kind} could not be driven: ${String(e).slice(0, 120)}`);
    }
    console.log(`${failures.some((f) => f.startsWith(kind + " ")) ? "FAIL" : "ok  "} ${kind}`);
    await page.close();
  }
  await browser.close();
  if (failures.length) { console.log("\n" + failures.join("\n")); process.exit(1); }
  console.log("\nall kind blocks render without hook errors or a fallback dump");
})().catch((e) => { console.error(e); process.exit(2); });
