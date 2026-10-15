// RECORD-PROVE: share/revoke a record to the persona outsider the way the Share dialog does. node rp-share.mjs <outsider-id> <row> <viewer|revoke>
import { createClient } from "@supabase/supabase-js";
const [USER, ROW, level] = process.argv.slice(2);
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
const { error } = await sb.auth.signInWithPassword({ email: process.env.AI_ADMIN_USERNAME, password: process.env.AI_ADMIN_PASSWORD });
if (error) throw error;
const r = level === "revoke"
  ? await sb.rpc("revoke_resource_access", { p_resource_type: "record", p_resource_id: ROW, p_target_user_id: USER })
  : await sb.rpc("share_resource_with_user", { p_resource_type: "record", p_resource_id: ROW, p_target_user_id: USER, p_permission_level: level });
console.log(level, ROW, JSON.stringify(r.error ?? r.data).slice(0, 200));
