import { createClient } from "@supabase/supabase-js";
import { createRecordsClient, supabaseDataSource } from "@ai-matrx/records/core";
import { env } from "./lib.mjs";
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
const { data: auth, error } = await sb.auth.signInWithPassword({ email: env.AI_ADMIN_USERNAME, password: env.AI_ADMIN_PASSWORD });
if (error) throw error;
const client = createRecordsClient({ dataSource: supabaseDataSource(sb), organizationId: "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f", actor: { actor: "user", user_id: auth.user.id, on_behalf_of: null } });
for (const id of process.argv.slice(2)) console.log(id, JSON.stringify(await client.tableArchive({ table_id: id })).slice(0, 120));
