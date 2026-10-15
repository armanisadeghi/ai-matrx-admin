// RECORD-PROVE: archive tables as admin in a named org. node rp-archive.mjs <org> <table>...
import { createClient } from "@supabase/supabase-js";
import { createRecordsClient, supabaseDataSource } from "@ai-matrx/records/core";
const [ORG, ...TABLES] = process.argv.slice(2);
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
const { data: a, error } = await sb.auth.signInWithPassword({ email: process.env.AI_ADMIN_USERNAME, password: process.env.AI_ADMIN_PASSWORD });
if (error) throw error;
const c = createRecordsClient({ dataSource: supabaseDataSource(sb), organizationId: ORG, actor: { actor: "user", user_id: a.user.id, on_behalf_of: null } });
for (const t of TABLES) {
  const w = await sb.schema("custom").rpc("where_id_opens", { p_id: t });
  const org = w.data?.organization_id ?? ORG; const cc = createRecordsClient({ dataSource: supabaseDataSource(sb), organizationId: org, actor: { actor: "user", user_id: a.user.id, on_behalf_of: null } });
  const r = await cc.tableArchive({ table_id: t });
  console.log(t.slice(0, 8), "opens:", JSON.stringify(w.data ?? w.error)?.slice(0, 120), "| archive:", r.ok ? "ok" : JSON.stringify(r.error).slice(0, 200));
}
