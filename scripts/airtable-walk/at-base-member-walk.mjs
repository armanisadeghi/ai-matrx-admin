// AT-BASE member walk: test@test.com (not a member of admin's organization) opens the Bases list and a base page that is not theirs.
//   ORIGIN=http://<session>.localhost:3001 node scripts/airtable-walk/at-base-member-walk.mjs
// Seeds one disposable base as admin, archives it after. Exit code 1 on any failed check.
import { ensureTable } from "@ai-matrx/records/core";
import { store } from "./store.mjs";
import { ORIGIN, start } from "./lib.mjs";

const { client } = await store();
const tag = Date.now().toString(36);
const fails = [];
const check = (label, ok, detail = "") => { console.log((ok ? "PASS " : "FAIL ") + label + (ok ? "" : "  — " + String(detail).slice(0, 300))); if (!ok) fails.push(label); };
const t = await ensureTable(client, { name: `Harbor member walk ${tag}`, fields: [{ key: "name", label: "Name", type: "text" }] });
if (!t.ok) throw new Error("seed refused: " + JSON.stringify(t.error));
const home = t.homeId;
let browser;
try {
  const s = await start(true);
  browser = s.browser;
  console.log("signed in as", s.who);
  if (String(s.who).startsWith("ERR")) throw new Error("member sign-in failed: " + s.who);
  await s.page.goto(`${ORIGIN}/data/bases`, { waitUntil: "domcontentloaded", timeout: 240000 });
  await s.page.waitForSelector("[data-bases-home]", { timeout: 120000 });
  await s.page.waitForTimeout(4000);
  const list = await s.page.locator("[data-bases-home]").innerText();
  check("the member's Bases list opens without an error", !/could not be read/i.test(list), list.slice(0, 200));
  check("the admin's base is not in the member's list", (await s.page.locator(`[data-base-card="${home}"]`).count()) === 0);
  await s.page.goto(`${ORIGIN}/data/bases/${home}`, { waitUntil: "domcontentloaded", timeout: 240000 });
  await s.page.waitForTimeout(6000);
  const body = await s.page.locator("body").innerText();
  check("a base the member was not given says so and shows nothing of it", /not found, or you have not been given it|Choose the organization/i.test(body) && !body.includes("Harbor member walk"), body.slice(0, 300));
  console.log("console errors:", s.errs.slice(0, 5));
} catch (e) {
  fails.push("the walk stopped: " + String(e.message).split("\n")[0]);
  console.log("FAIL the walk stopped:", e.message);
} finally {
  await browser?.close().catch(() => {});
  for (let i = 0; i < 40; i++) { const r = await client.tableArchive({ table_id: t.data, chunk: 20, includeTable: true }); if (!r.ok || r.data.done) break; }
  await client.recordDelete({ record_id: home }).catch(() => {});
  if (fails.length) { console.log("FAILED: " + fails.join("; ")); process.exitCode = 1; } else console.log("ALL PASSED");
}
