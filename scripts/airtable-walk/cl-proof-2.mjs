// CLOSE-LINK proof 2 (store, admin): merge re-points links and undo restores them (CD-LINK-13); restrict names what blocks it (06);
// a several-target link refuses a third table (04); seed an entity-reference column for the picker walk (02).
import { declareTable } from "@ai-matrx/records/core";
import { admin, must, say, err, remember } from "./cl-lib.mjs";
const a = await admin();
const T = { clients: "475d36ce-7e0e-4914-bb2e-f9372f999e48", vendors: "5f0c5f8d-4f56-4cf7-a66b-ea5c985eba92", bookings: "7dad23dc-ac4a-46a4-876c-499cdf9b8793" };
const BOOKING = "29642cec-76a9-4950-8da6-26870c59d725", HARBOR = "50323490-8204-4385-af5e-61db68972c9e";
// 13: two clients each linked from a booking; merge B into A; links point at A; undo puts them back
const dupe = must(await a.client.recordWrite({ table_id: T.clients, data: { name: "Harbor Bakery Inc", address: "12 March St" } }), "dupe");
const dupeId = dupe.id ?? dupe;
const b2 = must(await a.client.recordWrite({ table_id: T.bookings, data: { title: "Summer order", client: dupeId } }), "b2");
const b2id = b2.id ?? b2;
must(await a.client.recordUpdate({ record_id: BOOKING, patch: { client: HARBOR } }), "relink");
const m = await a.client.migrateMerge({ winner_id: HARBOR, loser_id: dupeId, note: "CLOSE-LINK proof" });
say("13 merge:", m.ok ? JSON.stringify(m.data).slice(0, 300) : err(m));
const after = must(await a.client.listByIds({ table_id: T.bookings, ids: [BOOKING, b2id] }), "after");
say("13 after merge, booking clients:", after.map((r) => `${r.document.title}->${r.document.client}`));
if (m.ok) {
  const u = await a.client.migrateUndo({ migration_id: m.data.migration_id });
  say("13 undo:", u.ok ? "ok" : err(u));
  const back = must(await a.client.listByIds({ table_id: T.bookings, ids: [BOOKING, b2id] }), "back");
  say("13 after undo, booking clients:", back.map((r) => `${r.document.title}->${r.document.client}`), "dupe id", dupeId);
}
// 04: a third table is refused on the several-target link
const other = must(await declareTable(a.client, { name: `CL Other ${Math.random().toString(36).slice(2, 5)}`, labelSingular: "Other", labelPlural: "Others", fields: [{ key: "name", label: "Name", type: "text", sort: 10 }] }), "other");
remember(other, "other");
const o1 = must(await a.client.recordWrite({ table_id: other, data: { name: "Stray" } }), "o1");
const bad = await a.client.recordUpdate({ record_id: BOOKING, patch: { party: [HARBOR, o1.id ?? o1] } });
say("04 third table on several-target link:", bad.ok ? "ACCEPTED (defect)" : err(bad));
// 06: restrict — a supplier with purchase orders; archive refused naming them
const sup = must(await declareTable(a.client, { name: `CL Suppliers ${Math.random().toString(36).slice(2, 5)}`, labelSingular: "Supplier", labelPlural: "Suppliers", fields: [{ key: "name", label: "Name", type: "text", sort: 10 }] }), "sup");
remember(sup, "suppliers");
const po = must(await declareTable(a.client, { name: `CL Purchase orders ${Math.random().toString(36).slice(2, 5)}`, labelSingular: "Purchase order", labelPlural: "Purchase orders", fields: [{ key: "title", label: "Title", type: "text", sort: 10 }] }), "po");
remember(po, "pos");
const rf = await a.client.fieldDeclare({ table_id: po, spec: { key: "supplier", label: "Supplier", type: "relation", relation_target: sup, on_target_delete: "restrict" } });
say("06 restrict field:", rf.ok ? "ok" : err(rf));
const tagT = must(await declareTable(a.client, { name: `CL Tags ${Math.random().toString(36).slice(2, 5)}`, labelSingular: "Tag", labelPlural: "Tags", fields: [{ key: "name", label: "Name", type: "text", sort: 10 }] }), "tags");
remember(tagT, "tags");
const tf = await a.client.fieldDeclare({ table_id: po, spec: { key: "tag", label: "Tag", type: "relation", relation_target: tagT } });
say("06 set_null tag field:", tf.ok ? "ok" : err(tf));
const s1 = must(await a.client.recordWrite({ table_id: sup, data: { name: "Acme Lumber" } }), "s1");
const t1 = must(await a.client.recordWrite({ table_id: tagT, data: { name: "Rush" } }), "t1");
const sid = s1.id ?? s1, tid = t1.id ?? t1;
for (const title of ["PO-1001", "PO-1002"]) must(await a.client.recordWrite({ table_id: po, data: { title, supplier: sid, tag: tid } }), "po row");
const del = await a.client.recordDelete({ record_id: sid });
say("06 archive supplier with orders:", del.ok ? "ARCHIVED (restrict not applied)" : err(del));
const delTag = await a.client.recordDelete({ record_id: tid });
say("06 archive tag:", delTag.ok ? "archived" : err(delTag));
const pos = must(await a.client.list({ table_id: po, limit: 10 }), "pos");
say("06 orders after tag archive:", pos.rows.map((r) => `${r.document.title} tag=${r.document.tag ?? "none"} supplier=${r.document.supplier ?? "none"}`));
// 02 seed: an entity-reference column pointing at platform notes
const er = await a.client.fieldDeclare({ table_id: T.bookings, spec: { key: "brief", label: "Brief", type: "relation", config: { target_mode: "any", allowed_types: ["note"] } } });
say("02 entity column:", er.ok ? "ok" : err(er));
say("ids", { dupeId, b2id, other, sup, po, tagT });
