// AT-WALK-I seed in admin's Workspace: ATWI main (Name, Status, Qty, Due datetime, Owner) with 4 rows, ATWI parent (Name) with 2 rows. Prints ids.
import { ensureTable } from "@ai-matrx/records/core";
import { store } from "./store.mjs";
process.env.WALK_ORG_ID ??= "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const { client } = await store();
const tag = Date.now().toString(36).slice(-4);
const ok = (r, w) => { if (!r.ok) throw new Error(w + ": " + JSON.stringify(r.error)); return r.data; };
const main = ok(await ensureTable(client, { name: `ATWI main ${tag}`, fields: [
  { key: "name", label: "Name", type: "text", sort: 10 },
  { key: "status", label: "Status", type: "select", options: ["Open", "Done"], sort: 20 },
  { key: "qty", label: "Qty", type: "number", sort: 30 },
  { key: "due", label: "Due", type: "datetime", sort: 40 }] }), "main");
const parent = ok(await ensureTable(client, { name: `ATWI parent ${tag}`, fields: [{ key: "name", label: "Name", type: "text", sort: 10 }] }), "parent");
const rows = [["Alpha","Open",3,"2026-11-03T00:30:00Z"],["Bravo","Done",9,"2026-11-10T12:00:00Z"],["Charlie","Open",5,"2026-11-17T23:30:00Z"],["Delta","Open",1,"2026-12-01T08:00:00Z"]];
const ids = [];
for (const [name,status,qty,due] of rows) ids.push(ok(await client.recordWrite({ table_id: main, data: { name, status, qty, due } }), "row"));
const pids = [];
for (const n of ["Acme", "Globex"]) pids.push(ok(await client.recordWrite({ table_id: parent, data: { name: n } }), "prow"));
console.log(JSON.stringify({ tag, main, parent, rows: ids, pids }));
