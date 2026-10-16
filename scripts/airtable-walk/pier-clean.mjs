import { store } from "./store.mjs";
const { client } = await store();
for (const t of process.argv.slice(2)) console.log("archive", t.slice(0, 8), JSON.stringify(await client.tableArchive({ table_id: t })).slice(0, 100));
