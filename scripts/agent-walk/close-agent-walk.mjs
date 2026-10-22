// Lane CLOSE-AGENT (2026-10-21): the CD-AGENT rows walked on the real table page, headless, on this lane's own host,
// as admin@admin.com (and test@test.com with WHO=member). Each phase prints PASS/FAIL lines and takes screenshots.
//
//   WALK_HOST=close-agent.localhost WALK_OUT=<dir> STATE=<file> FIX=<fixture json> node scripts/agent-walk/close-agent-walk.mjs <phase>
//
// Phases: propose (CD-AGENT-05), switch-off / switch-on (CD-AGENT-04), history (CD-AGENT-03), ask (CD-AGENT-08),
// output (CD-AGENT-09), member-settings (CD-AGENT-04 as a member).
import { chromium } from "playwright";
import { existsSync } from "node:fs";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { signIn as seatSignIn } from "../lib/seat-browser.mjs";

// The LIVE site by default (checks run on live, CLAUDE.md § Dev server); ORIGIN=http://<lane>.localhost:3001 for a fix-and-look.
const ORIGIN = process.env.ORIGIN ?? "https://www.aimatrx.com";
const OUT = process.env.WALK_OUT ?? "/tmp";
const env = {};
for (const file of [".env", ".env.local"]) {
  try {
    for (const line of readFileSync(new URL(`../../${file}`, import.meta.url), "utf8").split("\n")) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^"|"$/g, "");
    }
  } catch {}
}
const shot = async (page, name) => { const f = resolve(OUT, `${name}.png`); await page.screenshot({ path: f }); console.log(`   shot → ${f}`); return f; };

