import { store } from "./store.mjs";
import { readFileSync } from "node:fs";
const S = JSON.parse(readFileSync("/tmp/airtable-walk/at-auto3.json", "utf8"));
const { client } = await store();
for (const t of [S.ord, S.cust]) console.log("archive", t, JSON.stringify(await client.tableArchive({ table_id: t })).slice(0, 120));
