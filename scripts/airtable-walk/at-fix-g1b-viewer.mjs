// AT-FIX-G1b item 2: test@test.com holding only View on a fresh table ticks two rows; the bulk bar's write buttons must be
// disabled with the reason "Needs Edit access" while ticking still works and Print stays enabled. Archives its table.
import { ensureTable } from "@ai-matrx/records/core";
import { store } from "./store.mjs";
import { start, ORIGIN } from "./lib.mjs";
process.env.WALK_ORG_ID ??= "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const { sb, client } = await store();
const MEMBER = "4060701e-706a-4c76-b3ca-0bbc69fa5a14"; // test@test.com
const ok = (r, w) => { if (!r.ok) throw new Error(w + ": " + JSON.stringify(r.error)); return r.data; };
const tag = Date.now().toString(36).slice(-4);
const table = ok(await ensureTable(client, { name: `ATFG1b viewer ${tag}`, fields: [{ key: "name", label: "Name", type: "text", sort: 10 }, { key: "note", label: "Note", type: "text", sort: 20 }] }), "table");
async function archive() { for (let i = 0; i < 20; i++) { const a = await client.tableArchive({ table_id: table, chunk: 2, includeTable: true }); if (a.ok && a.data.done) { console.log("table archived"); break; } } }
try { for (const n of ["Alpha", "Bravo", "Charlie"]) ok(await client.recordWrite({ table_id: table, data: { name: n } }), "row"); } catch (e) { console.log("seed ERROR", e.message); }
const level = process.env.LEVEL ?? "viewer";
const g = await sb.schema("custom").rpc("share_grant", { p_organization_id: process.env.WALK_ORG_ID, p_subject_id: table, p_principal_kind: "user", p_principal_id: MEMBER, p_level: level });
console.log("table", table, "granted", level, g.error ? "ERR " + g.error.message : "ok");
const s = await start(true); const page = s.page; page.setDefaultTimeout(15000);
let code = 1;
try {
  console.log("signed in as", s.who);
  await page.goto(`${ORIGIN}/data/${table}`, { waitUntil: "domcontentloaded", timeout: 240000 });
  const resume = page.getByRole("button", { name: "Resume this preview" });
  if (await resume.count()) { console.log("preview was paused: resuming"); await resume.click(); }
  await page.waitForSelector("[data-table-toolbar]", { timeout: 240000 }); await page.getByText("Alpha", { exact: true }).first().waitFor({ timeout: 120000 }); await page.waitForTimeout(3000);
  const boxes = page.getByRole("checkbox", { name: /select row|select .*row|tick/i }).or(page.locator("tbody input[type=checkbox], [role=row] input[type=checkbox], [role=row] [role=checkbox]"));
  console.log("checkboxes", await boxes.count());
  await boxes.nth(1).click(); await boxes.nth(2).click(); await page.waitForTimeout(1500);
  const bar = await page.locator("[data-records-bulk]").evaluateAll((b) => b.map((x) => `${x.getAttribute("data-records-bulk")}:${x.disabled ? "disabled" : "enabled"}:${x.closest("[title]")?.getAttribute("title") ?? ""}`));
  console.log("bulk buttons:", bar.join(" | "));
  const ticked = await page.locator("[role=checkbox][aria-checked=true], input[type=checkbox]:checked").count();
  console.log("ticked boxes:", ticked);
  await page.screenshot({ path: "/tmp/atfg1b-viewer.png" });
  const w = bar.filter((x) => /^(set|clear|fill|duplicate|delete):/.test(x));
  code = w.length > 0 && w.every((x) => x.split(":")[1] === "disabled" && /Needs Edit access/.test(x)) && bar.some((x) => x.startsWith("print:enabled")) && ticked >= 2 ? 0 : 1;
} catch (e) { console.log("ERROR", e.message.split("\n")[0]); await page.screenshot({ path: "/tmp/atfg1b-viewer-err.png" }).catch(() => {}); }
await s.browser.close();
await archive();
console.log(code === 0 ? "PASS" : "FAIL");
process.exit(code);
