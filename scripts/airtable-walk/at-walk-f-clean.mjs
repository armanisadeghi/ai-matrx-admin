// AT-WALK-F cleanup: verify the script write, revoke the calendar feed, archive every "ATWF" table, automation and base Home.
import { store } from "./store.mjs";
process.env.WALK_ORG_ID ??= "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const { client, sb } = await store();
const main = "2f34307e-3d62-4841-a7bc-cdd3ca68e3e3";
const lp = await client.listPage({ table_id: main, limit: 20 });
console.log("Delta tags:", JSON.stringify(lp.data?.rows?.filter((r) => r.document.name === "Delta").map((r) => r.document.tags)));
console.log("revoke feed", JSON.stringify((await sb.schema("users").rpc("calendar_feed_revoke", { p_id: "ba63d166-573e-4f98-892e-bfebedda2ced" })).error ?? "ok"));
console.log("archive automation", JSON.stringify(await client.automationArchive({ automation_id: "3e13af8c-47fe-4cd1-a419-01d615d25cb2" })).slice(0, 80));
const tl = await client.tableList();
const mine = tl.data.filter((t) => /^ATWF /.test(t.name));
console.log(mine.map((t) => [t.id.slice(0, 8), t.name, (t.parent_id || "").slice(0, 8)].join(" ")).join("\n"));
for (const t of mine) { for (let i = 0; i < 40; i++) { const a = await client.tableArchive({ table_id: t.id, chunk: 2, includeTable: true }); if (!a.ok) { console.log(t.id, "ERR", JSON.stringify(a.error).slice(0, 120)); if (i > 4) break; continue; } if (a.data.done) { console.log(t.id, "archived"); break; } } }
const homes = [...new Set(mine.map((t) => t.parent_id).filter(Boolean))];
for (const h of homes) console.log("home", h, JSON.stringify(await client.recordDelete({ record_id: h })).slice(0, 80));
