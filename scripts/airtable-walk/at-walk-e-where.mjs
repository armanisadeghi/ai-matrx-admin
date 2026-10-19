import { createClient } from "@supabase/supabase-js";
import { createRecordsClient, supabaseDataSource } from "@ai-matrx/records/core";
import { env } from "./lib.mjs";
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
const { data: a } = await sb.auth.signInWithPassword({ email: env.AI_ADMIN_USERNAME, password: env.AI_ADMIN_PASSWORD });
const orgs = process.argv.slice(2);
for (const o of orgs) {
  const c = createRecordsClient({ dataSource: supabaseDataSource(sb), organizationId: o, actor: { actor: "user", user_id: a.user.id, on_behalf_of: null } });
  const r = await c.tableList();
  console.log(o, r.ok ? JSON.stringify(r.data.filter((t) => /^ATWE/.test(t.name)).map((t) => t.name + " " + t.id.slice(0, 8))) : JSON.stringify(r.error));
}
