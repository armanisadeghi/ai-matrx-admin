// AT-WALK-B: which organization is active for admin, and which orgs admin and test@test.com belong to.
import { createClient } from "@supabase/supabase-js";
import { env } from "./lib.mjs";
for (const [label, u, p] of [["admin", env.AI_ADMIN_USERNAME, env.AI_ADMIN_PASSWORD]]) {
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const { data: a, error } = await sb.auth.signInWithPassword({ email: u, password: p });
  if (error) throw error;
  const pref = await sb.schema("users").from("user_preferences").select("last_active_organization_id").eq("user_id", a.user.id).maybeSingle();
  console.log(label, "active", JSON.stringify(pref.data), pref.error?.message ?? "");
  const m = await sb.schema("organizations").from("organization_members").select("organization_id, role").eq("user_id", a.user.id).limit(200);
  console.log(label, "memberships", m.error?.message ?? m.data.length, JSON.stringify((m.data ?? []).slice(0, 12)));
}
