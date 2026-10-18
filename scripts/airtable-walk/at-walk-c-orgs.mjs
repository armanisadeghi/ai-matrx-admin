// AT-WALK-C: admin's organizations (name, role) and which ones test@test.com belongs to; the active org.
import { createClient } from "@supabase/supabase-js";
import { env } from "./lib.mjs";
const out = {};
for (const [label, u, p] of [["admin", env.AI_ADMIN_USERNAME, env.AI_ADMIN_PASSWORD], ["member", env.AI_TEST_USERNAME ?? "test@test.com", env.AI_TEST_PASSWORD]]) {
  if (!p) { console.log(label, "no password in env"); continue; }
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const { data: a, error } = await sb.auth.signInWithPassword({ email: u, password: p });
  if (error) { console.log(label, "signin", error.message); continue; }
  const m = await sb.schema("users").from("organization_members").select("organization_id, role").eq("user_id", a.user.id).limit(300);
  const ids = (m.data ?? []).map((x) => x.organization_id);
  const o = await sb.schema("organizations").from("organization").select("id,name").in("id", ids.slice(0, 100));
  console.log(label, a.user.id, "members", m.error?.message ?? ids.length, o.error?.message ?? "");
  out[label] = (m.data ?? []).map((x) => `${x.organization_id} ${x.role} ${(o.data ?? []).find((y) => y.id === x.organization_id)?.name ?? "?"}`);
  console.log(label, JSON.stringify(out[label].slice(0, 40), null, 0));
}
