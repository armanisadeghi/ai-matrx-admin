// AT-WALK-I cleanup: archives every table this walk made (archive door only).
import { store } from "./store.mjs";
const sets = [["884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f", ["f636aadf-d252-4928-80ba-872bb5e1be21", "3dde486c-8039-4e17-ad14-9341000d9b84", "34220129-1de5-4391-a80a-d7004c759af3"]], ["active", ["1142f719-0eea-4cbf-9fdf-65035eef7518"]], ["9c54ebd0-49c0-4ff0-8a51-1cd2c6b8562d", ["f0a25f3e-ce1c-449d-80c4-b11b36b07cc9"]]];
for (const [org, ids] of sets) {
  if (org === "active") delete process.env.WALK_ORG_ID; else process.env.WALK_ORG_ID = org;
  const { client } = await store();
  for (const id of ids) { let r; for (let i = 0; i < 12; i++) { r = await client.tableArchive({ table_id: id }); if (r.ok && r.data?.done) break; } console.log(org.slice(0, 8), id.slice(0, 8), JSON.stringify(r).slice(0, 90)); }
}
