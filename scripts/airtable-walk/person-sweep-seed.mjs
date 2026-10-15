// lane PERSON-SWEEP: admin@admin.com's disposable "Studio Team Roster" with a Person column.
// Prints {table, rows}. Archive after (person-sweep-archive.mjs <table>).
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
const matched = must(await client.recordWrite({ table_id: PERSON, data: { user_id: auth.user.id, full_name: "Studio Admin", email: env.AI_ADMIN_USERNAME } }), "person matched");
const guest = must(await client.recordWrite({ table_id: PERSON, data: { full_name: "Priya Raman", email: "priya.raman@studio-guest.example" } }), "person guest");
const table = must(await declareTable(client, {
  name: "Studio Team Roster " + Date.now().toString().slice(-5), labelSingular: "Member", labelPlural: "Team",
  fields: [
    { key: "name", label: "Name", type: "text", sort: 10 },
    { key: "lead", label: "Lead", type: "relation", relationTarget: PERSON, sort: 20 },
    { key: "role", label: "Role", type: "text", sort: 30 },
  ],
}), "table");
const rows = [["Mix and master", matched, "Engineer"], ["Vocal booth", guest, "Producer"], ["Strings session", matched, "Arranger"], ["Foley", null, "Sound design"]];
for (const [name, lead, role] of rows) must(await client.recordWrite({ table_id: table, data: { name, ...(lead ? { lead } : {}), role } }), "row");
console.log(JSON.stringify({ table, matched, guest }));
