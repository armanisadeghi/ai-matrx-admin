// LANE CONTEXT-PASSTHROUGH — headless walk of the Orchestra builder's "Receives" card on a real
// site as admin@admin.com (credentials from .env.local / .env, never printed). Changes one test
// member's connection through the card (mode, list, Add by Enter, Person & org), reads each save
// back from the database, then restores the connection it found.
//
// Usage: node scripts/orchestra-receives-walk.mjs <outDir> [origin] [conductorId] [memberName]
import { chromium } from "playwright";
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { signIn, until } from "./lib/seat-browser.mjs";

const ROOT = resolve(new URL(".", import.meta.url).pathname, "..");
const env = {};
for (const f of [".env", ".env.local"]) {
  const p = resolve(ROOT, f);
  if (!existsSync(p)) continue;
  for (const l of readFileSync(p, "utf8").split("\n")) {
    const m = l.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const OUT = process.argv[2] ?? "/tmp/receives-walk";
const ORIGIN = process.argv[3] ?? "https://aimatrx.com";
const CONDUCTOR = process.argv[4] ?? "4e9ad3b6-34f9-4f6b-9d07-ebeea6062126";
const MEMBER = process.argv[5] ?? "Report Writer";
mkdirSync(OUT, { recursive: true });

const report = { steps: [], consoleErrors: [], saves: [] };
const step = (name, ok, detail = "") => {
  report.steps.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
};
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await context.newPage();
page.on("console", (m) => { if (m.type() === "error") report.consoleErrors.push(m.text().slice(0, 300)); });
page.on("response", async (r) => {
  if (r.url().includes("orchestra_member_set_context")) {
    let body = null;
    try { body = await r.json(); } catch {}
    report.saves.push({ status: r.status(), body });
  }
});
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });

await signIn(page, ORIGIN, env.AI_ADMIN_USERNAME, env.AI_ADMIN_PASSWORD, "admin");
await page.goto(`${ORIGIN}/agents/orchestras/${CONDUCTOR}`, { waitUntil: "domcontentloaded", timeout: 120000 });
const memberNode = page.getByText(MEMBER, { exact: false }).first();
// The node's hover actions sit over its title's right end: press its description line instead.
const openMember = async () => {
  // The member's own "Edit role" button (revealed on hover) opens its inspector.
  const node = page.locator("div", { has: page.locator(`h4[title*="${MEMBER}"]`) }).filter({ has: page.getByRole("button", { name: "Edit role" }) }).last();
  await node.hover();
  await node.getByRole("button", { name: "Edit role" }).click();
};
const seen = await until("member visible", async () => (await memberNode.count()) && (await memberNode.isVisible()), 90000);
step("builder shows the member", !!seen.v, `${seen.ms} ms`);
await shot("01-builder");
await openMember();
const card = page.getByTestId("member-receives");
const cardSeen = await until("receives card", async () => (await card.count()) && (await card.isVisible()), 30000);
step("member inspector shows the Receives card", !!cardSeen.v);
await shot("02-receives");
const trigger = card.getByRole("combobox", { name: "Receives" });
const startMode = (await trigger.textContent())?.trim();
step("current mode is shown", !!startMode, startMode ?? "");

const savesBefore = () => report.saves.length;
async function waitSave(n, label) {
  const r = await until(label, async () => report.saves.length > n && report.saves.at(-1).status < 300, 20000);
  return r.v ? report.saves.at(-1).body : null;
}
async function pickMode(label) {
  const n = savesBefore();
  await trigger.click();
  await page.getByRole("option", { name: label }).click();
  return waitSave(n, `save ${label}`);
}

let saved = await pickMode("Mirror");
step("switching to Mirror saves", saved?.context?.mode === "mirror", JSON.stringify(saved?.context ?? saved));
await until("all except row", async () => (await card.getByText("All except").count()) > 0, 10000);
step("Mirror shows the All except list", (await card.getByText("All except").count()) > 0);
await shot("03-mirror");

// Add a value name by typing and pressing Enter.
await card.getByRole("button", { name: /None|,/ }).first().click();
const input = page.getByRole("textbox", { name: "Add a value name" });
await input.fill("internal_note");
let n = savesBefore();
await input.press("Enter");
saved = await waitSave(n, "save add");
step("Enter adds a value name and saves", JSON.stringify(saved?.context?.all_except ?? []).includes("internal_note"),
  JSON.stringify(saved?.context ?? saved));
await shot("04-added");
await page.keyboard.press("Escape");

saved = await pickMode("Handed over");
step("switching to Handed over saves and keeps lists per mode", saved?.context?.mode === "handed_over",
  JSON.stringify(saved?.context ?? saved));
await until("always send row", async () => (await card.getByText("Always send").count()) > 0, 10000);
step("Handed over shows the Always send list", (await card.getByText("Always send").count()) > 0);

const sw = card.getByRole("switch");
const wasOn = (await sw.getAttribute("aria-checked")) === "true";
n = savesBefore();
await sw.click();
saved = await waitSave(n, "save switch");
step("Person & org switch saves", saved?.context?.person_and_org === !wasOn, JSON.stringify(saved?.context ?? saved));
await shot("05-switch");

saved = await pickMode("Closed");
step("switching to Closed saves", saved?.context?.mode === "closed", JSON.stringify(saved?.context ?? saved));
await shot("06-closed");

// Reload: the saved state reads back from the database.
await page.reload({ waitUntil: "domcontentloaded" });
await until("member visible again", async () => (await memberNode.count()) && (await memberNode.isVisible()), 90000);
await openMember();
await until("card again", async () => (await card.count()) && (await card.isVisible()), 30000);
const afterReload = (await card.getByRole("combobox", { name: "Receives" }).textContent())?.trim();
step("after reload the card shows the saved mode", afterReload === "Closed", afterReload ?? "");
await shot("07-reloaded");

// Restore: Handed over, person & org on, no lists.
saved = await pickMode("Handed over");
const swNow = card.getByRole("switch");
if ((await swNow.getAttribute("aria-checked")) !== "true") {
  n = savesBefore();
  await swNow.click();
  saved = await waitSave(n, "restore switch");
}
step("restored to Handed over with person & org on", saved?.context?.mode === "handed_over" && saved?.context?.person_and_org !== false,
  JSON.stringify(saved?.context ?? saved));
report.consoleErrors = report.consoleErrors.filter((e) => !/favicon|ResizeObserver/.test(e));
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
console.log(`console errors: ${report.consoleErrors.length}`);
for (const e of report.consoleErrors.slice(0, 8)) console.log(`  ${e}`);
await browser.close();
process.exit(report.steps.every((s) => s.ok) ? 0 : 1);
