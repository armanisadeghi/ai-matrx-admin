import { store } from "./store.mjs"; import { T } from "./lib.mjs";
import { randomUUID } from "node:crypto";
const CH = randomUUID();
const { client } = await store();
const must = (r, w) => { if (!r.ok) throw new Error(w + ": " + JSON.stringify(r.error)); return r.data; };
const fields = must(await client.fields({ table_id: T.events }), "fields");
const fid = (k) => fields.find((f) => f.key === k)?.id;
const acts = must(await client.actionDeclare({ table_id: T.events, actions: [{ name: "Mark served", kind: "update", steps: [{ field: fid("status"), set: "value", value: "Served" }] }] }), "action");
const action_id = acts.find((a) => a.name === "Mark served").id;
const form_id = must(await client.formDeclare({ table_id: T.events, title: "Walk3 request form", questions: [{ field: "event" }, { field: "guests" }] }), "form");
const blocks = [
  { id: randomUUID(), kind: "number", title: "Events", measures: [{ op: "count" }] },
  { id: randomUUID(), kind: "bar", title: "By status", group_by: ["status"], measures: [{ op: "count" }] },
];
const pageBlocks = [
  { id: "h", kind: "heading", text: "Event desk" },
  { id: "f1", kind: "filter", table_id: T.events, field: "status" },
  { id: "l1", kind: "list", table_id: T.events, title: "All events", columns: ["event", "status", "guests"], limit: 20 },
  { id: "r1", kind: "record", source: "l1" },
  { id: "bt", kind: "button", source: "l1", table_id: T.events, action_id },
  { id: "fm", kind: "form", table_id: T.events, form_id },
  { id: CH, kind: "chart" },
];
const pgPrev = process.env.PAGE_ID;
const dash = must(await client.dashboardDeclare({ table_id: T.events, name: "Walk3 dashboard", blocks }), "dash");
const pg = must(await client.dashboardDeclare({ table_id: T.events, name: "Walk3 page", blocks: [blocks[1]].map((b) => ({ ...b, id: CH })), presentation: { kind: "page", page_blocks: pageBlocks }, dashboard_id: process.env.PAGE_ID ?? null }), "page");
console.log(JSON.stringify({ action_id, form_id, dash, page: pg }));
