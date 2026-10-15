// lane PERSON-UNDO: Person -> Email through field_update, then the newest migration of the field undone: what is left on the column?
import { createClient } from "@supabase/supabase-js";
import { createRecordsClient, declareTable, supabaseDataSource, KERNEL_TABLES } from "@ai-matrx/records/core";
import { env } from "./lib.mjs";
const ORG = "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
const { data: auth } = await sb.auth.signInWithPassword({ email: env.AI_ADMIN_USERNAME, password: env.AI_ADMIN_PASSWORD });
const client = createRecordsClient({ dataSource: supabaseDataSource(sb), organizationId: ORG, actor: { actor: "user", user_id: auth.user.id, on_behalf_of: null } });
const must = (r, w) => { if (!r.ok) throw new Error(w + ": " + JSON.stringify(r.error)); return r.data; };
const PERSON = KERNEL_TABLES.find((t) => t.name === "Person").id;
const p = must(await client.recordWrite({ table_id: PERSON, data: { full_name: "Probe3 Priya", email: "priya3@probe.example" } }), "p");
const table = must(await declareTable(client, { name: "Probe3 Roster " + Date.now().toString().slice(-5), labelSingular: "M", labelPlural: "Ms", fields: [{ key: "name", label: "Name", type: "text", sort: 10 }, { key: "lead", label: "Lead", type: "relation", relationTarget: PERSON, sort: 20 }] }), "t");
must(await client.recordWrite({ table_id: table, data: { name: "r1", lead: p } }), "row");
const shape = async (tag) => { const f = must(await client.fields({ table_id: table }), "f").find((x) => x.key === "lead"); console.log(tag, JSON.stringify({ type: f.type, format: f.format, parity: f.parity_type, rules: f.rules, rt: f.relation_target, cfg: f.config, max: f.relation_max, otd: f.on_target_delete })); return f; };
const f = await shape("start");
console.log(JSON.stringify({ table, field: f.id, person: p, user: auth.user.id }));