const phase = process.argv[2];
const FIX = JSON.parse(process.env.FIX ?? "{}");
const STATE = process.env.STATE;
const MEMBER = process.env.WHO === "member";
const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " — " + String(detail).slice(0, 400) : ""}`);
};

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, ...(STATE && existsSync(STATE) ? { storageState: STATE } : {}) });
const page = await ctx.newPage();
const whoami = () => page.evaluate(async () => (await (await fetch("/api/whoami")).json())?.email ?? null).catch(() => null);

async function ensureSignedIn(next) {
  await page.goto(`${ORIGIN}/dashboard`, { waitUntil: "domcontentloaded", timeout: 180000 }).catch(() => {});
  let who = await whoami();
  const email = MEMBER ? env.AI_MEMBER_USERNAME : env.AI_ADMIN_USERNAME;
  if (who !== email) {
    if (who) await ctx.clearCookies();
    who = await seatSignIn(page, ORIGIN, email, MEMBER ? env.AI_MEMBER_PASSWORD : env.AI_ADMIN_PASSWORD, MEMBER ? "member" : "admin").catch(() => null);
  }
  if (STATE) await ctx.storageState({ path: STATE });
  check(`signed in as ${MEMBER ? "test@test.com" : "admin@admin.com"}`, who === (MEMBER ? "test@test.com" : "admin@admin.com"), who);
}

async function openTable(t, query = "") {
  await page.goto(`${ORIGIN}/data/${t.table}${query}`, { waitUntil: "domcontentloaded", timeout: 180000 });
  await page.waitForSelector("[data-table-toolbar]", { timeout: 240000 }).catch(() => {});
  await page.waitForTimeout(4000);
}

const text = (sel) => page.locator(sel).first().innerText({ timeout: 30000 }).catch(() => "");

try {
  await ensureSignedIn(`/data/${(FIX.b ?? FIX.a).table}`);
  if (phase === "propose") {
    await openTable(FIX.b, "?rail=settings");
    await page.getByText("Proposed", { exact: true }).first().scrollIntoViewIfNeeded().catch(() => {});
    await shot(page, "05-settings-proposed");
    const li = page.locator("li", { hasText: "Supplier" }).filter({ has: page.getByRole("button", { name: "Accept" }) }).first();
    const seen = await li.isVisible({ timeout: 60000 }).catch(() => false);
    check("the agent's proposed column waits in the table's Settings with Accept and Reject", seen, seen ? await li.innerText() : await text("[data-table-details]"));
    if (seen) {
      await li.getByRole("button", { name: "Accept" }).click();
      await page.waitForTimeout(6000);
      await shot(page, "05-after-accept");
      const gone = !(await li.isVisible().catch(() => false));
      check("Accept takes it off the waiting list", gone);
      await page.goto(`${ORIGIN}/data/${FIX.b.table}`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("[data-table-toolbar]", { timeout: 240000 }).catch(() => {});
      await page.waitForTimeout(5000);
      const header = await page.getByRole("columnheader", { name: /Supplier/ }).first().isVisible().catch(() => false);
      const body = await page.evaluate(() => document.body.innerText);
      check("Supplier is now a column on the table", header || /\bSupplier\b/.test(body));
      await shot(page, "05-grid-with-supplier");
    }
  }
  if (phase === "switch-off" || phase === "switch-on") {
    const want = phase === "switch-on";
    await openTable(FIX.b, "?rail=settings");
    const box = page.locator("[data-table-agent-writes]").first();
    const visible = await box.isVisible({ timeout: 60000 }).catch(() => false);
    check("Settings shows the 'Agents can edit' switch", visible, visible ? await box.innerText() : "");
    if (visible) {
      const sw = box.getByRole("switch").first();
      if (((await sw.getAttribute("aria-checked")) === "true") !== want) await sw.click();
      await page.waitForTimeout(5000);
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForSelector("[data-table-agent-writes]", { timeout: 240000 }).catch(() => {});
      await page.waitForTimeout(3000);
      const after = await page.locator("[data-table-agent-writes]").first().getByRole("switch").first().getAttribute("aria-checked");
      check(`the switch reads ${want ? "on" : "off"} after a reload`, after === String(want), after);
      await shot(page, `04-switch-${want ? "on" : "off"}`);
    }
  }
  if (phase === "member-settings") {
    await openTable(FIX.a, "?rail=settings");
    await shot(page, "04-member-settings");
    const sw = await page.locator("[data-table-agent-writes]").count();
    check("a member (Edit access) is not offered the agent switch", sw === 0, `${sw} switch(es)`);
  }
  if (phase === "history") {
    await openTable(FIX.a, `?record=${FIX.a.rows.Kettle}`);
    await page.waitForTimeout(4000);
    const tab = page.getByRole("tab", { name: /History/i }).first();
    if (await tab.isVisible().catch(() => false)) await tab.click();
    else await page.getByRole("button", { name: /History/i }).first().click().catch(() => {});
    await page.waitForTimeout(6000);
    await shot(page, "03-history");
    const body = await page.evaluate(() => document.body.innerText);
    const line = body.split("\n").filter((l) => /agent|AI|Shout/i.test(l)).slice(0, 8).join(" | ");
    check("History says an agent changed the Shout value, and for whom", /agent/i.test(body) && /Shout/i.test(body), line);
    const entry = page.locator('[data-records-history-version] [role="option"]', { hasText: "agent" }).first();
    if (await entry.isVisible().catch(() => false)) await entry.click();
    await page.waitForTimeout(3000);
    await shot(page, "03-history-open");
    const ev = page.locator('[data-change-key="shout"]').first();
    const evText = (await ev.innerText().catch(() => "")).replace(/\n/g, " ");
    const evTitle = await ev.locator("[title]").last().getAttribute("title").catch(() => null);
    console.log("INFO change line:", evText, "| source tooltip:", evTitle);
    check("the agent's value says where it came from, in words", !!evTitle && !/[0-9a-f]{8}-[0-9a-f]{4}-/.test(evTitle) && !/object Object/.test(evTitle), evTitle);
  }
  if (phase === "ask") {
    await openTable(FIX.a);
    await page.locator("[data-table-ask]").first().click();
    await page.locator("[data-table-ask-box]").first().fill("How many orders with Qty over 30 are still Ordered?");
    await page.locator("[data-table-ask-go]").first().click();
    await page.waitForSelector("[data-table-ask-answer], [data-table-ask-failed]", { timeout: 240000 }).catch(() => {});
    await page.waitForTimeout(3000);
    await shot(page, "08-ask");
    const answer = await text("[data-table-ask-panel]");
    check("Ask this table answers 2 (Mugs 40, Filters 31)", /\b2\b|two/i.test(answer) && !(await page.locator("[data-table-ask-failed]").count()), answer.replace(/\n/g, " "));
    const cited = await text("[data-table-ask-cited]");
    check("the answer names the rows it used", /Mugs/.test(cited + answer) && /Filters/.test(cited + answer), cited.replace(/\n/g, " "));
  }
  if (phase === "output") {
    const o = FIX.output;
    await page.goto(`${ORIGIN}/data/${o.table}?filter=${encodeURIComponent(JSON.stringify(o.filter))}&from=${encodeURIComponent(o.from)}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("[data-table-toolbar]", { timeout: 240000 }).catch(() => {});
    await page.waitForTimeout(6000);
    await shot(page, "09-output-rows");
    const body = await page.evaluate(() => document.body.innerText);
    const every = o.expect.every((t) => body.includes(t));
    const stranger = o.notExpect && body.includes(o.notExpect);
    check(`the items table opened on one output shows its ${o.expect.length} rows and says where they came from`, every && !stranger && body.includes(o.from), body.split("\n").filter((l) => l.includes(o.from)).slice(0, 2).join(" | "));
  }
} catch (e) {
  check(`phase ${phase} ran to the end`, false, e.message.split("\n")[0]);
  await shot(page, `${phase}-error`).catch(() => {});
}
console.log(results.every(Boolean) ? "RESULT PASS" : "RESULT FAIL");
await browser.close();
