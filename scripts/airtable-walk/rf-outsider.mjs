// RECORD-FIXES: what an outsider holding ONE row can read. node rf-outsider.mjs <table> <row> [<other-row>]
import { createClient } from "@supabase/supabase-js";
import { createRecordsClient, supabaseDataSource } from "@ai-matrx/records/core";
import { env } from "./lib.mjs";
const [TB, ROW, OTHER] = process.argv.slice(2);
const ORG = process.env.ORG ?? "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
const { data: a, error } = await sb.auth.signInWithPassword({ email: "test@test.com", password: env.AI_MEMBER_PASSWORD });
if (error) throw error;
const c = createRecordsClient({ dataSource: supabaseDataSource(sb), organizationId: ORG, actor: { actor: "user", user_id: a.user.id, on_behalf_of: null } });
const show = (n, r) => console.log(n.padEnd(22), r.ok ? "OK " + JSON.stringify(r.data).slice(0, 90) : "REFUSED " + JSON.stringify(r.error).slice(0, 160));
for (const [n, id] of [["opens(table)", TB], ["opens(row)", ROW]]) { const r = await sb.schema("custom").rpc("where_id_opens", { p_id: id }); console.log(n.padEnd(22), JSON.stringify(r.error ?? r.data)); }
show("tableRead", await c.tableRead({ table_id: TB }));
show("recordRead(row)", await c.recordRead({ record_id: ROW }));
if (OTHER) show("recordRead(other)", await c.recordRead({ record_id: OTHER }));
show("list", await c.list({ table_id: TB, limit: 10 }));
show("tableList", await c.tableList());
show("views", await c.views({ table_id: TB }));
