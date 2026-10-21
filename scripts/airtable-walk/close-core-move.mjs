// CLOSE-CORE CD-CORE-16 (acceptance test 9 "Retype"): a record moves to another table keeping its id and
// relations; values the new table lacks go to History with the reason; Undo puts it back. Live store, as
// admin (and the same move refused for the member at Edit). Disposable tables, archived at the end.
// Run: node scripts/airtable-walk/close-core-move.mjs
import { declareTable } from "@ai-matrx/records/core";
import { admin, member, must, say } from "./at-fix-j-lib.mjs";

const A = await admin();
const s = Math.random().toString(36).slice(2, 6);
const made = [];
try {
  const leads = must(await declareTable(A.client, { name: `CC Leads ${s}`, labelSingular: "Lead", labelPlural: "Leads", fields: [
    { key: "name", label: "Name", type: "text", sort: 10 },
    { key: "phone", label: "Phone", type: "text", sort: 20 },
    { key: "budget", label: "Budget", type: "number", sort: 30 },
  ] }), "leads"); made.push(leads);
  const suppliers = must(await declareTable(A.client, { name: `CC Suppliers ${s}`, labelSingular: "Supplier", labelPlural: "Suppliers", fields: [
    { key: "name", label: "Name", type: "text", sort: 10 },
    { key: "phone", label: "Phone", type: "text", sort: 20 },
    { key: "terms", label: "Terms", type: "text", sort: 30 },
  ] }), "suppliers"); made.push(suppliers);
  const orders = must(await declareTable(A.client, { name: `CC Orders ${s}`, labelSingular: "Order", labelPlural: "Orders", fields: [
    { key: "name", label: "Name", type: "text", sort: 10 },
    { key: "vendor", label: "Vendor", type: "relation", relationTarget: leads, sort: 20 },
  ] }), "orders"); made.push(orders);
  const rec = must(await A.client.recordWrite({ table_id: leads, data: { name: "Hollis Garden Supply", phone: "714 555 0190", budget: 4000 } }), "lead row");
  const order = must(await A.client.recordWrite({ table_id: orders, data: { name: "PO 1182", vendor: rec } }), "order row");
  say("record", rec, "order", order);

  // The member (Edit on the org's tables at most) is refused by name.
  const M = await member();
  const refused = await M.client.migrateRetype({ field_id: rec, to: suppliers });
  say("member move:", refused.ok ? "ALLOWED (unexpected)" : `refused: ${refused.error.message}`);

  const moved = must(await A.client.migrateRetype({ field_id: rec, to: suppliers }), "move");
  say("moved:", { kept_the_id: moved.kept_the_id, to_table: moved.to_table === suppliers, misfits: moved.misfits, misfits_are: moved.misfits_are });
  const after = must(await A.client.recordRead({ record_id: rec }), "read after");
  say("after move, same id reads:", { id: rec, document: after.document ?? after }); // table checked in SQL: custom.record.table_id
  const migs = must(await A.client.migrations({ target_id: rec, limit: 5 }), "migrations");
  say("history:", migs.map((m) => ({ verb: m.verb, note: m.note })));
  const ord = must(await A.client.recordRead({ record_id: order }), "order read");
  say("order still links to the same id:", (ord.document ?? {}).vendor === rec, (ord.document ?? {}).vendor);

  const back = must(await A.client.migrateUndo({ migration_id: moved.migration_id }), "undo");
  const restored = must(await A.client.recordRead({ record_id: rec }), "read after undo");
  say("undo:", back.verb ?? back, "budget back:", (restored.document ?? {}).budget);
} finally {
  for (const t of made) {
    const r = await A.client.tableArchive({ table_id: t });
    say("archived", t, r.ok ? "ok" : JSON.stringify(r.error));
  }
}
