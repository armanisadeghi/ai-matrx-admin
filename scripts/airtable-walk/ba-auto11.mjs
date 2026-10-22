// BA- CD-AUTO-11: a member with Edit flips an automation's switch on the live site, or is told why not.
import { declareTable } from "@ai-matrx/records/core";
import { admin, member, must, live, gotoTable, openAutomations, say } from "./ba-lib.mjs";
const A = await admin(); const M = await member();
let tid = process.env.TID;
if (!tid) {
  tid = must(await declareTable(A.client, { name: "BA- Auto switch", labelSingular: "Row", labelPlural: "Rows", fields: [{ key: "name", label: "Name", type: "text", sort: 10 }] }), "declare");
  must(await A.client.automationDeclare({ table_id: tid, spec: { name: "BA- notify", trigger: { on: "row_added" }, actions: [{ do: "notify", to: { author: true }, text: "BA new row" }] } }), "auto");
}
say("table", tid);
if (process.env.GRANT) say("grant", await A.sb.schema("custom").rpc("share_grant", { p_organization_id: "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f", p_subject_id: tid, p_principal_kind: "user", p_principal_id: M.userId, p_level: "editor" }).then((r) => r.error ?? "ok"));
const lvl = await M.client.myLevels({ ids: [tid] }).catch((e) => ({ err: e.message }));
say("member level", lvl);
const autos = must(await A.client.automations({ table_id: tid }), "list").automations; say("before", autos.map((a) => [a.id, a.enabled]));
const { browser, page, who, shot, errs } = await live(true);
say("who", who);
await gotoTable(page, tid); await openAutomations(page);
const sw = page.getByRole("switch", { name: "Automation on" }).first();
say("switch", await sw.getAttribute("aria-checked"), "disabled", await sw.isDisabled(), "title", await sw.getAttribute("title"));
await sw.click({ force: true, timeout: 8000 }).catch((e) => say("click err", e.message.slice(0, 80)));
await page.waitForTimeout(3000);
await shot("auto11-member" + (process.env.GRANT ? "-editor" : ""));
say("switch after", await sw.getAttribute("aria-checked"));
say("dialog text", (await page.locator("[role=dialog]").first().innerText()).slice(0, 600));
say("after", must(await A.client.automations({ table_id: tid }), "list").automations.map((a) => [a.id, a.enabled]));
say("errs", errs.slice(0, 5));
await browser.close();
