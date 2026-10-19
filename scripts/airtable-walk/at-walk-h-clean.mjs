// archive every ATWH automation, then the two tables (all archived, none deleted). args: mainId logId
import { store } from "./store.mjs";
process.env.WALK_ORG_ID ??= "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const { client } = await store();
const [, , MAIN, LOG] = process.argv;
for (const a of (await client.automations({ table_id: MAIN })).data.automations) {
  await client.automationSetEnabled({ automation_id: a.id, enabled: false });
  console.log("archive", a.name, JSON.stringify(await client.automationArchive({ automation_id: a.id })).slice(0, 60));
}
for (const t of [MAIN, LOG]) for (let i = 0; i < 4; i++) { const r = await client.tableArchive({ table_id: t }); console.log("table", t.slice(0, 8), r.ok ? "archived" : JSON.stringify(r.error).slice(0, 100)); if (r.ok) break; }
