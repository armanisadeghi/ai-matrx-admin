// RECORD-FIXES: share/revoke one row to test@test.com the way the Share dialog does. node rf-share.mjs <row> <viewer|commenter|editor|revoke> [table-for-custom-grant]
import { createClient } from "@supabase/supabase-js";
import { store } from "./store.mjs";
import { env } from "./lib.mjs";
const [ROW, level] = process.argv.slice(2);
const { sb } = await store();
const m = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
const { data: a } = await m.auth.signInWithPassword({ email: "test@test.com", password: env.AI_MEMBER_PASSWORD });
const r = level === "revoke"
  ? await sb.rpc("revoke_resource_access", { p_resource_type: "record", p_resource_id: ROW, p_target_user_id: a.user.id })
  : await sb.rpc("share_resource_with_user", { p_resource_type: "record", p_resource_id: ROW, p_target_user_id: a.user.id, p_permission_level: level });
console.log(level, JSON.stringify(r.error ?? r.data).slice(0, 300));
