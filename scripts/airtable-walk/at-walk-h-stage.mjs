// declare the board (Stage column, Todo/Doing/Done) so StageRules has a stage column
import { store } from "./store.mjs";
process.env.WALK_ORG_ID ??= "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const { client } = await store();
const [, , MAIN] = process.argv;
console.log("stage field:", JSON.stringify(await client.tableStageField({ table_id: MAIN })));
const r = await client.pipelineDeclare({ table_id: MAIN, spec: { stage_field: { key: "stage", options: ["Todo", "Doing", "Done"] } } });
console.log(JSON.stringify(r).slice(0, 300));
console.log("stage field:", JSON.stringify(await client.tableStageField({ table_id: MAIN })));
