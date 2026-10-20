// AT-FIX-J2 item 4a seed: "ATFJ2 People" (3 named rows, public-domain names) and "ATFJ2 Orders" with a relation column "Person" -> People. Prints ids.
import { admin, say, must } from "./at-fix-j-lib.mjs";
import { declareTable } from "@ai-matrx/records/core";
const a = await admin();
const tag = Math.random().toString(36).slice(2, 5);
const people = must(await declareTable(a.client, { name: `ATFJ2 People ${tag}`, labelSingular: "Person", labelPlural: "People", fields: [{ key: "name", label: "Name", type: "text", sort: 10 }] }), "people");
for (const name of ["Ada Lovelace", "Grace Hopper", "Alan Turing"]) must(await a.client.recordWrite({ table_id: people, data: { name } }), "person");
const orders = must(await declareTable(a.client, { name: `ATFJ2 Orders ${tag}`, labelSingular: "Order", labelPlural: "Orders", fields: [
  { key: "item", label: "Item", type: "text", sort: 10 },
  { key: "person", label: "Person", type: "relation", relationTarget: people, sort: 20 },
] }), "orders");
say("PEOPLE", people); say("ORDERS", orders);
