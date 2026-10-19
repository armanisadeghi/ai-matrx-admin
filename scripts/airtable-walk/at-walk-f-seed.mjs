// AT-WALK-F seed: "ATWF parent" (linked target) + "ATWF main" (typed columns, relation, dated rows). Prints ids as JSON.
import { ensureTable } from "@ai-matrx/records/core";
import { store } from "./store.mjs";
process.env.WALK_ORG_ID ??= "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const { client } = await store();
const tag = Date.now().toString(36).slice(-4);
const ok = (r, w) => { if (!r.ok) throw new Error(w + ": " + JSON.stringify(r.error)); return r; };
const parent = ok(await ensureTable(client, { name: `ATWF parent ${tag}`, fields: [{ key: "name", label: "Name", type: "text", sort: 10 }] }), "parent");
const main = ok(await ensureTable(client, { name: `ATWF main ${tag}`, homeId: parent.homeId, fields: [
  { key: "name", label: "Name", type: "text", sort: 10 },
  { key: "qty", label: "Qty", type: "number", sort: 20 },
  { key: "tags", label: "Tags", type: "text", sort: 30 },
  { key: "site", label: "Site", type: "url", sort: 40 },
  { key: "due", label: "Due", type: "datetime", sort: 50 },
  { key: "group", label: "Group", type: "relation", relationTarget: parent.data, sort: 60 }] }), "main");
const g = ok(await client.recordWrite({ table_id: parent.data, data: { name: "Group A" } }), "g").data;
const rows = [["Alpha", 3, "urgent, red, blue", "https://example.com", "2026-11-03"], ["Bravo", 9, "blue, green", "https://www.wikipedia.org", "2026-11-10"], ["Charlie", 5, "red, urgent, red", "https://example.org", "2026-11-17"], ["Delta", 1, "", "", "2026-12-01"]];
const ids = [];
for (const [name, qty, tags, site, due] of rows) { const d = { name, qty, tags, due, group: g }; if (site) d.site = site; const r = ok(await client.recordWrite({ table_id: main.data, data: d }), "row"); ids.push(r.data); }
console.log(JSON.stringify({ tag, parentHome: parent.homeId, parent: parent.data, main: main.data, group: g, rows: ids }));
