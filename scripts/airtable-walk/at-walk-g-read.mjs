// read rows of the two ATWG tables through the store (admin)
import { store } from "./store.mjs";
const { client } = await store();
for (const [label, t] of [["sweep", "56711271-64c4-410d-b004-f2e4c8f52e10"], ["workspace", "a825b088-400b-4872-8482-60366664b8eb"]]) {
  const r = await client.list({ table_id: t, limit: 50 });
  console.log(label, r.ok ? JSON.stringify(r.data.rows.map((x) => x.document)) : JSON.stringify(r.error));
}
