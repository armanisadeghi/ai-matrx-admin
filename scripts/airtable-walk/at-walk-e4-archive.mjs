// node at-walk-e4-archive.mjs : archive every table the AT-WALK-E4 lane made in admin's Workspace, then archive their Home records
import { store } from "./store.mjs";
process.env.WALK_ORG_ID ??= "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const { client } = await store();
const tables = ["94f289f7-bb56-459c-82bf-fbe17064516c", "f6509169-f2c2-4f65-b9d8-9d5252741e7c", "6f751cd1-463b-4ea6-af60-e1f830ebbcfa", "243c14f1-1b54-43db-afc7-0cd417f93722", "bac8f7db-dd50-4686-ab4f-7f631209ed60", "07b0706e-2a99-4965-a000-626002ee190a"];
const homes = ["eade83e0-b05e-444d-a3b4-5732c96af6ba", "f069f227-5024-423b-8f48-b4b13342dcaf", "1c4c725e-b033-4c2e-97b3-6f43e1a4d459", "f9bd689e-eca9-4982-8702-0b9c40b0d460", "6c5e8111-053e-4b80-a984-1a77f07aaa3e"];
for (const id of tables) { for (let i = 0; i < 40; i++) { const r = await client.tableArchive({ table_id: id, chunk: 2, includeTable: true }); if (!r.ok) { console.log(id, "ERR", JSON.stringify(r.error).slice(0, 120)); if (i > 3) break; continue; } if (r.data.done) { console.log(id, "archived"); break; } } }
for (const h of homes) console.log(h, JSON.stringify(await client.recordDelete({ record_id: h })).slice(0, 100));
