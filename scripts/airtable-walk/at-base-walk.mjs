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
const homes = [];
const fails = [];
const check = (label, ok, detail = "") => { say((ok ? "PASS " : "FAIL ") + label + (ok ? "" : "  — " + String(detail).slice(0, 300))); if (!ok) fails.push(label); };

// seed: Projects + Tasks in ONE Home, a link between them, rows, an automation (on) and a page
const p = await ensureTable(client, { name: `Harbor walk Projects ${tag}`, fields: [{ key: "name", label: "Name", type: "text", sort: 10 }, { key: "budget", label: "Budget", type: "number", sort: 20 }] });
if (!p.ok) throw new Error("projects " + JSON.stringify(p.error));
const projects = p.data, home = p.homeId;
homes.push(home);
const t = await ensureTable(client, { name: `Harbor walk Tasks ${tag}`, homeId: home, fields: [{ key: "task", label: "Task", type: "text", sort: 10 }, { key: "project", label: "Project", type: "relation", relationTarget: projects, sort: 20 }] });
if (!t.ok) throw new Error("tasks " + JSON.stringify(t.error));
const tasks = t.data;
made.push(projects, tasks);
const pr = must(await client.recordWrite({ table_id: projects, data: { name: "Rebrand", budget: 12000 } }), "project");
for (const task of ["Logo", "Palette"]) must(await client.recordWrite({ table_id: tasks, data: { task, project: pr } }), "task");
const dash = await client.dashboardDeclare({ table_id: projects, name: "Overview", blocks: [], presentation: { kind: "page" } });
const taskField = must(await client.fields({ table_id: tasks }), "fields").find((f) => f.key === "task");
// The store answers ok:true with {ok:false,_errors} for a spec it refuses: the seed checks BOTH, or the walk would "pass" over a base with no automation in it.
const auto = await client.automationDeclare({ table_id: tasks, spec: { name: "Note new tasks", trigger: { on: "property_edited", field: taskField.id }, actions: [{ do: "notify", to: { author: true }, text: "A task changed" }] } });
if (!dash.ok) throw new Error("seed page refused: " + JSON.stringify(dash.error));
if (!auto.ok || !auto.data.ok) throw new Error("seed automation refused: " + JSON.stringify(auto.ok ? auto.data._errors : auto.error));
say("seed", { home, projects, tasks, page: dash.ok, automation: true });

