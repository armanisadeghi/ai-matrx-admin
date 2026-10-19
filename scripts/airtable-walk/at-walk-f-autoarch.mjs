import { store } from "./store.mjs";
process.env.WALK_ORG_ID ??= "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const { client } = await store();
for (const id of process.argv.slice(2)) console.log(id, JSON.stringify(await client.automationArchive({ automation_id: id })).slice(0, 200));
