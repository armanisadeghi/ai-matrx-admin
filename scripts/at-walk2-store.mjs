import { createClient } from "@supabase/supabase-js";
import { createRecordsClient, supabaseDataSource } from "@ai-matrx/records/core";
import { env } from "./at-walk2-lib.mjs";
export async function store() {
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const { data: auth, error } = await sb.auth.signInWithPassword({ email: env.AI_ADMIN_USERNAME, password: env.AI_ADMIN_PASSWORD });
  if (error) throw error;
  return { sb, client: createRecordsClient({ dataSource: supabaseDataSource(sb), organizationId: "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f", actor: { actor: "user", user_id: auth.user.id, on_behalf_of: null } }) };
}
