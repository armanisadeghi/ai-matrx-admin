// CLOSE-LINK proof 3 (store, admin): cascade takes contained serials with their widget (CD-LINK-06); entity-reference column seed (02).
import { declareTable } from "@ai-matrx/records/core";
import { admin, must, say, err, remember } from "./cl-lib.mjs";
const a = await admin();
const tag = Math.random().toString(36).slice(2, 5);
const widgets = must(await declareTable(a.client, { name: `CL Widgets ${tag}`, labelSingular: "Widget", labelPlural: "Widgets", fields: [{ key: "name", label: "Name", type: "text", sort: 10 }] }), "w");
remember(widgets, "widgets");
const serials = must(await declareTable(a.client, { name: `CL Serials ${tag}`, labelSingular: "Serial", labelPlural: "Serials", fields: [{ key: "code", label: "Code", type: "text", sort: 10 }] }), "s");
remember(serials, "serials");
const wf = await a.client.fieldDeclare({ table_id: serials, spec: { key: "widget", label: "Widget", type: "relation", relation_target: widgets, on_target_delete: "cascade" } });
say("06 cascade field:", wf.ok ? "ok" : err(wf));
const w1 = must(await a.client.recordWrite({ table_id: widgets, data: { name: "Gearbox G7" } }), "w1");
const wid = w1.id ?? w1;
for (const code of ["SN-001", "SN-002"]) must(await a.client.recordWrite({ table_id: serials, data: { code, widget: wid } }), "sn");
const del = await a.client.recordDelete({ record_id: wid });
say("06 archive widget:", del.ok ? "archived" : err(del));
const left = must(await a.client.list({ table_id: serials, limit: 10 }), "left");
say("06 serials still live after widget archive:", left.rows.map((r) => r.document.code));
const back = await a.client.recordRestore({ record_id: wid });
say("06 restore widget:", back.ok ? "ok" : err(back));
const again = must(await a.client.list({ table_id: serials, limit: 10 }), "again");
say("06 serials after restore:", again.rows.map((r) => r.document.code));
for (const type of ["entity_reference", "entity"]) {
  const er = await a.client.fieldDeclare({ table_id: "7dad23dc-ac4a-46a4-876c-499cdf9b8793", spec: { key: "brief", label: "Brief", type, config: { target_mode: "any", allowed_types: ["note"] } } });
  say(`02 entity column as ${type}:`, er.ok ? "ok" : err(er));
  if (er.ok) break;
}
