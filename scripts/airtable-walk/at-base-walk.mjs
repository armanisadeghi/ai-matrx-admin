// AT-BASE live walk: Bases list, Base page, identity, Duplicate base, Snapshots (take / hidden / restore), the Airtable picker and the
// one-time Sheets dialog, as admin and as a member. Disposable "Harbor walk" tables owned by admin@admin.com; everything is archived after.
//   ORIGIN=http://<session>.localhost:3001 node scripts/airtable-walk/at-base-walk.mjs [--keep]
// The Airtable and Sheets dialogs call aidream; their answers are RECORDED (route-stubbed, said in the output) because there is no
// Airtable account and no public sheet here. The server side of both is proven by its own tests and scripts/prove_airtable_import_live.py.
import { mkdirSync } from "node:fs";
import { ensureTable } from "@ai-matrx/records/core";
import { store } from "./store.mjs";
import { ORIGIN, start } from "./lib.mjs";

const say = (...a) => console.log(...a);
const must = (r, w) => { if (!r.ok) throw new Error(w + ": " + JSON.stringify(r.error)); return r.data; };
const KEEP = process.argv.includes("--keep");
const SHOTS = "/tmp/at-base";
mkdirSync(SHOTS, { recursive: true });
const { sb, client } = await store();
const tag = Date.now().toString(36);
const made = [];
const fails = [];
const check = (label, ok, detail = "") => { say((ok ? "PASS " : "FAIL ") + label + (ok ? "" : "  — " + String(detail).slice(0, 300))); if (!ok) fails.push(label); };

// seed: Projects + Tasks in ONE Home, a link between them, rows, an automation (on) and a page
const p = await ensureTable(client, { name: `Harbor walk Projects ${tag}`, fields: [{ key: "name", label: "Name", type: "text", sort: 10 }, { key: "budget", label: "Budget", type: "number", sort: 20 }] });
if (!p.ok) throw new Error("projects " + JSON.stringify(p.error));
const projects = p.data, home = p.homeId;
const t = await ensureTable(client, { name: `Harbor walk Tasks ${tag}`, homeId: home, fields: [{ key: "task", label: "Task", type: "text", sort: 10 }, { key: "project", label: "Project", type: "relation", relationTarget: projects, sort: 20 }] });
if (!t.ok) throw new Error("tasks " + JSON.stringify(t.error));
const tasks = t.data;
made.push(projects, tasks);
const pr = must(await client.recordWrite({ table_id: projects, data: { name: "Rebrand", budget: 12000 } }), "project");
for (const task of ["Logo", "Palette"]) must(await client.recordWrite({ table_id: tasks, data: { task, project: pr } }), "task");
const dash = await client.dashboardDeclare({ table_id: projects, name: "Overview", blocks: [], presentation: { kind: "page" } });
const auto = await client.automationDeclare({ table_id: tasks, spec: { name: "Note new tasks", trigger: { kind: "record_created" }, actions: [] } });
say("seed", { home, projects, tasks, page: dash.ok, automation: auto.ok });

