// AT-WALK-C: archive a big table in small chunks (default chunk 20 hits the statement timeout under load).
import { store } from "./store.mjs";
const { client } = await store();
const [id, chunk = "3"] = process.argv.slice(2);
for (let i = 0; i < 400; i++) {
  const r = await client.tableArchive({ table_id: id, chunk: Number(chunk), includeTable: true });
  if (!r.ok) { console.log("ERR", i, JSON.stringify(r.error).slice(0, 120)); await new Promise((s) => setTimeout(s, 3000)); continue; }
  if (r.data?.done) { console.log(id, "archived after", i + 1); break; }
}
