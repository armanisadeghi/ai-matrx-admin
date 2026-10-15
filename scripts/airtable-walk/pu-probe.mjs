// lane PERSON-UNDO: what the store does to a Person column's values on Person -> Text / Email, and on undo.
import { createClient } from "@supabase/supabase-js";
import { createRecordsClient, declareTable, supabaseDataSource, KERNEL_TABLES } from "@ai-matrx/records/core";
import { env } from "./lib.mjs";
const ORG = "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
const { data: auth, error } = await sb.auth.signInWithPassword({ email: env.AI_ADMIN_USERNAME, password: env.AI_ADMIN_PASSWORD });
if (error) throw error;
const client = createRecordsClient({ dataSource: supabaseDataSource(sb), organizationId: ORG, actor: { actor: "user", user_id: auth.user.id, on_behalf_of: null } });
const must = (r, what) => { if (!r.ok) throw new Error(what + ": " + JSON.stringify(r.error)); return r.data; };
const PERSON = KERNEL_TABLES.find((t) => t.name === "Person").id;
const mk = async (full_name, email, user_id) => must(await client.recordWrite({ table_id: PERSON, data: { full_name, email, ...(user_id ? { user_id } : {}) } }), "person");
const a = await mk("Probe Admin", env.AI_ADMIN_USERNAME, auth.user.id), b = await mk("Probe Priya", "priya.p@probe.example"), c = await mk("Probe Omar", "omar.p@probe.example");
const tables = [];
async function run(to, how) {
  const table = must(await declareTable(client, { name: "Probe Roster " + to + " " + Date.now().toString().slice(-5), labelSingular: "M", labelPlural: "Ms",
    fields: [{ key: "name", label: "Name", type: "text", sort: 10 }, { key: "lead", label: "Lead", type: "relation", relationTarget: PERSON, sort: 20 }] }), "table");
  tables.push(table);
  for (const [n, p] of [["r1", a], ["r2", b], ["r3", c]]) must(await client.recordWrite({ table_id: table, data: { name: n, lead: p } }), "row");
  const fields = must(await client.fields({ table_id: table }), "fields");
  const f = fields.find((x) => x.key === "lead");
  const dump = async (tag) => { const l = must(await client.list({ table_id: table, limit: 50 }), "list"); console.log(to, tag, JSON.stringify(l.rows.map((r) => ({ lead: r.document.lead, retired: r.document._retired?.map((e) => ({ k: e.key, v: e.value })) })))); };
  await dump("before");
  const res = await how(f);
  console.log(to, "door answered", JSON.stringify(res));
  await dump("after store retype");
  return { table, f, res };
}
const out1 = await run("text", async (f) => must(await client.migrateRetype({ field_id: f.id, to: "text" }), "retype"));
const out2 = await run("email", async (f) => must(await client.fieldUpdate({ field_id: f.id, patch: { parity_type: "email" } }), "fieldUpdate"));
console.log(JSON.stringify({ tables, people: [a, b, c] }));