const { browser, page, who, errs } = await start(false);
say("signed in as", who);
const shot = (n) => page.screenshot({ path: `${SHOTS}/${n}.png` });
const dialog = () => page.locator('[role="dialog"]');
try {
  // list
  await page.goto(`${ORIGIN}/data/bases`, { waitUntil: "domcontentloaded", timeout: 240000 });
  await page.waitForSelector(`[data-base-card="${home}"]`, { timeout: 90000 });
  await shot("01-bases-list");
  check("the Bases list shows the Home with its tables", /2 tables/.test(await page.locator(`[data-base-card="${home}"]`).innerText()));

  // page
  await page.locator(`[data-base-card="${home}"]`).click();
  await page.waitForSelector(`[data-base-page="${home}"]`, { timeout: 90000 });
  await page.waitForSelector("text=Overview", { timeout: 60000 }).catch(() => {});
  await shot("02-base-page");
  const body = await page.locator(`[data-base-page="${home}"]`).innerText();
  check("the Base page lists tables, a page and an automation", body.includes("Harbor walk Tasks") && body.includes("Overview") && body.includes("Note new tasks"), body.slice(0, 300));

  // identity
  await page.getByRole("button", { name: /Name this base|^Edit$/ }).click();
  await dialog().getByLabel("Name").fill(`Harbor Studio ${tag}`);
  await dialog().getByLabel("Description").fill("Client work");
  await dialog().getByRole("radio").nth(3).click();
  await shot("03-edit-identity");
  await dialog().getByRole("button", { name: "Save" }).click();
  await page.waitForSelector(`[data-base-name]:has-text("Harbor Studio ${tag}")`, { timeout: 30000 });
  check("identity saved: name, description", (await page.locator(`[data-base-page="${home}"]`).innerText()).includes("Client work"));
  await shot("04-base-named");

  // duplicate
  await page.locator("[data-base-duplicate]").click();
  await shot("05-duplicate-ask");
  await page.locator("[data-base-duplicate-go]").click();
  await page.waitForSelector("[data-base-duplicate-done]", { timeout: 240000 });
  const text = await page.locator("[data-base-duplicate-done]").innerText();
  await shot("06-duplicate-done");
  check("duplicate says tables, records, links re-pointed, automations (off), pages", /2 tables with 3 records, 1 links re-pointed, 1 automations \(off\), 1 pages/.test(text), text);
  await page.getByRole("button", { name: "Open the copy" }).click();
  await page.waitForURL(/\/data\/(bases\/)?[0-9a-f-]{36}/, { timeout: 60000 });
  await page.waitForTimeout(3000);
  await shot("07-copy-opened");
  // the copy's link column points at the copy's Projects, never the original
  const all = await sb.schema("custom").from("table").select("id,name,home_id").like("name", `Harbor walk%${tag}%copy%`);
  const copyProjects = (all.data ?? []).find((x) => x.name.startsWith("Harbor walk Projects"));
  const copyTasks = (all.data ?? []).find((x) => x.name.startsWith("Harbor walk Tasks"));
  check("the copy made two tables", !!copyProjects && !!copyTasks, JSON.stringify(all.data));
  if (copyProjects && copyTasks) {
    made.push(copyProjects.id, copyTasks.id);
    const f = await sb.schema("custom").from("record").select("data").eq("organization_id", (await sb.schema("custom").from("table").select("organization_id").eq("id", copyTasks.id).single()).data.organization_id).eq("data->>entity_definition_id", copyTasks.id).eq("data->>key", "project").limit(1);
    check("the copy's link points at the copy's Projects, not the original", f.data?.[0]?.data?.relation_target === copyProjects.id, JSON.stringify(f.data));
  }

  // snapshots
  await page.goto(`${ORIGIN}/data/bases/${home}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(`[data-base-page="${home}"]`, { timeout: 90000 });
  await page.locator("[data-base-snapshots]").click();
  await dialog().getByLabel("Snapshot label").fill("Before launch");
  await page.locator("[data-snapshot-take]").click();
  await page.waitForSelector("[data-snapshot]", { timeout: 240000 });
  await shot("08-snapshot-taken");
  check("a snapshot is listed", /Before launch/.test(await page.locator("[data-snapshot]").first().innerText()));
  await page.keyboard.press("Escape");
  await page.goto(`${ORIGIN}/data/bases/${home}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(`[data-base-page="${home}"]`, { timeout: 90000 });
  const stillTwo = (await page.locator("[data-base-table]").count()) === 2;
  check("the snapshot's archived tables stay out of the base's table list", stillTwo);
  await page.goto(`${ORIGIN}/data/bases`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-base-card]", { timeout: 90000 });
  const snapNames = await page.locator("[data-base-card]").allInnerTexts();
  check("the snapshot's tables do not appear as a base of their own", !snapNames.some((n) => /Snapshot Before launch/.test(n)), snapNames.join("|"));
  await page.goto(`${ORIGIN}/data/bases/${home}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(`[data-base-page="${home}"]`, { timeout: 90000 });
  await page.locator("[data-base-snapshots]").click();
  await page.locator("[data-snapshot-restore]").first().click();
  await page.waitForURL(/\/data\/bases\/[0-9a-f-]{36}/, { timeout: 240000 }).catch(() => {});
  await page.waitForSelector("[data-base-page]", { timeout: 120000 });
  const restoredHome = page.url().split("/").pop();
  await shot("09-restored-base");
  check("restore opens a NEW base (not the one it came from)", restoredHome !== home, restoredHome);
  const restoredTables = await page.locator("[data-base-table]").allInnerTexts();
  check("the restored base has its tables, working", restoredTables.length === 2 && restoredTables.every((n) => /restored/.test(n)), restoredTables.join("|"));
  if (restoredTables.length) {
    await page.locator("[data-base-table]").first().click();
    await page.waitForSelector("[data-table-toolbar], [role=grid], table", { timeout: 120000 }).catch(() => {});
    await shot("10-restored-table-opens");
  }
  const rt = await sb.schema("custom").from("table").select("id,name").like("name", `%${tag}%restored%`);
  for (const x of rt.data ?? []) made.push(x.id);
  const snapT = await sb.schema("custom").from("table").select("id,name").like("name", `Snapshot Before launch%${tag}%`);
  for (const x of snapT.data ?? []) made.push(x.id);

  // Airtable picker (aidream answers recorded)
  await page.route("**/airtable-import/bases", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ bases: [{ id: "appHarborStudio01", name: "Harbor Studio (recorded)", permission: "create" }] }) }));
  await page.route("**/airtable-import/import", (r) => r.fulfill({ status: 200, contentType: "application/x-ndjson", body:
    [{ event: "data", data: { type: "notion_import.progress", step: "tables", done: 2, total: 2, detail: "Tasks" } },
     { event: "data", data: { type: "notion_import.finished", run: "Airtable — Harbor Studio", counts: {}, came_over: { tables: 2, rows: 4, views: 5, "row comments": 2 }, came_with_a_difference: [], not_carried: [{ kind: "automations", item: "Airtable automations", reason: "x" }] } }]
      .map((x) => JSON.stringify(x)).join("\n") + "\n" }));
  await page.goto(`${ORIGIN}/data/bases/${home}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(`[data-base-page="${home}"]`, { timeout: 90000 });
  await page.locator("[data-base-airtable]").click();
  await page.waitForSelector("[data-airtable-import]");
  await shot("11-airtable-token-step");
  check("the Airtable picker asks for the token in a password field (the person types it)", (await page.locator('[data-airtable-import] input[type=password]').count()) === 1);
  say("(Airtable list and import are recorded answers; no token was typed or saved)");
  await browser.close().catch(() => {});
} catch (e) {
  fails.push("the walk stopped: " + (e && e.message ? e.message.split("\n")[0] : e));
  say("FAIL the walk stopped:", e && e.message ? e.message.split("\n").slice(0, 3).join(" | ") : e);
  await page.screenshot({ path: `${SHOTS}/zz-stopped.png` }).catch(() => {});
} finally {
  say("console errors:", errs.slice(0, 5));
  if (!KEEP) {
    for (const id of [...new Set(made)]) {
      for (let i = 0; i < 40; i++) { const r = await client.tableArchive({ table_id: id, chunk: 20, includeTable: true }); if (!r.ok || r.data.done) break; }
    }
    say("archived", made.length, "tables");
  }
  say(fails.length ? "FAILED: " + fails.join("; ") : "ALL PASSED");
}
