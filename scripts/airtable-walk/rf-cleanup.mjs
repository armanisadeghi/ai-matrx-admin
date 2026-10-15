// RECORD-FIXES cleanup: revoke the row shares and archive the Clinic Referrals tables. ORG=<org> node rf-cleanup.mjs <table>:<row,row> ...
import { createClient } from "@supabase/supabase-js";
import { store } from "./store.mjs";
import { env } from "./lib.mjs";
const { sb, client } = await store();
const m = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
const { data: a } = await m.auth.signInWithPassword({ email: "test@test.com", password: env.AI_MEMBER_PASSWORD });
for (const spec of process.argv.slice(2)) {
  const [table, rows] = spec.split(":");
  for (const row of rows.split(",")) await sb.rpc("revoke_resource_access", { p_resource_type: "record", p_resource_id: row, p_target_user_id: a.user.id });
  const r = await client.tableArchive({ table_id: table });
  console.log("archived", table, r.ok ? "ok" : JSON.stringify(r.error).slice(0, 160));
}
