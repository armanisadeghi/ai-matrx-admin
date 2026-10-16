import { createClient } from "@supabase/supabase-js";
import { createRecordsClient, supabaseDataSource } from "@ai-matrx/records/core";
import { env } from "./lib.mjs";
// The organization is the signed-in admin's ACTIVE one — the same row the app boots from
// (users.user_preferences.last_active_organization_id) — never a pinned id. WALK_ORG_ID overrides it
// (a walk that must run in one named organization); with neither, the script stops and says so.
export async function activeOrganizationId(sb, userId) {
  if (process.env.WALK_ORG_ID) return process.env.WALK_ORG_ID;
  const { data, error } = await sb.schema("users").from("user_preferences").select("last_active_organization_id").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (!data?.last_active_organization_id) throw new Error("The signed-in admin has no active organization: set WALK_ORG_ID or open the app once so it records one.");
  return data.last_active_organization_id;
}
export async function store() {
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const { data: auth, error } = await sb.auth.signInWithPassword({ email: env.AI_ADMIN_USERNAME, password: env.AI_ADMIN_PASSWORD });
  if (error) throw error;
  const organizationId = await activeOrganizationId(sb, auth.user.id);
  return { sb, organizationId, client: createRecordsClient({ dataSource: supabaseDataSource(sb), organizationId, actor: { actor: "user", user_id: auth.user.id, on_behalf_of: null } }) };
}
