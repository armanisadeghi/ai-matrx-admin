// lane PERSON-UNDO: archive (never delete) the Person records and tables this lane's probes created. args: person ids...
import { createClient } from "@supabase/supabase-js";
import { createRecordsClient, supabaseDataSource, KERNEL_TABLES } from "@ai-matrx/records/core";
import { env } from "./lib.mjs";
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
const { data: auth } = await sb.auth.signInWithPassword({ email: env.AI_ADMIN_USERNAME, password: env.AI_ADMIN_PASSWORD });
const client = createRecordsClient({ dataSource: supabaseDataSource(sb), organizationId: "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f", actor: { actor: "user", user_id: auth.user.id, on_behalf_of: null } });
const PERSON = KERNEL_TABLES.find((t) => t.name === "Person").id;
const ids = process.argv.slice(2);
const r = await client.recordChangeMany({ table_id: PERSON, changes: ids.map((id) => ({ op: "archive", record_id: id })) });
console.log(JSON.stringify(r).slice(0, 200));