let browser, page, errs = [];
const shot = (n) => page.screenshot({ path: `${SHOTS}/${n}.png` });
const dialog = () => page.locator('[role="dialog"]');
try {
  let who;
  for (let attempt = 1; attempt <= 3 && !browser; attempt++) {
    try { ({ browser, page, who, errs } = await start(false)); if (String(who).startsWith("ERR")) { await browser.close().catch(() => {}); browser = undefined; } } catch { browser = undefined; }
  }
  if (!browser) throw new Error("could not sign in as admin after 3 tries (the preview server was too slow)");
  say("signed in as", who);
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
  await page.waitForSelector(`[data-base-name]:has-text("Harbor Studio ${tag}")`, { timeout: 90000 });
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
  await page.waitForURL((u) => /\/data\/bases\/[0-9a-f-]{36}/.test(u.pathname) && !u.pathname.endsWith(home), { timeout: 120000 });
  await page.waitForSelector("[data-base-page]", { timeout: 90000 });
  await page.waitForSelector("text=Note new tasks", { timeout: 60000 }).catch(() => {});
  const copyHome = page.url().split("/").pop();
  homes.push(copyHome);
  await shot("07-copy-opened");
  const copyBody = await page.locator("[data-base-page]").innerText();
  check("the copy is a NEW base (a different Home) named '(copy)'", copyHome !== home && /\(copy\)/.test(await page.locator("[data-base-name]").innerText()), copyHome + " " + home);
  check("the copy's page lists its 2 tables, the page and the automation switched Off", (await page.locator("[data-base-table]").count()) === 2 && copyBody.includes("Overview") && /Note new tasks[\s\S]*Off/.test(copyBody), copyBody.slice(0, 400));
  const originalAfter = await page.goto(`${ORIGIN}/data/bases/${home}`, { waitUntil: "domcontentloaded" }).then(() => page.waitForSelector(`[data-base-page="${home}"]`, { timeout: 90000 })).then(() => page.locator("[data-base-table]").count());
  check("the original base still lists exactly its own 2 tables", originalAfter === 2, String(originalAfter));
  // the copy's link column points at the copy's Projects, never the original
  const listed = must(await client.tableList(), "tables").filter((x) => x.name.includes(tag));
  const copyProjects = listed.find((x) => x.name.startsWith("Harbor walk Projects") && x.name.includes("(copy)"));
  const copyTasks = listed.find((x) => x.name.startsWith("Harbor walk Tasks") && x.name.includes("(copy)"));
  check("the copy made two tables", !!copyProjects && !!copyTasks, listed.map((x) => x.name).join("|"));
  if (copyProjects && copyTasks) {
    made.push(copyProjects.id, copyTasks.id);
    say("DIAG copy automations:", JSON.stringify((await client.automations({ table_id: copyTasks.id })).data?.automations?.map((x) => [x.name, x.enabled])));
    const f = must(await client.fields({ table_id: copyTasks.id }), "fields").find((x) => x.key === "project");
    check("the copy's link points at the copy's Projects, not the original", f?.relation_target === copyProjects.id && f?.relation_target !== projects, JSON.stringify(f?.relation_target));
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
  await page.waitForURL((u) => /\/data\/bases\/[0-9a-f-]{36}/.test(u.pathname) && !u.pathname.endsWith(home), { timeout: 240000 }).catch(() => {});
  await page.waitForSelector("[data-base-page]", { timeout: 120000 });
  const restoredHome = page.url().split("/").pop();
  await shot("09-restored-base");
  check("restore opens a NEW base (not the one it came from)", restoredHome !== home, restoredHome);
  homes.push(restoredHome);
  check("the restored base is named '(restored <date>)'", /\(restored /.test(await page.locator("[data-base-name]").innerText()));
  const restoredBody = await page.locator("[data-base-page]").innerText();
  check("the restored base lists its page and its automation, switched Off", restoredBody.includes("Overview") && /Note new tasks[\s\S]*Off/.test(restoredBody), restoredBody.slice(0, 400));
  const restoredTables = await page.locator("[data-base-table]").allInnerTexts();
  check("the restored base has its tables, working", restoredTables.length === 2 && restoredTables.every((n) => /restored/.test(n)), restoredTables.join("|"));
  if (restoredTables.length) {
    await page.locator("[data-base-table]").first().click();
    await page.waitForSelector("[data-table-toolbar], [role=grid], table", { timeout: 120000 }).catch(() => {});
    await shot("10-restored-table-opens");
  }
  for (const x of must(await client.tableList(), "tables")) if (x.name.includes(tag) && /restored/.test(x.name)) made.push(x.id);

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
  await page.keyboard.press("Escape");

  // One-time Sheets import: REAL server, a public Google sample sheet (Google's own "Class Data" example, read-only for everyone). No company Google account is used.
  await page.locator("[data-base-sheets]").click();
  await page.waitForSelector("[data-sheets-import]");
  await page.getByLabel("Google Sheets link").fill("https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit");
  await shot("12-sheets-dialog");
  await page.locator("[data-sheets-go]").click();
  const sheetsOutcome = await Promise.race([
    page.waitForSelector("[data-sheets-done]", { timeout: 120000 }).then(() => "done"),
    page.waitForSelector('[data-sheets-import] [role="alert"]', { timeout: 120000 }).then(async () => "alert: " + (await page.locator('[data-sheets-import] [role="alert"]').innerText())),
  ]).catch((e) => "timeout " + e.message.split("\n")[0]);
  await shot("13-sheets-result");
  check("the one-time Sheets dialog brought a public sheet in as a table (real server)", sheetsOutcome === "done", sheetsOutcome);
  if (sheetsOutcome === "done") {
    const href = await page.locator("[data-sheets-done] a").getAttribute("href");
    const sheetTable = href?.split("/").pop();
    check("the Sheets table has rows", /\d+ rows are now a table/.test(await page.locator("[data-sheets-done]").innerText()));
    if (sheetTable) made.push(sheetTable);
  }
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
    for (const h of new Set(homes)) await client.recordDelete({ record_id: h }).catch(() => {});
    say("archived", made.length, "tables and", new Set(homes).size, "homes");
  }
  // Honest exit: any failed check, or a stop partway, is a non-zero exit and never "ALL PASSED".
  if (fails.length) { say("FAILED: " + fails.join("; ")); process.exitCode = 1; } else say("ALL PASSED");
}
