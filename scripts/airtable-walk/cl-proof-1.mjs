// CLOSE-LINK proof 1 (store, admin): both-ends link (CD-LINK-01), multi-table target (04), snapshot binding (05), link history (12).
import { declareTable } from "@ai-matrx/records/core";
import { admin, must, say, err, remember } from "./cl-lib.mjs";
const a = await admin();
const tag = Math.random().toString(36).slice(2, 5);
const clients = must(await declareTable(a.client, { name: `CL Clients ${tag}`, labelSingular: "Client", labelPlural: "Clients", fields: [
  { key: "name", label: "Name", type: "text", sort: 10 }, { key: "address", label: "Address", type: "text", sort: 20 }] }), "clients");
remember(clients, "clients");
const vendors = must(await declareTable(a.client, { name: `CL Vendors ${tag}`, labelSingular: "Vendor", labelPlural: "Vendors", fields: [{ key: "name", label: "Name", type: "text", sort: 10 }] }), "vendors");
remember(vendors, "vendors");
const bookings = must(await declareTable(a.client, { name: `CL Bookings ${tag}`, labelSingular: "Booking", labelPlural: "Bookings", fields: [
  { key: "title", label: "Title", type: "text", sort: 10 },
  { key: "client", label: "Client", type: "relation", relationTarget: clients, sort: 20 },
] }), "bookings");
remember(bookings, "bookings");
say("tables", { clients, vendors, bookings });
const party = await a.client.fieldDeclare({ table_id: bookings, spec: { key: "party", label: "Party", type: "relation", multi: true, relation_target: clients, config: { target_mode: "several", target_tables: [clients, vendors] } } });
say("04 declare several-target field:", party.ok ? "ok " + party.data : err(party));
const snap = await a.client.fieldDeclare({ table_id: bookings, spec: { key: "bill_to", label: "Bill to", type: "relation", relation_target: clients, config: { binding: "snapshot" } } });
say("05 declare snapshot field:", snap.ok ? "ok " + snap.data : err(snap));
const c1 = must(await a.client.recordWrite({ table_id: clients, data: { name: "Harbor Bakery", address: "12 March St" } }), "c1");
const v1 = must(await a.client.recordWrite({ table_id: vendors, data: { name: "Ridge Flour Co" } }), "v1");
const cid = c1.id ?? c1, vid = v1.id ?? v1;
const b1 = await a.client.recordWrite({ table_id: bookings, data: { title: "Spring order", client: cid, ...(party.ok ? { party: [cid, vid] } : {}), ...(snap.ok ? { bill_to: cid } : {}) } });
say("booking write:", b1.ok ? "ok" : err(b1));
const bid = b1.ok ? (b1.data.id ?? b1.data) : null;
// 01: the client sees its booking with no reverse field declared
const cf = must(await a.client.fields({ table_id: clients }), "fields");
say("01 client fields (declared):", cf.map((f) => `${f.key}:${f.type}`));
const rl = await a.client.reverseLinksMany({ table_id: clients, record_ids: [cid] });
say("01 reverse links of client:", rl.ok ? JSON.stringify(rl.data).slice(0, 500) : err(rl));
const rc = await a.client.reverseColumns({ table_id: clients });
say("01 reverse columns on Clients:", rc.ok ? JSON.stringify(rc.data).slice(0, 400) : err(rc));
if (bid) {
  const r = must(await a.client.listByIds({ table_id: bookings, ids: [bid] }), "read");
  say("04/05 booking as read:", JSON.stringify(r[0]?.document).slice(0, 700));
  must(await a.client.recordUpdate({ record_id: cid, patch: { address: "9 April Ave" } }).catch((e) => ({ ok: false, error: { message: String(e) } })), "addr");
  const r2 = must(await a.client.listByIds({ table_id: bookings, ids: [bid] }), "read2");
  say("05 booking after address change:", JSON.stringify(r2[0]?.document).slice(0, 700));
  const un = await a.client.recordUpdate({ record_id: bid, patch: { client: null } });
  say("12 unlink client:", un.ok ? "ok" : err(un));
  const h = await a.client.recordHistory({ record_id: bid });
  say("12 history:", h.ok ? JSON.stringify(h.data).slice(0, 1500) : err(h));
}
say("ids", { cid, vid, bid });
