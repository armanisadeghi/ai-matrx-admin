import { ensureTable, KERNEL_TABLES } from "@ai-matrx/records/core";
import { store } from "./store.mjs";
process.env.WALK_ORG_ID ??= "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const { client } = await store();
const must = (r, w) => { if (!r.ok) throw new Error(w + ": " + JSON.stringify(r.error)); return r.data; };
const l = must(await client.tableList(), "list").filter((t) => /^ATWE/.test(t.name));
console.log("existing", JSON.stringify(l.map((t) => [t.id, t.name, t.home_id ?? t.homeId])));
if (!l.some((t) => /roster/.test(t.name))) {
  const PERSON = KERNEL_TABLES.find((t) => t.name === "Person").id;
  for (let i = 0; i < 3; i++) {
    const r = await ensureTable(client, { name: `ATWE roster ${l[0]?.name.slice(-4) ?? "x"}`, fields: [{ key: "name", label: "Name", type: "text", sort: 10 }, { key: "owner", label: "Owner", type: "relation", relationTarget: PERSON, relationMax: 5, sort: 20 }] });
    if (r.ok) { must(await client.recordWrite({ table_id: r.data, data: { name: "Row A" } }), "row"); console.log("roster", r.data, r.homeId); break; } else console.log("retry", r.error.message);
  }
}
