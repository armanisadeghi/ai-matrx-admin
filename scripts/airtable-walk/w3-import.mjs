import { store } from "./store.mjs"; import { T } from "./lib.mjs";
import { writeFileSync } from "node:fs";
const { client } = await store();
const ex = Object.keys(client).filter((k) => /import|csv|xlsx|sheet|paste/i.test(k));
console.log(ex.join(","));
