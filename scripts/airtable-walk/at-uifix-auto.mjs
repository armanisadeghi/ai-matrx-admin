import { createClient } from "@supabase/supabase-js";
import { createRecordsClient, supabaseDataSource } from "@ai-matrx/records/core";
import { store } from "./store.mjs";
import { env } from "./lib.mjs";
const TB = "85c830ae-98aa-4e2a-a864-8115e53a1a5d";
const must = (r, w) => { if (!r.ok) throw new Error(w + ": " + JSON.stringify(r.error)); return r.data; };
const { client } = await store();
let l = must(await client.automations({ table_id: TB }), "list");
let a = l.automations.find((x) => x.spec.name === "Notify on new account");
if (!a) { must(await client.automationDeclare({ table_id: TB, spec: { name: "Notify on new account", trigger: { on: "row_added" }, actions: [{ do: "notify", to: { author: true }, text: "New wholesale account" }] } }), "declare"); l = must(await client.automations({ table_id: TB }), "list"); a = l.automations.find((x) => x.spec.name === "Notify on new account"); }
console.log("automation", a.id, "enabled", a.enabled);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
const { data: auth, error } = await sb.auth.signInWithPassword({ email: "test@test.com", password: env.AI_MEMBER_PASSWORD });
if (error) throw error;
const m = createRecordsClient({ dataSource: supabaseDataSource(sb), organizationId: "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f", actor: { actor: "user", user_id: auth.user.id, on_behalf_of: null } });
const lv = await m.tableLevelFacts?.({ table_id: TB }); console.log("level facts", JSON.stringify(lv).slice(0,300));
const ml = await m.automations({ table_id: TB }); console.log("member list", ml.ok, JSON.stringify(ml.ok ? ml.data.automations.length : ml.error));
const r = await m.automationSetEnabled({ automation_id: a.id, enabled: true }); console.log("member set", JSON.stringify(r).slice(0,300));
