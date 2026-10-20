// AT-WALK-J seed: "ATWJ main" (Name, Qty, Status, Tags multi, Notes long, Joined date, a capture sheet) + "ATWJ big" (330 rows, own base).
import { ensureTable } from "@ai-matrx/records/core";
import { store } from "./store.mjs";
process.env.WALK_ORG_ID ??= "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const { client } = await store();
const tag = Date.now().toString(36).slice(-4);
const ok = (r, w) => { if (!r.ok) throw new Error(w + ": " + JSON.stringify(r.error)); return r.data; };
let kind = "multi_choice";
const retry = async (f) => { for (let i = 0; i < 40; i++) { const r = await f(); if (r.ok || !["timed_out","internal"].includes(r.error?.code)) return r; await new Promise((z) => setTimeout(z, 20000)); } return await f(); };
let made = await retry(() => ensureTable(client, { name: `ATWJ main ${tag}`, fields: [
  { key: "name", label: "Name", type: "text", sort: 10 },
  { key: "qty", label: "Qty", type: "number", sort: 20 },
  { key: "status", label: "Status", type: "select", options: ["Open", "Done"], sort: 30 },
  { key: "tags", label: "Tags", type: kind, options: ["Alpha", "Beta", "Gamma"], sort: 40 },
  { key: "notes", label: "Notes", type: "long_text", sort: 50 },
  { key: "joined", label: "Joined", type: "datetime", sort: 60 }] }));
const table = ok(made, "table");
const rows = [["Delta", 1, ["Alpha", "Beta"]], ["Charlie", 5, ["Beta"]], ["Bravo", 9, ["Alpha", "Beta", "Gamma"]], ["Alpha", 3, ["Gamma"]], ["Echo", 7, ["Alpha"]], ["Foxtrot", 2, ["Beta", "Gamma"]]];
for (const [name, qty, tags] of rows) ok(await client.recordWrite({ table_id: table, data: { name, qty, status: qty > 4 ? "Done" : "Open", tags, joined: "2026-11-03T00:30:00Z" } }), "row");
const sheet = ok(await client.captureSheetDeclare({ table_id: table, title: `ATWJ crew ${tag}`, questions: [{ field: "name" }, { field: "qty" }] }), "sheet");
ok(await client.capturePublish({ sheet_id: sheet, open: true }), "publish");
const big = await retry(() => ensureTable(client, { name: `ATWJ big ${tag}`, fields: [{ key: "name", label: "Name", type: "text", sort: 10 }, { key: "n", label: "N", type: "number", sort: 20 }] }));
const bigId = ok(big, "big");
let done = 0;
for (let i = 0; i < 330; i += 10) {
  const rs = await Promise.all(Array.from({ length: 10 }, (_, j) => client.recordWrite({ table_id: bigId, data: { name: `Row ${i + j + 1}`, n: i + j + 1 } }).catch(() => ({ ok: false }))));
  done += rs.filter((r) => r.ok).length;
}
console.log(JSON.stringify({ tag, table, sheet, big: bigId, bigHome: big.homeId, mainHome: made.homeId, bigRows: done }));
